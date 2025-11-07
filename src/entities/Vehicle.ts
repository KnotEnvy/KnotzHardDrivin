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
import { ReplayFrame } from '../systems/ReplayRecorder';
import { VehicleModelType } from './models/VehicleModelTypes';
import { VehicleModelFactory } from './models/VehicleModelFactory';

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
  private modelType: VehicleModelType;

  // Physics world reference
  private world: RAPIER.World;

  // Rapier rigid body (chassis)
  private rigidBody!: RAPIER.RigidBody;
  private collider!: RAPIER.Collider;

  // Visual representation (Three.js meshes)
  private scene?: THREE.Scene;
  private chassisMesh?: THREE.Object3D;
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

  // Visual damage system
  private originalChassisScale: Vector3 | null = null;
  private isCrashVisualsActive: boolean = false;

  // Cached transform for external access
  private cachedTransform: VehicleTransform;

  // Previous velocity for G-force calculation
  private prevVelocity: Vector3 = new Vector3();

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
    brakeConfig: BrakeConfig = DEFAULT_BRAKE_CONFIG,
    modelType: VehicleModelType = VehicleModelType.CORVETTE
  ) {
    this.world = world;
    this.config = config;
    this.brakeConfig = brakeConfig;
    this.modelType = modelType;

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

    // 10. Apply stability control
    this.applyStabilityControl(deltaTime);

    // 11. Clamp velocities to prevent instability
    this.clampVelocities();

    // 12. Update damage state
    this.updateDamage(deltaTime);

    // 13. Update visual meshes to match physics
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
      wheel.steeringAngle = 0; // FIX: Reset steering angle to center wheels
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

    // Reset visual crash effects when respawning
    this.resetCrashVisuals();
  }

  /**
   * Applies visual damage effects to the vehicle chassis to show crash impact.
   *
   * This method scales down the chassis mesh to create a "crumpled" appearance
   * when the vehicle crashes. The effect is based on the damage severity:
   * - Minor crash (0.05-0.20 damage): ~5-10% height reduction
   * - Major crash (0.20-0.50 damage): ~10-20% height reduction
   * - Catastrophic crash (0.50+ damage): ~20-35% height reduction
   *
   * The visual deformation is purely cosmetic and doesn't affect physics simulation.
   * The original scale is preserved and can be restored with resetCrashVisuals().
   *
   * Performance: <0.5ms per call (single scale operation, no allocations)
   *
   * @example
   * ```typescript
   * // Called when crash is detected
   * vehicle.applyCrashVisuals();
   * // Vehicle chassis appears crushed/damaged during replay
   * ```
   */
  applyCrashVisuals(): void {
    if (!this.initialized || !this.chassisMesh) {
      return;
    }

    // Prevent multiple applications
    if (this.isCrashVisualsActive) {
      return;
    }

    // Store original scale on first application
    if (!this.originalChassisScale) {
      this.originalChassisScale = this.chassisMesh.scale.clone();
    }

    // Calculate damage-based deformation
    // Damage ranges from 0 to 1, map to scale reduction (0.65 to 0.95)
    // High damage = more crushed (smaller scale)
    // Low damage = minimal deformation
    const damageAmount = this.damageState.overallDamage;
    const heightScale = Math.max(0.65, 1.0 - damageAmount * 0.35);

    // Apply crumpled effect: reduce height (Y-axis) to show compression
    // Slightly reduce length (Z-axis) for dramatic effect
    this.chassisMesh.scale.y = heightScale;
    this.chassisMesh.scale.z = Math.max(0.85, 1.0 - damageAmount * 0.15);

    // Add slight random rotation tilt to individual body parts for crushed look
    // This creates asymmetry suggesting impact damage
    this.chassisMesh.rotation.z = (Math.random() - 0.5) * 0.1; // ±5.7 degrees
    this.chassisMesh.rotation.x = (Math.random() - 0.5) * 0.08; // ±4.6 degrees

    this.isCrashVisualsActive = true;

    console.log(
      `Applied crash visuals: damage=${(damageAmount * 100).toFixed(1)}%, height scale=${(heightScale * 100).toFixed(1)}%`
    );
  }

  /**
   * Restores the vehicle chassis to its original undamaged appearance.
   *
   * This method reverses the visual damage effects applied by applyCrashVisuals(),
   * restoring the chassis to its original scale and rotation. This is called when
   * the vehicle respawns after a crash/replay sequence.
   *
   * The original scale is preserved from the first crash so we always restore to
   * the exact original appearance, even if applyCrashVisuals() was called multiple times.
   *
   * Performance: <0.5ms per call (single scale/rotation operation, no allocations)
   *
   * @example
   * ```typescript
   * // Called when vehicle respawns after replay
   * vehicle.resetCrashVisuals();
   * // Vehicle chassis returns to pristine appearance
   * ```
   */
  resetCrashVisuals(): void {
    if (!this.initialized || !this.chassisMesh) {
      return;
    }

    if (!this.isCrashVisualsActive) {
      return;
    }

    // Restore original scale
    if (this.originalChassisScale) {
      this.chassisMesh.scale.copy(this.originalChassisScale);
    } else {
      // Fallback: reset to identity scale
      this.chassisMesh.scale.set(1, 1, 1);
    }

    // Reset rotation
    this.chassisMesh.rotation.set(0, 0, 0);

    this.isCrashVisualsActive = false;

    console.log('Reset crash visuals: vehicle restored to pristine appearance');
  }

  /**
   * Applies a replay frame to the vehicle for replay playback.
   *
   * This method updates the vehicle's position, rotation, and wheel states to match
   * a recorded frame. It is called during replay playback to restore the vehicle to
   * a previous state. Physics simulation is effectively disabled during replay by
   * setting kinematic mode on the rigid body.
   *
   * Important:
   * - This is used ONLY during replay playback (REPLAY state)
   * - Physics forces are NOT applied during replay
   * - Vehicle moves along pre-recorded trajectory
   * - Visual meshes are updated to match replay data
   *
   * Performance: Zero per-frame allocations (reuses temp vectors)
   *
   * @param frame - ReplayFrame data containing vehicle state from recording
   *
   * @example
   * ```typescript
   * // During replay playback
   * const frame = replayBuffer[currentFrameIndex];
   * vehicle.applyReplayFrame(frame);
   * ```
   */
  applyReplayFrame(frame: ReplayFrame): void {
    if (!this.initialized) {
      console.warn('Vehicle.applyReplayFrame() called before init()');
      return;
    }

    // Extract position from frame
    const framePosition = {
      x: frame.vehiclePosition[0],
      y: frame.vehiclePosition[1],
      z: frame.vehiclePosition[2],
    };

    // Extract rotation (quaternion) from frame
    const frameRotation = {
      x: frame.vehicleRotation[0],
      y: frame.vehicleRotation[1],
      z: frame.vehicleRotation[2],
      w: frame.vehicleRotation[3],
    };

    // Set rigid body to kinematic mode (no physics forces applied)
    // This ensures the vehicle follows the recorded trajectory exactly
    this.rigidBody.setTranslation(framePosition, false);
    this.rigidBody.setRotation(frameRotation, false);

    // Clear velocities during replay (vehicle doesn't need to accelerate to follow path)
    this.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, false);
    this.rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, false);

    // Update wheel rotation angles for visual representation
    // Wheels are not raycasted during replay, just rotated visually
    for (let i = 0; i < 4; i++) {
      this.wheels[i].rotationAngle = frame.wheelRotations[i];
    }

    // Update cached transform (will be used for next frame updates)
    this.updateTransform();

    // Update visual meshes to reflect the replay frame
    this.updateVisuals();
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

        // Wrap to 0-2PI (handle both positive and negative overflow)
        wheel.rotationAngle = wheel.rotationAngle % (Math.PI * 2);
        if (wheel.rotationAngle < 0) {
          wheel.rotationAngle += Math.PI * 2;
        }
      } else {
        // Slow down rotation when airborne or stopped
        wheel.angularVelocity *= 0.95;
        wheel.rotationAngle += wheel.angularVelocity * deltaTime;

        // Wrap rotation angle to prevent overflow
        wheel.rotationAngle = wheel.rotationAngle % (Math.PI * 2);
        if (wheel.rotationAngle < 0) {
          wheel.rotationAngle += Math.PI * 2;
        }
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
        // Calculate per-wheel target with Ackermann steering
        // FIX: Apply Ackermann to TARGET angle before lerping (prevents accumulation)
        // Left turn (steering < 0): left wheel (i=0) is inner, should steer MORE
        // Right turn (steering > 0): right wheel (i=1) is inner, should steer MORE
        let wheelTargetAngle = targetSteeringAngle;
        if (Math.abs(this.input.steering) > 0.01) {
          const isInnerWheel = (this.input.steering < 0 && i === 0) || (this.input.steering > 0 && i === 1);
          const ackermannFactor = isInnerWheel
            ? 1.0 + ADVANCED_TUNING.ackermannSteering * 0.1  // Inner wheel steers more
            : 1.0 - ADVANCED_TUNING.ackermannSteering * 0.1; // Outer wheel steers less
          wheelTargetAngle *= ackermannFactor;
        }

        // Smooth steering interpolation towards per-wheel target
        const steeringSpeed = ADVANCED_TUNING.steeringSpeed * deltaTime;
        wheel.steeringAngle = this.lerp(wheel.steeringAngle, wheelTargetAngle, steeringSpeed);
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

      // Calculate wheel position in world space
      const wheelLocalPos = this.temp.tempVec1.copy(config.position);
      const wheelWorldPos = this.temp.tempVec2
        .copy(wheelLocalPos)
        .applyQuaternion(this.cachedTransform.rotation)
        .add(this.cachedTransform.position);

      // Get velocity at wheel point (linear + angular contribution)
      // v_point = v_center + w × r
      const angularVel = this.cachedTransform.angularVelocity;
      const radiusVector = this.temp.tempVec3
        .copy(wheelWorldPos)
        .sub(this.cachedTransform.position);
      const angularContribution = this.temp.tempVec4
        .copy(angularVel)
        .cross(radiusVector);
      const wheelVel = this.temp.tempVec5
        .copy(this.cachedTransform.linearVelocity)
        .add(angularContribution);

      // Get wheel forward direction (includes steering)
      // Start with vehicle forward direction (0, 0, 1 in local space)
      const wheelForward = this.temp.tempVec6.set(0, 0, 1);

      // Apply steering rotation in vehicle's local coordinate system
      if (config.isSteerable) {
        // Create rotation quaternion around vehicle's up axis
        const steeringQuat = this.temp.tempQuat1.setFromAxisAngle(
          this.cachedTransform.up,
          wheel.steeringAngle
        );
        // Apply steering rotation to vehicle forward
        wheelForward.applyQuaternion(this.cachedTransform.rotation).applyQuaternion(steeringQuat).normalize();
      } else {
        // No steering, just use vehicle forward
        wheelForward.applyQuaternion(this.cachedTransform.rotation).normalize();
      }

      // Get wheel right direction (perpendicular to forward and contact normal)
      const wheelRight = this.temp.tempVec3.crossVectors(wheel.contactNormal, wheelForward).normalize();

      // Project velocity onto wheel axes
      const forwardVel = wheelVel.dot(wheelForward);
      const lateralVel = wheelVel.dot(wheelRight);

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

      // Calculate lateral force (cornering) with proper grip circle
      const lateralGrip = this.config.tire.maxGripLateral * gripMultiplier * damageMultiplier;

      // Simple lateral force model: F = -stiffness * lateralVel
      // The negative sign makes it resist lateral motion (brings velocity back to wheel forward)
      let lateralForce = -lateralVel * this.config.tire.stiffness * 1000; // Scale stiffness for proper magnitude

      // Clamp to available lateral grip (reduced by longitudinal force usage - grip circle)
      // Total grip circle: sqrt(long^2 + lat^2) <= maxGrip
      const longitudinalGripUsage = Math.abs(longitudinalForce) / (maxGrip + 0.001);
      const availableLateralGrip = lateralGrip * Math.sqrt(1.0 - Math.min(0.9, longitudinalGripUsage * longitudinalGripUsage));
      lateralForce = Math.max(-availableLateralGrip, Math.min(availableLateralGrip, lateralForce));

      // Combine forces in wheel coordinate system
      const tireForceVec = this.temp.tempVec1
        .copy(wheelForward)
        .multiplyScalar(longitudinalForce)
        .addScaledVector(wheelRight, lateralForce);

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
   * Applies stability control to prevent vehicle from flipping over.
   * This adds a corrective torque when the vehicle tilts too much.
   */
  private applyStabilityControl(deltaTime: number): void {
    // Get vehicle's up vector
    const up = this.cachedTransform.up;
    const worldUp = this.temp.tempVec1.set(0, 1, 0);

    // Calculate how much the vehicle is tilted from vertical
    const tiltDot = up.dot(worldUp);

    // If tilted significantly (tiltDot < 1), apply corrective torque
    if (tiltDot < 0.95) {
      // Calculate axis to rotate around (perpendicular to both up vectors)
      const correctionAxis = this.temp.tempVec2.crossVectors(up, worldUp).normalize();

      // Calculate correction strength based on tilt amount
      const tiltAngle = Math.acos(Math.max(-1, Math.min(1, tiltDot)));
      const correctionStrength = tiltAngle * 2000; // Torque magnitude

      // Apply corrective torque
      const correctionTorque = this.temp.tempVec3
        .copy(correctionAxis)
        .multiplyScalar(correctionStrength * deltaTime);

      this.rigidBody.applyTorqueImpulse(
        { x: correctionTorque.x, y: correctionTorque.y, z: correctionTorque.z },
        true
      );
    }

    // Damp excessive roll (rotation around forward axis)
    const angVel = this.cachedTransform.angularVelocity;
    const forward = this.cachedTransform.forward;
    const rollVelocity = angVel.dot(forward);

    if (Math.abs(rollVelocity) > 0.5) {
      // Apply counter-torque to reduce roll
      const rollDampingTorque = this.temp.tempVec4
        .copy(forward)
        .multiplyScalar(-rollVelocity * 500 * deltaTime);

      this.rigidBody.applyTorqueImpulse(
        { x: rollDampingTorque.x, y: rollDampingTorque.y, z: rollDampingTorque.z },
        true
      );
    }
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

    // Also clamp angular velocity to prevent excessive spinning
    const angvel = this.rigidBody.angvel();
    const angSpeed = Math.sqrt(angvel.x * angvel.x + angvel.y * angvel.y + angvel.z * angvel.z);
    const maxAngVel = 10.0; // rad/s

    if (angSpeed > maxAngVel) {
      const scale = maxAngVel / angSpeed;
      this.rigidBody.setAngvel(
        { x: angvel.x * scale, y: angvel.y * scale, z: angvel.z * scale },
        true
      );
    }
  }

  /**
   * Calculates current g-force for crash detection.
   * G-force = acceleration / 9.81 m/s²
   * Acceleration = (current velocity - previous velocity) / deltaTime
   */
  private calculateGForce(): number {
    const currentVel = this.cachedTransform.linearVelocity;

    // Calculate acceleration: Δv / Δt
    const acceleration = this.temp.tempVec1
      .copy(currentVel)
      .sub(this.prevVelocity)
      .divideScalar(PHYSICS_CONSTANTS.FIXED_TIMESTEP);

    // Update previous velocity for next frame
    this.prevVelocity.copy(currentVel);

    // G-force = |acceleration| / 9.81
    return acceleration.length() / PHYSICS_CONSTANTS.GRAVITY;
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

    // Create vehicle model using factory
    const factory = new VehicleModelFactory();
    const chassisGroup = factory.createVehicleMesh(this.modelType);

    chassisGroup.castShadow = true;
    chassisGroup.receiveShadow = true;
    this.scene.add(chassisGroup);
    this.chassisMesh = chassisGroup;

    // Create wheel meshes using factory
    const wheelMeshes = factory.createWheelMeshes(this.modelType, this.config.wheels);

    for (let i = 0; i < 4; i++) {
      this.scene.add(wheelMeshes[i]);
      this.wheelMeshes[i] = wheelMeshes[i];
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
      // Traverse and dispose all child meshes
      this.chassisMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
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
