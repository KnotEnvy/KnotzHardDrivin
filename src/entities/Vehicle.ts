import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { Physics } from '../core/Physics';
import type { InputState } from '../core/Input';
import { VehicleConfig as C } from '../config/vehicle.config';
import { clamp, clampMagnitude, moveToward } from '../util/math';

interface Wheel {
  /** Suspension attach point in chassis-local space. */
  readonly local: THREE.Vector3;
  readonly isFront: boolean;
  /** Visual group (handles steer about Y + suspension travel). */
  readonly group: THREE.Group;
  /** Current suspension length (attach → wheel centre), for visuals. */
  length: number;
  spin: number;
}

/**
 * Arcade raycast vehicle: a single dynamic chassis body with four ray-cast
 * "wheels". Each fixed step we cast a ray down from each wheel, read the real
 * surface normal, and apply suspension + tire-friction impulses at the contact
 * point. Tire forces are clamped by available traction (μ · normal load) so the
 * car grips up to a limit and slides past it (drift).
 *
 * Forces are applied as impulses (force × dt) so there is no force-accumulator
 * state to reset between steps.
 */
export class Vehicle {
  readonly mesh = new THREE.Group();

  private readonly RAPIER: typeof RAPIER;
  private readonly world: RAPIER.World;
  private readonly body: RAPIER.RigidBody;
  private readonly wheels: Wheel[] = [];

  private steerAngle = 0;
  private _groundedCount = 0;

  // --- scratch (reused every step; avoids per-frame allocation) ---
  private readonly pos = new THREE.Vector3();
  private readonly quat = new THREE.Quaternion();
  private readonly linvel = new THREE.Vector3();
  private readonly angvel = new THREE.Vector3();
  private readonly com = new THREE.Vector3();
  private readonly fwd = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3();
  private readonly wheelFwd = new THREE.Vector3();
  private readonly wheelLat = new THREE.Vector3();
  private readonly normal = new THREE.Vector3();
  private readonly contact = new THREE.Vector3();
  private readonly rArm = new THREE.Vector3();
  private readonly pointVel = new THREE.Vector3();
  private readonly tmp = new THREE.Vector3();
  private readonly steerQ = new THREE.Quaternion();
  private readonly rayOrigin = { x: 0, y: 0, z: 0 };
  private readonly rayDir = { x: 0, y: -1, z: 0 };
  private readonly ray: RAPIER.Ray;
  private readonly impulseV = { x: 0, y: 0, z: 0 };
  private readonly pointV = { x: 0, y: 0, z: 0 };

  private static readonly LOCAL_FWD = new THREE.Vector3(0, 0, -1);
  private static readonly LOCAL_RIGHT = new THREE.Vector3(1, 0, 0);
  private static readonly LOCAL_UP = new THREE.Vector3(0, 1, 0);

  constructor(physics: Physics, scene: THREE.Scene) {
    this.RAPIER = physics.RAPIER;
    this.world = physics.world;

    this.body = this.world.createRigidBody(
      this.RAPIER.RigidBodyDesc.dynamic()
        .setLinearDamping(C.linearDamping)
        .setAngularDamping(C.angularDamping)
        .setCanSleep(false),
    );
    this.world.createCollider(
      this.RAPIER.ColliderDesc.cuboid(
        C.chassisHalfExtents.x,
        C.chassisHalfExtents.y,
        C.chassisHalfExtents.z,
      ).setDensity(C.chassisDensity),
      this.body,
    );

    this.ray = new this.RAPIER.Ray(this.rayOrigin, this.rayDir);

    this.buildMesh();
    this.buildWheels();
    scene.add(this.mesh);

    this.respawn(new THREE.Vector3(0, this.spawnHeight, 0), new THREE.Quaternion());
  }

  /** Chassis-centre height that drops the car onto a surface at y=0 cleanly. */
  get spawnHeight(): number {
    return -C.wheelMountY + C.suspensionRest + C.wheelRadius + C.spawnHeightMargin;
  }

  /** Speed along the chassis forward axis (m/s; negative = reversing). */
  get forwardSpeed(): number {
    const lv = this.body.linvel();
    this.fwd.copy(Vehicle.LOCAL_FWD).applyQuaternion(this.readQuat());
    return this.fwd.x * lv.x + this.fwd.y * lv.y + this.fwd.z * lv.z;
  }

  /** Overall speed (m/s). */
  get speed(): number {
    const lv = this.body.linvel();
    return Math.hypot(lv.x, lv.y, lv.z);
  }

  get groundedCount(): number {
    return this._groundedCount;
  }

  /** Reset the car to a transform at rest with centred steering. */
  respawn(position: THREE.Vector3, rotation: THREE.Quaternion): void {
    this.body.setTranslation(position, true);
    this.body.setRotation(rotation, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.steerAngle = 0;
    for (const w of this.wheels) w.length = C.suspensionRest;
    this.syncMesh();
  }

  fixedUpdate(dt: number, input: InputState): void {
    // Cache body state once per step.
    const t = this.body.translation();
    const lv = this.body.linvel();
    const av = this.body.angvel();
    const cm = this.body.worldCom();
    this.pos.set(t.x, t.y, t.z);
    this.linvel.set(lv.x, lv.y, lv.z);
    this.angvel.set(av.x, av.y, av.z);
    this.com.set(cm.x, cm.y, cm.z);
    this.readQuat();

    this.fwd.copy(Vehicle.LOCAL_FWD).applyQuaternion(this.quat);
    this.right.copy(Vehicle.LOCAL_RIGHT).applyQuaternion(this.quat);
    this.up.copy(Vehicle.LOCAL_UP).applyQuaternion(this.quat);

    // Speed-sensitive steering toward the input target.
    const speed = Math.hypot(lv.x, lv.y, lv.z);
    const falloff = 1 - C.steerSpeedFalloff * clamp(speed / C.highSpeed, 0, 1);
    const targetSteer = input.steer * C.maxSteer * falloff;
    this.steerAngle = moveToward(this.steerAngle, targetSteer, C.steerSpeed * dt);

    const mass = this.body.mass();
    const massCorner = mass / 4;
    const maxLen = C.suspensionRest + C.wheelRadius;

    this._groundedCount = 0;

    for (const wheel of this.wheels) {
      // World-space attach point.
      this.tmp.copy(wheel.local).applyQuaternion(this.quat).add(this.pos);
      this.rayOrigin.x = this.tmp.x;
      this.rayOrigin.y = this.tmp.y;
      this.rayOrigin.z = this.tmp.z;
      this.rayDir.x = -this.up.x;
      this.rayDir.y = -this.up.y;
      this.rayDir.z = -this.up.z;

      const hit = this.world.castRayAndGetNormal(
        this.ray,
        maxLen,
        true,
        undefined,
        undefined,
        undefined,
        this.body, // exclude our own chassis
      );

      if (!hit) {
        wheel.length = C.suspensionRest; // fully extended (airborne)
        continue;
      }

      const toi = hit.timeOfImpact;
      wheel.length = clamp(toi - C.wheelRadius, 0.02, maxLen);
      this._groundedCount++;

      // Contact point and the REAL surface normal (the v1-killer fix).
      this.contact.copy(this.tmp).addScaledVector(this.up, -toi);
      this.normal.set(hit.normal.x, hit.normal.y, hit.normal.z).normalize();

      // Velocity at the contact point: v = linvel + angvel × r.
      this.rArm.copy(this.contact).sub(this.com);
      this.pointVel.copy(this.angvel).cross(this.rArm).add(this.linvel);

      // --- Suspension (spring + damper) along the contact normal. ---
      const compression = maxLen - toi;
      const vNormal = this.pointVel.dot(this.normal);
      const springForce = C.suspensionStiffness * compression;
      const suspForce = Math.max(0, springForce - C.suspensionDamping * vNormal);
      const normalLoad = Math.max(0, springForce);

      // --- Wheel ground directions (front wheels are steered). ---
      this.wheelFwd.copy(this.fwd);
      if (wheel.isFront && this.steerAngle !== 0) {
        this.steerQ.setFromAxisAngle(this.up, this.steerAngle);
        this.wheelFwd.applyQuaternion(this.steerQ);
      }
      // Project forward onto the ground plane, then derive lateral.
      this.wheelFwd.addScaledVector(this.normal, -this.wheelFwd.dot(this.normal)).normalize();
      this.wheelLat.copy(this.normal).cross(this.wheelFwd).normalize();

      const vForward = this.pointVel.dot(this.wheelFwd);
      const vLat = this.pointVel.dot(this.wheelLat);

      // --- Longitudinal force (engine / brake / reverse / rolling). ---
      let drive = 0;
      if (input.throttle > 0) drive += (input.throttle * C.maxEngineForce) / 4;
      if (input.brake > 0) {
        drive -=
          vForward > 0.5
            ? (input.brake * C.maxBrakeForce) / 4
            : (input.brake * C.reverseForce) / 4;
      }
      drive -= vForward * C.rollingResistance;
      const traction = C.longitudinalGrip * normalLoad;
      const longImpulse = clampMagnitude(drive, traction) * dt;

      // --- Lateral grip: try to cancel side-slip, limited by friction. ---
      const rearHandbrake = !wheel.isFront && input.handbrake;
      const latMu = C.lateralGrip * (rearHandbrake ? C.handbrakeRearGrip : 1);
      const maxLatImpulse = latMu * normalLoad * dt;
      const latImpulse = clampMagnitude(-massCorner * vLat, maxLatImpulse);

      // --- Apply combined impulse at the contact point. ---
      const suspImpulse = suspForce * dt;
      this.impulseV.x =
        this.normal.x * suspImpulse + this.wheelFwd.x * longImpulse + this.wheelLat.x * latImpulse;
      this.impulseV.y =
        this.normal.y * suspImpulse + this.wheelFwd.y * longImpulse + this.wheelLat.y * latImpulse;
      this.impulseV.z =
        this.normal.z * suspImpulse + this.wheelFwd.z * longImpulse + this.wheelLat.z * latImpulse;
      this.pointV.x = this.contact.x;
      this.pointV.y = this.contact.y;
      this.pointV.z = this.contact.z;
      this.body.applyImpulseAtPoint(this.impulseV, this.pointV, true);

      // Spin the visual wheel by how far it rolled this step.
      wheel.spin += (vForward / C.wheelRadius) * dt;
    }

    // --- Aerodynamic drag (quadratic): F = −Cd·|v|·v, so impulse = −v·(Cd·|v|·dt). ---
    if (speed > 0.01) {
      const dragImpulse = C.airDragQuad * speed * dt;
      this.impulseV.x = -this.linvel.x * dragImpulse;
      this.impulseV.y = -this.linvel.y * dragImpulse;
      this.impulseV.z = -this.linvel.z * dragImpulse;
      this.body.applyImpulse(this.impulseV, true);
    }
  }

  /** Copy physics transform → meshes. Call once per rendered frame. */
  syncMesh(): void {
    const t = this.body.translation();
    const r = this.body.rotation();
    this.mesh.position.set(t.x, t.y, t.z);
    this.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    for (const w of this.wheels) {
      w.group.position.set(w.local.x, w.local.y - w.length, w.local.z);
      w.group.rotation.y = w.isFront ? this.steerAngle : 0;
      (w.group.children[0] as THREE.Mesh).rotation.x = w.spin;
    }
  }

  /** Forward direction in world space, flattened to the XZ plane (for camera). */
  getFlatForward(out: THREE.Vector3): THREE.Vector3 {
    out.copy(Vehicle.LOCAL_FWD).applyQuaternion(this.readQuat());
    out.y = 0;
    if (out.lengthSq() < 1e-6) out.set(0, 0, -1);
    return out.normalize();
  }

  getPosition(out: THREE.Vector3): THREE.Vector3 {
    const t = this.body.translation();
    return out.set(t.x, t.y, t.z);
  }

  private readQuat(): THREE.Quaternion {
    const r = this.body.rotation();
    return this.quat.set(r.x, r.y, r.z, r.w);
  }

  private buildMesh(): void {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(C.chassisHalfExtents.x * 2, 0.5, C.chassisHalfExtents.z * 2),
      new THREE.MeshStandardMaterial({ color: 0xd6263a, metalness: 0.3, roughness: 0.45 }),
    );
    body.position.y = 0.05;
    body.castShadow = true;

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.5, 1.9),
      new THREE.MeshStandardMaterial({ color: 0x101418, metalness: 0.2, roughness: 0.3 }),
    );
    cabin.position.set(0, 0.45, -0.1);
    cabin.castShadow = true;

    this.mesh.add(body, cabin);
  }

  private buildWheels(): void {
    const layout: ReadonlyArray<readonly [number, number, boolean]> = [
      [-C.halfTrack, -C.halfWheelbase, true], // FL
      [C.halfTrack, -C.halfWheelbase, true], // FR
      [-C.halfTrack, C.halfWheelbase, false], // RL
      [C.halfTrack, C.halfWheelbase, false], // RR
    ];

    const geo = new THREE.CylinderGeometry(C.wheelRadius, C.wheelRadius, 0.3, 18);
    geo.rotateZ(Math.PI / 2); // axle along local X so it rolls about X
    const mat = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.85 });

    for (const [x, z, isFront] of layout) {
      const group = new THREE.Group();
      group.position.set(x, C.wheelMountY - C.suspensionRest, z);
      const wheelMesh = new THREE.Mesh(geo, mat);
      wheelMesh.castShadow = true;
      group.add(wheelMesh);
      this.mesh.add(group);
      this.wheels.push({
        local: new THREE.Vector3(x, C.wheelMountY, z),
        isFront,
        group,
        length: C.suspensionRest,
        spin: 0,
      });
    }
  }
}
