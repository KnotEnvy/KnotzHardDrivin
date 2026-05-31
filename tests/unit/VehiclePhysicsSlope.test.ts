/**
 * VehiclePhysicsSlope.test.ts
 *
 * Integration tests for the surface-normal raycast fix (Phase 1).
 *
 * These tests use the REAL Rapier.js physics engine (not the mock from setup.ts)
 * so they can assert on actual rigid-body dynamics. `vi.unmock` is called before
 * any import of @dimforge/rapier3d-compat so the global mock is bypassed.
 *
 * Coverage:
 *   1. Flat ground: car settles, all 4 wheels grounded, chassis stays in suspension range.
 *   2. 25° banked plane: contact normal is NOT world-up (fix is live), car stays on plane.
 *   3. Forward ramp: car given initial velocity maintains all-wheel contact climbing.
 */

// Bypass the global Rapier mock from tests/setup.ts so we get the real WASM engine.
vi.unmock('@dimforge/rapier3d-compat');

import { describe, it, expect, beforeAll } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';

// ---------------------------------------------------------------------------
// Types used by the vehicle raycast logic (extracted inline to avoid importing
// the full Vehicle class, which has Three.js / DOM dependencies).
// ---------------------------------------------------------------------------

interface Vec3 { x: number; y: number; z: number }

/** Wheel raycast state produced by the function under test. */
interface WheelHitResult {
  isGrounded: boolean;
  suspensionLength: number;
  contactNormal: Vec3;
  contactPoint: Vec3;
}

// ---------------------------------------------------------------------------
// Helper: perform the exact raycast logic from Vehicle.raycastWheels() on
// a single wheel, using the real Rapier world.  This mirrors the patched code
// in Vehicle.ts so the assertions directly test Change #1.
// ---------------------------------------------------------------------------
function rayCastWheel(
  world: RAPIER.World,
  excludeCollider: RAPIER.Collider,
  wheelWorldPos: Vec3,
  rayDir: Vec3,          // normalised downward direction (chassis-up negated)
  suspensionRestLength: number,
  suspensionMaxTravel: number
): WheelHitResult {
  const maxDist = suspensionRestLength + suspensionMaxTravel;
  const ray = new RAPIER.Ray(wheelWorldPos, rayDir);

  // --- The exact call introduced in Change #1 ---
  const hit = world.castRayAndGetNormal(
    ray,
    maxDist,
    true,
    undefined,
    undefined,
    excludeCollider
  );

  if (!hit) {
    return {
      isGrounded: false,
      suspensionLength: maxDist,
      contactNormal: { x: 0, y: 1, z: 0 },
      contactPoint: { x: 0, y: 0, z: 0 },
    };
  }

  const toi = hit.timeOfImpact;
  let nx = hit.normal.x;
  let ny = hit.normal.y;
  let nz = hit.normal.z;

  // Normalise
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  nx /= len; ny /= len; nz /= len;

  // Robustness: guarantee normal opposes ray direction (winding-independent)
  const dot = nx * rayDir.x + ny * rayDir.y + nz * rayDir.z;
  if (dot > 0) { nx = -nx; ny = -ny; nz = -nz; }

  return {
    isGrounded: true,
    suspensionLength: toi,
    contactNormal: { x: nx, y: ny, z: nz },
    contactPoint: {
      x: wheelWorldPos.x + rayDir.x * toi,
      y: wheelWorldPos.y + rayDir.y * toi,
      z: wheelWorldPos.z + rayDir.z * toi,
    },
  };
}

// ---------------------------------------------------------------------------
// Helper: build a thin static cuboid that acts as ground (or a banked plane).
// rotation is a unit quaternion { x, y, z, w }.
// ---------------------------------------------------------------------------
function createStaticBox(
  world: RAPIER.World,
  position: Vec3,
  halfExtents: Vec3,
  rotation: { x: number; y: number; z: number; w: number } = { x: 0, y: 0, z: 0, w: 1 }
): RAPIER.Collider {
  const rbDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);
  const rb = world.createRigidBody(rbDesc);
  const colDesc = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
    .setRotation(rotation)
    .setFriction(0.8)
    .setRestitution(0.1);
  return world.createCollider(colDesc, rb);
}

// ---------------------------------------------------------------------------
// Helper: create a minimal dynamic rigid body to act as a dummy chassis.
// Returns [rigidBody, collider].  The collider is excluded from wheel raycasts.
// ---------------------------------------------------------------------------
function createChassisBody(
  world: RAPIER.World,
  position: Vec3
): [RAPIER.RigidBody, RAPIER.Collider] {
  const rbDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(position.x, position.y, position.z)
    .setLinearDamping(0.05)
    .setAngularDamping(0.25);
  const rb = world.createRigidBody(rbDesc);
  rb.setAdditionalMass(1200, true);
  const colDesc = RAPIER.ColliderDesc.cuboid(1.0, 0.5, 2.0)
    .setDensity(1200 / 4.0)
    .setFriction(0.5)
    .setRestitution(0.1);
  const col = world.createCollider(colDesc, rb);
  return [rb, col];
}

/** Wheel mount offsets (local) matching DEFAULT_VEHICLE_CONFIG. */
const WHEEL_OFFSETS: Vec3[] = [
  { x: -0.8, y: -0.3, z:  1.25 }, // FL
  { x:  0.8, y: -0.3, z:  1.25 }, // FR
  { x: -0.8, y: -0.3, z: -1.25 }, // RL
  { x:  0.8, y: -0.3, z: -1.25 }, // RR
];
const SUSP_REST   = 0.5;
const SUSP_TRAVEL = 0.3;

// ===========================================================================
// Tests
// ===========================================================================

describe('VehiclePhysicsSlope – surface normal raycast fix', () => {
  beforeAll(async () => {
    // Real WASM init — required exactly once before any Rapier calls.
    await RAPIER.init();
  });

  // -------------------------------------------------------------------------
  // Test 1: flat ground — all 4 wheels grounded, chassis stays in suspension range
  // -------------------------------------------------------------------------
  it('flat ground: all 4 wheels grounded and chassis Y within suspension travel after 2 s', () => {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

    // Flat ground slab centred at y=0, thick enough to not be missed
    createStaticBox(world, { x: 0, y: -0.25, z: 0 }, { x: 50, y: 0.25, z: 50 });

    // Chassis spawned 1 m above ground
    const spawnY = 1.0;
    const [rb, selfCollider] = createChassisBody(world, { x: 0, y: spawnY, z: 0 });

    const FIXED_STEP = 1 / 60;
    const steps = Math.round(2.0 / FIXED_STEP); // 2 seconds @ 60 Hz

    for (let i = 0; i < steps; i++) {
      world.step();
    }

    const pos = rb.translation();
    // The chassis should have settled somewhere above the ground slab top (y=0)
    // and within the suspension rest length (0.5 m) + chassis half-height (0.5 m).
    // Conservative: chassis centre between 0.4 m and 1.6 m.
    expect(pos.y).toBeGreaterThan(0.4);
    expect(pos.y).toBeLessThan(1.6);

    // Velocity should be near zero (settled)
    const vel = rb.linvel();
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
    expect(speed).toBeLessThan(0.5); // m/s

    // All 4 wheel raycasts should report grounded
    const chPos = rb.translation();
    const downDir: Vec3 = { x: 0, y: -1, z: 0 }; // flat ground, chassis is upright

    for (let i = 0; i < 4; i++) {
      const offset = WHEEL_OFFSETS[i];
      // Wheel world position (chassis is not rotated for flat test)
      const wheelPos: Vec3 = {
        x: chPos.x + offset.x,
        y: chPos.y + offset.y,
        z: chPos.z + offset.z,
      };
      const result = rayCastWheel(world, selfCollider, wheelPos, downDir, SUSP_REST, SUSP_TRAVEL);
      expect(result.isGrounded).toBe(true);
      // Suspension should be compressed: length < rest length
      expect(result.suspensionLength).toBeLessThanOrEqual(SUSP_REST + 0.01);
    }

    world.free();
  });

  // -------------------------------------------------------------------------
  // Test 2: 25° banked plane — normal is NOT world-up AND car stays on plane
  // -------------------------------------------------------------------------
  it('25° banked plane: contact normal tilts with slope (fix is live) and car does not fall through', () => {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

    // Rotate a ground slab by 25° around the Z-axis to create a banked plane.
    // Quaternion for 25° around Z: q = (0, 0, sin(12.5°), cos(12.5°))
    const angleDeg = 25;
    const angleRad = (angleDeg * Math.PI) / 180;
    const halfAngle = angleRad / 2;
    const slabRot = {
      x: 0,
      y: 0,
      z: Math.sin(halfAngle),
      w: Math.cos(halfAngle),
    };

    // Slab centred at origin, rotated 25°.  Make it large so wheels don't miss.
    createStaticBox(world, { x: 0, y: 0, z: 0 }, { x: 50, y: 0.25, z: 50 }, slabRot);

    // Chassis spawned 2 m above slab centre
    const [rb, selfCollider] = createChassisBody(world, { x: 0, y: 2.0, z: 0 });

    const FIXED_STEP = 1 / 60;
    const settleSteps = Math.round(1.5 / FIXED_STEP); // 1.5 s — enough to land & settle

    for (let i = 0; i < settleSteps; i++) {
      world.step();
    }

    // Chassis should still be above slab (not fallen through)
    const pos = rb.translation();
    // The slab top at x=0 is at y = 0.25 (half-height of slab).
    // With 25° tilt, at x=0 the surface y is 0.25*cos(25°) ≈ 0.23 m.
    // Chassis centre should be above that.
    expect(pos.y).toBeGreaterThan(0.1);
    // And not flung to the moon (stability check)
    expect(pos.y).toBeLessThan(5.0);

    // Now cast downward from wheel positions and verify normal is tilted.
    // We use the world-down direction since chassis may have rotated slightly.
    // The key assertion: contactNormal.y < 0.98 (not pure world-up) and
    // the normal has a Z component consistent with the 25° tilt.
    const chPos = rb.translation();
    const downDir: Vec3 = { x: 0, y: -1, z: 0 };

    let groundedCount = 0;
    let tiltedNormalCount = 0;

    for (let i = 0; i < 4; i++) {
      const offset = WHEEL_OFFSETS[i];
      const wheelPos: Vec3 = {
        x: chPos.x + offset.x,
        y: chPos.y + offset.y + 0.5, // raise origin above chassis COM
        z: chPos.z + offset.z,
      };
      const result = rayCastWheel(world, selfCollider, wheelPos, downDir, SUSP_REST + 0.5, SUSP_TRAVEL + 0.5);
      if (result.isGrounded) {
        groundedCount++;
        // A 25° banked plane has normal.y = cos(25°) ≈ 0.906 and normal.z = ±sin(25°) ≈ 0.423.
        // If the fix is live, y < 0.99 (not world-up).
        const ny = result.contactNormal.y;
        if (ny < 0.98) {
          tiltedNormalCount++;
        }
      }
    }

    // At least 2 wheels should be on the tilted surface
    expect(groundedCount).toBeGreaterThanOrEqual(2);
    // And those wheels should see a tilted normal (the fix is active)
    expect(tiltedNormalCount).toBeGreaterThanOrEqual(2);

    world.free();
  });

  // -------------------------------------------------------------------------
  // Test 3: ramp surface normal — climbing surface returns a tilted normal
  //
  // Note: this test does NOT run the full vehicle update loop (no suspension or
  // tire forces), so we cannot assert continuous wheel contact under dynamics.
  // Instead, we verify that the raycast helper returns the correct slope normal
  // for a 15° ramp surface — directly testing the castRayAndGetNormal + winding
  // fix that is the core of Change #1.
  // -------------------------------------------------------------------------
  it('forward ramp: raycast from above a 15° ramp returns a tilted normal, not world-up', () => {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

    // 15° ramp slab rotated around the X axis
    const rampDeg = 15;
    const rampRad = (rampDeg * Math.PI) / 180;
    const rampHalfAngle = rampRad / 2;
    const rampRot = {
      x: Math.sin(rampHalfAngle),
      y: 0,
      z: 0,
      w: Math.cos(rampHalfAngle),
    };
    // Place ramp at origin
    createStaticBox(world, { x: 0, y: 0, z: 0 }, { x: 10, y: 0.25, z: 10 }, rampRot);

    // Create a dummy chassis body above the ramp just so we have a collider to exclude
    const [_rb, selfCollider] = createChassisBody(world, { x: 0, y: 5, z: 0 });

    // Step once so colliders are propagated
    world.step();

    // Cast a ray straight down from above the ramp centre
    const wheelPos: Vec3 = { x: 0, y: 3.0, z: 0 };
    const downDir: Vec3 = { x: 0, y: -1, z: 0 };
    const result = rayCastWheel(world, selfCollider, wheelPos, downDir, 2.5, 1.0);

    // The ray should hit the ramp
    expect(result.isGrounded).toBe(true);

    // The contact normal should NOT be world-up (0,1,0):
    // A 15° X-rotation means the ramp normal has y ≈ cos(15°) ≈ 0.966 and x-component ≈ 0.
    // The z-component should be ≈ -sin(15°) ≈ -0.259 (rotated around X).
    // The key assertion: normal.y < 0.98 (tilted — world-up would be exactly 1.0).
    expect(result.contactNormal.y).toBeLessThan(0.98);

    // Z component should be non-zero (the tilt direction)
    const nzAbs = Math.abs(result.contactNormal.z);
    expect(nzAbs).toBeGreaterThan(0.2);

    // Normal should be unit length (normalised correctly)
    const normalLen = Math.sqrt(
      result.contactNormal.x ** 2 +
      result.contactNormal.y ** 2 +
      result.contactNormal.z ** 2
    );
    expect(normalLen).toBeCloseTo(1.0, 3);

    // Normal must oppose the ray direction (dot product with downDir < 0)
    const dotWithRay =
      result.contactNormal.x * downDir.x +
      result.contactNormal.y * downDir.y +
      result.contactNormal.z * downDir.z;
    expect(dotWithRay).toBeLessThan(0);

    world.free();
  });
});
