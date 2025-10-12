import { Vector3 } from 'three';
import {
  VehicleConfig,
  WheelConfig,
  EngineConfig,
  TransmissionConfig,
  TireConfig,
  AerodynamicsConfig,
  DamageConfig,
  BrakeConfig,
  DriveType,
  SurfaceType,
} from '../types/VehicleTypes';

/**
 * PhysicsConfig - Centralized vehicle physics configuration
 *
 * All tunable parameters for vehicle physics simulation.
 * Values based on real-world physics with arcade tuning for fun gameplay.
 *
 * Performance budget: Vehicle.update() must be <2ms per call
 *
 * Reference vehicle: Sports car similar to Porsche 911
 * - Mass: 1200kg
 * - Power: 300 HP (223,710 Watts)
 * - Top speed: 200 km/h (55.56 m/s)
 * - 0-100 km/h: ~5 seconds
 */

/**
 * Global physics constants.
 */
export const PHYSICS_CONSTANTS = {
  /**
   * Gravity acceleration (m/s^2).
   */
  GRAVITY: 9.81,

  /**
   * Fixed physics timestep (seconds).
   * Must match GameEngine fixedTimeStep (1/60 = 0.01667s).
   */
  FIXED_TIMESTEP: 1 / 60,

  /**
   * Air density at sea level (kg/m^3).
   */
  AIR_DENSITY: 1.225,

  /**
   * Velocity damping to prevent jitter (0-1).
   * Applied to linear velocity each frame.
   */
  LINEAR_DAMPING: 0.01,

  /**
   * Angular damping to prevent spinning (0-1).
   * Applied to angular velocity each frame.
   */
  ANGULAR_DAMPING: 0.15,

  /**
   * Minimum velocity threshold for sleep (m/s).
   * Vehicle considered stationary below this.
   */
  SLEEP_THRESHOLD: 0.1,

  /**
   * Maximum velocity clamp (m/s).
   * Prevents unrealistic speeds from bugs.
   */
  MAX_VELOCITY: 100, // ~360 km/h
} as const;

/**
 * Engine configuration for default vehicle.
 *
 * Torque curve approximation:
 * - Low RPM (1000-2000): 60% of max torque
 * - Mid RPM (2000-5000): 80-100% of max torque (peak at 4000)
 * - High RPM (5000-7000): 70-80% of max torque
 * - Redline (7000+): Declining torque
 */
const DEFAULT_ENGINE: EngineConfig = {
  maxPower: 223710, // 300 HP in Watts
  maxTorque: 400, // Newton-meters at peak
  peakTorqueRPM: 4000,
  idleRPM: 800,
  maxRPM: 7000,
  engineBraking: 0.1, // 10% resistance when off throttle
};

/**
 * Transmission configuration for default vehicle.
 *
 * Gear ratios tuned for:
 * - 1st: Strong acceleration, ~60 km/h max
 * - 2nd: ~90 km/h max
 * - 3rd: ~130 km/h max
 * - 4th: ~170 km/h max
 * - 5th: ~200+ km/h max (top speed)
 */
const DEFAULT_TRANSMISSION: TransmissionConfig = {
  gearRatios: [3.5, 2.5, 1.8, 1.3, 1.0], // 5-speed gearbox
  finalDriveRatio: 3.7,
  shiftUpRPM: 6500, // Shift up at 6500 RPM
  shiftDownRPM: 3000, // Shift down at 3000 RPM
  shiftTime: 0.1, // 100ms shift time
};

/**
 * Tire configuration for default vehicle.
 *
 * Grip values based on:
 * - Static friction coefficient: ~1.0 (dry tarmac)
 * - Dynamic friction coefficient: ~0.7-0.8
 * - Slip ratio curve: Peak grip at ~10-15% slip
 */
const DEFAULT_TIRE: TireConfig = {
  maxGripLongitudinal: 12000, // Newtons (forward/backward)
  maxGripLateral: 8000, // Newtons (side-to-side) - reduced for stability
  stiffness: 4.0, // Reduced for smoother handling and stability
  surfaceGripMultipliers: {
    [SurfaceType.TARMAC]: 1.0, // Full grip
    [SurfaceType.DIRT]: 0.6, // 60% grip
    [SurfaceType.GRASS]: 0.4, // 40% grip
    [SurfaceType.ICE]: 0.2, // 20% grip
    [SurfaceType.SAND]: 0.5, // 50% grip
  },
};

/**
 * Aerodynamics configuration for default vehicle.
 *
 * Drag force: F_drag = 0.5 * Cd * A * rho * v^2
 * Downforce: F_down = 0.5 * Cl * A * rho * v^2
 *
 * At 55 m/s (200 km/h):
 * - Drag: ~500 N (resists forward motion)
 * - Downforce: ~800 N (improves grip)
 */
const DEFAULT_AERODYNAMICS: AerodynamicsConfig = {
  dragCoefficient: 0.3, // Low drag for sports car
  frontalArea: 2.0, // Square meters
  downforceCoefficient: 0.5, // Moderate downforce
  airDensity: PHYSICS_CONSTANTS.AIR_DENSITY,
};

/**
 * Damage system configuration.
 *
 * Impact force thresholds calibrated for:
 * - Minor: Light scrape (< 5000 N) - no gameplay impact
 * - Moderate: Hard impact (5000-10000 N) - slight performance loss
 * - Severe: Major crash (10000-20000 N) - significant performance loss
 * - Catastrophic: Total wreck (> 20000 N) - forced respawn
 *
 * Example impacts:
 * - 30 mph into wall: ~8000 N
 * - 60 mph into wall: ~20000 N
 * - Landing from 10m jump: ~12000 N
 */
const DEFAULT_DAMAGE: DamageConfig = {
  minorDamageThreshold: 5000,
  moderateDamageThreshold: 10000,
  severeDamageThreshold: 20000,
  catastrophicDamageThreshold: 30000,
  performanceDegradationPerLevel: 0.05, // 5% penalty per level
  maxCollisions: 10, // Track last 10 collisions
  collisionHistoryWindow: 60, // 60 seconds history
};

/**
 * Brake configuration.
 *
 * Brake force tuned for:
 * - 60-0 mph in ~40 meters (~4 seconds)
 * - Front bias: 60% front, 40% rear (weight transfer during braking)
 * - Handbrake: 80% of max force, rear wheels only
 */
const DEFAULT_BRAKE: BrakeConfig = {
  maxBrakeForce: 8000, // Newtons per wheel
  frontBrakeBias: 0.6, // 60% front, 40% rear
  handbrakeForce: 0.8, // 80% of max brake force
  handbrakeLockRear: true,
};

/**
 * Wheel configurations for default vehicle.
 *
 * Wheelbase: 2.5m (front to rear axle)
 * Track width: 1.6m (left to right)
 *
 * Suspension tuned for:
 * - Stiffness: Supports vehicle weight with ~20% compression at rest
 * - Damping: Critically damped (0.7) for smooth response
 * - Travel: 0.3m (30cm) max compression
 */
const DEFAULT_WHEELS: [WheelConfig, WheelConfig, WheelConfig, WheelConfig] = [
  // Front Left
  {
    position: new Vector3(-0.8, -0.3, 1.25), // Left, down, forward
    suspensionRestLength: 0.5,
    suspensionMaxTravel: 0.3,
    suspensionStiffness: 40000, // N/m (40 kN/m)
    suspensionDamping: 0.7, // Critically damped
    radius: 0.35, // 35cm wheel radius
    width: 0.25, // 25cm wheel width
    isPowered: false, // RWD by default
    isSteerable: true,
    maxSteeringAngle: 0.61, // 35 degrees in radians
  },
  // Front Right
  {
    position: new Vector3(0.8, -0.3, 1.25),
    suspensionRestLength: 0.5,
    suspensionMaxTravel: 0.3,
    suspensionStiffness: 40000,
    suspensionDamping: 0.7,
    radius: 0.35,
    width: 0.25,
    isPowered: false,
    isSteerable: true,
    maxSteeringAngle: 0.61,
  },
  // Rear Left
  {
    position: new Vector3(-0.8, -0.3, -1.25),
    suspensionRestLength: 0.5,
    suspensionMaxTravel: 0.3,
    suspensionStiffness: 45000, // Slightly stiffer rear
    suspensionDamping: 0.7,
    radius: 0.35,
    width: 0.25,
    isPowered: true, // RWD
    isSteerable: false,
    maxSteeringAngle: 0,
  },
  // Rear Right
  {
    position: new Vector3(0.8, -0.3, -1.25),
    suspensionRestLength: 0.5,
    suspensionMaxTravel: 0.3,
    suspensionStiffness: 45000,
    suspensionDamping: 0.7,
    radius: 0.35,
    width: 0.25,
    isPowered: true,
    isSteerable: false,
    maxSteeringAngle: 0,
  },
];

/**
 * Default vehicle configuration.
 *
 * This is the primary configuration used for the player vehicle.
 * All values are tuned for a balance between realism and arcade fun.
 *
 * Performance characteristics:
 * - Top speed: ~200 km/h (55 m/s)
 * - 0-100 km/h: ~5 seconds
 * - Braking: 100-0 km/h in ~40 meters
 * - Handling: Responsive with slight oversteer (RWD)
 */
export const DEFAULT_VEHICLE_CONFIG: VehicleConfig = {
  mass: 1200, // kg
  centerOfMass: new Vector3(0, -0.2, 0.1), // Slightly forward and low
  driveType: DriveType.REAR_WHEEL_DRIVE,
  engine: DEFAULT_ENGINE,
  transmission: DEFAULT_TRANSMISSION,
  tire: DEFAULT_TIRE,
  aerodynamics: DEFAULT_AERODYNAMICS,
  wheels: DEFAULT_WHEELS,
  damage: DEFAULT_DAMAGE,
};

/**
 * Brake configuration (separate for easier access).
 */
export const DEFAULT_BRAKE_CONFIG: BrakeConfig = DEFAULT_BRAKE;

/**
 * Raycast configuration for wheel ground detection.
 */
export const RAYCAST_CONFIG = {
  /**
   * Maximum raycast distance (meters).
   * Should be suspension rest length + max travel + safety margin.
   */
  maxDistance: 1.0,

  /**
   * Collision groups for raycasts.
   * Ensures wheels only detect ground, not other vehicles.
   */
  collisionGroups: 0xffff0001, // All groups except vehicle layer

  /**
   * Whether to return multiple hits.
   * False = only closest hit (more performant).
   */
  multipleHits: false,
} as const;

/**
 * Anti-roll bar configuration (prevents excessive body roll in corners).
 *
 * Anti-roll bars (sway bars) connect left and right suspension.
 * When one wheel compresses more than the other, the bar applies a torque
 * to level the vehicle body.
 */
export const ANTI_ROLL_BAR = {
  /**
   * Front anti-roll bar stiffness (Nm/degree).
   */
  frontStiffness: 5000,

  /**
   * Rear anti-roll bar stiffness (Nm/degree).
   */
  rearStiffness: 4000,

  /**
   * Whether anti-roll bars are enabled.
   */
  enabled: true,
} as const;

/**
 * Traction control system (TCS) configuration.
 *
 * Reduces wheelspin by limiting power when slip ratio exceeds threshold.
 * Improves acceleration on low-grip surfaces.
 */
export const TRACTION_CONTROL = {
  /**
   * Whether TCS is enabled.
   */
  enabled: false, // Disabled for arcade feel

  /**
   * Slip ratio threshold (0-1).
   * TCS activates when slip exceeds this.
   */
  slipThreshold: 0.15, // 15% slip

  /**
   * Power reduction rate when TCS active (0-1 per second).
   */
  powerReduction: 0.5, // Cut power by 50% per second
} as const;

/**
 * Anti-lock braking system (ABS) configuration.
 *
 * Prevents wheel lockup during hard braking by modulating brake pressure.
 * Maintains steering control while braking.
 */
export const ABS_CONFIG = {
  /**
   * Whether ABS is enabled.
   */
  enabled: false, // Disabled for arcade feel

  /**
   * Slip ratio threshold for activation (0-1).
   * ABS activates when wheel slip exceeds this.
   */
  slipThreshold: 0.2, // 20% slip

  /**
   * Brake force reduction when ABS active (0-1).
   */
  brakeReduction: 0.3, // Reduce brake by 30%

  /**
   * ABS pulse frequency (Hz).
   */
  pulseFrequency: 15, // 15 pulses per second
} as const;

/**
 * Advanced tuning parameters (for fine-tuning handling).
 */
export const ADVANCED_TUNING = {
  /**
   * Weight transfer multiplier (0-2).
   * Higher values = more pronounced weight transfer during acceleration/braking.
   * Affects grip distribution between front/rear wheels.
   */
  weightTransferMultiplier: 1.0,

  /**
   * Steering speed multiplier (0-2).
   * How quickly steering input reaches wheels.
   */
  steeringSpeed: 3.0, // Rad/s

  /**
   * Steering return speed multiplier (0-2).
   * How quickly steering returns to center when released.
   */
  steeringReturnSpeed: 2.0,

  /**
   * Ackermann steering percentage (0-1).
   * 1 = perfect Ackermann (inner wheel steers more than outer).
   * 0 = parallel steering (both wheels same angle).
   * Improves cornering realism.
   */
  ackermannSteering: 0.5,

  /**
   * Counter-steering assistance (0-1).
   * Helps prevent spin-outs by automatically counter-steering.
   * 0 = no assist, 1 = full assist.
   */
  counterSteeringAssist: 0.2, // Slight assist for arcade feel

  /**
   * Speed-sensitive steering (0-1).
   * Reduces steering angle at high speeds for stability.
   * 0 = no reduction, 1 = significant reduction.
   */
  speedSensitiveSteeringFactor: 0.3,
} as const;

/**
 * Helper function to create a wheel configuration variant.
 *
 * @param base - Base wheel config to modify
 * @param overrides - Properties to override
 * @returns New wheel config with overrides applied
 */
export function createWheelConfig(
  base: WheelConfig,
  overrides: Partial<WheelConfig>
): WheelConfig {
  return {
    ...base,
    ...overrides,
    position: overrides.position ?? base.position.clone(),
  };
}

/**
 * Helper function to create a vehicle configuration variant.
 *
 * @param base - Base vehicle config to modify
 * @param overrides - Properties to override
 * @returns New vehicle config with overrides applied
 */
export function createVehicleConfig(
  base: VehicleConfig,
  overrides: Partial<VehicleConfig>
): VehicleConfig {
  return {
    ...base,
    ...overrides,
    centerOfMass: overrides.centerOfMass ?? base.centerOfMass.clone(),
    wheels: overrides.wheels ?? [
      createWheelConfig(base.wheels[0], {}),
      createWheelConfig(base.wheels[1], {}),
      createWheelConfig(base.wheels[2], {}),
      createWheelConfig(base.wheels[3], {}),
    ],
  };
}

/**
 * Preset: Front-wheel drive configuration.
 */
export const FWD_VEHICLE_CONFIG = createVehicleConfig(DEFAULT_VEHICLE_CONFIG, {
  driveType: DriveType.FRONT_WHEEL_DRIVE,
  wheels: [
    createWheelConfig(DEFAULT_WHEELS[0], { isPowered: true }), // FL powered
    createWheelConfig(DEFAULT_WHEELS[1], { isPowered: true }), // FR powered
    createWheelConfig(DEFAULT_WHEELS[2], { isPowered: false }), // RL not powered
    createWheelConfig(DEFAULT_WHEELS[3], { isPowered: false }), // RR not powered
  ],
});

/**
 * Preset: All-wheel drive configuration.
 */
export const AWD_VEHICLE_CONFIG = createVehicleConfig(DEFAULT_VEHICLE_CONFIG, {
  driveType: DriveType.ALL_WHEEL_DRIVE,
  wheels: [
    createWheelConfig(DEFAULT_WHEELS[0], { isPowered: true }), // FL powered
    createWheelConfig(DEFAULT_WHEELS[1], { isPowered: true }), // FR powered
    createWheelConfig(DEFAULT_WHEELS[2], { isPowered: true }), // RL powered
    createWheelConfig(DEFAULT_WHEELS[3], { isPowered: true }), // RR powered
  ],
});

/**
 * Preset: Heavy truck configuration (future).
 */
export const TRUCK_VEHICLE_CONFIG = createVehicleConfig(DEFAULT_VEHICLE_CONFIG, {
  mass: 2500, // Heavier
  engine: {
    ...DEFAULT_ENGINE,
    maxPower: 300000, // More power
    maxTorque: 800, // More torque
  },
  wheels: [
    createWheelConfig(DEFAULT_WHEELS[0], {
      suspensionStiffness: 60000, // Stiffer
      radius: 0.45, // Larger wheels
    }),
    createWheelConfig(DEFAULT_WHEELS[1], {
      suspensionStiffness: 60000,
      radius: 0.45,
    }),
    createWheelConfig(DEFAULT_WHEELS[2], {
      suspensionStiffness: 70000,
      radius: 0.45,
    }),
    createWheelConfig(DEFAULT_WHEELS[3], {
      suspensionStiffness: 70000,
      radius: 0.45,
    }),
  ],
});
