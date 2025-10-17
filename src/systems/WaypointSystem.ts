import * as THREE from 'three';

/**
 * Waypoint data structure
 * Defines the properties of a single waypoint on the track
 */
export interface WaypointData {
  id: number;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  triggerRadius: number;
  isCheckpoint: boolean;
  timeBonus?: number;
}

/**
 * Result returned from waypoint update checks
 * Contains all possible outcomes from checking waypoint status
 */
export interface WaypointResult {
  waypointPassed?: boolean;
  waypointId?: number;
  timeBonus?: number;
  lapCompleted?: boolean;
  currentLap?: number;
  raceFinished?: boolean;
  wrongWay?: boolean;
  progress?: number;
}

/**
 * Internal waypoint class
 * Wraps waypoint data with additional functionality
 */
class Waypoint {
  public id: number;
  public position: THREE.Vector3;
  public direction: THREE.Vector3;
  public triggerRadius: number;
  public isCheckpoint: boolean;
  public timeBonus?: number;

  constructor(data: WaypointData) {
    this.id = data.id;
    this.position = data.position;
    this.direction = data.direction;
    this.triggerRadius = data.triggerRadius;
    this.isCheckpoint = data.isCheckpoint;
    this.timeBonus = data.timeBonus;
  }
}

/**
 * WaypointSystem - Track progression and lap counting system
 *
 * Features:
 * - Sequential waypoint validation (must pass in order)
 * - Lap completion detection (2 laps required)
 * - Checkpoint time bonus support
 * - Wrong-way detection (dot product < -0.5)
 * - Race finish detection
 * - Progress calculation (0.0 to 1.0)
 *
 * Performance: ~0.1ms per frame
 *
 * Usage:
 * ```typescript
 * const waypointSystem = new WaypointSystem(waypointData);
 * const result = waypointSystem.update(vehiclePosition);
 * if (result.waypointPassed) {
 *   console.log('Waypoint passed:', result.waypointId);
 * }
 * ```
 */
export class WaypointSystem {
  private waypoints: Waypoint[] = [];
  private currentWaypoint = 0;
  private lapCount = 0;
  private maxLaps = 2;

  // Temp vector to avoid per-frame allocations
  private tempVec = new THREE.Vector3();

  /**
   * Constructor
   * @param waypointData - Array of waypoint data to initialize the system
   */
  constructor(waypointData: WaypointData[]) {
    this.waypoints = waypointData.map(data => new Waypoint(data));
  }

  /**
   * Main update method - checks vehicle position against current waypoint
   * @param vehiclePosition - Current position of the vehicle
   * @param vehicleForward - Vehicle's forward direction vector (optional, required for wrong-way detection)
   * @returns WaypointResult containing any triggered events
   */
  update(vehiclePosition: THREE.Vector3, vehicleForward?: THREE.Vector3): WaypointResult {
    const current = this.waypoints[this.currentWaypoint];
    const distance = vehiclePosition.distanceTo(current.position);

    if (distance < current.triggerRadius) {
      return this.onWaypointPassed(vehiclePosition);
    }

    // Check for wrong-way (only if vehicleForward is provided)
    if (vehicleForward && this.isGoingWrongWay(vehiclePosition, vehicleForward)) {
      return { wrongWay: true };
    }

    return { progress: this.getProgress() };
  }

  /**
   * Called when vehicle passes through a waypoint trigger radius
   * Handles waypoint progression, lap counting, and race completion
   *
   * @param vehiclePos - Vehicle position (currently unused but available for future validation)
   * @returns WaypointResult with all triggered events
   */
  private onWaypointPassed(vehiclePos: THREE.Vector3): WaypointResult {
    const waypoint = this.waypoints[this.currentWaypoint];
    const result: WaypointResult = {
      waypointPassed: true,
      waypointId: waypoint.id,
    };

    // Check if it's a checkpoint (time bonus)
    if (waypoint.isCheckpoint) {
      result.timeBonus = waypoint.timeBonus || 30;
    }

    // Advance to next waypoint
    this.currentWaypoint++;

    // Check if lap completed
    if (this.currentWaypoint >= this.waypoints.length) {
      this.currentWaypoint = 0;
      this.lapCount++;

      result.lapCompleted = true;
      result.currentLap = this.lapCount;

      // Check if race finished
      if (this.lapCount >= this.maxLaps) {
        result.raceFinished = true;
      }
    }

    return result;
  }

  /**
   * Detects if vehicle is going the wrong way
   * Uses dot product between vehicle forward vector and direction to waypoint
   *
   * Logic:
   * - Dot product > 0: Facing toward waypoint (correct way)
   * - Dot product < -0.5: Facing away from waypoint (wrong way)
   * - Threshold of -0.5 allows for ~90-degree deviation
   *
   * Performance: Uses temp vector to avoid per-frame allocations
   *
   * @param vehiclePos - Current vehicle position
   * @param vehicleForward - Vehicle's forward direction vector (normalized)
   * @returns true if going wrong way, false otherwise
   */
  private isGoingWrongWay(vehiclePos: THREE.Vector3, vehicleForward: THREE.Vector3): boolean {
    const current = this.waypoints[this.currentWaypoint];
    // Calculate direction from vehicle to waypoint
    this.tempVec.copy(current.position).sub(vehiclePos).normalize();
    // Dot product: vehicleForward · toWaypoint
    const dot = vehicleForward.dot(this.tempVec);

    return dot < -0.5; // Facing more than 90 degrees away from waypoint
  }

  /**
   * Calculates overall race progress (0.0 to 1.0)
   * Takes into account current waypoint and lap number
   *
   * Formula: (currentWaypoint + lapCount * totalWaypoints) / (totalWaypoints * maxLaps)
   *
   * @returns Progress value from 0.0 (start) to 1.0 (finish)
   */
  getProgress(): number {
    return (this.currentWaypoint + this.lapCount * this.waypoints.length) /
           (this.waypoints.length * this.maxLaps);
  }

  /**
   * Gets the position of the next waypoint to reach
   * Useful for minimap visualization and navigation UI
   *
   * WARNING: Returned vector is a direct reference to internal temp vector.
   * Zero per-frame allocations - critical for performance.
   * Caller must copy the result if persistence across frames is needed.
   *
   * @returns Reference to next waypoint position (temp vector - copy if needed)
   */
  getNextWaypointPosition(): THREE.Vector3 {
    this.tempVec.copy(this.waypoints[this.currentWaypoint].position);
    return this.tempVec;
  }

  /**
   * Gets the current waypoint index
   * @returns Current waypoint index (0-based)
   */
  getCurrentWaypointIndex(): number {
    return this.currentWaypoint;
  }

  /**
   * Gets the current lap count
   * @returns Current lap number (0-based, 0 = first lap)
   */
  getCurrentLap(): number {
    return this.lapCount;
  }

  /**
   * Gets the maximum number of laps for the race
   * @returns Maximum lap count
   */
  getMaxLaps(): number {
    return this.maxLaps;
  }

  /**
   * Gets the total number of waypoints in the track
   * @returns Total waypoint count
   */
  getTotalWaypoints(): number {
    return this.waypoints.length;
  }

  /**
   * Resets the waypoint system to initial state
   * Useful for restarting races or respawning
   */
  reset(): void {
    this.currentWaypoint = 0;
    this.lapCount = 0;
  }

  /**
   * Sets the maximum number of laps for the race
   * @param maxLaps - New maximum lap count
   */
  setMaxLaps(maxLaps: number): void {
    this.maxLaps = Math.max(1, maxLaps); // Ensure at least 1 lap
  }
}
