/**
 * Vehicle tuning. These are arcade-leaning values chosen to be *stable first,
 * fun second* — expect to tune them against playtest feedback. SI units
 * (metres, kilograms, newtons, seconds, radians) throughout.
 */
export const VehicleConfig = {
  // --- Chassis -------------------------------------------------------------
  /** Half-extents of the chassis box collider (full size = 2×). */
  chassisHalfExtents: { x: 0.9, y: 0.35, z: 2.0 }, // 1.8 × 0.7 × 4.0 m
  /** Collider density → mass (≈ density × volume ≈ 230 × 5.04 ≈ 1160 kg). */
  chassisDensity: 230,
  linearDamping: 0.05,
  angularDamping: 0.6, // tames twitchy yaw/roll; raise if it feels skittish

  // --- Wheel layout (local offsets from chassis centre; forward = −Z) ------
  wheelRadius: 0.36,
  halfTrack: 0.85, // left/right offset
  halfWheelbase: 1.45, // front/back offset
  wheelMountY: -0.25, // suspension attach height relative to chassis centre

  // --- Suspension (per wheel) ---------------------------------------------
  suspensionRest: 0.45, // rest length; max ray = rest + wheelRadius
  suspensionStiffness: 45000, // N/m
  suspensionDamping: 4500, // N·s/m

  // --- Drivetrain ----------------------------------------------------------
  maxEngineForce: 9000, // N total (split across grounded wheels)
  maxBrakeForce: 16000, // N total
  reverseForce: 4500, // N total (brake held while ~stopped)
  rollingResistance: 8, // N per (m/s) per wheel
  airDragQuad: 3.0, // N per (m/s)² → top speed ≈ 55 m/s (~198 km/h)

  // --- Steering ------------------------------------------------------------
  maxSteer: 0.55, // rad (~31°)
  steerSpeed: 4.0, // rad/s toward target
  steerSpeedFalloff: 0.6, // fraction of steer removed at highSpeed
  highSpeed: 45, // m/s reference for falloff

  // --- Tires ---------------------------------------------------------------
  lateralGrip: 2.2, // lateral friction coefficient (μ)
  longitudinalGrip: 2.4, // longitudinal friction coefficient (μ)
  handbrakeRearGrip: 0.35, // multiplier on rear lateral grip when handbraking

  // --- Spawn ---------------------------------------------------------------
  spawnHeightMargin: 0.15, // extra clearance so the car drops in, not embeds
} as const;

export type VehicleConfigT = typeof VehicleConfig;
