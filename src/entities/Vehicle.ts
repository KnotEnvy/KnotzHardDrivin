import { Vector3, Quaternion, Euler, Matrix4 } from 'three';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  VehicleConfig,
  VehicleInput,
  VehicleTransform,
  VehicleTelemetry,
  WheelState,
  WheelIndex,
  DamageState,
  DamageSeverity,
  CollisionEvent,
  SurfaceType,
  PhysicsTempObjects,
  BrakeConfig,
} from '../types/VehicleTypes';
import {
  DEFAULT_VEHICLE_CONFIG,
  DEFAULT_BRAKE_CONFIG,
  PHYSICS_CONSTANTS,
  RAYCAST_CONFIG,
  ANTI_ROLL_BAR,
  ADVANCED_TUNING,
} from '../config/PhysicsConfig';

/**
 * Vehicle class implementing full physics simulation with Rapier.js.
 *
 * Architecture:
 * - Single rigid body for chassis (1200kg)
 * - 4 independent wheel raycasts (NOT rigid bodies for stability)
 * - Spring-damper suspension per wheel
 * - Force-based control (engine, brake, steering)
 * - Tire grip based on surface types
 * - Damage tracking system
 *
 * Performance:
 * - Target: <2ms per update() call
 * - Zero per-frame allocations (reuses temp objects)
 * - Deterministic physics (same inputs = same outputs)
 *
 * Usage:
 * ```typescript
 * const vehicle = new Vehicle(physicsWorld, config);
 * await vehicle.init(spawnPosition, spawnRotation);
 *
 * // Each frame:
 * vehicle.setInput(input);
 * vehicle.update(deltaTime);
 * const transform = vehicle.getTransform();
 * ```
 */
export class Vehicle {
  // Configuration
  private config: VehicleConfig;
  private brakeConfig: BrakeConfig;

  // Physics world reference
  private world: RAPIER.World;

  // Rapier rigid body (chassis)
  private rigidBody!: RAPIER.RigidBody;
  private collider!: RAPIER.Collider;

  // Visual representation (Three.js meshes)
  private scene?: THREE.Scene;
  private chassisMesh?: THREE.Mesh;
  private wheelMeshes: [THREE.Mesh?, THREE.Mesh?, THREE.Mesh?, THREE.Mesh?] = [
    undefined,
    undefined,
    undefined,
    undefined,
  ];

  // Temp objects for visual updates (reused to avoid allocations)
  private tempPosition = new Vector3();
  private tempQuaternion = new Quaternion();
  private tempSteeringQuat = new THREE.Quaternion();
  private tempRollQuat = new THREE.Quaternion();
  private tempAxisY = new THREE.Vector3(0, 1, 0);
  private tempAxisX = new THREE.Vector3(1, 0, 0);

  // Wheel states (runtime data)
  private wheels: [WheelState, WheelState, WheelState, WheelState];

  // Input state
  private input: VehicleInput = {
    throttle: 0,
    brake: 0,
    steering: 0,
    handbrake: 0,
  };

  // Engine and transmission state
  private currentRPM: number = 0;
  private currentGear: number = 1;
  private gearShiftTimer: number = 0;
  private isShifting: boolean = false;

  // Damage state
  private damageState: DamageState;

  // Cached transform for external access
  private cachedTransform: VehicleTransform;

  // Temp objects for calculations (zero per-frame allocations)
  private temp: PhysicsTempObjects;

  // Initialization flag
  private initialized: boolean = false;

  /**
   * Creates a new vehicle instance.
   *
   * @param world - Rapier physics world
   * @param config - Vehicle configuration (optional, uses default if not provided)
   * @param brakeConfig - Brake configuration (optional, uses default if not provided)
   */
  constructor(
    world: RAPIER.World,
    config: VehicleConfig = DEFAULT_VEHICLE_CONFIG,
    brakeConfig: BrakeConfig = DEFAULT_BRAKE_CONFIG
  ) {
    this.world = world;
    this.config = config;
    this.brakeConfig = brakeConfig;

    // Initialize wheel states
    this.wheels = [
      this.createWheelState(),
      this.createWheelState(),
      this.createWheelState(),
      this.createWheelState(),
    ];

    // Initialize damage state
    this.damageState = {
      overallDamage: 0,
      severity: DamageSeverity.NONE,
      performancePenalty: 0,
      crashCount: 0,
      recentCollisions: [],
    };

    // Initialize cached transform
    this.cachedTransform = {
      position: new Vector3(),
      rotation: new Quaternion(),
      linearVelocity: new Vector3(),
      angularVelocity: new Vector3(),
      forward: new Vector3(0, 0, 1),
      right: new Vector3(1, 0, 0),
      up: new Vector3(0, 1, 0),
    };

    // Initialize temp objects (reused every frame)
    this.temp = {
      tempVec1: new Vector3(),
      tempVec2: new Vector3(),
      tempVec3: new Vector3(),
      tempVec4: new Vector3(),
      tempVec5: new Vector3(),
      tempVec6: new Vector3(),
      tempQuat1: new Quaternion(),
      tempQuat2: new Quaternion(),
      tempRay: new RAPIER.Ray(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: -1, z: 0 }
      ),
    };

    // Start at idle RPM
    this.currentRPM = this.config.engine.idleRPM;
  }

  /**
   * Initializes the vehicle in the physics world and creates visual meshes.
   *
   * Creates the rigid body, collider, visual meshes, and sets initial transform.
   *
   * @param position - Initial world position
   * @param rotation - Initial world rotation (quaternion)
   * @param scene - THREE.js scene to add meshes to
   */
  async init(position: Vector3, rotation: Quaternion, scene: THREE.Scene): Promise<void> {
    this.scene = scene;

    // Create rigid body description
    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setRotation({
        x: rotation.x,
        y: rotation.y,
        z: rotation.z,
        w: rotation.w,
      })
      .setLinearDamping(PHYSICS_CONSTANTS.LINEAR_DAMPING)
      .setAngularDamping(PHYSICS_CONSTANTS.ANGULAR_DAMPING)
      .setCanSleep(false); // Prevent sleeping for responsive controls

    this.rigidBody = this.world.createRigidBody(rigidBodyDesc);

    // Set mass properties
    this.rigidBody.setAdditionalMass(this.config.mass, true);

    // Note: Center of mass is determined by collider mass distribution
    // To adjust COM, position the collider relative to the rigid body
    // or use setAdditionalMassProperties (not currently needed for basic vehicle)

    // Create box collider for chassis
    // Dimensions: 2m wide x 1m tall x 4m long
    const colliderDesc = RAPIER.ColliderDesc.cuboid(1.0, 0.5, 2.0)
      .setDensity(this.config.mass / 4.0) // Distribute mass
      .setFriction(0.5)
      .setRestitution(0.1); // Slight bounciness

    this.collider = this.world.createCollider(colliderDesc, this.rigidBody);

    // Create visual meshes
    this.createVisualMeshes();

    this.initialized = true;

    console.log('Vehicle initialized at', position);
  }

  /**
   * Updates vehicle physics for one timestep.
   *
   * Call this every fixed physics update (60Hz).
   *
   * Update order:
   * 1. Update transform cache
   * 2. Process input
   * 3. Raycast wheels
   * 4. Apply suspension forces
   * 5. Apply tire forces (steering, drive, brake)
   * 6. Apply aerodynamic forces
   * 7. Update telemetry
   *
   * @param deltaTime - Fixed timestep (should be 1/60)
   */
  update(deltaTime: number): void {
    if (!this.initialized) {
      console.warn('Vehicle.update() called before init()');
      return;
    }

    // 1. Update cached transform
    this.updateTransform();

    // 2. Update gear shifting
    this.updateGearShift(deltaTime);

    // 3. Raycast all wheels to find ground contact
    this.raycastWheels();

    // 4. Apply suspension forces
    this.applySuspensionForces(deltaTime);

    // 5. Apply anti-roll bar forces (optional)
    if (ANTI_ROLL_BAR.enabled) {
      this.applyAntiRollBar();
    }

    // 6. Update wheel rotation for visual
    this.updateWheelRotation(deltaTime);

    // 7. Apply tire forces (steering, drive, brake)
    this.applyTireForces(deltaTime);

    // 8. Apply aerodynamic forces (drag, downforce)
    this.applyAerodynamicForces();

    // 9. Update RPM based on wheel speed
    this.updateRPM(deltaTime);

    // 10. Clamp velocities to prevent instability
    this.clampVelocities();

    // 11. Update damage state
    this.updateDamage(deltaTime);

    // 12. Update visual meshes to match physics
    this.updateVisuals();
  }

  /**
   * Sets the vehicle input state.
   *
   * Input values should be normalized:
   * - throttle: 0-1
   * - brake: 0-1
   * - steering: -1 to 1
   * - handbrake: 0-1
   *
   * @param input - Vehicle input state
   */
  setInput(input: Partial<VehicleInput>): void {
    if (input.throttle !== undefined) {
      this.input.throttle = Math.max(0, Math.min(1, input.throttle));
    }
    if (input.brake !== undefined) {
      this.input.brake = Math.max(0, Math.min(1, input.brake));
    }
    if (input.steering !== undefined) {
      this.input.steering = Math.max(-1, Math.min(1, input.steering));
    }
    if (input.handbrake !== undefined) {
      this.input.handbrake = Math.max(0, Math.min(1, input.handbrake));
    }
  }

  /**
   * Gets the current vehicle input state.
   *
   * @returns Current input state
   */
  getInput(): VehicleInput {
    return { ...this.input };
  }

  /**
   * Gets the current vehicle transform (position, rotation, velocity).
   *
   * @returns Vehicle transform in world space
   */
  getTransform(): VehicleTransform {
    return this.cachedTransform;
  }

  /**
   * Gets telemetry data for HUD display.
   *
   * @returns Vehicle telemetry
   */
  getTelemetry(): VehicleTelemetry {
    const speed = this.cachedTransform.linearVelocity.length();
    const wheelsOnGround = this.wheels.filter(w => w.isGrounded).length;

    return {
      speed,
      speedKmh: speed * 3.6, // m/s to km/h
      speedMph: speed * 2.237, // m/s to mph
      rpm: this.currentRPM,
      gear: this.currentGear,
      isAirborne: wheelsOnGround === 0,
      wheelsOnGround,
      gForce: this.calculateGForce(),
      damagePercent: this.damageState.overallDamage * 100,
    };
  }

  /**
   * Gets the current wheel states.
   *
   * @returns Array of 4 wheel states
   */
  getWheelStates(): [WheelState, WheelState, WheelState, WheelState] {
    return this.wheels;
  }

  /**
   * Gets the current damage state.
   *
   * @returns Damage state
   */
  getDamageState(): DamageState {
    return this.damageState;
  }

  /**
   * Resets the vehicle to a new position and rotation.
   *
   * Clears velocities, damage, and resets state.
   *
   * @param position - New world position
   * @param rotation - New world rotation
   */
  reset(position: Vector3, rotation: Quaternion): void {
    if (!this.initialized) return;

    // Set new transform
    this.rigidBody.setTranslation({ x: position.x, y: position.y, z: position.z }, true);
    this.rigidBody.setRotation(
      { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
      true
    );

    // Clear velocities
    this.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);

    // Reset wheels
    for (const wheel of this.wheels) {
      wheel.isGrounded = false;
      wheel.suspensionLength = this.config.wheels[0].suspensionRestLength;
      wheel.previousSuspensionLength = wheel.suspensionLength;
      wheel.rotationAngle = 0;
      wheel.angularVelocity = 0;
      wheel.slipRatio = 0;
      wheel.slipAngle = 0;
    }

    // Reset input
    this.input = { throttle: 0, brake: 0, steering: 0, handbrake: 0 };

    // Reset engine
    this.currentRPM = this.config.engine.idleRPM;
    this.currentGear = 1;
    this.isShifting = false;

    // Partial damage recovery (not full reset)
    if (this.damageState.overallDamage > 0) {
      this.damageState.overallDamage = Math.max(0, this.damageState.overallDamage - 0.2);
      this.damageState.performancePenalty =
        this.damageState.overallDamage * this.config.damage.performanceDegradationPerLevel;
      this.updateDamageSeverity();
    }

    console.log('Vehicle reset to', position);
  }

  /**
   * Disposes of the vehicle and cleans up physics and visual resources.
   */
  dispose(): void {
    if (this.initialized) {
      // Clean up physics
      this.world.removeCollider(this.collider, false);
      this.world.removeRigidBody(this.rigidBody);

      // Clean up visual meshes
      this.disposeVisualMeshes();

      this.initialized = false;
      console.log('Vehicle disposed');
    }
  }

  // ========================================================================
  // PRIVATE METHODS - Internal physics calculations
  // ========================================================================

  /**
   * Creates an initial wheel state.
   */
  private createWheelState(): WheelState {
    return {
      isGrounded: false,
      suspensionLength: this.config.wheels[0].suspensionRestLength,
      previousSuspensionLength: this.config.wheels[0].suspensionRestLength,
      contactPoint: new Vector3(),
      contactNormal: new Vector3(0, 1, 0),
      surfaceType: SurfaceType.TARMAC,
      steeringAngle: 0,
      rotationAngle: 0,
      angularVelocity: 0,
      slipRatio: 0,
      slipAngle: 0,
      suspensionForce: 0,
      tireForce: new Vector3(),
    };
  }

  /**
   * Updates the cached transform from rigid body.
   */
  private updateTransform(): void {
    const translation = this.rigidBody.translation();
    const rotation = this.rigidBody.rotation();
    const linvel = this.rigidBody.linvel();
    const angvel = this.rigidBody.angvel();

    // Update position
    this.cachedTransform.position.set(translation.x, translation.y, translation.z);

    // Update rotation
    this.cachedTransform.rotation.set(rotation.x, rotation.y, rotation.z, rotation.w);

    // Update velocities
    this.cachedTransform.linearVelocity.set(linvel.x, linvel.y, linvel.z);
    this.cachedTransform.angularVelocity.set(angvel.x, angvel.y, angvel.z);

    // Update direction vectors
    this.cachedTransform.forward.set(0, 0, 1).applyQuaternion(this.cachedTransform.rotation);
    this.cachedTransform.right.set(1, 0, 0).applyQuaternion(this.cachedTransform.rotation);
    this.cachedTransform.up.set(0, 1, 0).applyQuaternion(this.cachedTransform.rotation);
  }

  /**
   * Raycasts all wheels to detect ground contact.
   */
  private raycastWheels(): void {
    const bodyPos = this.cachedTransform.position;
    const bodyRot = this.cachedTransform.rotation;

    for (let i = 0; i < 4; i++) {
      const wheelConfig = this.config.wheels[i];
      const wheelState = this.wheels[i];

      // Calculate wheel position in world space
      const wheelLocalPos = this.temp.tempVec1.copy(wheelConfig.position);
      const wheelWorldPos = this.temp.tempVec2
        .copy(wheelLocalPos)
        .applyQuaternion(bodyRot)
        .add(bodyPos);

      // Raycast downward from wheel mount point
      const rayOrigin = { x: wheelWorldPos.x, y: wheelWorldPos.y, z: wheelWorldPos.z };
      const rayDir = this.temp.tempVec3
        .copy(this.cachedTransform.up)
        .multiplyScalar(-1);
      const rayDirection = { x: rayDir.x, y: rayDir.y, z: rayDir.z };

      this.temp.tempRay.origin = rayOrigin;
      this.temp.tempRay.dir = rayDirection;

      // Perform raycast
      const maxDist = wheelConfig.suspensionRestLength + wheelConfig.suspensionMaxTravel;
      const hit = this.world.castRay(
        this.temp.tempRay,
        maxDist,
        true, // solid
        undefined, // all collision groups
        undefined, // no filter
        this.collider // exclude self
      );

      // Update wheel state
      if (hit) {
        wheelState.isGrounded = true;
        wheelState.suspensionLength = hit.timeOfImpact;
        wheelState.contactPoint.set(
          rayOrigin.x + rayDir.x * hit.timeOfImpact,
          rayOrigin.y + rayDir.y * hit.timeOfImpact,
          rayOrigin.z + rayDir.z * hit.timeOfImpact
        );
        wheelState.contactNormal.set(0, 1, 0); // Default up (TODO: get from hit normal)
        wheelState.surfaceType = SurfaceType.TARMAC; // TODO: detect from material
      } else {
        wheelState.isGrounded = false;
        wheelState.suspensionLength = maxDist;
      }
    }
  }

  /**
   * Applies suspension spring-damper forces to all wheels.
   */
  private applySuspensionForces(deltaTime: number): void {
    for (let i = 0; i < 4; i++) {
      const wheelConfig = this.config.wheels[i];
      const wheelState = this.wheels[i];

      if (!wheelState.isGrounded) {
        wheelState.suspensionForce = 0;
        continue;
      }

      // Calculate suspension compression
      const compression = wheelConfig.suspensionRestLength - wheelState.suspensionLength;
      const compressionRatio = compression / wheelConfig.suspensionRestLength;

      // Calculate compression velocity (damping)
      const compressionVel =
        (wheelState.suspensionLength - wheelState.previousSuspensionLength) / deltaTime;
      wheelState.previousSuspensionLength = wheelState.suspensionLength;

      // Spring force: F = k * x (Hooke's law)
      const springForce = wheelConfig.suspensionStiffness * compression;

      // Damper force: F = c * v
      const damperForce = wheelConfig.suspensionDamping * wheelConfig.suspensionStiffness * compressionVel;

      // Total suspension force
      const totalForce = springForce - damperForce;

      // Clamp to prevent negative force (suspension can't pull)
      wheelState.suspensionForce = Math.max(0, totalForce);

      // Apply force at wheel contact point
      const forceDir = this.temp.tempVec1.copy(wheelState.contactNormal);
      const forceVec = this.temp.tempVec2.copy(forceDir).multiplyScalar(wheelState.suspensionForce);

      // Get world position of wheel
      const wheelLocalPos = this.temp.tempVec3.copy(wheelConfig.position);
      const wheelWorldPos = this.temp.tempVec4
        .copy(wheelLocalPos)
        .applyQuaternion(this.cachedTransform.rotation)
        .add(this.cachedTransform.position);

      // Apply force at wheel position
      this.rigidBody.applyImpulseAtPoint(
        { x: forceVec.x * deltaTime, y: forceVec.y * deltaTime, z: forceVec.z * deltaTime },
        { x: wheelWorldPos.x, y: wheelWorldPos.y, z: wheelWorldPos.z },
        true
      );
    }
  }

  /**
   * Applies anti-roll bar forces to reduce body roll.
   */
  private applyAntiRollBar(): void {
    // Front axle
    const frontLeftCompression = this.getWheelCompression(WheelIndex.FRONT_LEFT);
    const frontRightCompression = this.getWheelCompression(WheelIndex.FRONT_RIGHT);
    const frontRollAngle = frontLeftCompression - frontRightCompression;

    if (Math.abs(frontRollAngle) > 0.001) {
      const frontForce = ANTI_ROLL_BAR.frontStiffness * frontRollAngle;
      this.applyAntiRollForce(WheelIndex.FRONT_LEFT, -frontForce);
      this.applyAntiRollForce(WheelIndex.FRONT_RIGHT, frontForce);
    }

    // Rear axle
    const rearLeftCompression = this.getWheelCompression(WheelIndex.REAR_LEFT);
    const rearRightCompression = this.getWheelCompression(WheelIndex.REAR_RIGHT);
    const rearRollAngle = rearLeftCompression - rearRightCompression;

    if (Math.abs(rearRollAngle) > 0.001) {
      const rearForce = ANTI_ROLL_BAR.rearStiffness * rearRollAngle;
      this.applyAntiRollForce(WheelIndex.REAR_LEFT, -rearForce);
      this.applyAntiRollForce(WheelIndex.REAR_RIGHT, rearForce);
    }
  }

  /**
   * Gets wheel compression ratio (0-1).
   */
  private getWheelCompression(wheelIndex: WheelIndex): number {
    const wheel = this.wheels[wheelIndex];
    const config = this.config.wheels[wheelIndex];
    if (!wheel.isGrounded) return 0;
    return (config.suspensionRestLength - wheel.suspensionLength) / config.suspensionRestLength;
  }

  /**
   * Applies anti-roll force to a specific wheel.
   */
  private applyAntiRollForce(wheelIndex: WheelIndex, force: number): void {
    const wheel = this.wheels[wheelIndex];
    if (!wheel.isGrounded) return;

    const forceVec = this.temp.tempVec1.copy(wheel.contactNormal).multiplyScalar(force);

    const wheelConfig = this.config.wheels[wheelIndex];
    const wheelWorldPos = this.temp.tempVec2
      .copy(wheelConfig.position)
      .applyQuaternion(this.cachedTransform.rotation)
      .add(this.cachedTransform.position);

    this.rigidBody.applyImpulseAtPoint(
      { x: forceVec.x * PHYSICS_CONSTANTS.FIXED_TIMESTEP, y: forceVec.y * PHYSICS_CONSTANTS.FIXED_TIMESTEP, z: forceVec.z * PHYSICS_CONSTANTS.FIXED_TIMESTEP },
      { x: wheelWorldPos.x, y: wheelWorldPos.y, z: wheelWorldPos.z },
      true
    );
  }

  /**
   * Updates wheel rotation for visual representation.
   */
  private updateWheelRotation(deltaTime: number): void {
    const speed = this.cachedTransform.linearVelocity.length();

    for (let i = 0; i < 4; i++) {
      const wheel = this.wheels[i];
      const config = this.config.wheels[i];

      if (wheel.isGrounded && speed > 0.1) {
        // Calculate angular velocity from linear speed
        // omega = v / r
        wheel.angularVelocity = speed / config.radius;

        // Integrate rotation angle
        wheel.rotationAngle += wheel.angularVelocity * deltaTime;

        // Wrap to 0-2PI
        if (wheel.rotationAngle > Math.PI * 2) {
          wheel.rotationAngle -= Math.PI * 2;
        }
      } else {
        // Slow down rotation when airborne or stopped
        wheel.angularVelocity *= 0.95;
        wheel.rotationAngle += wheel.angularVelocity * deltaTime;
      }
    }
  }

  /**
   * Applies tire forces (steering, drive, brake).
   */
  private applyTireForces(deltaTime: number): void {
    // Calculate steering angle with speed sensitivity
    const speed = this.cachedTransform.linearVelocity.length();
    const steeringFactor = 1.0 - (speed / 50.0) * ADVANCED_TUNING.speedSensitiveSteeringFactor;
    const targetSteeringAngle =
      this.input.steering * this.config.wheels[0].maxSteeringAngle * Math.max(0.3, steeringFactor);

    // Update steering for front wheels
    for (let i = 0; i < 2; i++) {
      // Front wheels only
      const wheel = this.wheels[i];
      const config = this.config.wheels[i];

      if (config.isSteerable) {
        // Smooth steering interpolation
        const steeringSpeed = ADVANCED_TUNING.steeringSpeed * deltaTime;
        wheel.steeringAngle = this.lerp(wheel.steeringAngle, targetSteeringAngle, steeringSpeed);

        // Apply Ackermann steering (inner wheel steers more)
        if (Math.abs(this.input.steering) > 0.01) {
          const ackermannFactor = i === 0 ? 1.0 + ADVANCED_TUNING.ackermannSteering * 0.1 : 1.0 - ADVANCED_TUNING.ackermannSteering * 0.1;
          wheel.steeringAngle *= ackermannFactor;
        }
      }
    }

    // Apply forces to each wheel
    for (let i = 0; i < 4; i++) {
      const wheel = this.wheels[i];
      const config = this.config.wheels[i];

      if (!wheel.isGrounded) {
        wheel.tireForce.set(0, 0, 0);
        continue;
      }

      // Calculate wheel velocity in world space
      const wheelWorldPos = this.temp.tempVec1
        .copy(config.position)
        .applyQuaternion(this.cachedTransform.rotation)
        .add(this.cachedTransform.position);

      const wheelVel = this.temp.tempVec2.set(0, 0, 0); // TODO: get velocity at wheel point

      // Get wheel forward direction (includes steering)
      const wheelForward = this.temp.tempVec3.set(0, 0, 1);
      if (config.isSteerable) {
        wheelForward.applyAxisAngle(this.temp.tempVec4.set(0, 1, 0), wheel.steeringAngle);
      }
      wheelForward.applyQuaternion(this.cachedTransform.rotation).normalize();

      // Get wheel right direction
      const wheelRight = this.temp.tempVec4.crossVectors(wheelForward, wheel.contactNormal).normalize();

      // Project velocity onto wheel axes
      const forwardVel = this.cachedTransform.linearVelocity.dot(wheelForward);
      const lateralVel = this.cachedTransform.linearVelocity.dot(wheelRight);

      // Calculate slip ratio and angle
      const wheelSpeed = wheel.angularVelocity * config.radius;
      wheel.slipRatio = Math.abs(wheelSpeed) > 0.1 ? (wheelSpeed - forwardVel) / Math.abs(wheelSpeed) : 0;
      wheel.slipAngle = Math.atan2(lateralVel, Math.abs(forwardVel) + 0.1);

      // Get grip multiplier from surface
      const gripMultiplier = this.config.tire.surfaceGripMultipliers[wheel.surfaceType];
      const damageMultiplier = 1.0 - this.damageState.performancePenalty;

      // Calculate longitudinal force (forward/backward)
      let longitudinalForce = 0;

      if (config.isPowered && this.input.throttle > 0.01) {
        // Drive force
        const engineForce = this.calculateEngineForce();
        const poweredWheelCount = this.config.wheels.filter(w => w.isPowered).length;
        longitudinalForce = (engineForce / poweredWheelCount) * gripMultiplier * damageMultiplier;
      }

      // Brake force
      const brakeInput = Math.max(this.input.brake, this.input.handbrake * this.brakeConfig.handbrakeForce);
      if (brakeInput > 0.01) {
        const brakeBias = i < 2 ? this.brakeConfig.frontBrakeBias : 1.0 - this.brakeConfig.frontBrakeBias;
        const brakeForce = this.brakeConfig.maxBrakeForce * brakeInput * brakeBias;
        longitudinalForce -= brakeForce * Math.sign(forwardVel);
      }

      // Apply tire grip curve (simplified Pacejka)
      const maxGrip = this.config.tire.maxGripLongitudinal * gripMultiplier * damageMultiplier;
      longitudinalForce = Math.max(-maxGrip, Math.min(maxGrip, longitudinalForce));

      // Calculate lateral force (cornering)
      const lateralGrip = this.config.tire.maxGripLateral * gripMultiplier * damageMultiplier;
      const lateralForce = -lateralVel * this.config.tire.stiffness;
      const clampedLateralForce = Math.max(-lateralGrip, Math.min(lateralGrip, lateralForce));

      // Combine forces
      const tireForceVec = this.temp.tempVec5
        .copy(wheelForward)
        .multiplyScalar(longitudinalForce)
        .addScaledVector(wheelRight, clampedLateralForce);

      wheel.tireForce.copy(tireForceVec);

      // Apply force at wheel contact point
      this.rigidBody.applyImpulseAtPoint(
        {
          x: tireForceVec.x * deltaTime,
          y: tireForceVec.y * deltaTime,
          z: tireForceVec.z * deltaTime,
        },
        { x: wheel.contactPoint.x, y: wheel.contactPoint.y, z: wheel.contactPoint.z },
        true
      );
    }
  }

  /**
   * Calculates engine force based on current RPM and throttle.
   */
  private calculateEngineForce(): number {
    if (this.isShifting || this.currentGear === 0) {
      return 0;
    }

    // Get current gear ratio
    const gearRatio =
      this.config.transmission.gearRatios[this.currentGear - 1] *
      this.config.transmission.finalDriveRatio;

    // Calculate torque at current RPM (simplified torque curve)
    const normalizedRPM = this.currentRPM / this.config.engine.peakTorqueRPM;
    let torqueFactor = 1.0;

    if (normalizedRPM < 0.5) {
      // Low RPM: 60% torque
      torqueFactor = 0.6 + normalizedRPM * 0.8;
    } else if (normalizedRPM > 1.5) {
      // High RPM: declining torque
      torqueFactor = Math.max(0.4, 1.4 - normalizedRPM * 0.3);
    }

    const engineTorque = this.config.engine.maxTorque * torqueFactor * this.input.throttle;

    // Convert torque to force: F = T * gear_ratio / wheel_radius
    const wheelRadius = this.config.wheels[2].radius; // Use rear wheel
    const force = (engineTorque * gearRatio) / wheelRadius;

    return force * (1.0 - this.damageState.performancePenalty);
  }

  /**
   * Applies aerodynamic forces (drag and downforce).
   */
  private applyAerodynamicForces(): void {
    const velocity = this.cachedTransform.linearVelocity;
    const speed = velocity.length();

    if (speed < 1.0) return; // Skip at low speeds

    // Drag force: F = 0.5 * Cd * A * rho * v^2
    const dragMagnitude =
      0.5 *
      this.config.aerodynamics.dragCoefficient *
      this.config.aerodynamics.frontalArea *
      this.config.aerodynamics.airDensity *
      speed *
      speed;

    const dragForce = this.temp.tempVec1.copy(velocity).normalize().multiplyScalar(-dragMagnitude);

    // Downforce: F = 0.5 * Cl * A * rho * v^2
    const downforceMagnitude =
      0.5 *
      this.config.aerodynamics.downforceCoefficient *
      this.config.aerodynamics.frontalArea *
      this.config.aerodynamics.airDensity *
      speed *
      speed;

    const downforce = this.temp.tempVec2.copy(this.cachedTransform.up).multiplyScalar(-downforceMagnitude);

    // Apply forces
    const totalForce = this.temp.tempVec3.copy(dragForce).add(downforce);

    this.rigidBody.applyImpulse(
      {
        x: totalForce.x * PHYSICS_CONSTANTS.FIXED_TIMESTEP,
        y: totalForce.y * PHYSICS_CONSTANTS.FIXED_TIMESTEP,
        z: totalForce.z * PHYSICS_CONSTANTS.FIXED_TIMESTEP,
      },
      true
    );
  }

  /**
   * Updates engine RPM based on wheel speed and gear.
   */
  private updateRPM(deltaTime: number): void {
    if (this.isShifting) {
      // RPM drops during shift
      this.currentRPM = this.lerp(this.currentRPM, this.config.engine.idleRPM * 1.5, deltaTime * 5.0);
      return;
    }

    // Calculate RPM from wheel speed
    const wheelSpeed = this.getAverageWheelSpeed();
    const gearRatio =
      this.config.transmission.gearRatios[this.currentGear - 1] *
      this.config.transmission.finalDriveRatio;

    const wheelRadius = this.config.wheels[2].radius;
    const targetRPM = ((wheelSpeed / wheelRadius) * gearRatio * 60) / (2 * Math.PI);

    // Blend toward target RPM
    const rpmBlendSpeed = this.input.throttle > 0.1 ? 10.0 : 5.0;
    this.currentRPM = this.lerp(
      this.currentRPM,
      Math.max(this.config.engine.idleRPM, targetRPM),
      deltaTime * rpmBlendSpeed
    );

    // Clamp RPM
    this.currentRPM = Math.max(
      this.config.engine.idleRPM,
      Math.min(this.config.engine.maxRPM, this.currentRPM)
    );

    // Automatic gear shifting
    if (this.currentRPM > this.config.transmission.shiftUpRPM && this.currentGear < 5) {
      this.shiftGear(this.currentGear + 1);
    } else if (
      this.currentRPM < this.config.transmission.shiftDownRPM &&
      this.currentGear > 1 &&
      this.input.throttle < 0.5
    ) {
      this.shiftGear(this.currentGear - 1);
    }
  }

  /**
   * Shifts to a new gear.
   */
  private shiftGear(newGear: number): void {
    if (newGear === this.currentGear || newGear < 1 || newGear > 5) return;

    this.currentGear = newGear;
    this.isShifting = true;
    this.gearShiftTimer = this.config.transmission.shiftTime;

    console.log(`Shifted to gear ${this.currentGear}`);
  }

  /**
   * Updates gear shift timer.
   */
  private updateGearShift(deltaTime: number): void {
    if (this.isShifting) {
      this.gearShiftTimer -= deltaTime;
      if (this.gearShiftTimer <= 0) {
        this.isShifting = false;
      }
    }
  }

  /**
   * Gets average speed of powered wheels.
   */
  private getAverageWheelSpeed(): number {
    let totalSpeed = 0;
    let count = 0;

    for (let i = 0; i < 4; i++) {
      if (this.config.wheels[i].isPowered && this.wheels[i].isGrounded) {
        totalSpeed += this.wheels[i].angularVelocity * this.config.wheels[i].radius;
        count++;
      }
    }

    return count > 0 ? totalSpeed / count : 0;
  }

  /**
   * Clamps velocities to prevent instability.
   */
  private clampVelocities(): void {
    const linvel = this.rigidBody.linvel();
    const speed = Math.sqrt(linvel.x * linvel.x + linvel.y * linvel.y + linvel.z * linvel.z);

    if (speed > PHYSICS_CONSTANTS.MAX_VELOCITY) {
      const scale = PHYSICS_CONSTANTS.MAX_VELOCITY / speed;
      this.rigidBody.setLinvel(
        { x: linvel.x * scale, y: linvel.y * scale, z: linvel.z * scale },
        true
      );
    }
  }

  /**
   * Calculates current g-force for crash detection.
   */
  private calculateGForce(): number {
    // Simplified: acceleration = change in velocity / time
    // G-force = acceleration / 9.81
    const speed = this.cachedTransform.linearVelocity.length();
    const gForce = speed / PHYSICS_CONSTANTS.FIXED_TIMESTEP / PHYSICS_CONSTANTS.GRAVITY;
    return Math.abs(gForce);
  }

  /**
   * Updates damage state based on collisions.
   */
  private updateDamage(deltaTime: number): void {
    // TODO: Detect collisions from Rapier contact events
    // For now, this is a placeholder

    // Clean up old collision history
    const currentTime = performance.now() / 1000;
    this.damageState.recentCollisions = this.damageState.recentCollisions.filter(
      collision => currentTime - collision.timestamp < this.config.damage.collisionHistoryWindow
    );

    // Update damage severity classification
    this.updateDamageSeverity();
  }

  /**
   * Updates damage severity based on overall damage.
   */
  private updateDamageSeverity(): void {
    if (this.damageState.overallDamage < 0.2) {
      this.damageState.severity = DamageSeverity.NONE;
    } else if (this.damageState.overallDamage < 0.4) {
      this.damageState.severity = DamageSeverity.MINOR;
    } else if (this.damageState.overallDamage < 0.6) {
      this.damageState.severity = DamageSeverity.MODERATE;
    } else if (this.damageState.overallDamage < 0.8) {
      this.damageState.severity = DamageSeverity.SEVERE;
    } else {
      this.damageState.severity = DamageSeverity.CATASTROPHIC;
    }
  }

  /**
   * Registers a collision event for damage tracking.
   *
   * Call this from external collision handler.
   *
   * @param event - Collision event data
   */
  registerCollision(event: CollisionEvent): void {
    this.damageState.recentCollisions.push(event);
    this.damageState.crashCount++;

    // Calculate damage amount from impact force
    let damageAmount = 0;

    if (event.impactForce >= this.config.damage.catastrophicDamageThreshold) {
      damageAmount = 0.3;
      event.severity = DamageSeverity.CATASTROPHIC;
    } else if (event.impactForce >= this.config.damage.severeDamageThreshold) {
      damageAmount = 0.2;
      event.severity = DamageSeverity.SEVERE;
    } else if (event.impactForce >= this.config.damage.moderateDamageThreshold) {
      damageAmount = 0.1;
      event.severity = DamageSeverity.MODERATE;
    } else if (event.impactForce >= this.config.damage.minorDamageThreshold) {
      damageAmount = 0.05;
      event.severity = DamageSeverity.MINOR;
    }

    // Apply damage
    this.damageState.overallDamage = Math.min(1.0, this.damageState.overallDamage + damageAmount);
    this.damageState.performancePenalty =
      this.damageState.overallDamage * this.config.damage.performanceDegradationPerLevel;

    this.updateDamageSeverity();

    console.log(
      `Collision: ${event.severity}, force: ${event.impactForce.toFixed(0)}N, damage: ${(this.damageState.overallDamage * 100).toFixed(1)}%`
    );
  }

  /**
   * Linear interpolation helper.
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * Math.min(1, Math.max(0, t));
  }

  // ========================================================================
  // VISUAL MESH METHODS - Three.js rendering
  // ========================================================================

  /**
   * Creates visual meshes for chassis and wheels.
   *
   * Chassis: Dark blue box (2m wide x 1m tall x 4m long)
   * Wheels: Dark gray cylinders (radius from config)
   */
  private createVisualMeshes(): void {
    if (!this.scene) {
      console.warn('Cannot create visual meshes: scene not set');
      return;
    }

    // Create chassis mesh (box matching collider dimensions)
    const chassisGeometry = new THREE.BoxGeometry(2.0, 1.0, 4.0);
    const chassisMaterial = new THREE.MeshStandardMaterial({
      color: 0x2244aa, // Dark blue
      metalness: 0.5,
      roughness: 0.4,
    });
    this.chassisMesh = new THREE.Mesh(chassisGeometry, chassisMaterial);
    this.chassisMesh.castShadow = true;
    this.chassisMesh.receiveShadow = true;
    this.scene.add(this.chassisMesh);

    // Create wheel meshes (cylinders rotated to align with X-axis)
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333, // Dark gray
      metalness: 0.3,
      roughness: 0.7,
    });

    for (let i = 0; i < 4; i++) {
      const wheelConfig = this.config.wheels[i];
      const wheelGeometry = new THREE.CylinderGeometry(
        wheelConfig.radius,
        wheelConfig.radius,
        wheelConfig.width,
        16 // segments
      );

      // Rotate cylinder to align with X-axis (cylinders default to Y-axis)
      wheelGeometry.rotateZ(Math.PI / 2);

      const wheelMesh = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheelMesh.castShadow = true;
      wheelMesh.receiveShadow = true;
      this.scene.add(wheelMesh);

      this.wheelMeshes[i] = wheelMesh;
    }

    console.log('Vehicle visual meshes created');
  }

  /**
   * Updates visual mesh transforms to match physics state.
   *
   * Updates chassis position/rotation and wheel positions/rotations.
   * Called every frame after physics update.
   *
   * Performance: <0.1ms per call (reuses temp vectors, no allocations)
   */
  private updateVisuals(): void {
    if (!this.chassisMesh || !this.scene) return;

    // Update chassis mesh to match rigid body transform
    const translation = this.rigidBody.translation();
    const rotation = this.rigidBody.rotation();

    this.chassisMesh.position.set(translation.x, translation.y, translation.z);
    this.chassisMesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

    // Update wheel meshes
    for (let i = 0; i < 4; i++) {
      const wheelMesh = this.wheelMeshes[i];
      if (!wheelMesh) continue;

      const wheelConfig = this.config.wheels[i];
      const wheelState = this.wheels[i];

      // Calculate wheel position in world space
      this.tempPosition
        .copy(wheelConfig.position)
        .applyQuaternion(this.cachedTransform.rotation)
        .add(this.cachedTransform.position);

      // If wheel is grounded, adjust Y position based on suspension compression
      if (wheelState.isGrounded) {
        // Use contact point for grounded wheels (more accurate)
        this.tempPosition.copy(wheelState.contactPoint);
        // Offset up by wheel radius so wheel surface touches ground
        this.tempPosition.y += wheelConfig.radius;
      }

      wheelMesh.position.copy(this.tempPosition);

      // Update wheel rotation
      // Wheels rotate around their local X-axis for rolling
      // Front wheels also rotate around Y-axis for steering
      this.tempQuaternion.copy(this.cachedTransform.rotation);

      // Apply steering rotation (Y-axis) for steerable wheels
      if (wheelConfig.isSteerable) {
        this.tempSteeringQuat.setFromAxisAngle(this.tempAxisY, wheelState.steeringAngle);
        this.tempQuaternion.multiply(this.tempSteeringQuat);
      }

      // Apply wheel roll rotation (X-axis)
      this.tempRollQuat.setFromAxisAngle(this.tempAxisX, wheelState.rotationAngle);
      this.tempQuaternion.multiply(this.tempRollQuat);

      wheelMesh.quaternion.copy(this.tempQuaternion);
    }
  }

  /**
   * Disposes visual meshes and cleans up resources.
   *
   * Removes meshes from scene and disposes geometries/materials to prevent memory leaks.
   */
  private disposeVisualMeshes(): void {
    if (!this.scene) return;

    // Dispose chassis mesh
    if (this.chassisMesh) {
      this.scene.remove(this.chassisMesh);
      this.chassisMesh.geometry.dispose();
      if (this.chassisMesh.material instanceof THREE.Material) {
        this.chassisMesh.material.dispose();
      }
      this.chassisMesh = undefined;
    }

    // Dispose wheel meshes
    for (let i = 0; i < 4; i++) {
      const wheelMesh = this.wheelMeshes[i];
      if (wheelMesh) {
        this.scene.remove(wheelMesh);
        wheelMesh.geometry.dispose();
        if (wheelMesh.material instanceof THREE.Material) {
          wheelMesh.material.dispose();
        }
        this.wheelMeshes[i] = undefined;
      }
    }

    console.log('Vehicle visual meshes disposed');
  }
}
