/**
 * StatisticsSystem - Persistent game statistics tracking
 *
 * Responsibilities:
 * - Track cumulative game statistics across sessions
 * - Record per-race metrics (crashes, distance, lap time)
 * - Track speed statistics (average, top speed)
 * - Accumulate total play time
 * - Persist statistics to localStorage
 * - Calculate rolling averages for speed statistics
 *
 * Integration Points:
 * - GameEngine: Initialize system on startup, increment play time in update()
 * - TimerSystem: Record race completion with lap time
 * - CrashManager: Track crash counts via recordRaceComplete()
 * - Vehicle: Record vehicle speed via recordSpeed()
 * - UI System: Display statistics on results screen
 *
 * Performance: <5ms for save/load operations
 * Memory: <1MB for statistics data
 *
 * Design Pattern:
 * - Singleton: StatisticsSystem.getInstance()
 * - Storage: localStorage with key 'harddriving_stats'
 * - Versioning: Include version in serialized data for future migrations
 *
 * Usage:
 * ```typescript
 * const stats = StatisticsSystem.getInstance();
 *
 * // Record race completion
 * stats.recordRaceComplete(lapTime, crashCount, distanceTraveled);
 *
 * // Record speed sample (called frequently)
 * stats.recordSpeed(currentSpeed);
 *
 * // Accumulate play time (called from GameEngine each frame)
 * stats.recordPlayTime(deltaTime);
 *
 * // Get current statistics
 * const current = stats.getStats();
 * console.log(`Best lap: ${current.bestLapTime}ms`);
 * ```
 */

/**
 * Represents cumulative game statistics
 */
export interface GameStatistics {
  totalRaces: number; // Number of races completed
  totalCrashes: number; // Total crash count across all races
  totalDistance: number; // Total distance traveled in meters
  bestLapTime: number; // Best lap time achieved in milliseconds
  averageSpeed: number; // Rolling average speed in m/s
  topSpeed: number; // Highest speed achieved in m/s
  timePlayedTotal: number; // Total play time in seconds
}

/**
 * Serialized statistics for localStorage
 */
interface SerializedStatistics extends GameStatistics {
  version: number;
}

/**
 * Singleton StatisticsSystem
 */
export class StatisticsSystem {
  private static instance: StatisticsSystem | null = null;

  // Configuration
  private readonly storageKey: string = 'harddriving_stats';
  private readonly dataVersion: number = 1;
  private readonly speedAveragingAlpha: number = 0.01; // Exponential smoothing factor

  // Internal state
  private stats: GameStatistics;

  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    this.stats = {
      totalRaces: 0,
      totalCrashes: 0,
      totalDistance: 0,
      bestLapTime: Infinity,
      averageSpeed: 0,
      topSpeed: 0,
      timePlayedTotal: 0,
    };
    this.load();
  }

  /**
   * Gets or creates the singleton instance
   * @returns The StatisticsSystem singleton
   */
  public static getInstance(): StatisticsSystem {
    if (!StatisticsSystem.instance) {
      StatisticsSystem.instance = new StatisticsSystem();
    }
    return StatisticsSystem.instance;
  }

  /**
   * Resets the singleton instance (for testing)
   */
  public static resetInstance(): void {
    StatisticsSystem.instance = null;
  }

  /**
   * Records completion of a single race/lap
   *
   * Updates:
   * - Increments total races
   * - Adds crash count to total
   * - Adds distance traveled to total
   * - Updates best lap time if this was faster
   * - Persists changes to localStorage
   *
   * @param lapTime - Lap time in milliseconds
   * @param crashes - Number of crashes during this race
   * @param distance - Distance traveled in meters
   *
   * @example
   * ```typescript
   * stats.recordRaceComplete(45230, 2, 1500);
   * ```
   */
  public recordRaceComplete(
    lapTime: number,
    crashes: number,
    distance: number
  ): void {
    // Validate inputs
    if (lapTime <= 0) {
      console.warn('StatisticsSystem: Invalid lap time');
      return;
    }

    if (crashes < 0) {
      console.warn('StatisticsSystem: Invalid crash count');
      return;
    }

    if (distance < 0) {
      console.warn('StatisticsSystem: Invalid distance');
      return;
    }

    // Update race statistics
    this.stats.totalRaces++;
    this.stats.totalCrashes += crashes;
    this.stats.totalDistance += distance;

    // Update best lap if applicable
    if (lapTime < this.stats.bestLapTime) {
      this.stats.bestLapTime = lapTime;
    }

    // Persist changes
    this.save();
  }

  /**
   * Records a vehicle speed sample
   *
   * Updates:
   * - Top speed if current speed exceeds previous max
   * - Average speed using exponential moving average (EMA) with alpha=0.01
   *
   * Formula: newAvg = oldAvg * (1 - alpha) + currentSpeed * alpha
   *
   * The low alpha value (0.01) ensures smooth averaging that reflects
   * long-term playing patterns rather than momentary spikes.
   *
   * @param speed - Current vehicle speed in m/s
   *
   * @example
   * ```typescript
   * stats.recordSpeed(25.5); // Update average with new sample
   * ```
   */
  public recordSpeed(speed: number): void {
    if (speed < 0) {
      console.warn('StatisticsSystem: Negative speed value');
      return;
    }

    // Update top speed
    if (speed > this.stats.topSpeed) {
      this.stats.topSpeed = speed;
    }

    // Update rolling average speed using exponential smoothing
    this.stats.averageSpeed =
      this.stats.averageSpeed * (1 - this.speedAveragingAlpha) +
      speed * this.speedAveragingAlpha;
  }

  /**
   * Records accumulated play time
   *
   * Adds deltaTime to total play time accumulator.
   * Should be called from GameEngine.update() every frame.
   *
   * @param deltaTime - Time step in seconds
   *
   * @example
   * ```typescript
   * // In GameEngine.update()
   * stats.recordPlayTime(deltaTime);
   * ```
   */
  public recordPlayTime(deltaTime: number): void {
    if (deltaTime < 0) {
      console.warn('StatisticsSystem: Negative deltaTime');
      return;
    }

    this.stats.timePlayedTotal += deltaTime;
  }

  /**
   * Gets a copy of current statistics
   *
   * Returns an immutable snapshot for external systems to read.
   * Modifications to returned object do not affect internal state.
   *
   * @returns Copy of GameStatistics object
   */
  public getStats(): GameStatistics {
    return {
      totalRaces: this.stats.totalRaces,
      totalCrashes: this.stats.totalCrashes,
      totalDistance: this.stats.totalDistance,
      bestLapTime: this.stats.bestLapTime,
      averageSpeed: this.stats.averageSpeed,
      topSpeed: this.stats.topSpeed,
      timePlayedTotal: this.stats.timePlayedTotal,
    };
  }

  /**
   * Gets total races completed
   * @returns Number of races
   */
  public getTotalRaces(): number {
    return this.stats.totalRaces;
  }

  /**
   * Gets total crashes across all races
   * @returns Total crash count
   */
  public getTotalCrashes(): number {
    return this.stats.totalCrashes;
  }

  /**
   * Gets total distance traveled
   * @returns Distance in meters
   */
  public getTotalDistance(): number {
    return this.stats.totalDistance;
  }

  /**
   * Gets best lap time achieved
   * @returns Lap time in milliseconds, or Infinity if no races completed
   */
  public getBestLapTime(): number {
    return this.stats.bestLapTime;
  }

  /**
   * Gets average crash rate (crashes per race)
   * @returns Average crashes, or 0 if no races completed
   */
  public getAverageCrashesPerRace(): number {
    if (this.stats.totalRaces === 0) return 0;
    return this.stats.totalCrashes / this.stats.totalRaces;
  }

  /**
   * Gets average distance per race
   * @returns Average distance in meters, or 0 if no races completed
   */
  public getAverageDistance(): number {
    if (this.stats.totalRaces === 0) return 0;
    return this.stats.totalDistance / this.stats.totalRaces;
  }

  /**
   * Gets average speed across all recorded samples
   * @returns Speed in m/s (rolling average)
   */
  public getAverageSpeed(): number {
    return this.stats.averageSpeed;
  }

  /**
   * Gets top speed achieved
   * @returns Speed in m/s
   */
  public getTopSpeed(): number {
    return this.stats.topSpeed;
  }

  /**
   * Gets total play time
   * @returns Time in seconds
   */
  public getTotalPlayTime(): number {
    return this.stats.timePlayedTotal;
  }

  /**
   * Resets all statistics to initial state
   * Used for fresh starts or testing purposes
   */
  public resetStats(): void {
    this.stats = {
      totalRaces: 0,
      totalCrashes: 0,
      totalDistance: 0,
      bestLapTime: Infinity,
      averageSpeed: 0,
      topSpeed: 0,
      timePlayedTotal: 0,
    };
    this.save();
  }

  /**
   * Internal: Persists statistics to localStorage
   *
   * Handles errors gracefully:
   * - QuotaExceededError: Not expected for small stats, but logs if occurs
   * - Other errors: Logs and continues
   */
  private save(): void {
    try {
      const serialized: SerializedStatistics = {
        version: this.dataVersion,
        ...this.stats,
      };

      const json = JSON.stringify(serialized);
      localStorage.setItem(this.storageKey, json);
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'QuotaExceededError'
      ) {
        console.warn(
          'StatisticsSystem: localStorage quota exceeded (this is unusual for stats)'
        );
      } else {
        console.error('StatisticsSystem: Failed to save statistics:', error);
      }
    }
  }

  /**
   * Internal: Loads statistics from localStorage
   *
   * Handles deserialization and validation:
   * - Validates data types and required fields
   * - Handles version mismatches (for future migrations)
   * - Corrupted data: Logs warning, initializes with defaults
   * - Missing data: Silently initializes with defaults
   */
  private load(): void {
    try {
      const json = localStorage.getItem(this.storageKey);
      if (!json) {
        // No saved data, use defaults
        return;
      }

      const data = JSON.parse(json) as SerializedStatistics;

      // Validate version
      if (data.version !== this.dataVersion) {
        console.warn(
          `StatisticsSystem: Data version mismatch (expected ${this.dataVersion}, got ${data.version})`
        );
        // Could implement migration logic here
      }

      // Validate and assign fields
      const loaded: GameStatistics = {
        totalRaces:
          typeof data.totalRaces === 'number' ? data.totalRaces : 0,
        totalCrashes:
          typeof data.totalCrashes === 'number' ? data.totalCrashes : 0,
        totalDistance:
          typeof data.totalDistance === 'number' ? data.totalDistance : 0,
        bestLapTime:
          typeof data.bestLapTime === 'number' ? data.bestLapTime : Infinity,
        averageSpeed:
          typeof data.averageSpeed === 'number' ? data.averageSpeed : 0,
        topSpeed: typeof data.topSpeed === 'number' ? data.topSpeed : 0,
        timePlayedTotal:
          typeof data.timePlayedTotal === 'number'
            ? data.timePlayedTotal
            : 0,
      };

      // Validate ranges (sanity checks)
      if (
        loaded.totalRaces >= 0 &&
        loaded.totalCrashes >= 0 &&
        loaded.totalDistance >= 0 &&
        loaded.averageSpeed >= 0 &&
        loaded.topSpeed >= 0 &&
        loaded.timePlayedTotal >= 0
      ) {
        this.stats = loaded;
        console.log('StatisticsSystem: Loaded statistics from storage');
      } else {
        console.warn(
          'StatisticsSystem: Loaded statistics contain invalid negative values'
        );
      }
    } catch (error) {
      console.error('StatisticsSystem: Failed to load statistics:', error);
      // Keep default initialization
    }
  }

  /**
   * Disposes resources and cleans up
   * Called when shutting down the game
   */
  public dispose(): void {
    // Save final state before disposal
    this.save();
  }
}
