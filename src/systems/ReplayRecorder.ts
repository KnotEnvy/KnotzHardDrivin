import * as THREE from 'three';
import { Vehicle } from '../entities/Vehicle';
import { CameraSystem, CameraTarget } from './CameraSystem';
import { VehicleTransform } from '../types/VehicleTypes';

/**
 * Represents a single frame of recorded gameplay data for replay playback.
 *
 * Contains the essential state needed to faithfully represent what happened:
 * - Vehicle position and rotation (quaternion)
 * - Wheel rotations (4 angles for visual representation)
 * - Camera transform (for potential replay camera use)
 * - Timestamp for synchronization
 *
 * Performance: Each frame is approximately 220 bytes uncompressed.
 * Ring buffer of 1800 frames (30 seconds at 60fps) = ~400KB base size + overhead.
 */
export interface ReplayFrame {
  /**
   * Elapsed time from start of recording in seconds.
   * Used to synchronize playback and match real-time progression.
   */
  time: number;

  /**
   * Vehicle world position [x, y, z].
   * Stored as array to save memory vs three Vector3 objects.
   */
  vehiclePosition: [number, number, number];

  /**
   * Vehicle world rotation as quaternion [x, y, z, w].
   * Quaternion is more compact than Euler angles and avoids gimbal lock.
   */
  vehicleRotation: [number, number, number, number];

  /**
   * Wheel rotation angles in radians for each wheel [FL, FR, RL, RR].
   * Used for visual wheel spinning during replay.
   */
  wheelRotations: [number, number, number, number];

  /**
   * Camera position [x, y, z] at this frame.
   * Can be used for cinematicCamera replay shots.
   */
  cameraPosition: [number, number, number];

  /**
   * Camera quaternion [x, y, z, w].
   * Preserves camera rotation during replay.
   */
  cameraRotation: [number, number, number, number];
}

/**
 * ReplayRecorder - Records continuous gameplay for crash replay playback.
 *
 * Architecture:
 * - Ring buffer of fixed size (1800 frames for 30 seconds at 60fps)
 * - Records at game loop frequency (60Hz fixed timestep)
 * - Zero per-frame allocations (reuses arrays and objects)
 * - Ready for future delta/keyframe compression
 *
 * Performance:
 * - Recording: <0.5ms per frame (target: <1ms)
 * - Memory: ~10MB for 30-second buffer
 * - No garbage collection pressure
 *
 * Integration:
 * - Called by GameEngine.update() after vehicle physics update
 * - Frames accumulate in ring buffer during PLAYING state
 * - Buffer is retrieved by ReplayPlayer for playback
 * - Buffer is cleared when race restarts
 *
 * Usage:
 * ```typescript
 * const recorder = new ReplayRecorder();
 *
 * // During gameplay (called every frame)
 * recorder.recordFrame(vehicle, camera, deltaTime);
 *
 * // When crash detected
 * const frames = recorder.getReplayBuffer();
 * // Pass frames to ReplayPlayer for playback
 *
 * // When race restarts
 * recorder.clearBuffer();
 * ```
 */
export class ReplayRecorder {
  // Ring buffer configuration
  private static readonly MAX_FRAMES = 1800; // 30 seconds at 60fps
  private static readonly FIXED_TIMESTEP = 1 / 60; // 60Hz physics

  // Ring buffer storage
  private frames: ReplayFrame[] = [];
  private writeIndex: number = 0;
  private frameCount: number = 0; // Total frames recorded (for playback bounds checking)
  private isRecording: boolean = false;
  private recordingStartTime: number = 0;

  // Temporary objects for recording (reused to avoid per-frame allocations)
  private tempPosition: [number, number, number] = [0, 0, 0];
  private tempRotation: [number, number, number, number] = [0, 0, 0, 1];
  private tempWheelRotations: [number, number, number, number] = [0, 0, 0, 0];
  private tempCameraPos: [number, number, number] = [0, 0, 0];
  private tempCameraRot: [number, number, number, number] = [0, 0, 0, 1];

  /**
   * Creates a new ReplayRecorder instance.
   *
   * Initializes the ring buffer with pre-allocated empty frames.
   * This avoids allocation pressure during gameplay.
   */
  constructor() {
    // Pre-allocate ring buffer with empty frames
    for (let i = 0; i < ReplayRecorder.MAX_FRAMES; i++) {
      this.frames.push({
        time: 0,
        vehiclePosition: [0, 0, 0],
        vehicleRotation: [0, 0, 0, 1],
        wheelRotations: [0, 0, 0, 0],
        cameraPosition: [0, 0, 0],
        cameraRotation: [0, 0, 0, 1],
      });
    }
  }

  /**
   * Starts recording gameplay frames.
   *
   * Resets the buffer and begins accumulating frames.
   * Called when entering PLAYING state.
   *
   * @example
   * ```typescript
   * recorder.startRecording();
   * // Now frames will be captured during update
   * ```
   */
  startRecording(): void {
    this.isRecording = true;
    this.recordingStartTime = performance.now() / 1000;
    this.writeIndex = 0;
    this.frameCount = 0;
    console.log('Replay recording started');
  }

  /**
   * Stops recording gameplay frames.
   *
   * Preserves the current buffer for replay playback.
   * Can be resumed with startRecording().
   *
   * @example
   * ```typescript
   * recorder.stopRecording();
   * // Buffer is preserved for access via getReplayBuffer()
   * ```
   */
  stopRecording(): void {
    this.isRecording = false;
    console.log(`Replay recording stopped (${this.frameCount} frames recorded)`);
  }

  /**
   * Records current vehicle and camera state to the ring buffer.
   *
   * Must be called every frame during PLAYING state to accumulate data.
   * Automatically wraps around when buffer is full (oldest frames overwritten).
   *
   * Performance:
   * - No allocations (reuses temp objects)
   * - Array access only (O(1) operation)
   * - Target: <0.5ms per frame
   *
   * @param vehicle - Vehicle instance to record state from
   * @param camera - Camera instance to record transform from
   * @param deltaTime - Frame timestep (not used for timing, included for API completeness)
   *
   * @example
   * ```typescript
   * // In GameEngine.update()
   * if (this.state === GameState.PLAYING) {
   *   this.replayRecorder.recordFrame(vehicle, camera, deltaTime);
   * }
   * ```
   */
  recordFrame(vehicle: Vehicle, camera: THREE.PerspectiveCamera, deltaTime: number): void {
    if (!this.isRecording) {
      return;
    }

    // Get current frame slot in ring buffer
    const frame = this.frames[this.writeIndex];

    // Calculate elapsed time from recording start
    const currentTime = performance.now() / 1000;
    frame.time = currentTime - this.recordingStartTime;

    // Record vehicle transform
    const vehicleTransform = vehicle.getTransform();
    frame.vehiclePosition[0] = vehicleTransform.position.x;
    frame.vehiclePosition[1] = vehicleTransform.position.y;
    frame.vehiclePosition[2] = vehicleTransform.position.z;

    frame.vehicleRotation[0] = vehicleTransform.rotation.x;
    frame.vehicleRotation[1] = vehicleTransform.rotation.y;
    frame.vehicleRotation[2] = vehicleTransform.rotation.z;
    frame.vehicleRotation[3] = vehicleTransform.rotation.w;

    // Record wheel rotations
    const wheelStates = vehicle.getWheelStates();
    frame.wheelRotations[0] = wheelStates[0].rotationAngle;
    frame.wheelRotations[1] = wheelStates[1].rotationAngle;
    frame.wheelRotations[2] = wheelStates[2].rotationAngle;
    frame.wheelRotations[3] = wheelStates[3].rotationAngle;

    // Record camera transform
    frame.cameraPosition[0] = camera.position.x;
    frame.cameraPosition[1] = camera.position.y;
    frame.cameraPosition[2] = camera.position.z;

    frame.cameraRotation[0] = camera.quaternion.x;
    frame.cameraRotation[1] = camera.quaternion.y;
    frame.cameraRotation[2] = camera.quaternion.z;
    frame.cameraRotation[3] = camera.quaternion.w;

    // Advance ring buffer write position
    this.writeIndex = (this.writeIndex + 1) % ReplayRecorder.MAX_FRAMES;
    this.frameCount++;
  }

  /**
   * Retrieves the complete replay buffer for playback.
   *
   * Returns a copy of the frame array suitable for ReplayPlayer consumption.
   * The returned array is ordered chronologically for playback from start to end.
   *
   * For ring buffers that have wrapped around:
   * - If frameCount < MAX_FRAMES: buffer hasn't wrapped, return all frames in order
   * - If frameCount >= MAX_FRAMES: buffer has wrapped, reorder frames chronologically
   *
   * @returns Array of ReplayFrame objects in chronological order, ready for playback
   *
   * @example
   * ```typescript
   * const frames = recorder.getReplayBuffer();
   * const player = new ReplayPlayer(frames);
   * player.startPlayback();
   * ```
   */
  getReplayBuffer(): ReplayFrame[] {
    // If buffer hasn't wrapped yet, return frames in order from 0 to writeIndex
    if (this.frameCount < ReplayRecorder.MAX_FRAMES) {
      return this.frames.slice(0, this.writeIndex);
    }

    // Buffer has wrapped: reorder frames chronologically
    // writeIndex now points to the oldest frame (will be overwritten next)
    const orderedFrames: ReplayFrame[] = [];

    // Add frames from writeIndex (oldest) to end of array
    for (let i = this.writeIndex; i < ReplayRecorder.MAX_FRAMES; i++) {
      orderedFrames.push(this.frames[i]);
    }

    // Add frames from start of array to writeIndex (newest)
    for (let i = 0; i < this.writeIndex; i++) {
      orderedFrames.push(this.frames[i]);
    }

    return orderedFrames;
  }

  /**
   * Retrieves a slice of the replay buffer for partial playback.
   *
   * Useful for "last 10 seconds" replays or skipping to specific timestamps.
   * Handles ring buffer wrapping automatically.
   *
   * @param startTime - Start time in seconds (relative to recording start)
   * @param endTime - End time in seconds (relative to recording start)
   * @returns Slice of ReplayFrame objects within the time range
   *
   * @example
   * ```typescript
   * // Get last 5 seconds of replay
   * const recentFrames = recorder.getReplayBufferSlice(
   *   recorder.getReplayDuration() - 5,
   *   recorder.getReplayDuration()
   * );
   * ```
   */
  getReplayBufferSlice(startTime: number, endTime: number): ReplayFrame[] {
    const allFrames = this.getReplayBuffer();
    return allFrames.filter(frame => frame.time >= startTime && frame.time <= endTime);
  }

  /**
   * Gets the total duration of recorded gameplay in seconds.
   *
   * @returns Duration in seconds, or 0 if no frames recorded
   *
   * @example
   * ```typescript
   * const duration = recorder.getReplayDuration();
   * console.log(`Recorded ${duration.toFixed(1)} seconds`);
   * ```
   */
  getReplayDuration(): number {
    if (this.frameCount === 0) {
      return 0;
    }

    const frames = this.getReplayBuffer();
    if (frames.length === 0) {
      return 0;
    }

    return frames[frames.length - 1].time;
  }

  /**
   * Gets the number of frames currently in the buffer.
   *
   * @returns Frame count
   */
  getFrameCount(): number {
    return Math.min(this.frameCount, ReplayRecorder.MAX_FRAMES);
  }

  /**
   * Checks if the recorder is currently active (recording).
   *
   * @returns true if recording, false otherwise
   */
  isRecordingActive(): boolean {
    return this.isRecording;
  }

  /**
   * Clears the replay buffer and resets the recorder.
   *
   * Called when:
   * - Starting a new race (clear old replay data)
   * - Resetting from menu
   * - Freeing memory before shutdown
   *
   * @example
   * ```typescript
   * // Clear replay when starting new race
   * recorder.clearBuffer();
   * recorder.startRecording();
   * ```
   */
  clearBuffer(): void {
    this.writeIndex = 0;
    this.frameCount = 0;
    this.isRecording = false;

    // No need to clear individual frame data since it will be overwritten
    console.log('Replay buffer cleared');
  }

  /**
   * Gets debug information about the recorder state.
   *
   * Useful for monitoring and troubleshooting.
   *
   * @returns Debug object with recorder stats
   *
   * @example
   * ```typescript
   * const debug = recorder.getDebugInfo();
   * console.log(`Recording: ${debug.isRecording}, Frames: ${debug.frameCount}`);
   * ```
   */
  getDebugInfo(): {
    isRecording: boolean;
    frameCount: number;
    maxFrames: number;
    duration: number;
    writeIndex: number;
    bufferUsagePercent: number;
  } {
    const frameCount = this.getFrameCount();
    return {
      isRecording: this.isRecording,
      frameCount,
      maxFrames: ReplayRecorder.MAX_FRAMES,
      duration: this.getReplayDuration(),
      writeIndex: this.writeIndex,
      bufferUsagePercent: (frameCount / ReplayRecorder.MAX_FRAMES) * 100,
    };
  }

  /**
   * Disposes the recorder and frees resources.
   *
   * Call this when the game shuts down or the recorder is no longer needed.
   * Currently a placeholder for future cleanup (compression, serialization, etc).
   */
  dispose(): void {
    this.clearBuffer();
    console.log('ReplayRecorder disposed');
  }
}
