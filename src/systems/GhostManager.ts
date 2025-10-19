/**
 * GhostManager - Manages ghost AI lifecycle during races.
 *
 * Responsibilities:
 * - Spawn ghosts from leaderboard data at race start
 * - Update ghost playback each frame
 * - Handle ghost disposal on race end
 * - Coordinate with LeaderboardSystem for ghost data
 * - Integrate with GameEngine FSM for lifecycle management
 *
 * Design Pattern:
 * - Singleton: GhostManager.getInstance()
 * - Ghost array: Multiple ghosts can race simultaneously
 * - Frame-based lifecycle: Spawn on PLAYING, despawn on CRASHED/RESULTS
 *
 * Performance:
 * - Update: <2ms per frame for multiple ghosts
 * - Spawn: <5ms per ghost instantiation
 * - No per-frame allocations
 *
 * Integration:
 * - LeaderboardSystem: Get ghost data from top entries
 * - GameEngine: Called in update loop during PLAYING state
 * - StateManager: Listen for state transitions
 *
 * Usage:
 * ```typescript
 * const manager = GhostManager.getInstance();
 * manager.spawnGhosts(gameScene, topRanks);
 *
 * // In game loop
 * manager.update(deltaTime);
 *
 * // When race ends
 * manager.disposeAllGhosts();
 * ```
 */

import * as THREE from 'three';
import { Ghost } from '../entities/Ghost';
import { GhostData, GhostRecorder } from './GhostRecorder';
import { LeaderboardSystem } from './LeaderboardSystem';

/**
 * Singleton GhostManager
 */
export class GhostManager {
  private static instance: GhostManager | null = null;

  // Active ghosts in current race
  private ghosts: Ghost[] = [];

  // Configuration
  private readonly MAX_ACTIVE_GHOSTS = 5; // Limit for performance

  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {}

  /**
   * Gets or creates the singleton instance
   * @returns The GhostManager singleton
   */
  public static getInstance(): GhostManager {
    if (!GhostManager.instance) {
      GhostManager.instance = new GhostManager();
    }
    return GhostManager.instance;
  }

  /**
   * Resets the singleton instance (for testing)
   */
  public static resetInstance(): void {
    GhostManager.instance = null;
  }

  /**
   * Spawns ghosts from leaderboard data.
   *
   * Creates Ghost entities for specified rank positions and adds them to the scene.
   * Limits to MAX_ACTIVE_GHOSTS for performance.
   *
   * @param scene - Three.js scene to add ghosts to
   * @param ranks - Array of rank positions to spawn (1-10)
   * @param vehicleTemplate - Optional vehicle mesh to clone for ghosts
   *
   * @example
   * ```typescript
   * manager.spawnGhosts(scene, [1, 2, 3]); // Spawn top 3
   * ```
   */
  public spawnGhosts(
    scene: THREE.Scene,
    ranks: number[] = [1],
    vehicleTemplate?: THREE.Object3D
  ): void {
    // Clear any existing ghosts
    this.disposeAllGhosts();

    const leaderboard = LeaderboardSystem.getInstance();

    // Limit number of active ghosts
    const ranksToSpawn = ranks.slice(0, this.MAX_ACTIVE_GHOSTS);

    for (const rank of ranksToSpawn) {
      try {
        // Get ghost data from leaderboard
        const ghostDataBytes = leaderboard.getGhostData(rank);
        if (!ghostDataBytes) {
          console.log(`GhostManager: No ghost data for rank ${rank}`);
          continue;
        }

        // Deserialize ghost data
        const ghostRecorder = GhostRecorder.getInstance();
        const ghostData: GhostData = ghostRecorder.deserialize(ghostDataBytes);

        // Create and spawn ghost
        const ghost = new Ghost(ghostData, scene, vehicleTemplate);
        this.ghosts.push(ghost);

        console.log(`GhostManager: Spawned ghost for rank ${rank}`);
      } catch (error) {
        console.error(`GhostManager: Failed to spawn ghost for rank ${rank}:`, error);
      }
    }

    if (this.ghosts.length > 0) {
      console.log(`GhostManager: Spawned ${this.ghosts.length} ghost(s)`);
    }
  }

  /**
   * Spawns ghost for player's best time (if available).
   *
   * Useful for time trial mode where player races against their previous best.
   *
   * @param scene - Three.js scene to add ghost to
   * @param vehicleTemplate - Optional vehicle mesh to clone
   *
   * @example
   * ```typescript
   * manager.spawnBestGhost(scene);
   * ```
   */
  public spawnBestGhost(scene: THREE.Scene, vehicleTemplate?: THREE.Object3D): void {
    this.spawnGhosts(scene, [1], vehicleTemplate);
  }

  /**
   * Updates all active ghosts for this frame.
   *
   * Called every frame during race to advance ghost playback.
   * Performance: <2ms for typical 2-3 ghosts.
   *
   * @param deltaTime - Frame timestep in seconds
   *
   * @example
   * ```typescript
   * // In GameEngine.update()
   * if (this.gameState === GameState.PLAYING) {
   *   ghostManager.update(deltaTime);
   * }
   * ```
   */
  public update(deltaTime: number): void {
    for (const ghost of this.ghosts) {
      ghost.startPlayback();
      ghost.update(deltaTime);
    }
  }

  /**
   * Starts playback for all ghosts.
   *
   * @param speed - Playback speed multiplier (default 1.0)
   *
   * @example
   * ```typescript
   * manager.startAllPlayback();
   * ```
   */
  public startAllPlayback(speed: number = 1.0): void {
    for (const ghost of this.ghosts) {
      ghost.startPlayback(speed);
    }
  }

  /**
   * Stops playback for all ghosts.
   *
   * @example
   * ```typescript
   * manager.stopAllPlayback();
   * ```
   */
  public stopAllPlayback(): void {
    for (const ghost of this.ghosts) {
      ghost.stopPlayback();
    }
  }

  /**
   * Sets visibility for all ghosts.
   *
   * @param visible - Whether ghosts should be visible
   *
   * @example
   * ```typescript
   * manager.setAllVisible(false); // Hide all ghosts
   * ```
   */
  public setAllVisible(visible: boolean): void {
    for (const ghost of this.ghosts) {
      ghost.setVisible(visible);
    }
  }

  /**
   * Gets the number of active ghosts.
   *
   * @returns Ghost count
   */
  public getGhostCount(): number {
    return this.ghosts.length;
  }

  /**
   * Gets a specific ghost by index.
   *
   * @param index - Ghost index (0-based)
   * @returns Ghost instance or null if not found
   *
   * @example
   * ```typescript
   * const ghost = manager.getGhost(0);
   * if (ghost) {
   *   console.log(ghost.getPosition());
   * }
   * ```
   */
  public getGhost(index: number): Ghost | null {
    if (index < 0 || index >= this.ghosts.length) {
      return null;
    }
    return this.ghosts[index];
  }

  /**
   * Gets all active ghosts.
   *
   * @returns Array of active Ghost instances
   */
  public getAllGhosts(): Ghost[] {
    return [...this.ghosts];
  }

  /**
   * Disposes a specific ghost by index.
   *
   * @param index - Ghost index (0-based)
   */
  public disposeGhost(index: number): void {
    if (index < 0 || index >= this.ghosts.length) {
      return;
    }
    this.ghosts[index].dispose();
    this.ghosts.splice(index, 1);
  }

  /**
   * Disposes all active ghosts and clears the array.
   *
   * Call this when race ends or switching to a new race.
   *
   * @example
   * ```typescript
   * manager.disposeAllGhosts();
   * ```
   */
  public disposeAllGhosts(): void {
    for (const ghost of this.ghosts) {
      ghost.dispose();
    }
    this.ghosts = [];
    console.log('GhostManager: All ghosts disposed');
  }

  /**
   * Gets debug information about ghost manager state.
   *
   * @returns Debug object with ghost stats
   */
  public getDebugInfo(): {
    ghostCount: number;
    maxGhosts: number;
    ghosts: Array<{
      index: number;
      isVisible: boolean;
      playbackInfo: any;
    }>;
  } {
    return {
      ghostCount: this.ghosts.length,
      maxGhosts: this.MAX_ACTIVE_GHOSTS,
      ghosts: this.ghosts.map((ghost, index) => ({
        index,
        isVisible: ghost.isVisible(),
        playbackInfo: ghost.getPlaybackInfo(),
      })),
    };
  }

  /**
   * Disposes the manager and cleans up all resources.
   */
  public dispose(): void {
    this.disposeAllGhosts();
    console.log('GhostManager disposed');
  }
}
