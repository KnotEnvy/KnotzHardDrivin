/**
 * LeaderboardSystem - Persistent top 10 lap times storage
 *
 * Responsibilities:
 * - Maintain a ranked list of best lap times (top 10)
 * - Persist leaderboard data to browser localStorage
 * - Serialize/deserialize data (Date -> ISO string, Uint8Array -> number[])
 * - Handle localStorage quota exceeded errors gracefully
 * - Track ghost replay data for each leaderboard entry
 * - Validate lap times and manage rankings
 *
 * Integration Points:
 * - TimerSystem: Check if lap time qualifies for leaderboard (isTopTen())
 * - ReplayRecorder: Store ghost data when submitting top 10 time
 * - UI System: Display leaderboard entries and retrieve ghost data
 * - GameEngine: Initialize system on startup, access via getInstance()
 *
 * Performance: <10ms for save/load operations
 * Memory: <5MB for leaderboard data (max 10 entries)
 *
 * Design Pattern:
 * - Singleton: LeaderboardSystem.getInstance()
 * - Storage: localStorage with key 'harddriving_leaderboard'
 * - Versioning: Include version in serialized data for future migrations
 *
 * Usage:
 * ```typescript
 * const leaderboard = LeaderboardSystem.getInstance();
 *
 * // Check if time qualifies
 * if (leaderboard.isTopTen(lapTime)) {
 *   // Show name entry dialog
 *   const submitted = leaderboard.submitTime('PlayerName', lapTime, ghostData);
 * }
 *
 * // Get leaderboard for display
 * const entries = leaderboard.getLeaderboard();
 * ```
 */

/**
 * Represents a single leaderboard entry
 */
export interface LeaderboardEntry {
  rank: number; // 1-10, calculated dynamically
  playerName: string; // Player name (max 20 chars)
  lapTime: number; // Best lap time in milliseconds
  timestamp: Date; // When the time was recorded
  ghostData?: Uint8Array; // Compressed replay data (optional)
}

/**
 * Internal serialized format for localStorage
 */
interface SerializedLeaderboardEntry {
  rank: number;
  playerName: string;
  lapTime: number;
  timestamp: string; // ISO string
  ghostData?: number[]; // Uint8Array serialized to number[]
}

/**
 * Serialized leaderboard data for localStorage
 */
interface SerializedLeaderboard {
  version: number;
  entries: SerializedLeaderboardEntry[];
}

/**
 * Singleton LeaderboardSystem
 */
export class LeaderboardSystem {
  private static instance: LeaderboardSystem | null = null;

  // Configuration
  private readonly maxEntries: number = 10;
  private readonly storageKey: string = 'harddriving_leaderboard';
  private readonly dataVersion: number = 1;

  // Internal state
  private entries: LeaderboardEntry[] = [];

  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    this.load();
  }

  /**
   * Gets or creates the singleton instance
   * @returns The LeaderboardSystem singleton
   */
  public static getInstance(): LeaderboardSystem {
    if (!LeaderboardSystem.instance) {
      LeaderboardSystem.instance = new LeaderboardSystem();
    }
    return LeaderboardSystem.instance;
  }

  /**
   * Resets the singleton instance (for testing)
   */
  public static resetInstance(): void {
    LeaderboardSystem.instance = null;
  }

  /**
   * Submits a lap time to the leaderboard if it qualifies for top 10
   *
   * Will add the entry if:
   * - Leaderboard has less than 10 entries, OR
   * - Lap time is faster than current 10th place entry
   *
   * After adding, ranks all entries and removes lowest if over 10.
   *
   * @param playerName - Player's name (will be trimmed to 20 chars)
   * @param lapTime - Lap time in milliseconds
   * @param ghostData - Optional compressed replay data as Uint8Array
   * @returns true if entry was added to leaderboard, false if didn't qualify
   *
   * @example
   * ```typescript
   * const submitted = leaderboard.submitTime('Alice', 45230, ghostBuffer);
   * if (submitted) console.log('New leaderboard entry!');
   * ```
   */
  public submitTime(
    playerName: string,
    lapTime: number,
    ghostData?: Uint8Array
  ): boolean {
    // Validate inputs
    if (!playerName || playerName.trim().length === 0) {
      console.warn('LeaderboardSystem: Invalid player name');
      return false;
    }

    if (lapTime <= 0) {
      console.warn('LeaderboardSystem: Invalid lap time (must be > 0)');
      return false;
    }

    // Check if time qualifies
    if (!this.isTopTen(lapTime)) {
      return false;
    }

    // Create new entry
    const entry: LeaderboardEntry = {
      rank: 0, // Will be recalculated
      playerName: playerName.trim().substring(0, 20),
      lapTime,
      timestamp: new Date(),
      ghostData,
    };

    // Add entry
    this.entries.push(entry);

    // Sort by lap time (ascending - faster times first)
    this.entries.sort((a, b) => a.lapTime - b.lapTime);

    // Keep only top 10
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }

    // Update ranks
    this.updateRanks();

    // Persist to storage
    this.save();

    return true;
  }

  /**
   * Gets a copy of the current leaderboard sorted by rank
   * @returns Array of LeaderboardEntry objects (top 10, sorted by rank)
   */
  public getLeaderboard(): LeaderboardEntry[] {
    // Return deep copy to prevent external modification
    return this.entries.map(entry => ({
      rank: entry.rank,
      playerName: entry.playerName,
      lapTime: entry.lapTime,
      timestamp: new Date(entry.timestamp), // Create new Date instance
      ghostData: entry.ghostData ? new Uint8Array(entry.ghostData) : undefined,
    }));
  }

  /**
   * Gets ghost replay data for a specific leaderboard rank
   *
   * @param rank - Leaderboard rank (1-10)
   * @returns Uint8Array containing ghost data, or null if not found or no ghost available
   */
  public getGhostData(rank: number): Uint8Array | null {
    if (rank < 1 || rank > this.maxEntries) {
      console.warn(`LeaderboardSystem: Invalid rank ${rank}`);
      return null;
    }

    const entry = this.entries.find(e => e.rank === rank);
    if (!entry || !entry.ghostData) {
      return null;
    }

    // Return a copy to prevent external modification
    return new Uint8Array(entry.ghostData);
  }

  /**
   * Checks if a lap time qualifies for the current leaderboard
   *
   * Returns true if:
   * - Leaderboard has less than 10 entries, OR
   * - Lap time is faster than the current 10th place entry
   *
   * @param lapTime - Lap time in milliseconds
   * @returns true if time qualifies for top 10
   */
  public isTopTen(lapTime: number): boolean {
    // Less than 10 entries, always qualifies
    if (this.entries.length < this.maxEntries) {
      return true;
    }

    // Compare with slowest entry (last one due to ascending sort)
    return lapTime < this.entries[this.entries.length - 1].lapTime;
  }

  /**
   * Gets the current number of entries on the leaderboard
   * @returns Number of entries (0-10)
   */
  public getEntryCount(): number {
    return this.entries.length;
  }

  /**
   * Gets the time of the Nth fastest lap on the leaderboard
   * Returns Infinity if leaderboard has fewer than N entries
   *
   * @param rank - Rank position (1-10)
   * @returns Lap time in milliseconds, or Infinity if rank not available
   */
  public getTimeAtRank(rank: number): number {
    if (rank < 1 || rank > this.maxEntries) {
      return Infinity;
    }

    const entry = this.entries.find(e => e.rank === rank);
    return entry ? entry.lapTime : Infinity;
  }

  /**
   * Clears all leaderboard entries and persists change
   * Used for resetting/testing purposes
   */
  public clearLeaderboard(): void {
    this.entries = [];
    this.save();
  }

  /**
   * Internal: Updates rank field for all entries based on current sort order
   */
  private updateRanks(): void {
    for (let i = 0; i < this.entries.length; i++) {
      this.entries[i].rank = i + 1;
    }
  }

  /**
   * Internal: Persists leaderboard to localStorage
   *
   * Handles serialization:
   * - Converts Date objects to ISO strings
   * - Converts Uint8Array to number[] for JSON compatibility
   *
   * Handles errors:
   * - QuotaExceededError: Attempts to free space by removing oldest entry
   * - Other errors: Logs and continues (graceful degradation)
   */
  private save(): void {
    try {
      // Serialize data
      const serialized: SerializedLeaderboard = {
        version: this.dataVersion,
        entries: this.entries.map(entry => ({
          rank: entry.rank,
          playerName: entry.playerName,
          lapTime: entry.lapTime,
          timestamp: entry.timestamp.toISOString(),
          ghostData: entry.ghostData
            ? Array.from(entry.ghostData)
            : undefined,
        })),
      };

      // Attempt to save
      const json = JSON.stringify(serialized);
      localStorage.setItem(this.storageKey, json);
    } catch (error) {
      // Handle storage errors
      if (
        error instanceof Error &&
        error.name === 'QuotaExceededError'
      ) {
        console.warn(
          'LeaderboardSystem: localStorage quota exceeded, removing oldest entry'
        );

        // Try to free space by removing the slowest (oldest) entry
        if (this.entries.length > 0) {
          this.entries.pop();
          this.updateRanks();

          // Retry save
          try {
            const serialized: SerializedLeaderboard = {
              version: this.dataVersion,
              entries: this.entries.map(entry => ({
                rank: entry.rank,
                playerName: entry.playerName,
                lapTime: entry.lapTime,
                timestamp: entry.timestamp.toISOString(),
                ghostData: entry.ghostData
                  ? Array.from(entry.ghostData)
                  : undefined,
              })),
            };
            const json = JSON.stringify(serialized);
            localStorage.setItem(this.storageKey, json);
          } catch (retryError) {
            console.error(
              'LeaderboardSystem: Failed to save after quota recovery:',
              retryError
            );
          }
        }
      } else {
        console.error('LeaderboardSystem: Failed to save leaderboard:', error);
      }
    }
  }

  /**
   * Internal: Loads leaderboard from localStorage
   *
   * Handles deserialization:
   * - Converts ISO strings back to Date objects
   * - Converts number[] back to Uint8Array for ghost data
   * - Validates data integrity
   *
   * Handles errors:
   * - Corrupted data: Logs warning, initializes with empty state
   * - Missing data: Silently initializes with empty state
   */
  private load(): void {
    try {
      const json = localStorage.getItem(this.storageKey);
      if (!json) {
        // No saved data, start with empty leaderboard
        this.entries = [];
        return;
      }

      // Parse JSON
      const data = JSON.parse(json) as SerializedLeaderboard;

      // Validate version (for future migrations)
      if (data.version !== this.dataVersion) {
        console.warn(
          `LeaderboardSystem: Data version mismatch (expected ${this.dataVersion}, got ${data.version})`
        );
        // Could implement migration logic here
      }

      // Validate and deserialize entries
      if (!Array.isArray(data.entries)) {
        throw new Error('Invalid entries format');
      }

      this.entries = data.entries
        .map((entry: SerializedLeaderboardEntry) => {
          // Validate required fields
          if (
            typeof entry.rank !== 'number' ||
            typeof entry.playerName !== 'string' ||
            typeof entry.lapTime !== 'number' ||
            typeof entry.timestamp !== 'string'
          ) {
            return null;
          }

          const loaded: LeaderboardEntry = {
            rank: entry.rank,
            playerName: entry.playerName,
            lapTime: entry.lapTime,
            timestamp: new Date(entry.timestamp),
            ghostData: entry.ghostData
              ? new Uint8Array(entry.ghostData)
              : undefined,
          };
          return loaded;
        })
        .filter((entry: LeaderboardEntry | null): entry is LeaderboardEntry => entry !== null);

      // Re-sort and recalculate ranks to ensure consistency
      this.entries.sort((a, b) => a.lapTime - b.lapTime);
      this.updateRanks();

      // Ensure we don't exceed max entries
      if (this.entries.length > this.maxEntries) {
        this.entries = this.entries.slice(0, this.maxEntries);
      }

      console.log(
        `LeaderboardSystem: Loaded ${this.entries.length} entries from storage`
      );
    } catch (error) {
      console.error('LeaderboardSystem: Failed to load leaderboard:', error);
      this.entries = [];
    }
  }

  /**
   * Disposes resources and cleans up
   * Called when shutting down the game
   */
  public dispose(): void {
    this.entries = [];
  }
}
