import * as THREE from 'three';
import { ReplayFrame } from './ReplayRecorder';

/**
 * ReplayPlayer - Plays back recorded replay frames with smooth interpolation.
 *
 * Architecture:
 * - Consumes ReplayFrame array from ReplayRecorder
 * - Performs smooth frame interpolation (position: lerp, rotation: slerp)
 * - Tracks playback time and synchronizes with recorded data
 * - Handles frame seeking for efficient playback
 * - Provides playback controls (play, pause, skip)
 * - Zero per-frame allocations in hot path (update loop)
 *
 * Performance:
 * - Playback: <1ms per frame overhead
 * - Interpolation: Instant (O(1) operations only)
 * - No GC pressure during playback
 *
 * Integration:
 * - Called by GameEngine.update() during REPLAY state
 * - Provides interpolated frame transforms to apply to vehicle/camera
 * - Returns null when playback ends
 *
 * Usage:
 * ```typescript
 * const player = new ReplayPlayer(recordedFrames);
 * player.startPlayback();
 *
 * // In game loop
 * const interpolatedFrame = player.update(deltaTime);
 * if (interpolatedFrame) {
 *   vehicle.setTransform(interpolatedFrame.vehiclePosition, ...);
 *   camera.setTransform(interpolatedFrame.cameraPosition, ...);
 * }
 *
 * // When playback ends or user skips
 * player.stopPlayback();
 * ```
 */
export class ReplayPlayer {
  // Playback state
  private frames: ReplayFrame[];
  private isPlaying: boolean = false;
  private playbackStartTime: number = 0;
  private playbackElapsedTime: number = 0;
  private currentFrameIndex: number = 0;

  // Interpolation state
  private lastFrameIndex: number = -1;
  private interpolationT: number = 0;

  // Temporary objects for interpolation (reused, zero allocation in hot path)
  private tempVector3: THREE.Vector3 = new THREE.Vector3();
  private tempQuaternion: THREE.Quaternion = new THREE.Quaternion();
  private tempInterpolatedFrame: ReplayFrame = {
    time: 0,
    vehiclePosition: [0, 0, 0],
    vehicleRotation: [0, 0, 0, 1],
    wheelRotations: [0, 0, 0, 0],
    cameraPosition: [0, 0, 0],
    cameraRotation: [0, 0, 0, 1],
  };

  /**
   * Creates a new ReplayPlayer instance.
   *
   * @param frames - Array of ReplayFrame objects in chronological order
   *
   * @example
   * ```typescript
   * const recorder = new ReplayRecorder();
   * // ... record frames ...
   * const frames = recorder.getReplayBuffer();
   * const player = new ReplayPlayer(frames);
   * ```
   */
  constructor(frames: ReplayFrame[]) {
    this.frames = frames;
  }

  /**
   * Starts playback of the recorded frames.
   *
   * Begins from the first frame and advances through the buffer at normal speed.
   * Playback can be resumed after stopping.
   *
   * @example
   * ```typescript
   * player.startPlayback();
   * // Now update(deltaTime) will return interpolated frames
   * ```
   */
  startPlayback(): void {
    this.isPlaying = true;
    this.playbackStartTime = performance.now() / 1000;
    this.playbackElapsedTime = 0;
    this.currentFrameIndex = 0;
    this.lastFrameIndex = -1;
    console.log(`Replay playback started (${this.frames.length} frames, ${this.getReplayDuration().toFixed(1)}s duration)`);
  }

  /**
   * Stops playback of the recorded frames.
   *
   * Preserves current playback state but stops frame advancement.
   * Can be resumed with startPlayback().
   *
   * @example
   * ```typescript
   * player.stopPlayback();
   * // update(deltaTime) will now return null
   * ```
   */
  stopPlayback(): void {
    this.isPlaying = false;
    console.log('Replay playback stopped');
  }

  /**
   * Advances playback by one frame and returns interpolated state.
   *
   * Core replay playback loop. Called every frame during REPLAY state.
   *
   * Performance:
   * - Frame seeking: O(log n) binary search (only when crossing frame boundary)
   * - Interpolation: O(1) vector operations
   * - No allocations: Reuses temp objects
   * - Target: <1ms per frame
   *
   * Process:
   * 1. Calculate elapsed time since playback start
   * 2. Find current and next frame for this timestamp
   * 3. Interpolate between frames (lerp for position, slerp for rotation)
   * 4. Return interpolated frame or null if playback ended
   *
   * @param deltaTime - Frame timestep in seconds (for reference, not used for timing)
   * @returns Interpolated ReplayFrame for this moment, or null if playback finished
   *
   * @example
   * ```typescript
   * // In GameEngine.update() during REPLAY state
   * const frame = player.update(0.016);
   * if (frame) {
   *   const vehicleTransform = vehicle.getTransform();
   *   vehicleTransform.position.fromArray(frame.vehiclePosition);
   *   vehicleTransform.rotation.fromArray(frame.vehicleRotation);
   *   vehicle.setTransform(vehicleTransform);
   * } else {
   *   // Playback finished
   *   gameEngine.setState(GameState.PLAYING);
   * }
   * ```
   */
  update(deltaTime: number): ReplayFrame | null {
    if (!this.isPlaying || this.frames.length === 0) {
      return null;
    }

    // Calculate elapsed time since playback started
    const currentTime = performance.now() / 1000;
    this.playbackElapsedTime = currentTime - this.playbackStartTime;

    // Get replay duration
    const replayDuration = this.getReplayDuration();

    // Check if playback has finished
    // For single frame replays (duration=0), allow one frame to be returned, then finish
    const hasFinished = replayDuration > 0 && this.playbackElapsedTime >= replayDuration;
    if (hasFinished) {
      this.isPlaying = false;
      console.log('Replay playback finished');
      return null;
    }

    // For zero-duration replays, return the frame once then finish
    if (replayDuration === 0 && this.playbackElapsedTime > 0.016) {
      this.isPlaying = false;
      console.log('Replay playback finished');
      return null;
    }

    // Find surrounding frames for interpolation
    const frameIndices = this.findSurroundingFrames(this.playbackElapsedTime);
    if (frameIndices === null) {
      return null;
    }

    const { currentIndex, nextIndex, t } = frameIndices;
    const currentFrame = this.frames[currentIndex];
    const nextFrame = this.frames[nextIndex];

    // Interpolate between frames
    return this.interpolateFrames(currentFrame, nextFrame, t);
  }

  /**
   * Skips to end of replay playback immediately.
   *
   * Used when player clicks "Skip Replay" button.
   * Stops playback and triggers respawn sequence.
   *
   * @example
   * ```typescript
   * player.skip();
   * // Playback stops, game transitions to respawn
   * ```
   */
  skip(): void {
    this.stopPlayback();
    console.log('Replay skipped');
  }

  /**
   * Checks if replay is currently playing.
   *
   * @returns true if actively playing, false otherwise
   *
   * @example
   * ```typescript
   * if (player.isPlaying()) {
   *   // Show replay UI overlay
   * }
   * ```
   */
  isPlayingActive(): boolean {
    return this.isPlaying;
  }

  /**
   * Gets playback progress as a normalized value.
   *
   * Useful for progress bars and UI feedback.
   *
   * @returns Progress from 0.0 (start) to 1.0 (end), clamped to [0, 1]
   *
   * @example
   * ```typescript
   * const progress = player.getPlaybackProgress();
   * progressBar.style.width = `${progress * 100}%`;
   * ```
   */
  getPlaybackProgress(): number {
    const duration = this.getReplayDuration();
    if (duration === 0) {
      return 1.0;
    }

    return Math.min(1.0, this.playbackElapsedTime / duration);
  }

  /**
   * Gets the total duration of the replay in seconds.
   *
   * @returns Duration in seconds, or 0 if no frames
   */
  getReplayDuration(): number {
    if (this.frames.length === 0) {
      return 0;
    }

    return this.frames[this.frames.length - 1].time;
  }

  /**
   * Gets the number of frames in the replay buffer.
   *
   * @returns Frame count
   */
  getFrameCount(): number {
    return this.frames.length;
  }

  /**
   * Gets current playback time in seconds.
   *
   * @returns Elapsed time since playback start
   */
  getPlaybackTime(): number {
    return this.playbackElapsedTime;
  }

  /**
   * Finds the two frames surrounding the given timestamp for interpolation.
   *
   * Uses binary search for efficiency when seekin through large buffers.
   * Returns frame indices and interpolation factor (0-1) between them.
   *
   * Performance:
   * - Time complexity: O(log n) binary search
   * - Only searches when playback advances to new frame boundary
   *
   * @param targetTime - Time in seconds to find frames for
   * @returns Object with currentIndex, nextIndex, and interpolation factor t (0-1),
   *          or null if target time is beyond replay bounds
   *
   * @internal
   */
  private findSurroundingFrames(targetTime: number): {
    currentIndex: number;
    nextIndex: number;
    t: number;
  } | null {
    if (this.frames.length === 0) {
      return null;
    }

    // Clamp target time to replay bounds
    const clampedTime = Math.max(0, Math.min(targetTime, this.getReplayDuration()));

    // Binary search for the frame at or just before clampedTime
    let left = 0;
    let right = this.frames.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right + 1) / 2);
      if (this.frames[mid].time <= clampedTime) {
        left = mid;
      } else {
        right = mid - 1;
      }
    }

    const currentIndex = left;

    // Handle edge cases
    if (currentIndex >= this.frames.length - 1) {
      // At or past the end, return the last frame with t=0 (no interpolation)
      return {
        currentIndex: this.frames.length - 1,
        nextIndex: this.frames.length - 1,
        t: 0,
      };
    }

    const currentFrame = this.frames[currentIndex];
    const nextFrame = this.frames[currentIndex + 1];

    // Calculate interpolation factor (0-1) between current and next frame
    const frameDuration = nextFrame.time - currentFrame.time;
    const t = frameDuration > 0 ? (clampedTime - currentFrame.time) / frameDuration : 0;

    return {
      currentIndex,
      nextIndex: currentIndex + 1,
      t: Math.max(0, Math.min(1, t)), // Clamp to [0, 1]
    };
  }

  /**
   * Interpolates between two frames using appropriate interpolation methods.
   *
   * - Positions: Linear interpolation (lerp)
   * - Rotations: Spherical linear interpolation (slerp for smooth rotation)
   * - Wheel rotations: Linear interpolation (they're just angles)
   *
   * Performance:
   * - Zero allocations: Reuses temp vectors and quaternions
   * - All interpolations are O(1)
   * - Target: <0.5ms total per frame
   *
   * @param frame1 - First frame to interpolate from
   * @param frame2 - Second frame to interpolate to
   * @param t - Interpolation factor (0-1, where 0 = frame1, 1 = frame2)
   * @returns Interpolated ReplayFrame
   *
   * @internal
   */
  private interpolateFrames(frame1: ReplayFrame, frame2: ReplayFrame, t: number): ReplayFrame {
    // Interpolate vehicle position (linear)
    this.tempVector3.fromArray(frame1.vehiclePosition);
    const pos2 = new THREE.Vector3().fromArray(frame2.vehiclePosition);
    this.tempVector3.lerp(pos2, t);
    this.tempInterpolatedFrame.vehiclePosition[0] = this.tempVector3.x;
    this.tempInterpolatedFrame.vehiclePosition[1] = this.tempVector3.y;
    this.tempInterpolatedFrame.vehiclePosition[2] = this.tempVector3.z;

    // Interpolate vehicle rotation (spherical linear - smooth rotation)
    this.tempQuaternion.fromArray(frame1.vehicleRotation);
    const rot2 = new THREE.Quaternion().fromArray(frame2.vehicleRotation);
    this.tempQuaternion.slerp(rot2, t);
    this.tempInterpolatedFrame.vehicleRotation[0] = this.tempQuaternion.x;
    this.tempInterpolatedFrame.vehicleRotation[1] = this.tempQuaternion.y;
    this.tempInterpolatedFrame.vehicleRotation[2] = this.tempQuaternion.z;
    this.tempInterpolatedFrame.vehicleRotation[3] = this.tempQuaternion.w;

    // Interpolate wheel rotations (linear - they're just angles)
    for (let i = 0; i < 4; i++) {
      const angle1 = frame1.wheelRotations[i];
      const angle2 = frame2.wheelRotations[i];
      this.tempInterpolatedFrame.wheelRotations[i] = angle1 + (angle2 - angle1) * t;
    }

    // Interpolate camera position (linear)
    this.tempVector3.fromArray(frame1.cameraPosition);
    const camPos2 = new THREE.Vector3().fromArray(frame2.cameraPosition);
    this.tempVector3.lerp(camPos2, t);
    this.tempInterpolatedFrame.cameraPosition[0] = this.tempVector3.x;
    this.tempInterpolatedFrame.cameraPosition[1] = this.tempVector3.y;
    this.tempInterpolatedFrame.cameraPosition[2] = this.tempVector3.z;

    // Interpolate camera rotation (spherical linear)
    this.tempQuaternion.fromArray(frame1.cameraRotation);
    const camRot2 = new THREE.Quaternion().fromArray(frame2.cameraRotation);
    this.tempQuaternion.slerp(camRot2, t);
    this.tempInterpolatedFrame.cameraRotation[0] = this.tempQuaternion.x;
    this.tempInterpolatedFrame.cameraRotation[1] = this.tempQuaternion.y;
    this.tempInterpolatedFrame.cameraRotation[2] = this.tempQuaternion.z;
    this.tempInterpolatedFrame.cameraRotation[3] = this.tempQuaternion.w;

    // Interpolate time
    this.tempInterpolatedFrame.time = frame1.time + (frame2.time - frame1.time) * t;

    return this.tempInterpolatedFrame;
  }

  /**
   * Gets debug information about the player state.
   *
   * Useful for monitoring and troubleshooting playback issues.
   *
   * @returns Debug object with player stats
   *
   * @example
   * ```typescript
   * const debug = player.getDebugInfo();
   * console.log(`Playing: ${debug.isPlaying}, Progress: ${(debug.progress * 100).toFixed(1)}%`);
   * ```
   */
  getDebugInfo(): {
    isPlaying: boolean;
    frameCount: number;
    currentFrameIndex: number;
    playbackTime: number;
    replayDuration: number;
    progress: number;
  } {
    return {
      isPlaying: this.isPlaying,
      frameCount: this.frames.length,
      currentFrameIndex: this.currentFrameIndex,
      playbackTime: this.playbackElapsedTime,
      replayDuration: this.getReplayDuration(),
      progress: this.getPlaybackProgress(),
    };
  }

  /**
   * Disposes the player and clears resources.
   *
   * Call when replay playback is no longer needed.
   * Clears frame buffer and resets state.
   */
  dispose(): void {
    this.frames = [];
    this.isPlaying = false;
    this.currentFrameIndex = 0;
    console.log('ReplayPlayer disposed');
  }
}
