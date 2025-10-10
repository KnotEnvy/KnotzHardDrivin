import { Vector3, Quaternion } from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

/**
 * Vehicle drive type determines how power is distributed to wheels.
 */
export enum DriveType {
  FRONT_WHEEL_DRIVE = 'fwd',
  REAR_WHEEL_DRIVE = 'rwd',
  ALL_WHEEL_DRIVE = 'awd',
}

/**
 * Damage severity levels for collision impact.
 */
export enum DamageSeverity {
  NONE = 'none',
  MINOR = 'minor',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  CATASTROPHIC = 'catastrophic',
}

/**
 * Surface type affects tire grip and friction.
 */
export enum SurfaceType {
  TARMAC = 'tarmac',
  DIRT = 'dirt',
  GRASS = 'grass',
  ICE = 'ice',
  SAND = 'sand',
}

/**
 * Wheel position index enumeration for clarity.
 */
export enum WheelIndex {
  FRONT_LEFT = 0,
  FRONT_RIGHT = 1,
  REAR_LEFT = 2,
  REAR_RIGHT = 3,
}

/**
 * Configuration for a single wheel on the vehicle.
 */
export interface WheelConfig {
  /**
   * Position relative to vehicle center (local space).
   * Typically: front left = (-x, -y, +z), front right = (+x, -y, +z)
   */
  position: Vector3;

  /**
   * Suspension rest length in meters.
   * The distance from wheel mount to ground when at rest.
   */
  suspensionRestLength: number;

  /**
   * Maximum suspension travel distance in meters.
   * How far the suspension can compress before bottoming out.
   */
  suspensionMaxTravel: number;

  /**
   * Suspension stiffness (spring constant) in N/m.
   * Higher values = stiffer suspension, less compression.
   */
  suspensionStiffness: number;

  /**
   * Suspension damping coefficient (0-1).
   * Controls how quickly suspension returns to rest.
   * 0 = no damping (bouncy), 1 = critically damped (smooth).
   */
  suspensionDamping: number;

  /**
   * Wheel radius in meters.
   * Used for calculating linear speed from angular velocity.
   */
  radius: number;

  /**
   * Wheel width in meters.
   * Used for visual representation and tire contact patch calculation.
   */
  width: number;

  /**
   * Whether this wheel receives power from the engine.
   * True for front wheels in FWD, rear wheels in RWD, all wheels in AWD.
   */
  isPowered: boolean;

  /**
   * Whether this wheel can steer.
   * Typically only front wheels steer.
   */
  isSteerable: boolean;

  /**
   * Maximum steering angle in radians.
   * Typically 30-35 degrees (0.52-0.61 rad) for front wheels.
   */
  maxSteeringAngle: number;
}

/**
 * Wheel state at runtime (updated every physics step).
 */
export interface WheelState {
  /**
   * Whether the wheel is currently touching the ground.
   */
  isGrounded: boolean;

  /**
   * Distance from wheel mount to ground contact point.
   * Used to calculate suspension compression.
   */
  suspensionLength: number;

  /**
   * Previous frame's suspension length (for damping calculation).
   */
  previousSuspensionLength: number;

  /**
   * Ground contact point in world space.
   */
  contactPoint: Vector3;

  /**
   * Ground normal at contact point.
   */
  contactNormal: Vector3;

  /**
   * Surface type at contact point.
   * Determines grip multiplier for tire forces.
   */
  surfaceType: SurfaceType;

  /**
   * Current steering angle applied to this wheel (radians).
   */
  steeringAngle: number;

  /**
   * Wheel rotation angle for visual representation (radians).
   */
  rotationAngle: number;

  /**
   * Angular velocity of wheel in rad/s.
   */
  angularVelocity: number;

  /**
   * Slip ratio: (wheel speed - ground speed) / max(wheel speed, ground speed).
   * Used for tire friction calculation. 0 = no slip, 1 = full slip.
   */
  slipRatio: number;

  /**
   * Slip angle in radians: angle between wheel direction and velocity direction.
   * Used for lateral tire force calculation.
   */
  slipAngle: number;

  /**
   * Applied suspension force magnitude in Newtons.
   * For debugging and visual feedback.
   */
  suspensionForce: number;

  /**
   * Applied tire force (forward/lateral) in Newtons.
   * For debugging and visual feedback.
   */
  tireForce: Vector3;
}

/**
 * Vehicle damage state tracking.
 */
export interface DamageState {
  /**
   * Overall damage level (0 = pristine, 1 = destroyed).
   */
  overallDamage: number;

  /**
   * Current damage severity classification.
   */
  severity: DamageSeverity;

  /**
   * Performance degradation multiplier (0-1).
   * Applied to engine power, max speed, grip.
   */
  performancePenalty: number;

  /**
   * Number of major crashes this session.
   */
  crashCount: number;

  /**
   * List of recent collision events.
   */
  recentCollisions: CollisionEvent[];
}

/**
 * Collision event data for damage calculation and replay.
 */
export interface CollisionEvent {
  /**
   * Time of collision (game time in seconds).
   */
  timestamp: number;

  /**
   * Position of collision in world space.
   */
  position: Vector3;

  /**
   * Vehicle velocity at time of collision.
   */
  velocity: Vector3;

  /**
   * Impact force magnitude in Newtons.
   */
  impactForce: number;

  /**
   * Collision surface normal (direction of impact).
   */
  normal: Vector3;

  /**
   * Entity that was collided with (track, obstacle, etc).
   */
  collidedWith: string;

  /**
   * Damage severity assigned to this collision.
   */
  severity: DamageSeverity;
}

/**
 * Vehicle input control state.
 * Values normalized to [-1, 1] or [0, 1].
 */
export interface VehicleInput {
  /**
   * Throttle input (0-1).
   * 0 = no throttle, 1 = full throttle.
   */
  throttle: number;

  /**
   * Brake input (0-1).
   * 0 = no brake, 1 = full brake.
   */
  brake: number;

  /**
   * Steering input (-1 to 1).
   * -1 = full left, 0 = center, 1 = full right.
   */
  steering: number;

  /**
   * Handbrake input (0-1).
   * Used for emergency braking and drifting.
   */
  handbrake: number;
}

/**
 * Vehicle telemetry data for HUD and debugging.
 */
export interface VehicleTelemetry {
  /**
   * Current forward speed in m/s.
   */
  speed: number;

  /**
   * Current speed in km/h (for UI display).
   */
  speedKmh: number;

  /**
   * Current speed in mph (for UI display).
   */
  speedMph: number;

  /**
   * Current RPM (revolutions per minute).
   */
  rpm: number;

  /**
   * Current gear (0 = neutral, 1-5 = forward gears, -1 = reverse).
   */
  gear: number;

  /**
   * Whether vehicle is airborne (all wheels off ground).
   */
  isAirborne: boolean;

  /**
   * Number of wheels currently touching ground.
   */
  wheelsOnGround: number;

  /**
   * Current g-force (for crash detection).
   */
  gForce: number;

  /**
   * Current damage percentage (0-100).
   */
  damagePercent: number;
}

/**
 * Complete vehicle configuration (read from PhysicsConfig).
 */
export interface VehicleConfig {
  /**
   * Vehicle mass in kilograms.
   */
  mass: number;

  /**
   * Center of mass offset from rigid body origin (local space).
   * Typically slightly forward and low for stability.
   */
  centerOfMass: Vector3;

  /**
   * Drive type (FWD, RWD, AWD).
   */
  driveType: DriveType;

  /**
   * Engine configuration.
   */
  engine: EngineConfig;

  /**
   * Transmission configuration.
   */
  transmission: TransmissionConfig;

  /**
   * Tire configuration.
   */
  tire: TireConfig;

  /**
   * Aerodynamics configuration.
   */
  aerodynamics: AerodynamicsConfig;

  /**
   * Wheel configurations (4 wheels).
   */
  wheels: [WheelConfig, WheelConfig, WheelConfig, WheelConfig];

  /**
   * Damage system configuration.
   */
  damage: DamageConfig;
}

/**
 * Engine configuration parameters.
 */
export interface EngineConfig {
  /**
   * Maximum power output in Watts.
   * 300 HP = 223,710 Watts
   */
  maxPower: number;

  /**
   * Peak torque in Newton-meters.
   */
  maxTorque: number;

  /**
   * RPM at which peak torque occurs.
   */
  peakTorqueRPM: number;

  /**
   * Idle RPM.
   */
  idleRPM: number;

  /**
   * Maximum RPM (redline).
   */
  maxRPM: number;

  /**
   * Engine braking coefficient (0-1).
   * Resistance force when off throttle.
   */
  engineBraking: number;
}

/**
 * Transmission configuration parameters.
 */
export interface TransmissionConfig {
  /**
   * Gear ratios [1st, 2nd, 3rd, 4th, 5th].
   * Higher ratio = more torque, less speed.
   */
  gearRatios: number[];

  /**
   * Final drive ratio.
   * Applied after gear ratio.
   */
  finalDriveRatio: number;

  /**
   * Automatic gear shift up RPM.
   */
  shiftUpRPM: number;

  /**
   * Automatic gear shift down RPM.
   */
  shiftDownRPM: number;

  /**
   * Gear shift time in seconds.
   */
  shiftTime: number;
}

/**
 * Tire physics configuration.
 */
export interface TireConfig {
  /**
   * Maximum longitudinal grip (forward/backward).
   */
  maxGripLongitudinal: number;

  /**
   * Maximum lateral grip (side-to-side).
   */
  maxGripLateral: number;

  /**
   * Tire stiffness: how quickly grip builds with slip.
   */
  stiffness: number;

  /**
   * Grip multipliers per surface type.
   */
  surfaceGripMultipliers: Record<SurfaceType, number>;
}

/**
 * Aerodynamics configuration.
 */
export interface AerodynamicsConfig {
  /**
   * Drag coefficient (Cd).
   * Typical car: 0.25-0.35
   */
  dragCoefficient: number;

  /**
   * Frontal area in square meters.
   * Used with drag coefficient for air resistance.
   */
  frontalArea: number;

  /**
   * Downforce coefficient (Cl).
   * Generates downward force at speed for grip.
   */
  downforceCoefficient: number;

  /**
   * Air density in kg/m^3.
   * Sea level: 1.225 kg/m^3
   */
  airDensity: number;
}

/**
 * Damage system configuration.
 */
export interface DamageConfig {
  /**
   * Impact force threshold for minor damage (Newtons).
   */
  minorDamageThreshold: number;

  /**
   * Impact force threshold for moderate damage (Newtons).
   */
  moderateDamageThreshold: number;

  /**
   * Impact force threshold for severe damage (Newtons).
   */
  severeDamageThreshold: number;

  /**
   * Impact force threshold for catastrophic damage (Newtons).
   */
  catastrophicDamageThreshold: number;

  /**
   * Performance degradation per damage level (0-1).
   */
  performanceDegradationPerLevel: number;

  /**
   * Maximum number of collisions before full damage.
   */
  maxCollisions: number;

  /**
   * Time window for collision history in seconds.
   */
  collisionHistoryWindow: number;
}

/**
 * Brake configuration.
 */
export interface BrakeConfig {
  /**
   * Maximum brake force in Newtons.
   */
  maxBrakeForce: number;

  /**
   * Brake force distribution: front bias (0-1).
   * 0.6 = 60% front, 40% rear
   */
  frontBrakeBias: number;

  /**
   * Handbrake force as percentage of max brake force.
   */
  handbrakeForce: number;

  /**
   * Whether handbrake locks rear wheels.
   */
  handbrakeLockRear: boolean;
}

/**
 * Vehicle transform state (position, rotation, velocity).
 */
export interface VehicleTransform {
  /**
   * Position in world space.
   */
  position: Vector3;

  /**
   * Orientation quaternion.
   */
  rotation: Quaternion;

  /**
   * Linear velocity in world space (m/s).
   */
  linearVelocity: Vector3;

  /**
   * Angular velocity in world space (rad/s).
   */
  angularVelocity: Vector3;

  /**
   * Forward direction vector (unit vector).
   */
  forward: Vector3;

  /**
   * Right direction vector (unit vector).
   */
  right: Vector3;

  /**
   * Up direction vector (unit vector).
   */
  up: Vector3;
}

/**
 * Cached physics calculation temp objects to avoid per-frame allocations.
 */
export interface PhysicsTempObjects {
  /**
   * Temporary Vector3 objects (reused for calculations).
   */
  tempVec1: Vector3;
  tempVec2: Vector3;
  tempVec3: Vector3;
  tempVec4: Vector3;
  tempVec5: Vector3;
  tempVec6: Vector3;

  /**
   * Temporary Quaternion objects.
   */
  tempQuat1: Quaternion;
  tempQuat2: Quaternion;

  /**
   * Temporary ray for raycasting.
   */
  tempRay: RAPIER.Ray;
}
