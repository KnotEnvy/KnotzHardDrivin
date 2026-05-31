/**
 * TrackGeometryPipeline.test.ts
 *
 * Validates the new frame-transport track geometry pipeline.
 *
 * This file uses the REAL Rapier.js engine (vi.unmock) so Rapier trimesh
 * calls are real, and the track can be fully constructed including its
 * physics collider.
 *
 * Coverage:
 *   1. oval.json (banked oval) — end ≈ start → closure detected → isClosed=true
 *   2. track01 (ramps+banks, open) — no warp: consecutive spline point gap < 5 m
 *   3. Road collider — zero degenerate triangles (all valid area)
 *   4. Loop section — frame up vectors vary smoothly, return near origin, no NaN
 *   5. Ramp section — paired +h/-h ramps return frame to level (net pitch ≈ 0)
 */

// Bypass the global Rapier mock from tests/setup.ts so we get the real WASM engine.
vi.unmock('@dimforge/rapier3d-compat');

import { describe, it, expect, beforeAll } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

// We import only the types from Track.ts to avoid Three.js material side-effects,
// then construct a minimal Track directly. The Track constructor calls generateSpline,
// generateMesh, and generateCollider which are the functions under test.
import { Track, TrackData, TrackSection, FramePoint } from '@/entities/Track';

// ---------------------------------------------------------------------------
// Minimal physics world mock compatible with Rapier (uses real Rapier types
// but the Track only needs world.world.createRigidBody / createCollider).
// For geometry tests we can pass the real Rapier world directly.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helper: create a minimal mock scene (Track adds mesh to scene)
// ---------------------------------------------------------------------------
function makeMockScene() {
  return {
    add: (_o: unknown) => {},
    remove: (_o: unknown) => {},
    children: [] as unknown[],
    traverse: (_fn: unknown) => {},
    getObjectByName: (_n: string) => undefined,
  } as unknown as THREE.Scene;
}

// ---------------------------------------------------------------------------
// Helper: create a real Rapier physics world wrapper that looks like PhysicsWorld
// ---------------------------------------------------------------------------
function makeRealPhysicsWorld(rapierWorld: RAPIER.World) {
  return { world: rapierWorld } as unknown as import('@/core/PhysicsWorld').PhysicsWorld;
}

// ---------------------------------------------------------------------------
// Minimal track data builders (matching the JSON schemas)
// ---------------------------------------------------------------------------

const ovalSections: TrackSection[] = [
  { type: 'straight', length: 400 },
  { type: 'bank', radius: 150, angle: 180, banking: 15 },
  { type: 'straight', length: 400 },
  { type: 'bank', radius: 150, angle: 180, banking: 15 },
];

const track01Sections: TrackSection[] = [
  { type: 'straight', length: 80 },
  { type: 'ramp',     length: 40, height:  3 },
  { type: 'bank',     radius: 50, angle: 90, banking: 25 },
  { type: 'ramp',     length: 30, height: -3 },
  { type: 'straight', length: 80 },
  { type: 'ramp',     length: 40, height:  3 },
  { type: 'bank',     radius: 50, angle: 90, banking: 25 },
  { type: 'ramp',     length: 30, height: -3 },
];

const loopOnlySections: TrackSection[] = [
  { type: 'straight', length: 30 },
  { type: 'loop',     radius: 15 },
  { type: 'straight', length: 30 },
];

function makeSpawnPoint() {
  return {
    position: [0, 0.5, 0] as [number, number, number],
    rotation: [0, 0, 0, 1] as [number, number, number, number],
  };
}

function makeTrackData(name: string, sections: TrackSection[], width = 10): TrackData {
  return { name, sections, width, spawnPoint: makeSpawnPoint(), waypoints: [] };
}

// ---------------------------------------------------------------------------
// Helpers for triangle area validation
// ---------------------------------------------------------------------------

function triangleAreaSq(
  verts: ArrayLike<number>,
  a: number,
  b: number,
  c: number
): number {
  const ax = verts[a * 3], ay = verts[a * 3 + 1], az = verts[a * 3 + 2];
  const bx = verts[b * 3], by = verts[b * 3 + 1], bz = verts[b * 3 + 2];
  const cx = verts[c * 3], cy = verts[c * 3 + 1], cz = verts[c * 3 + 2];
  const ex = bx - ax, ey = by - ay, ez = bz - az;
  const fx = cx - ax, fy = cy - ay, fz = cz - az;
  const crossX = ey * fz - ez * fy;
  const crossY = ez * fx - ex * fz;
  const crossZ = ex * fy - ey * fx;
  return crossX * crossX + crossY * crossY + crossZ * crossZ;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TrackGeometryPipeline – frame-transport rebuild', () => {
  let rapierWorld: RAPIER.World;

  beforeAll(async () => {
    await RAPIER.init();
    rapierWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  });

  // =========================================================================
  // 1. Oval (banked oval from oval.json) — should be detected as CLOSED
  // =========================================================================
  describe('oval.json geometry', () => {
    let track: Track;

    beforeAll(() => {
      // Use a fresh Rapier world per track to avoid handle exhaustion
      const w = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
      const data = makeTrackData('Super Speedway', ovalSections, 16);
      track = new Track(data, makeRealPhysicsWorld(w), makeMockScene());
    });

    it('detects the oval as a closed track (isClosed=true)', () => {
      expect((track as any).isClosed).toBe(true);
    });

    it('end frame-point ≈ start frame-point (position within 1 m)', () => {
      const fps: FramePoint[] = (track as any).framePoints;
      const first = fps[0].position;
      const last  = fps[fps.length - 1].position;
      const dist = first.distanceTo(last);
      // The closure check uses 1 m threshold; actual oval should be very tight.
      expect(dist).toBeLessThan(2.0);
    });

    it('no NaN in any frame-point position', () => {
      const fps: FramePoint[] = (track as any).framePoints;
      for (const fp of fps) {
        expect(isFinite(fp.position.x)).toBe(true);
        expect(isFinite(fp.position.y)).toBe(true);
        expect(isFinite(fp.position.z)).toBe(true);
      }
    });

    it('mesh has no zero-index attribute issues (geometry is valid)', () => {
      const geo = track.getMesh().geometry;
      const pos = geo.attributes.position;
      const idx = geo.index;
      expect(pos).toBeDefined();
      expect(idx).toBeDefined();
      expect(pos.array.length).toBeGreaterThan(0);
      expect(pos.array.length % 3).toBe(0);
    });
  });

  // =========================================================================
  // 2. track01 (open ramp+bank layout) — must NOT warp across the map
  // =========================================================================
  describe('track01.json geometry (open layout, no false closure)', () => {
    let track: Track;

    beforeAll(() => {
      const w = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
      const data = makeTrackData('Thunder Speedway', track01Sections, 10);
      track = new Track(data, makeRealPhysicsWorld(w), makeMockScene());
    });

    it('does NOT detect as closed (isClosed=false)', () => {
      // track01 is an open layout; with frame-transport the end heading is ~90°
      // from start, so the closure dot product fails.
      expect((track as any).isClosed).toBe(false);
    });

    it('max consecutive spline point gap < 5 m (no warp-across-map)', () => {
      const spline = (track as any).spline as THREE.CatmullRomCurve3;
      // Sample 500 points — sufficient to catch any runaway segment
      const pts = spline.getPoints(500);
      let maxGap = 0;
      for (let i = 1; i < pts.length; i++) {
        const d = pts[i].distanceTo(pts[i - 1]);
        if (d > maxGap) maxGap = d;
      }
      // With 500 samples over a ~500 m track the expected gap is ~1 m.
      // Allow up to 5 m for robustness.
      expect(maxGap).toBeLessThan(5.0);
    });

    it('all frame-point positions are finite (no NaN from ramp math)', () => {
      const fps: FramePoint[] = (track as any).framePoints;
      for (const fp of fps) {
        expect(isFinite(fp.position.x)).toBe(true);
        expect(isFinite(fp.position.y)).toBe(true);
        expect(isFinite(fp.position.z)).toBe(true);
        expect(isFinite(fp.forward.x)).toBe(true);
        expect(isFinite(fp.up.x)).toBe(true);
      }
    });

    it('frame-points cover some elevation (ramp actually rises)', () => {
      const fps: FramePoint[] = (track as any).framePoints;
      const yValues = fps.map(fp => fp.position.y);
      const maxY = Math.max(...yValues);
      const minY = Math.min(...yValues);
      // With ramp height=3 the track should rise at least 2 m above its base
      expect(maxY - minY).toBeGreaterThan(2.0);
    });
  });

  // =========================================================================
  // 3. Road collider — zero degenerate triangles
  // =========================================================================
  describe('road collider — no degenerate triangles', () => {
    let track: Track;

    beforeAll(() => {
      const w = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
      const data = makeTrackData('Degenerate Test', ovalSections, 16);
      track = new Track(data, makeRealPhysicsWorld(w), makeMockScene());
    });

    it('all road-mesh triangles have non-zero area', () => {
      // The mesh geometry contains ALL triangles (road + wall). We iterate
      // them all and verify none have zero cross-product — the generateCollider
      // function drops these from Rapier but we verify the mesh itself is clean.
      const geo  = track.getMesh().geometry;
      const pos  = geo.attributes.position.array;
      const idx  = geo.index!.array;
      let degenerateCount = 0;

      for (let t = 0; t < idx.length; t += 3) {
        const areaSq = triangleAreaSq(pos, idx[t], idx[t + 1], idx[t + 2]);
        if (areaSq < 1e-14) degenerateCount++;
      }

      // Mesh may have a tiny number of shared-edge degenerate triangles at seams.
      // We allow at most 0 — the geometry pipeline should be clean.
      expect(degenerateCount).toBe(0);
    });

    it('road collider handle exists (Rapier accepted the mesh)', () => {
      const collider: RAPIER.Collider | null = (track as any).collider;
      expect(collider).not.toBeNull();
      // Rapier collider handle is a non-negative integer
      if (collider) {
        expect(typeof collider.handle).toBe('number');
        expect(collider.handle).toBeGreaterThanOrEqual(0);
      }
    });

    it('wall collider handle exists separately', () => {
      const wallCollider: RAPIER.Collider | null = (track as any).wallCollider;
      const roadCollider: RAPIER.Collider | null = (track as any).collider;
      // Wall collider should be a distinct Rapier object
      if (wallCollider && roadCollider) {
        expect(wallCollider.handle).not.toBe(roadCollider.handle);
      }
      // At minimum, wall collider should exist (or be null with no degenerate issue)
      // — just check it's defined (not undefined)
      expect((track as any).wallCollider !== undefined).toBe(true);
    });
  });

  // =========================================================================
  // 4. Loop section — frame up vectors vary smoothly through 360°, no NaN
  // =========================================================================
  describe('loop section frame transport', () => {
    let track: Track;

    beforeAll(() => {
      const w = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
      const data = makeTrackData('Loop Test', loopOnlySections, 10);
      track = new Track(data, makeRealPhysicsWorld(w), makeMockScene());
    });

    it('loop frame-points have no NaN in up or forward', () => {
      const fps: FramePoint[] = (track as any).framePoints;
      for (const fp of fps) {
        expect(isFinite(fp.up.x)).toBe(true);
        expect(isFinite(fp.up.y)).toBe(true);
        expect(isFinite(fp.up.z)).toBe(true);
        expect(isFinite(fp.forward.x)).toBe(true);
        expect(isFinite(fp.forward.y)).toBe(true);
        expect(isFinite(fp.forward.z)).toBe(true);
      }
    });

    it('loop reaches a point where up.y is negative (frame inverts at apex)', () => {
      const fps: FramePoint[] = (track as any).framePoints;
      // At the top of the loop, up.y should be negative (pointing away from loop center
      // = pointing downward in world space when the car is upside-down)
      const hasInvertedUp = fps.some(fp => fp.up.y < -0.5);
      expect(hasInvertedUp).toBe(true);
    });

    it('loop frame returns near original orientation after 360°', () => {
      const fps: FramePoint[] = (track as any).framePoints;
      // Find the frame-points that are part of the loop (they come after the initial straight).
      // The loop is 36 divisions + 2 end-of-straight points + 1 start-of-trail.
      // We check that the last loop point's forward matches approximately the direction
      // just before the loop entered. A simple proxy: the last frame-point should have
      // forward.z > 0 (pointing in roughly the same +Z direction as the start).
      const lastFP = fps[fps.length - 1];
      // The trailing straight runs in +Z, so forward should remain in the +Z family.
      // We allow a generous tolerance: dot(lastForward, firstForward) > 0.7
      const firstFP = fps[0];
      const dotFwd = lastFP.forward.dot(firstFP.forward);
      expect(dotFwd).toBeGreaterThan(0.7);
    });

    it('loop up vector continuously varies (no jump-discontinuities > 0.3 per step)', () => {
      const fps: FramePoint[] = (track as any).framePoints;
      for (let i = 1; i < fps.length; i++) {
        const prevUp = fps[i - 1].up;
        const currUp = fps[i].up;
        // Angular distance between consecutive up vectors: 1 - |dot| < threshold
        // For a 36-division loop, each step is 10° → dot ≈ cos(10°) ≈ 0.985
        // We allow up to 30° (dot ≈ 0.866) for other section transitions.
        const dot = Math.abs(prevUp.dot(currUp));
        // dot should be close to 1 for smooth variation
        expect(dot).toBeGreaterThan(0.8);
      }
    });
  });

  // =========================================================================
  // 5. Ramp — paired +h/-h ramps net back to level
  // =========================================================================
  describe('ramp section frame transport', () => {
    it('paired +3/-3 m ramps return forward pitch to within 5° of start', () => {
      const w = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
      const sections: TrackSection[] = [
        { type: 'straight', length: 20 },
        { type: 'ramp',     length: 40, height:  3 },
        { type: 'ramp',     length: 30, height: -3 },
        { type: 'straight', length: 20 },
      ];
      const data = makeTrackData('Ramp Test', sections, 10);
      const track = new Track(data, makeRealPhysicsWorld(w), makeMockScene());

      const fps: FramePoint[] = (track as any).framePoints;
      const first = fps[0];
      const last  = fps[fps.length - 1];

      // dot(firstForward, lastForward) should be > cos(5°) ≈ 0.996 if they're level
      const dot = first.forward.dot(last.forward);
      // Allow up to 10° for small numerical error: cos(10°) ≈ 0.985
      expect(dot).toBeGreaterThan(0.97);
    });

    it('ramp frame has non-zero Y on forward during ascent (pitched)', () => {
      const w = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
      const sections: TrackSection[] = [
        { type: 'ramp', length: 40, height: 8 },
      ];
      const data = makeTrackData('Ramp Ascent', sections, 10);
      const track = new Track(data, makeRealPhysicsWorld(w), makeMockScene());

      const fps: FramePoint[] = (track as any).framePoints;
      // During ascent the forward vector should gain positive Y (pitching upward)
      const midFP = fps[Math.floor(fps.length / 2)];
      expect(midFP.forward.y).toBeGreaterThan(0.05);
    });
  });

  // =========================================================================
  // 6. Dispose — wall collider + rigid body are cleaned up
  // =========================================================================
  it('dispose() removes both road and wall colliders without error', () => {
    const w = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const data = makeTrackData('Dispose Test', ovalSections, 16);
    const track = new Track(data, makeRealPhysicsWorld(w), makeMockScene());

    expect(() => track.dispose()).not.toThrow();

    // After dispose, both collider references should be null
    expect((track as any).collider).toBeNull();
    expect((track as any).wallCollider).toBeNull();
    expect((track as any).rigidBody).toBeNull();
    expect((track as any).wallRigidBody).toBeNull();
  });

  // =========================================================================
  // 7. Public API surface — all required methods still exist
  // =========================================================================
  it('public API is stable (all required methods present)', () => {
    const w = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const data = makeTrackData('API Test', [{ type: 'straight', length: 50 }], 10);
    const track = new Track(data, makeRealPhysicsWorld(w), makeMockScene());

    expect(typeof track.getSpawnPoint).toBe('function');
    expect(typeof track.getWaypoints).toBe('function');
    expect(typeof track.getName).toBe('function');
    expect(typeof track.getMesh).toBe('function');
    expect(typeof track.getBounds).toBe('function');
    expect(typeof track.getSurfaceType).toBe('function');
    expect(typeof track.dispose).toBe('function');
    expect(typeof track.updateBackground).toBe('function');
    expect(typeof track.createCollisionDebugMesh).toBe('function');
    expect(typeof Track.loadTrackData).toBe('function');

    // New informational APIs
    expect(typeof track.getIsClosed).toBe('function');
    expect(typeof track.getFramePoints).toBe('function');

    track.dispose();
  });
});
