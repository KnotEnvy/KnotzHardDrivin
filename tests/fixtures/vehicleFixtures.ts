/**
 * Test fixtures for vehicle physics testing
 * Provides pre-configured vehicle configurations for consistent testing
 */

import * as THREE from 'three';

// ============================================================================
// VEHICLE CONFIGURATION FIXTURES
// ============================================================================

/**
 * Default vehicle configuration matching PRD specifications
 */
export const defaultVehicleConfig = {
  mass: 1200, // kg
  centerOfMass: new THREE.Vector3(0, -0.3, 0.2), // Slightly forward and low
  enginePower: 300, // HP equivalent (converted to Watts: 223710W)
  maxSpeed: 55.56, // 200 km/h = 55.56 m/s
  brakeForce: 3000, // N
  steeringAngle: 0.611, // 35 degrees in radians
  downforce: 500, // N at max speed
  dragCoefficient: 0.3,

  // Suspension config (per wheel)
  suspension: {
    stiffness: 40, // N/m (30-50 range)
    damping: 0.5, // 0.3-0.7 range
    restLength: 0.4, // meters (0.3-0.5 range)
    maxTravel: 0.2, // meters
  },

  // Wheel config
  wheels: {
    radius: 0.35, // meters
    width: 0.25, // meters
    mass: 20, // kg per wheel
    count: 4,
  },

  // Tire physics
  tires: {
    gripMultiplier: {
      tarmac: 1.0,
      dirt: 0.6,
      ice: 0.3,
    },
    maxForwardForce: 5000, // N
    maxLateralForce: 4000, // N
    slipAngleThreshold: 0.2, // radians
  },

  // Damage system
  damage: {
    maxCrashes: 3,
    speedDegradationPerCrash: 0.05, // 5% per major crash
    thresholds: {
      minor: 5000, // N
      major: 15000, // N
      catastrophic: 25000, // N
    },
  },
};

/**
 * Lightweight vehicle config for performance testing
 */
export const lightweightVehicleConfig = {
  ...defaultVehicleConfig,
  mass: 800,
  enginePower: 250,
  maxSpeed: 60, // m/s
  suspension: {
    stiffness: 35,
    damping: 0.4,
    restLength: 0.35,
    maxTravel: 0.15,
  },
};

/**
 * Heavy vehicle config for stability testing
 */
export const heavyVehicleConfig = {
  ...defaultVehicleConfig,
  mass: 1800,
  enginePower: 400,
  maxSpeed: 45, // m/s
  suspension: {
    stiffness: 50,
    damping: 0.7,
    restLength: 0.45,
    maxTravel: 0.25,
  },
};

/**
 * High-performance vehicle config for speed testing
 */
export const performanceVehicleConfig = {
  ...defaultVehicleConfig,
  mass: 1000,
  enginePower: 500,
  maxSpeed: 70, // m/s
  downforce: 1000,
  dragCoefficient: 0.25,
  suspension: {
    stiffness: 45,
    damping: 0.6,
    restLength: 0.35,
    maxTravel: 0.15,
  },
  tires: {
    ...defaultVehicleConfig.tires,
    maxForwardForce: 7000,
    maxLateralForce: 6000,
  },
};

/**
 * Minimal vehicle config for basic testing
 */
export const minimalVehicleConfig = {
  mass: 1000,
  centerOfMass: new THREE.Vector3(0, 0, 0),
  enginePower: 200,
  maxSpeed: 50,
  brakeForce: 2000,
  steeringAngle: 0.5,
  downforce: 0,
  dragCoefficient: 0.3,
  suspension: {
    stiffness: 30,
    damping: 0.3,
    restLength: 0.3,
    maxTravel: 0.2,
  },
  wheels: {
    radius: 0.3,
    width: 0.2,
    mass: 15,
    count: 4,
  },
  tires: {
    gripMultiplier: {
      tarmac: 1.0,
      dirt: 0.6,
      ice: 0.3,
    },
    maxForwardForce: 4000,
    maxLateralForce: 3000,
    slipAngleThreshold: 0.2,
  },
  damage: {
    maxCrashes: 3,
    speedDegradationPerCrash: 0.05,
    thresholds: {
      minor: 5000,
      major: 15000,
      catastrophic: 25000,
    },
  },
};

// ============================================================================
// WHEEL CONFIGURATION FIXTURES
// ============================================================================

/**
 * Wheel positions relative to vehicle center (for 4-wheel vehicle)
 * Front-left, front-right, rear-left, rear-right
 */
export const standardWheelPositions = [
  new THREE.Vector3(-0.8, -0.4, 1.2), // Front-left
  new THREE.Vector3(0.8, -0.4, 1.2), // Front-right
  new THREE.Vector3(-0.8, -0.4, -1.2), // Rear-left
  new THREE.Vector3(0.8, -0.4, -1.2), // Rear-right
];

/**
 * Wheel positions for wide-stance vehicle
 */
export const wideStanceWheelPositions = [
  new THREE.Vector3(-1.0, -0.4, 1.3),
  new THREE.Vector3(1.0, -0.4, 1.3),
  new THREE.Vector3(-1.0, -0.4, -1.3),
  new THREE.Vector3(1.0, -0.4, -1.3),
];

/**
 * Wheel positions for narrow-stance vehicle
 */
export const narrowStanceWheelPositions = [
  new THREE.Vector3(-0.6, -0.4, 1.0),
  new THREE.Vector3(0.6, -0.4, 1.0),
  new THREE.Vector3(-0.6, -0.4, -1.0),
  new THREE.Vector3(0.6, -0.4, -1.0),
];

// ============================================================================
// PHYSICS STATE FIXTURES
// ============================================================================

/**
 * Standard physics state for a stationary vehicle
 */
export const stationaryVehicleState = {
  position: new THREE.Vector3(0, 1, 0),
  rotation: new THREE.Quaternion(),
  linearVelocity: new THREE.Vector3(0, 0, 0),
  angularVelocity: new THREE.Vector3(0, 0, 0),
};

/**
 * Physics state for a vehicle moving forward at medium speed
 */
export const forwardMovingVehicleState = {
  position: new THREE.Vector3(0, 1, 0),
  rotation: new THREE.Quaternion(),
  linearVelocity: new THREE.Vector3(0, 0, 20),
  angularVelocity: new THREE.Vector3(0, 0, 0),
};

/**
 * Physics state for a vehicle in mid-air (falling)
 */
export const airborneVehicleState = {
  position: new THREE.Vector3(0, 10, 0),
  rotation: new THREE.Quaternion(),
  linearVelocity: new THREE.Vector3(0, -5, 15),
  angularVelocity: new THREE.Vector3(0, 0, 0),
};

/**
 * Physics state for a vehicle sliding laterally
 */
export const slidingVehicleState = {
  position: new THREE.Vector3(0, 1, 0),
  rotation: new THREE.Quaternion(),
  linearVelocity: new THREE.Vector3(10, 0, 15), // Significant lateral component
  angularVelocity: new THREE.Vector3(0, 2, 0), // Spinning
};

/**
 * Physics state for a crashed vehicle
 */
export const crashedVehicleState = {
  position: new THREE.Vector3(0, 0.5, 0),
  rotation: new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    Math.PI / 4 // Flipped 45 degrees
  ),
  linearVelocity: new THREE.Vector3(0, 0, 0),
  angularVelocity: new THREE.Vector3(0, 0, 0),
};

// ============================================================================
// SURFACE TYPE FIXTURES
// ============================================================================

/**
 * Surface friction coefficients for different terrain types
 */
export const surfaceTypes = {
  tarmac: {
    friction: 1.0,
    restitution: 0.1,
    color: 0x333333,
  },
  dirt: {
    friction: 0.6,
    restitution: 0.2,
    color: 0x8b7355,
  },
  ice: {
    friction: 0.3,
    restitution: 0.05,
    color: 0xccffff,
  },
  grass: {
    friction: 0.7,
    restitution: 0.15,
    color: 0x228b22,
  },
  sand: {
    friction: 0.5,
    restitution: 0.25,
    color: 0xdaa520,
  },
};

// ============================================================================
// DAMAGE STATE FIXTURES
// ============================================================================

/**
 * Pristine vehicle damage state
 */
export const pristineDamageState = {
  level: 0,
  crashes: 0,
  speedMultiplier: 1.0,
  visualState: 'pristine',
};

/**
 * Lightly damaged vehicle state
 */
export const lightlyDamagedState = {
  level: 1,
  crashes: 1,
  speedMultiplier: 0.95,
  visualState: 'scratched',
};

/**
 * Moderately damaged vehicle state
 */
export const moderatelyDamagedState = {
  level: 2,
  crashes: 2,
  speedMultiplier: 0.9,
  visualState: 'dented',
};

/**
 * Heavily damaged vehicle state
 */
export const heavilyDamagedState = {
  level: 3,
  crashes: 3,
  speedMultiplier: 0.85,
  visualState: 'smoking',
};

// ============================================================================
// INPUT STATE FIXTURES
// ============================================================================

/**
 * Neutral input state (no inputs pressed)
 */
export const neutralInput = {
  throttle: 0,
  brake: 0,
  steering: 0,
  handbrake: false,
};

/**
 * Full throttle input
 */
export const fullThrottleInput = {
  throttle: 1.0,
  brake: 0,
  steering: 0,
  handbrake: false,
};

/**
 * Full brake input
 */
export const fullBrakeInput = {
  throttle: 0,
  brake: 1.0,
  steering: 0,
  handbrake: false,
};

/**
 * Left turn input
 */
export const leftTurnInput = {
  throttle: 0.5,
  brake: 0,
  steering: -1.0,
  handbrake: false,
};

/**
 * Right turn input
 */
export const rightTurnInput = {
  throttle: 0.5,
  brake: 0,
  steering: 1.0,
  handbrake: false,
};

/**
 * Drift input (handbrake turn)
 */
export const driftInput = {
  throttle: 0.7,
  brake: 0,
  steering: -1.0,
  handbrake: true,
};

// ============================================================================
// COLLISION FIXTURES
// ============================================================================

/**
 * Minor collision event
 */
export const minorCollisionEvent = {
  timestamp: 1000,
  position: new THREE.Vector3(0, 1, 0),
  velocity: new THREE.Vector3(0, 0, 10),
  impactForce: 3000, // Below minor threshold
  collisionNormal: new THREE.Vector3(0, 1, 0),
  severity: 'minor' as const,
};

/**
 * Major collision event
 */
export const majorCollisionEvent = {
  timestamp: 2000,
  position: new THREE.Vector3(5, 1, 10),
  velocity: new THREE.Vector3(0, 0, 30),
  impactForce: 10000, // Between minor and catastrophic
  collisionNormal: new THREE.Vector3(-1, 0, 0),
  severity: 'major' as const,
};

/**
 * Catastrophic collision event
 */
export const catastrophicCollisionEvent = {
  timestamp: 3000,
  position: new THREE.Vector3(10, 2, 20),
  velocity: new THREE.Vector3(0, 0, 50),
  impactForce: 30000, // Above catastrophic threshold
  collisionNormal: new THREE.Vector3(0, 0, -1),
  severity: 'catastrophic' as const,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a deep copy of a vehicle config for mutation in tests
 * @param config - Source config
 * @returns Deep copy of config
 */
export function cloneVehicleConfig(config: typeof defaultVehicleConfig) {
  return JSON.parse(JSON.stringify(config));
}

/**
 * Validates a vehicle config against expected ranges
 * @param config - Config to validate
 * @returns True if valid, false otherwise
 */
export function isValidVehicleConfig(config: any): boolean {
  if (!config) return false;

  // Check required fields
  if (
    typeof config.mass !== 'number' ||
    typeof config.enginePower !== 'number' ||
    typeof config.maxSpeed !== 'number'
  ) {
    return false;
  }

  // Check reasonable ranges
  if (config.mass < 100 || config.mass > 5000) return false;
  if (config.enginePower < 0 || config.enginePower > 2000) return false;
  if (config.maxSpeed < 0 || config.maxSpeed > 150) return false;

  return true;
}
