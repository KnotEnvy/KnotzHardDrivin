/**
 * TimerSystem - Race timing, scoring, and lap tracking
 *
 * Responsibilities:
 * - Manage race time countdown (120 seconds initial)
 * - Track elapsed time since race start
 * - Record individual lap times
 * - Track best lap time
 * - Apply time bonuses (checkpoints: +30s)
 * - Apply time penalties (crashes: -5s, -10s, -15s)
 * - Detect time expiration (game over)
 * - Emit events for UI/gameplay systems
 * - Format time for display (MM:SS.mmm)
 *
 * Integration Points:
 * - GameEngine: Start/stop/pause/resume on state changes
 * - WaypointSystem: onCheckpointPassed() when checkpoint reached, onLapCompleted() on lap finish
 * - CrashManager: applyPenalty() based on crash severity
 * - UI: Subscribe to TIME_EXPIRED event for results screen
 *
 * Performance: <0.5ms per frame
 * Zero per-frame allocations (uses internal state only)
 *
 * Design Pattern:
 * - Singleton: TimerSystem.getInstance()
 * - Observer: Subscribe to timer events (TIME_BONUS, LAP_COMPLETE, TIME_EXPIRED, PENALTY)
 *
 * Usage:
 * ```typescript
 * const timer = TimerSystem.getInstance();
 * timer.start();
 * timer.update(deltaTime);
 * if (someCheckpointReached) {
 *   timer.onCheckpointPassed(30); // 30 second bonus
 * }
 * const formatted = timer.formatTime(timer.getState().raceTime);
 * ```
 */

/**
 * Timer event types for observer pattern
 */
export enum TimerEvent {
  CHECKPOINT_BONUS = 'checkpoint_bonus',
  LAP_COMPLETE = 'lap_complete',
  TIME_EXPIRED = 'time_expired',
  PENALTY_APPLIED = 'penalty_applied',
  RACE_STARTED = 'race_started',
  RACE_PAUSED = 'race_paused',
  RACE_RESUMED = 'race_resumed',
}

/**
 * Timer state snapshot (immutable copy)
 */
export interface TimerState {
  raceTime: number; // Total elapsed time (ms)
  remainingTime: number; // Countdown timer (ms)
  lapStartTime: number; // Current lap start time (ms)
  currentLap: number; // Current lap number (1-based)
  lapTimes: number[]; // Array of completed lap times (ms)
  bestLapTime: number; // Best lap time achieved (ms)
}

/**
 * Observer callback type for timer events
 */
type TimerEventCallback = (event: TimerEvent, data?: any) => void;

/**
 * Singleton TimerSystem
 */
export class TimerSystem {
  private static instance: TimerSystem | null = null;

  // Timer state
  private state: TimerState;
  private initialTime: number = 120000; // 120 seconds in milliseconds
  private running: boolean = false;
  private paused: boolean = false;

  // Timing tracking
  private startTime: number = 0; // Absolute start time (performance.now())
  private pauseTime: number = 0; // Time when paused (for pause/resume)
  private pausedDuration: number = 0; // Total paused time (ms)

  // Observer pattern
  private observers: Set<TimerEventCallback> = new Set();

  // Temp for avoiding allocations
  private lapTimeSnapshot: number = 0;

  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    this.state = {
      raceTime: 0,
      remainingTime: this.initialTime,
      lapStartTime: 0,
      currentLap: 1,
      lapTimes: [],
      bestLapTime: Infinity,
    };
  }

  /**
   * Gets or creates the singleton instance
   * @returns The TimerSystem singleton
   */
  public static getInstance(): TimerSystem {
    if (!TimerSystem.instance) {
      TimerSystem.instance = new TimerSystem();
    }
    return TimerSystem.instance;
  }

  /**
   * Resets the singleton instance (for testing)
   */
  public static resetInstance(): void {
    TimerSystem.instance = null;
  }

  /**
   * Starts the timer and begins race timing
   * Called when entering PLAYING state
   */
  public start(): void {
    this.running = true;
    this.paused = false;
    this.startTime = performance.now();
    this.pausedDuration = 0;

    // Initialize lap start time
    this.state.lapStartTime = performance.now();
    this.state.raceTime = 0;

    this.emit(TimerEvent.RACE_STARTED);
  }

  /**
   * Stops the timer completely
   * Called when exiting PLAYING state or on race end
   */
  public stop(): void {
    this.running = false;
    this.paused = false;
  }

  /**
   * Pauses the timer without stopping it
   * Called when entering PAUSED state
   */
  public pause(): void {
    if (!this.running || this.paused) return;

    this.paused = true;
    this.pauseTime = performance.now();

    this.emit(TimerEvent.RACE_PAUSED);
  }

  /**
   * Resumes the timer from pause
   * Called when entering PLAYING state from PAUSED
   */
  public resume(): void {
    if (!this.running || !this.paused) return;

    const pauseDuration = performance.now() - this.pauseTime;
    this.pausedDuration += pauseDuration;
    this.paused = false;

    this.emit(TimerEvent.RACE_RESUMED);
  }

  /**
   * Updates the timer each frame
   * Called from GameEngine.update() with deltaTime
   *
   * @param deltaTime - Time step in seconds
   */
  public update(deltaTime: number): void {
    if (!this.running || this.paused) return;

    // Calculate elapsed time since race start
    const now = performance.now();
    const totalElapsed = now - this.startTime - this.pausedDuration;
    this.state.raceTime = totalElapsed;

    // Decrement remaining time
    this.state.remainingTime = Math.max(0, this.initialTime - totalElapsed);

    // Check if time expired
    if (this.state.remainingTime <= 0) {
      this.onTimeExpired();
    }
  }

  /**
   * Called when vehicle passes through a checkpoint
   * Adds time bonus and emits event
   *
   * @param timeBonus - Seconds to add (typically 30)
   */
  public onCheckpointPassed(timeBonus: number): void {
    if (!this.running) return;

    // Convert seconds to milliseconds and add to remaining time
    const bonusMs = timeBonus * 1000;
    this.state.remainingTime = Math.min(300000, this.state.remainingTime + bonusMs); // Cap at 300s

    this.emit(TimerEvent.CHECKPOINT_BONUS, { timeBonus, totalRemaining: this.state.remainingTime });
  }

  /**
   * Called when a lap is completed
   * Records lap time and updates best lap
   * Emits event for UI updates
   */
  public onLapCompleted(): void {
    if (!this.running) return;

    // Calculate this lap's time
    const now = performance.now();
    const lapTime = now - this.state.lapStartTime;

    // Record lap time
    this.state.lapTimes.push(lapTime);

    // Update best lap if this was faster
    if (lapTime < this.state.bestLapTime) {
      this.state.bestLapTime = lapTime;
    }

    // Start next lap timer
    this.state.lapStartTime = performance.now();

    // Increment lap counter
    this.state.currentLap++;

    this.emit(TimerEvent.LAP_COMPLETE, {
      lapNumber: this.state.currentLap - 1, // Previous lap number
      lapTime,
      bestLapTime: this.state.bestLapTime,
      isNewBest: lapTime === this.state.bestLapTime,
    });
  }

  /**
   * Applies a time penalty (negative time bonus)
   * Called by CrashManager based on crash severity
   *
   * Severity penalty values (from PRD.md Section 4.4.1):
   * - MINOR: -5 seconds
   * - MAJOR: -10 seconds
   * - CATASTROPHIC: -15 seconds
   *
   * @param penaltySeconds - Seconds to subtract
   */
  public applyPenalty(penaltySeconds: number): void {
    if (!this.running) return;

    const penaltyMs = penaltySeconds * 1000;
    this.state.remainingTime = Math.max(0, this.state.remainingTime - penaltyMs);

    this.emit(TimerEvent.PENALTY_APPLIED, {
      penaltySeconds,
      totalRemaining: this.state.remainingTime,
    });
  }

  /**
   * Called when time expires (remainingTime <= 0)
   * Stops timer and emits event for game state transition
   *
   * GameEngine subscribes to this and transitions to RESULTS state
   */
  private onTimeExpired(): void {
    this.running = false;

    this.emit(TimerEvent.TIME_EXPIRED, {
      finalTime: this.state.raceTime,
      finalLap: this.state.currentLap - 1,
    });
  }

  /**
   * Formats milliseconds to MM:SS.mmm format
   * Example: 125500ms -> "02:05.50"
   *
   * @param milliseconds - Time to format
   * @returns Formatted time string MM:SS.mmm
   */
  public formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10); // Centiseconds (0-99)

    return (
      `${minutes.toString().padStart(2, '0')}:` +
      `${seconds.toString().padStart(2, '0')}.` +
      `${ms.toString().padStart(2, '0')}`
    );
  }

  /**
   * Gets a copy of the current timer state
   * Returns immutable snapshot for UI/external systems
   *
   * @returns Copy of TimerState
   */
  public getState(): TimerState {
    return {
      raceTime: this.state.raceTime,
      remainingTime: this.state.remainingTime,
      lapStartTime: this.state.lapStartTime,
      currentLap: this.state.currentLap,
      lapTimes: [...this.state.lapTimes], // Shallow copy of array
      bestLapTime: this.state.bestLapTime,
    };
  }

  /**
   * Gets formatted race time string
   * @returns Formatted MM:SS.mmm string
   */
  public getFormattedRaceTime(): string {
    return this.formatTime(this.state.raceTime);
  }

  /**
   * Gets formatted remaining time string
   * @returns Formatted MM:SS.mmm string
   */
  public getFormattedRemainingTime(): string {
    return this.formatTime(this.state.remainingTime);
  }

  /**
   * Gets formatted best lap time
   * @returns Formatted MM:SS.mmm string or "--:--" if no laps completed
   */
  public getFormattedBestLapTime(): string {
    if (this.state.bestLapTime === Infinity) {
      return '--:--';
    }
    return this.formatTime(this.state.bestLapTime);
  }

  /**
   * Gets the current lap number
   * @returns Current lap (1-based)
   */
  public getCurrentLap(): number {
    return this.state.currentLap;
  }

  /**
   * Gets the total number of completed laps
   * @returns Number of laps completed
   */
  public getCompletedLaps(): number {
    return this.state.lapTimes.length;
  }

  /**
   * Gets best lap time in milliseconds
   * @returns Best lap time or Infinity if no laps completed
   */
  public getBestLapTime(): number {
    return this.state.bestLapTime;
  }

  /**
   * Gets all recorded lap times
   * @returns Array of lap times in milliseconds
   */
  public getLapTimes(): number[] {
    return [...this.state.lapTimes];
  }

  /**
   * Checks if timer is currently running
   * @returns true if running, false if stopped or paused
   */
  public isRunning(): boolean {
    return this.running && !this.paused;
  }

  /**
   * Checks if timer is paused
   * @returns true if paused, false otherwise
   */
  public isPaused(): boolean {
    return this.paused;
  }

  /**
   * Resets timer to initial state
   * Useful for restarting race or returning to menu
   */
  public reset(): void {
    this.running = false;
    this.paused = false;
    this.state = {
      raceTime: 0,
      remainingTime: this.initialTime,
      lapStartTime: 0,
      currentLap: 1,
      lapTimes: [],
      bestLapTime: Infinity,
    };
    this.startTime = 0;
    this.pauseTime = 0;
    this.pausedDuration = 0;
  }

  /**
   * Sets the initial race time
   * Used for custom race durations (future feature)
   *
   * @param milliseconds - Initial race time in milliseconds
   */
  public setInitialTime(milliseconds: number): void {
    this.initialTime = Math.max(10000, milliseconds); // Minimum 10 seconds
    if (!this.running) {
      this.state.remainingTime = this.initialTime;
    }
  }

  /**
   * Subscribes to timer events
   * @param callback - Function to call on events
   */
  public subscribe(callback: TimerEventCallback): void {
    this.observers.add(callback);
  }

  /**
   * Unsubscribes from timer events
   * @param callback - Function to remove
   */
  public unsubscribe(callback: TimerEventCallback): void {
    this.observers.delete(callback);
  }

  /**
   * Emits an event to all subscribers
   * Internal method
   *
   * @param event - TimerEvent to emit
   * @param data - Optional data to pass with event
   */
  private emit(event: TimerEvent, data?: any): void {
    this.observers.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error(`Error in timer observer callback: ${error}`);
      }
    });
  }

  /**
   * Disposes resources and cleans up
   * Called when leaving game
   */
  public dispose(): void {
    this.running = false;
    this.paused = false;
    this.observers.clear();
  }
}
