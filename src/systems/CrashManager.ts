import { Vector3 } from 'three';
import { Vehicle } from '../entities/Vehicle';
import { Track } from '../entities/Track';
import { GameState } from '../core/GameEngine';
import { DamageSeverity } from '../types/VehicleTypes';
import { TimerSystem } from './TimerSystem';

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
   */
  private readonly MINOR_CRASH_THRESHOLD = 5000;

  /**
   * Impact force threshold for major damage (Newtons).
   * Between minor and this: trigger replay.
   */
  private readonly MAJOR_CRASH_THRESHOLD = 15000;

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
   * Callback to trigger state transitions in GameEngine.
   * Will be called with GameState.CRASHED when major crash detected.
   */
  private stateTransitionCallback: ((state: GameState) => void) | null = null;

  /**
   * Current game time (seconds) - updated externally.
   */
  private currentTime = 0;

  /**
   * Enables/disables crash detection.
   * Set to false during replays or non-playing states.
   */
  private enabled = false;

  /**
   * Grace period after initialization (seconds).
   * Crash detection is disabled for this duration to allow physics to settle.
   */
  private readonly GRACE_PERIOD = 0.5; // 500ms / ~30 frames

  /**
   * Time when crash detection was initialized.
   * Used to enforce grace period.
   */
  private initTime = 0;

  constructor() {
    // Initialize velocity tracking
    this.previousVelocity.set(0, 0, 0);
  }

  /**
   * Initializes crash manager with references to game systems.
   *
   * @param vehicle - Vehicle instance to monitor for crashes
   * @param track - Track instance for collision context
   * @param stateTransitionCallback - Function to call for state transitions
   *
   * @example
   * ```typescript
   * crashManager.init(
   *   gameEngine.getVehicle(),
   *   gameEngine.getTrack(),
   *   (state) => gameEngine.setState(state)
   * );
   * ```
   */
  init(
    vehicle: Vehicle,
    track: Track,
    stateTransitionCallback: (state: GameState) => void
  ): void {
    this.vehicle = vehicle;
    this.track = track;
    this.stateTransitionCallback = stateTransitionCallback;
    this.enabled = true;
    this.lastReplayTriggerTime = -this.CRASH_REPLAY_COOLDOWN;
    this.initTime = 0; // Will be set on first update() call

    // Initialize previousVelocity with vehicle's current velocity
    // This prevents false crash detection on first frame
    const transform = vehicle.getTransform();
    this.previousVelocity.copy(transform.linearVelocity);

    console.log('CrashManager initialized');
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

    // Set init time on first update (for grace period)
    if (this.initTime === 0) {
      this.initTime = gameTime;
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
    const timeSinceInit = this.currentTime - this.initTime;
    if (timeSinceInit < this.GRACE_PERIOD) {
      return;
    }

    const currentTransform = this.vehicle.getTransform();
    const currentVelocity = currentTransform.linearVelocity;

    // Calculate velocity delta (reuse temp vector, no allocation)
    this.velocityDelta.copy(currentVelocity).sub(this.previousVelocity);
    const velocityChangeMagnitude = this.velocityDelta.length();

    // No collision if velocity is stable
    if (velocityChangeMagnitude < 0.1) {
      return;
    }

    // Calculate impact force from velocity change
    // F = m * a, where a = dv / dt
    // We approximate: F ≈ m * dv / dt
    // For a fixed 60Hz update: dt = 0.01667
    const vehicleMass = 1200; // kg (from default config)
    const impactForce = vehicleMass * velocityChangeMagnitude / 0.01667;

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
    const timeSinceInit = this.currentTime - this.initTime;
    if (timeSinceInit < this.GRACE_PERIOD) {
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

    // Notify replay trigger listeners
    this.replayTriggerListeners.forEach(listener => {
      try {
        listener(crashEvent);
      } catch (error) {
        console.error('Error in replay trigger listener:', error);
      }
    });

    // Trigger state transition to CRASHED
    if (this.stateTransitionCallback) {
      this.stateTransitionCallback(GameState.CRASHED);
    }
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

    // Get spawn point from track
    const spawnPoint = this.track.getSpawnPoint();

    // Reset vehicle position and velocity
    this.vehicle.reset(spawnPoint.position, spawnPoint.rotation);

    // Reset velocity tracking
    this.previousVelocity.set(0, 0, 0);

    console.log('Vehicle respawned at spawn point');
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
    this.stateTransitionCallback = null;
    this.enabled = false;

    console.log('CrashManager disposed');
  }
}
