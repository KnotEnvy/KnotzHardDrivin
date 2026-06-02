import { Vector3, Quaternion } from 'three';
import { Vehicle } from '../entities/Vehicle';
import { Track } from '../entities/Track';
import { GameState } from '../core/GameEngine';
import { DamageSeverity } from '../types/VehicleTypes';
import { TimerSystem } from './TimerSystem';
import { DamageVisualizationSystem } from './DamageVisualizationSystem';
import { CameraSystem } from './CameraSystem';
import { WaypointSystem } from './WaypointSystem';

/**
 * Crash severity classification based on impact force.
 */
export enum CrashSeverity {
  NONE = 'none',
  MINOR = 'minor',
  MAJOR = 'major',
  CATASTROPHIC = 'catastrophic',
}

/**
 * Crash event data structure for replay triggering and damage calculation.
 */
export interface CrashEvent {
  /**
   * Absolute game time when crash occurred (seconds).
   */
  timestamp: number;

  /**
   * World space position of crash impact.
   */
  position: Vector3;

  /**
   * Vehicle velocity at time of impact (m/s).
   */
  velocity: Vector3;

  /**
   * Impact force magnitude in Newtons.
   * Calculated from velocity change and vehicle mass.
   */
  impactForce: number;

  /**
   * Surface normal at collision point.
   * Direction the vehicle bounced or was deflected.
   */
  collisionNormal: Vector3;

  /**
   * What the vehicle collided with (obstacle name, track section, etc).
   */
  collidedWith: string;

  /**
   * Derived severity level based on impact force.
   */
  severity: CrashSeverity;

  /**
   * Forward velocity before impact (along vehicle forward axis).
   */
  forwardVelocityAtImpact: number;

  /**
   * Vertical velocity component at impact.
   * Used to detect hard landings from jumps.
   */
  verticalVelocityAtImpact: number;

  /**
   * Whether this crash should trigger a replay.
   */
  shouldReplay: boolean;
}

/**
 * Crash detection and replay trigger system.
 *
 * Responsibilities:
 * - Monitor vehicle collisions and velocity changes
 * - Detect crashes using impact force thresholds
 * - Classify crash severity (minor/major/catastrophic)
 * - Trigger replay sequences at appropriate moments
 * - Update vehicle damage state
 * - Handle vehicle respawning after replay
 * - Prevent replay spam with cooldown mechanism
 *
 * Integration Points:
 * - Vehicle: Reads velocity, position, damage state; applies damage
 * - PhysicsWorld: Collision events (future integration)
 * - GameEngine: State transitions (PLAYING -> CRASHED -> REPLAY -> PLAYING)
 * - CameraSystem: Switch to replay camera mode on major crashes
 * - WaypointSystem: Get last waypoint for respawn position
 *
 * Crash Thresholds (from PRD.md Section 4.3.1):
 * - Minor: Impact force < 5000 N (scratch, continue - no replay)
 * - Major: Impact force 5000-15000 N (trigger 10s replay)
 * - Catastrophic: Impact force > 15000 N (extended replay, heavy damage)
 *
 * Hard Landing Detection:
 * - Vertical velocity > -15 m/s on ground contact = crash trigger
 * - Used to catch jumps that end in hard impacts
 *
 * Design Constraints:
 * - Zero per-frame allocations in hot crash detection path
 * - Event-driven architecture (external code subscribes to crash events)
 * - No direct modification of game state (only emit events)
 * - Crash cooldown prevents replay spam (minimum 2 seconds between crash replays)
 */
export class CrashManager {
  /**
   * Impact force threshold for minor damage (Newtons).
   * Below this: no replay, just minor damage.
   * Raised to 25000N to avoid false positives during normal driving.
   */
  private readonly MINOR_CRASH_THRESHOLD = 25000;

  /**
   * Impact force threshold for major damage (Newtons).
   * Between minor and this: trigger replay.
   */
  private readonly MAJOR_CRASH_THRESHOLD = 50000;

  /**
   * Hard landing threshold (vertical velocity in m/s).
   * Negative velocity means downward motion.
   * -15 m/s = approximately 3.5G of deceleration.
   */
  private readonly HARD_LANDING_THRESHOLD = -15;

  /**
   * Minimum vertical collision normal magnitude to count as "ground contact".
   * Dot product of collision normal with up vector.
   * 0.7 = approximately 45 degree angle or steeper.
   */
  private readonly GROUND_CONTACT_THRESHOLD = 0.7;

  /**
   * Cooldown time between crash replays (seconds).
   * Prevents spam of rapid repeated crashes.
   */
  private readonly CRASH_REPLAY_COOLDOWN = 2.0;

  /**
   * Previous frame's velocity for delta calculation (reused, no allocation).
   */
  private previousVelocity = new Vector3();

  /**
   * Temporary vector for velocity delta calculation (reused).
   */
  private velocityDelta = new Vector3();

  /**
   * Temporary vector for forward component calculation (reused).
   */
  private tempVec = new Vector3();

  /**
   * Last time a replay was triggered (seconds).
   * Used to enforce crash replay cooldown.
   */
  private lastReplayTriggerTime = -this.CRASH_REPLAY_COOLDOWN;

  /**
   * List of registered crash event listeners.
   * Called when a crash event occurs.
   */
  private crashListeners: Array<(event: CrashEvent) => void> = [];

  /**
   * List of registered replay trigger listeners.
   * Called when a crash is severe enough to warrant replay.
   */
  private replayTriggerListeners: Array<(event: CrashEvent) => void> = [];

  /**
   * Reference to vehicle for reading physics state.
   */
  private vehicle: Vehicle | null = null;

  /**
   * Reference to track for collision info and respawn point.
   */
  private track: Track | null = null;

  /**
   * Reference to waypoint system for safe respawn at the last passed waypoint.
   */
  private waypointSystem: WaypointSystem | null = null;

  /**
   * Reference to camera system for shake effects.
   */
  private cameraSystem: CameraSystem | null = null;

  /**
   * Callback to trigger state transitions in GameEngine.
   * Will be called with GameState.CRASHED when major crash detected.
   */
  private stateTransitionCallback: ((state: GameState) => void) | null = null;

  /**
   * Current game time (seconds) - updated externally.
   */
  private currentTime = 0;

  /**
   * Timestamp of the last time the vehicle was significantly inverted (up.y < -0.3).
   * Used to suppress the hard-landing detector for a few seconds after the car exits
   * an inverted loop section — the car legitimately falls from loop height and should
   * not trigger a crash just because the landing speed is high.
   */
  private lastInversionTime = -999;

  /**
   * Duration (seconds) after inversion during which hard-landing detection is suppressed.
   * Gives the car time to land from the loop exit without triggering a crash.
   */
  private readonly POST_INVERSION_GRACE = 5.0;

  /**
   * Enables/disables crash detection.
   * Set to false during replays or non-playing states.
   */
  private enabled = false;

  /**
   * Grace period after initialization (seconds).
   * Crash detection is disabled for this duration to allow physics to settle.
   */
  private readonly GRACE_PERIOD = 1.5; // 1500ms / ~90 frames - allows vehicle to settle after spawn

  /**
   * Internal timer tracking time since CrashManager was enabled.
   * Incremented each frame with deltaTime.
   */
  private timeSinceEnabled = 0;

  constructor() {
    // Initialize velocity tracking
    this.previousVelocity.set(0, 0, 0);
  }

  /**
   * Initializes crash manager with references to game systems.
   *
   * @param vehicle - Vehicle instance to monitor for crashes
   * @param track - Track instance for collision context
   * @param cameraSystem - Camera system for shake effects
   * @param stateTransitionCallback - Function to call for state transitions
   *
   * @example
   * ```typescript
   * crashManager.init(
   *   gameEngine.getVehicle(),
   *   gameEngine.getTrack(),
   *   gameEngine.getCameraSystem(),
   *   (state) => gameEngine.setState(state)
   * );
   * ```
   */
  init(
    vehicle: Vehicle,
    track: Track,
    cameraSystem: CameraSystem,
    stateTransitionCallback: (state: GameState) => void,
    waypointSystem?: WaypointSystem
  ): void {
    this.vehicle = vehicle;
    this.track = track;
    this.waypointSystem = waypointSystem ?? null;
    this.cameraSystem = cameraSystem;
    this.stateTransitionCallback = stateTransitionCallback;
    this.enabled = true;
    this.lastReplayTriggerTime = -this.CRASH_REPLAY_COOLDOWN;
    this.timeSinceEnabled = 0; // Reset grace period timer

    // Initialize previousVelocity with vehicle's current velocity
    // This prevents false crash detection on first frame
    const transform = vehicle.getTransform();
    this.previousVelocity.copy(transform.linearVelocity);

    console.log('CrashManager initialized with crash effects support');
  }

  /**
   * Updates crash detection each frame.
   * Should be called from GameEngine's update loop during PLAYING state.
   *
   * Monitors:
   * - Sudden velocity changes (impacts)
   * - Hard landings (vertical velocity threshold)
   * - Collision events from physics system
   *
   * @param deltaTime - Time elapsed since last frame (seconds)
   * @param gameTime - Current game time (seconds)
   *
   * @example
   * ```typescript
   * // In GameEngine.update() during PLAYING state
   * this.crashManager.update(deltaTime, this.getElapsedTime());
   * ```
   */
  update(deltaTime: number, gameTime: number): void {
    if (!this.enabled || !this.vehicle) {
      return;
    }

    this.currentTime = gameTime;

    // Increment time since enabled for grace period check
    this.timeSinceEnabled += deltaTime;

    // Track inversion for the post-inversion hard-landing grace period
    const transform = this.vehicle.getTransform();
    if (transform.up.y < -0.3) {
      this.lastInversionTime = this.currentTime;
    }

    // Check for crashes based on velocity changes
    this.detectCollisionImpact();

    // Check for hard landings from jumps
    this.detectHardLanding();

    // Update velocity tracking for next frame
    this.updateVelocityTracking();
  }

  /**
   * Detects collision impacts by monitoring velocity changes.
   *
   * Algorithm:
   * 1. Calculate velocity delta from previous frame
   * 2. Convert delta to impact force using vehicle mass
   * 3. Classify severity based on force thresholds
   * 4. If major crash: trigger replay and state transition
   * 5. Update vehicle damage regardless of severity
   *
   * Zero per-frame allocations (reuses temp vectors).
   */
  private detectCollisionImpact(): void {
    if (!this.vehicle) {
      return;
    }

    // Grace period: skip crash detection immediately after spawn
    // Allows physics to settle (vehicle falling to ground, etc.)
    if (this.timeSinceEnabled < this.GRACE_PERIOD) {
      return;
    }

    // Post-inversion grace period: after the car completes the inverted part of a
    // loop, it falls from height and lands at high speed. Suppress both hard-landing
    // and collision-impact detection to avoid a false crash from the exit landing.
    if (this.currentTime - this.lastInversionTime < this.POST_INVERSION_GRACE) {
      return;
    }

    const currentTransform = this.vehicle.getTransform();
    const currentVelocity = currentTransform.linearVelocity;

    // Calculate velocity delta (reuse temp vector, no allocation)
    this.velocityDelta.copy(currentVelocity).sub(this.previousVelocity);

    // Use SCALAR speed drop rather than vector-delta magnitude.
    //
    // Rationale: centripetal acceleration (loop, banked turn) continuously
    // rotates the velocity vector without reducing its magnitude — the car
    // keeps the same speed while changing direction.  Using the vector-delta
    // magnitude would measure that direction-change as a huge "deceleration"
    // and trigger a false crash every time the car enters the loop.
    //
    // A genuine wall/obstacle impact DOES drop the scalar speed (kinetic energy
    // is lost to the collision), so the scalar drop is the right discriminator.
    const currentSpeed = currentVelocity.length();
    const previousSpeed = this.previousVelocity.length();
    const scalarSpeedDrop = previousSpeed - currentSpeed; // positive = deceleration

    // Minimum per-frame speed drop to qualify as a crash impulse.
    //
    // Centripetal / suspension forces (loop, banked turn, ramp): the SCALAR
    // speed magnitude barely changes — the car changes direction without losing
    // kinetic energy.  A real wall/obstacle impact does transfer kinetic energy
    // out of the car, producing a measurable per-tick scalar-speed decrease.
    //
    // Hard braking at ~1.5 G = ~15 m/s²  →  15/60 ≈ 0.25 m/s per tick
    // Smooth ramp/loop entry contact     →  typically < 0.5 m/s per tick
    // Real wall crash at 26 m/s          →  many m/s per tick (> 5 m/s typical)
    //
    // Minimum per-frame speed drop.
    //
    // Centripetal forces (loop, bank): zero scalar speed change → never triggers.
    // Hard braking: ~15 m/s² → 0.25 m/s per tick → no trigger.
    // Loop entry contact (car box slides over rising ramp): 1-2 m/s per tick.
    // Genuine wall crash at >10 m/s: 5+ m/s per tick → triggers.
    //
    // Threshold set at 5.0 m/s/tick (300 m/s² = 30 G) to skip loop-entry contacts
    // while catching genuine high-speed wall impacts (30+ G).
    const MIN_CRASH_SPEED_DROP = 5.0; // m/s per physics tick (60 Hz)
    if (scalarSpeedDrop < MIN_CRASH_SPEED_DROP) {
      return;
    }

    // Calculate impact force from scalar speed drop.
    // F = m * Δv / Δt  — here Δv is the scalar speed loss, so this measures
    // the longitudinal deceleration impulse rather than the centripetal force.
    const vehicleMass = 1200; // kg (from default config)
    const impactForce = vehicleMass * scalarSpeedDrop / 0.01667;

    // Only trigger on significant impacts
    if (impactForce < this.MINOR_CRASH_THRESHOLD) {
      return;
    }

    // Determine collision normal (approximate from velocity delta direction)
    // The vehicle bounced in the direction opposite to velocity change
    this.tempVec.copy(this.velocityDelta).normalize().multiplyScalar(-1);
    const collisionNormal = this.tempVec.clone();

    // Calculate forward velocity component
    const forwardComponent = this.velocityDelta.dot(currentTransform.forward);

    // Calculate vertical velocity component
    const verticalComponent = this.velocityDelta.y;

    // Create crash event
    const crashEvent: CrashEvent = {
      timestamp: this.currentTime,
      position: currentTransform.position.clone(),
      velocity: currentVelocity.clone(),
      impactForce,
      collisionNormal,
      collidedWith: 'obstacle', // Will be refined with physics callbacks
      severity: this.calculateSeverity(impactForce),
      forwardVelocityAtImpact: forwardComponent,
      verticalVelocityAtImpact: verticalComponent,
      shouldReplay: this.shouldTriggerReplay(impactForce),
    };

    // Notify crash listeners
    this.notifyCrashEvent(crashEvent);

    // Update vehicle damage
    this.applyDamage(crashEvent);

    // Trigger crash effects (particles + camera shake)
    this.triggerCrashVisualEffects(crashEvent);

    // Trigger replay if major crash and not in cooldown
    if (crashEvent.shouldReplay && this.isReplayAvailable()) {
      this.triggerReplaySequence(crashEvent);
    }
  }

  /**
   * Detects hard landings from jumps/ramps.
   *
   * A hard landing occurs when:
   * 1. Vehicle transitions from airborne to grounded state
   * 2. Vertical velocity exceeds HARD_LANDING_THRESHOLD (downward)
   * 3. Impact is perpendicular to ground (dot product check)
   *
   * This catches scenarios where vehicle lands from a jump with too much speed.
   */
  private detectHardLanding(): void {
    if (!this.vehicle) {
      return;
    }

    // Grace period: skip crash detection immediately after spawn
    if (this.timeSinceEnabled < this.GRACE_PERIOD) {
      return;
    }

    // Post-inversion grace period: after the car has been inverted (on the loop),
    // it may legitimately fall from loop height and land at high vertical speed.
    // Suppress hard-landing detection for POST_INVERSION_GRACE seconds after
    // the last inversion event to avoid a false crash on the loop exit landing.
    if (this.currentTime - this.lastInversionTime < this.POST_INVERSION_GRACE) {
      return;
    }

    const telemetry = this.vehicle.getTelemetry();
    const transform = this.vehicle.getTransform();
    const verticalVelocity = transform.linearVelocity.y;

    // Only check when vehicle is just becoming grounded
    // (was airborne, now grounded)
    if (telemetry.wheelsOnGround === 0) {
      return; // Still airborne
    }

    // Check if landing velocity exceeds threshold
    if (verticalVelocity > this.HARD_LANDING_THRESHOLD) {
      return; // Soft landing
    }

    // Calculate impact force from vertical velocity drop
    const vehicleMass = 1200;
    const verticalImpactForce = vehicleMass * Math.abs(verticalVelocity) / 0.01667;

    // Only trigger if significant
    if (verticalImpactForce < this.MINOR_CRASH_THRESHOLD) {
      return;
    }

    // Create hard landing crash event
    const crashEvent: CrashEvent = {
      timestamp: this.currentTime,
      position: transform.position.clone(),
      velocity: transform.linearVelocity.clone(),
      impactForce: verticalImpactForce,
      collisionNormal: new Vector3(0, 1, 0), // Vertical impact
      collidedWith: 'ground',
      severity: this.calculateSeverity(verticalImpactForce),
      forwardVelocityAtImpact: 0,
      verticalVelocityAtImpact: verticalVelocity,
      shouldReplay: this.shouldTriggerReplay(verticalImpactForce),
    };

    // Notify listeners and apply damage
    this.notifyCrashEvent(crashEvent);
    this.applyDamage(crashEvent);

    // Trigger crash effects (particles + camera shake)
    this.triggerCrashVisualEffects(crashEvent);

    // Trigger replay if warranted
    if (crashEvent.shouldReplay && this.isReplayAvailable()) {
      this.triggerReplaySequence(crashEvent);
    }
  }

  /**
   * Updates velocity tracking for next frame's delta calculation.
   * Called at end of update() to capture current velocity for comparison.
   *
   * Reuses previousVelocity vector to avoid allocation.
   */
  private updateVelocityTracking(): void {
    if (!this.vehicle) {
      return;
    }

    const transform = this.vehicle.getTransform();
    this.previousVelocity.copy(transform.linearVelocity);
  }

  /**
   * Calculates crash severity based on impact force.
   *
   * Thresholds from PRD.md Section 4.3.1:
   * - NONE: Force < 5000 N
   * - MINOR: Force 5000-15000 N
   * - MAJOR/CATASTROPHIC: Force > 15000 N
   *
   * @param impactForce - Impact force in Newtons
   * @returns Severity classification
   */
  private calculateSeverity(impactForce: number): CrashSeverity {
    if (impactForce < this.MINOR_CRASH_THRESHOLD) {
      return CrashSeverity.NONE;
    }

    if (impactForce < this.MAJOR_CRASH_THRESHOLD) {
      return CrashSeverity.MINOR;
    }

    if (impactForce < this.MAJOR_CRASH_THRESHOLD * 1.5) {
      return CrashSeverity.MAJOR;
    }

    return CrashSeverity.CATASTROPHIC;
  }

  /**
   * Determines if a crash should trigger replay playback.
   *
   * Replay threshold: Force >= MINOR_CRASH_THRESHOLD
   * - Minor and above: Show replay
   * - Below minor: Continue without replay
   *
   * @param impactForce - Impact force in Newtons
   * @returns true if replay should play, false otherwise
   */
  private shouldTriggerReplay(impactForce: number): boolean {
    return impactForce >= this.MINOR_CRASH_THRESHOLD;
  }

  /**
   * Checks if enough time has passed since last replay trigger.
   * Implements cooldown to prevent replay spam from rapid collisions.
   *
   * @returns true if replay can be triggered, false if in cooldown
   */
  private isReplayAvailable(): boolean {
    const timeSinceLastReplay = this.currentTime - this.lastReplayTriggerTime;
    return timeSinceLastReplay >= this.CRASH_REPLAY_COOLDOWN;
  }

  /**
   * Applies damage to the vehicle based on crash event.
   * Updates vehicle damage state which affects performance.
   *
   * @param crashEvent - Crash event with impact force
   */
  private applyDamage(crashEvent: CrashEvent): void {
    if (!this.vehicle) {
      return;
    }

    // Calculate damage percentage based on impact force
    // Normalize against catastrophic threshold
    const normalizedForce = Math.min(
      crashEvent.impactForce / (this.MAJOR_CRASH_THRESHOLD * 2),
      1.0
    );

    // Map severity to damage amount
    let damageAmount = 0;
    let penaltySeconds = 0; // Phase 5A: Timer penalty
    switch (crashEvent.severity) {
      case CrashSeverity.MINOR:
        damageAmount = normalizedForce * 0.05; // 5% max per minor crash
        penaltySeconds = 5; // -5 seconds for minor crash (Phase 5A)
        break;
      case CrashSeverity.MAJOR:
        damageAmount = normalizedForce * 0.15; // 15% max per major crash
        penaltySeconds = 10; // -10 seconds for major crash (Phase 5A)
        break;
      case CrashSeverity.CATASTROPHIC:
        damageAmount = normalizedForce * 0.30; // 30% max per catastrophic
        penaltySeconds = 15; // -15 seconds for catastrophic crash (Phase 5A)
        break;
      case CrashSeverity.NONE:
        damageAmount = 0;
        penaltySeconds = 0;
        break;
    }

    // Accumulate damage (don't exceed 100%)
    const damageState = this.vehicle.getDamageState();
    damageState.overallDamage = Math.min(
      damageState.overallDamage + damageAmount,
      1.0
    );

    // Update severity classification
    if (damageState.overallDamage < 0.33) {
      damageState.severity = DamageSeverity.NONE;
    } else if (damageState.overallDamage < 0.66) {
      damageState.severity = DamageSeverity.MODERATE;
    } else {
      damageState.severity = DamageSeverity.SEVERE;
    }

    // Update performance penalty
    damageState.performancePenalty = damageState.overallDamage * 0.5; // Up to 50% performance penalty

    // Increment crash counter
    damageState.crashCount++;

    // Add collision to recent history
    damageState.recentCollisions.push({
      timestamp: this.currentTime,
      position: crashEvent.position,
      velocity: crashEvent.velocity,
      impactForce: crashEvent.impactForce,
      normal: crashEvent.collisionNormal,
      collidedWith: crashEvent.collidedWith,
      severity: this.mapCrashSeverityToDamage(crashEvent.severity),
    });

    // Limit collision history (keep last 10)
    if (damageState.recentCollisions.length > 10) {
      damageState.recentCollisions = damageState.recentCollisions.slice(-10);
    }

    // Apply timer penalty (Phase 5A)
    if (penaltySeconds > 0) {
      const timerSystem = TimerSystem.getInstance();
      timerSystem.applyPenalty(penaltySeconds);
    }
  }

  /**
   * Maps crash severity to damage severity for tracking.
   *
   * @param crashSeverity - Crash severity classification
   * @returns Corresponding damage severity
   */
  private mapCrashSeverityToDamage(crashSeverity: CrashSeverity): DamageSeverity {
    switch (crashSeverity) {
      case CrashSeverity.NONE:
        return DamageSeverity.NONE;
      case CrashSeverity.MINOR:
        return DamageSeverity.MINOR;
      case CrashSeverity.MAJOR:
        return DamageSeverity.SEVERE;
      case CrashSeverity.CATASTROPHIC:
        return DamageSeverity.CATASTROPHIC;
    }
  }

  /**
   * Triggers crash visual effects (particles + camera shake).
   *
   * Called for ALL crashes (minor, major, catastrophic) to provide
   * immediate visual feedback. Effects scale with crash severity:
   *
   * MINOR:
   * - 15 sparks, 5 debris pieces
   * - Camera shake: 0.3 intensity, 0.5s duration
   *
   * MAJOR:
   * - 30 sparks, 15 debris pieces
   * - Camera shake: 0.6 intensity, 1.0s duration
   *
   * CATASTROPHIC:
   * - 50 sparks, 25 debris pieces
   * - Camera shake: 1.0 intensity, 1.5s duration
   *
   * Performance: <2ms total (particle emission + shake trigger)
   *
   * @param crashEvent - Crash event with position, normal, velocity, severity
   */
  private triggerCrashVisualEffects(crashEvent: CrashEvent): void {
    // Get damage visualization system for particle effects
    const damageSystem = DamageVisualizationSystem.getInstance();

    // Map CrashSeverity to particle severity string
    let particleSeverity: 'minor' | 'major' | 'catastrophic' = 'minor';
    let shakeIntensity = 0.3;
    let shakeDuration = 0.5;

    switch (crashEvent.severity) {
      case CrashSeverity.MINOR:
        particleSeverity = 'minor';
        shakeIntensity = 0.3;
        shakeDuration = 0.5;
        break;
      case CrashSeverity.MAJOR:
        particleSeverity = 'major';
        shakeIntensity = 0.6;
        shakeDuration = 1.0;
        break;
      case CrashSeverity.CATASTROPHIC:
        particleSeverity = 'catastrophic';
        shakeIntensity = 1.0;
        shakeDuration = 1.5;
        break;
      case CrashSeverity.NONE:
        // No effects for minor bumps
        return;
    }

    // Trigger particle effects (sparks + debris)
    damageSystem.triggerCrashEffects(
      crashEvent.position,
      crashEvent.collisionNormal,
      crashEvent.velocity,
      particleSeverity
    );

    // Trigger camera shake
    if (this.cameraSystem) {
      this.cameraSystem.applyCameraShake(shakeIntensity, shakeDuration);
    }
  }

  /**
   * Triggers the replay sequence for a major crash.
   *
   * Effects:
   * 1. Records replay trigger time (for cooldown)
   * 2. Notifies replay trigger listeners (UI, replay system)
   * 3. Triggers state transition: PLAYING -> CRASHED
   * 4. CameraSystem will switch to replay camera mode
   * 5. ReplaySystem will begin playback
   *
   * Called only when:
   * - Impact force >= MINOR_CRASH_THRESHOLD
   * - Cooldown period has elapsed
   * - Game is in PLAYING state
   *
   * @param crashEvent - Crash event that triggered replay
   */
  private triggerReplaySequence(crashEvent: CrashEvent): void {
    // Record trigger time for cooldown
    this.lastReplayTriggerTime = this.currentTime;

    console.log(
      `Crash detected! Force: ${crashEvent.impactForce.toFixed(0)}N, ` +
      `Severity: ${crashEvent.severity}, Position: (${crashEvent.position.x.toFixed(1)}, ` +
      `${crashEvent.position.y.toFixed(1)}, ${crashEvent.position.z.toFixed(1)})`
    );

    // Trigger state transition to CRASHED FIRST (before notifying listeners)
    // This ensures the state is CRASHED when handleCrashReplayTrigger runs
    if (this.stateTransitionCallback) {
      this.stateTransitionCallback(GameState.CRASHED);
    }

    // THEN notify replay trigger listeners
    // At this point, state is CRASHED and listeners can set up the replay
    this.replayTriggerListeners.forEach(listener => {
      try {
        listener(crashEvent);
      } catch (error) {
        console.error('Error in replay trigger listener:', error);
      }
    });
  }

  /**
   * Notifies all registered crash listeners of a crash event.
   * Crash listeners are called for all crashes (even minor ones).
   * Useful for visual feedback, UI updates, sound effects.
   *
   * @param crashEvent - Crash event data
   */
  private notifyCrashEvent(crashEvent: CrashEvent): void {
    this.crashListeners.forEach(listener => {
      try {
        listener(crashEvent);
      } catch (error) {
        console.error('Error in crash listener:', error);
      }
    });
  }

  /**
   * Registers a listener to be called when any crash is detected.
   * Called for all crashes including minor ones.
   *
   * Use case: UI feedback, sound effects, particle effects, telemetry.
   *
   * @param listener - Callback function receiving crash event
   *
   * @example
   * ```typescript
   * crashManager.onCrash((event) => {
   *   console.log(`Crash: ${event.severity} at ${event.position}`);
   *   audioSystem.playCrashSound(event.impactForce);
   * });
   * ```
   */
  onCrash(listener: (event: CrashEvent) => void): void {
    this.crashListeners.push(listener);
  }

  /**
   * Registers a listener to be called when a crash triggers a replay.
   * Called only for major crashes that warrant replay playback.
   *
   * Use case: Start replay recording, switch camera, pause game logic.
   *
   * @param listener - Callback function receiving crash event
   *
   * @example
   * ```typescript
   * crashManager.onReplayTrigger((event) => {
   *   replaySystem.startPlayback(event.timestamp);
   *   cameraSystem.switchToReplayMode();
   * });
   * ```
   */
  onReplayTrigger(listener: (event: CrashEvent) => void): void {
    this.replayTriggerListeners.push(listener);
  }

  /**
   * Respawns the vehicle after replay viewing.
   * Resets position to spawn point but retains damage.
   *
   * Called from GameEngine when transitioning REPLAY -> PLAYING.
   * Alternatively called directly after replay completes.
   *
   * @example
   * ```typescript
   * // After replay finishes
   * crashManager.respawnVehicle();
   * gameEngine.setState(GameState.PLAYING);
   * ```
   */
  respawnVehicle(): void {
    if (!this.vehicle || !this.track) {
      console.warn('Cannot respawn: vehicle or track not initialized');
      return;
    }

    // Respawn at the track spawn point — this guarantees flat, driveable ground.
    //
    // Auto-generated waypoint positions are sampled from the spline parameter
    // space and can land anywhere on the track geometry (including mid-loop
    // elevated sections), making them unsafe for respawn without additional
    // height filtering.  The spawn point is always at ground level and far
    // enough back from the loop to give a full run-up, which is the correct
    // player experience after a loop crash.
    const spawnPoint = this.track.getSpawnPoint();
    const respawnPosition = spawnPoint.position;
    const respawnRotation = spawnPoint.rotation;

    console.log(`Vehicle respawned at track spawn: (${respawnPosition.x.toFixed(1)}, ${respawnPosition.y.toFixed(1)}, ${respawnPosition.z.toFixed(1)})`);

    // Reset vehicle position and velocity
    this.vehicle.reset(respawnPosition, respawnRotation);

    // Reset velocity tracking
    this.previousVelocity.set(0, 0, 0);
  }

  /**
   * Clears all damage and resets to pristine state.
   * Typically called at race start or via settings/admin.
   *
   * @example
   * ```typescript
   * // Reset damage between races
   * crashManager.clearDamage();
   * ```
   */
  clearDamage(): void {
    if (!this.vehicle) {
      return;
    }

    const damageState = this.vehicle.getDamageState();
    damageState.overallDamage = 0;
    damageState.severity = DamageSeverity.NONE;
    damageState.performancePenalty = 0;
    damageState.crashCount = 0;
    damageState.recentCollisions = [];

    console.log('Vehicle damage cleared');
  }

  /**
   * Enables or disables crash detection.
   * Typically disabled during replays or non-playing states.
   *
   * @param enabled - True to enable crash detection, false to disable
   *
   * @example
   * ```typescript
   * // Disable during replay playback
   * crashManager.setEnabled(false);
   *
   * // Re-enable when returning to PLAYING state
   * crashManager.setEnabled(true);
   * ```
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Re-arms crash detection after a respawn.
   *
   * A respawn teleports the vehicle (velocity zeroed) and re-enables detection.
   * Without resetting the detection baselines this produces a false crash on the
   * very next frame, because:
   * - `previousVelocity` is frozen at the pre-crash speed (update() early-returns
   *   while disabled, so velocity tracking never captured the stop), making the
   *   first post-respawn `scalarSpeedDrop` huge.
   * - the post-spawn settle grace (`timeSinceEnabled`) and the post-inversion
   *   grace (`lastInversionTime`) are stale, so the settling car isn't protected.
   *
   * Call this instead of `setEnabled(true)` when returning to PLAYING after a
   * replay/respawn. Mirrors the baseline setup done in {@link init}.
   */
  resetDetectionState(): void {
    this.timeSinceEnabled = 0;          // fresh post-spawn settle grace
    this.lastInversionTime = -999;      // clear any frozen inversion grace
    if (this.vehicle) {
      // Re-baseline so the first frame's velocity delta is ~0 (no phantom impact).
      this.previousVelocity.copy(this.vehicle.getTransform().linearVelocity);
    }
    this.enabled = true;
  }

  /**
   * Checks if crash detection is currently active.
   *
   * @returns true if crash detection is enabled and monitoring
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Gets the current crash cooldown progress (0-1).
   * 0 = cooldown expired, ready for replay
   * 1 = just triggered, must wait
   *
   * Useful for UI cooldown indicators.
   *
   * @returns Cooldown progress (0-1)
   */
  getCrashCooldownProgress(): number {
    const timeSinceReplay = this.currentTime - this.lastReplayTriggerTime;
    const progress = timeSinceReplay / this.CRASH_REPLAY_COOLDOWN;
    return Math.min(progress, 1.0);
  }

  /**
   * Gets detailed crash statistics for current session.
   * Useful for HUD telemetry and debugging.
   *
   * @returns Object with crash statistics
   *
   * @example
   * ```typescript
   * const stats = crashManager.getStatistics();
   * console.log(`Crashes this session: ${stats.totalCrashes}`);
   * console.log(`Last crash severity: ${stats.lastCrashSeverity}`);
   * ```
   */
  getStatistics() {
    if (!this.vehicle) {
      return {
        totalCrashes: 0,
        lastCrashSeverity: CrashSeverity.NONE,
        totalDamage: 0,
        recentCollisions: [],
      };
    }

    const damageState = this.vehicle.getDamageState();

    return {
      totalCrashes: damageState.crashCount,
      lastCrashSeverity: damageState.recentCollisions.length > 0
        ? damageState.recentCollisions[damageState.recentCollisions.length - 1].severity
        : CrashSeverity.NONE,
      totalDamage: damageState.overallDamage,
      recentCollisions: damageState.recentCollisions,
    };
  }

  /**
   * Unsubscribes all listeners and cleans up resources.
   * Called when transitioning away from PLAYING state or at game shutdown.
   */
  dispose(): void {
    this.crashListeners = [];
    this.replayTriggerListeners = [];
    this.vehicle = null;
    this.track = null;
    this.waypointSystem = null;
    this.stateTransitionCallback = null;
    this.enabled = false;

    console.log('CrashManager disposed');
  }
}
