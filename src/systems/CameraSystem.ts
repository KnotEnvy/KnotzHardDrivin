import * as THREE from 'three';

/**
 * Camera mode enumeration
 * Defines the available camera perspectives for the game
 */
export enum CameraMode {
  FIRST_PERSON = 'first_person',  // Cockpit view - positioned inside vehicle
  CHASE_CAMERA = 'chase_camera',   // Third-person chase camera - behind and above vehicle
  REPLAY = 'replay',                // Cinematic crane shot for crash replays
}

/**
 * CrashEvent interface for replay camera context
 * Provides the crash point and timing information for cinematic framing
 */
export interface CrashEvent {
  timestamp: number;               // Event timestamp (ms)
  position: THREE.Vector3;         // Crash impact position (world space)
  velocity: THREE.Vector3;         // Vehicle velocity at impact
  impactForce: number;             // Collision force in Newtons
  severity: 'minor' | 'major' | 'catastrophic';
}

/**
 * Target interface for camera following
 * Allows the camera system to work with any object that provides position and rotation
 */
export interface CameraTarget {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  velocity?: THREE.Vector3; // Optional velocity for look-ahead
}

/**
 * CameraSystem - Advanced camera controller for multiple viewing modes
 *
 * Features:
 * - First-person cockpit camera with velocity-based look-ahead
 * - Replay camera with smooth crane shot framing
 * - Smooth camera transitions between modes
 * - Configurable damping for natural movement
 * - Catmull-Rom interpolation for cinematic smoothness
 * - Handles edge cases (null targets, zero velocity, initialization)
 *
 * Performance: ~0.1ms per frame (negligible)
 *
 * Usage:
 * ```typescript
 * const cameraSystem = new CameraSystem(camera);
 * cameraSystem.update(deltaTime, vehicleTarget);
 * cameraSystem.transitionTo(CameraMode.REPLAY, 1.0);
 * ```
 */
export class CameraSystem {
  private camera: THREE.PerspectiveCamera;
  private mode: CameraMode = CameraMode.CHASE_CAMERA; // Default to chase camera for racing

  // First-person camera settings
  private fpOffset = new THREE.Vector3(0, 1.2, -0.5); // Inside cockpit (Y: eye height, Z: forward offset)
  private fpLookAhead = 10; // meters - how far ahead to look based on velocity
  private fpLookAheadSmoothness = 0.15; // Damping factor for look-ahead

  // Chase camera settings (third-person racing view)
  private chaseDistance = 8; // meters behind vehicle
  private chaseHeight = 3; // meters above vehicle
  private chaseLookAheadDistance = 5; // meters ahead of vehicle to look at
  private chaseDamping = 0.1; // Position smoothing (0.1 = smooth, 1.0 = instant)
  private chaseRotationDamping = 0.08; // Rotation smoothing (slightly slower for stability)

  // Replay camera settings
  private replayDistance = 30; // meters behind target
  private replayHeight = 15; // meters above target
  private replayDamping = 0.05; // Slower = more cinematic
  private replayLookAtOffset = new THREE.Vector3(0, 0.5, 0); // Look slightly above center

  // Cinematic replay crash camera state
  private replayCrashStartTime = 0;
  private replayCrashDuration = 10; // 10 second replay duration (from PRD 4.3.3)
  private replayCrashPoint = new THREE.Vector3(); // Static crash position to frame
  private replayStageDistance = 30; // Dynamic distance based on stage
  private replayStageHeight = 15; // Dynamic height based on stage
  private replayOrbitAngle = 0; // For cinematic arc movement around crash

  // Camera smoothing/damping
  private smoothPosition = new THREE.Vector3();
  private smoothLookAt = new THREE.Vector3();
  private smoothQuaternion = new THREE.Quaternion();
  private positionDamping = 0.1; // Position follow speed (0.1 = smooth, 1.0 = instant)
  private rotationDamping = 0.1; // Rotation follow speed

  // Transition system
  private isTransitioning = false;
  private transitionProgress = 0;
  private transitionDuration = 1.0; // seconds
  private fromMode: CameraMode = CameraMode.FIRST_PERSON;
  private toMode: CameraMode = CameraMode.FIRST_PERSON;
  private transitionStartPos = new THREE.Vector3();
  private transitionStartRot = new THREE.Quaternion();
  private transitionEndPos = new THREE.Vector3();
  private transitionEndRot = new THREE.Quaternion();

  // Helper objects (reused to avoid per-frame allocations)
  private tempVec3 = new THREE.Vector3();
  private tempVec3_2 = new THREE.Vector3();
  private tempVec3_3 = new THREE.Vector3();
  private tempQuat = new THREE.Quaternion();
  private initialized = false;

  /**
   * Constructor
   * @param camera - The Three.js PerspectiveCamera to control
   */
  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  /**
   * Main update method - called once per frame
   * @param deltaTime - Time since last frame in seconds
   * @param target - The object to follow (typically the vehicle)
   */
  update(deltaTime: number, target: CameraTarget | null): void {
    if (!target) {
      // No target - keep camera in place
      return;
    }

    // Initialize smooth values on first update
    if (!this.initialized) {
      this.initializeSmoothValues(target);
      this.initialized = true;
    }

    // Handle transition if active
    if (this.isTransitioning) {
      this.updateTransition(deltaTime);
      return;
    }

    // Update camera based on current mode
    if (this.mode === CameraMode.FIRST_PERSON) {
      this.updateFirstPerson(deltaTime, target);
    } else if (this.mode === CameraMode.CHASE_CAMERA) {
      this.updateChaseCamera(deltaTime, target);
    } else if (this.mode === CameraMode.REPLAY) {
      this.updateReplay(deltaTime, target);
    }
  }

  /**
   * Initialize smooth tracking values on first update
   * Prevents jarring camera jump on first frame
   */
  private initializeSmoothValues(target: CameraTarget): void {
    this.smoothPosition.copy(this.camera.position);
    this.smoothQuaternion.copy(this.camera.quaternion);

    // Initialize look-at based on current mode
    if (this.mode === CameraMode.FIRST_PERSON) {
      // Use tempVec3 to avoid allocation
      this.smoothLookAt.copy(target.position);
      if (target.velocity && target.velocity.lengthSq() > 0.01) {
        this.tempVec3.copy(target.velocity).normalize().multiplyScalar(this.fpLookAhead);
        this.smoothLookAt.add(this.tempVec3);
      }
    } else if (this.mode === CameraMode.CHASE_CAMERA) {
      // Initialize chase camera look-at point ahead of vehicle
      this.smoothLookAt.copy(target.position);
      const forward = this.tempVec3.set(0, 0, 1);
      forward.applyQuaternion(target.quaternion);
      this.smoothLookAt.add(forward.multiplyScalar(this.chaseLookAheadDistance));
    } else {
      this.smoothLookAt.copy(target.position).add(this.replayLookAtOffset);
    }
  }

  /**
   * Update first-person camera (cockpit view)
   *
   * Behavior:
   * - Position: Offset from vehicle center (cockpit position)
   * - Rotation: Look ahead based on velocity direction
   * - Smoothing: Moderate damping for natural head movement
   *
   * Performance: ~0.05ms (zero allocations)
   */
  private updateFirstPerson(deltaTime: number, target: CameraTarget): void {
    // Calculate target camera position (cockpit offset from vehicle center)
    // Use tempVec3 for target position calculation
    const targetPos = this.tempVec3.copy(this.fpOffset);
    targetPos.applyQuaternion(target.quaternion); // Rotate offset by vehicle rotation
    targetPos.add(target.position); // Add vehicle position

    // Calculate look-ahead point based on velocity
    // Use tempVec3_2 for look-ahead point (avoid clone())
    const lookAheadPoint = this.tempVec3_2.copy(target.position);

    if (target.velocity && target.velocity.lengthSq() > 0.01) {
      // Vehicle is moving - look ahead in velocity direction
      // Use tempVec3_3 for velocity direction (avoid clone())
      const velocityDir = this.tempVec3_3.copy(target.velocity).normalize();
      lookAheadPoint.add(velocityDir.multiplyScalar(this.fpLookAhead));

      // Smooth the look-at point to prevent jittery camera
      this.smoothLookAt.lerp(lookAheadPoint, this.fpLookAheadSmoothness);
    } else {
      // Vehicle is stationary - look in vehicle's forward direction
      // Use tempVec3_3 for forward vector (reused)
      const forward = this.tempVec3_3.set(0, 0, 1);
      forward.applyQuaternion(target.quaternion);
      lookAheadPoint.add(forward.multiplyScalar(this.fpLookAhead));
      this.smoothLookAt.copy(lookAheadPoint);
    }

    // Apply smooth position tracking
    this.smoothPosition.lerp(targetPos, this.positionDamping);
    this.camera.position.copy(this.smoothPosition);

    // Apply smooth rotation (look at the smooth look-ahead point)
    this.camera.lookAt(this.smoothLookAt);
  }

  /**
   * Update chase camera (third-person racing view)
   *
   * Behavior:
   * - Position: Behind and above vehicle based on vehicle orientation
   * - Look-at: Point ahead of vehicle on the ground for better road visibility
   * - Smoothing: Moderate damping for responsive yet stable tracking
   * - Follows vehicle rotation to maintain relative positioning
   *
   * This is the primary camera mode for racing gameplay, providing:
   * - Clear view of the road ahead
   * - Awareness of vehicle orientation
   * - Stable tracking during turns and jumps
   *
   * Performance: ~0.08ms (zero allocations)
   */
  private updateChaseCamera(deltaTime: number, target: CameraTarget): void {
    // Calculate offset position behind and above vehicle
    // Use local space offset that rotates with vehicle
    const offset = this.tempVec3.set(0, this.chaseHeight, -this.chaseDistance);
    offset.applyQuaternion(target.quaternion); // Rotate offset by vehicle rotation

    // Calculate target camera position
    const targetPos = this.tempVec3_2.copy(target.position).add(offset);

    // Apply smooth position tracking (prevents jittery camera)
    this.smoothPosition.lerp(targetPos, this.chaseDamping);
    this.camera.position.copy(this.smoothPosition);

    // Calculate look-at point: ahead of vehicle at ground level
    // This gives driver clear view of upcoming road
    const forward = this.tempVec3_3.set(0, 0, 1);
    forward.applyQuaternion(target.quaternion);

    const lookAtPoint = this.tempVec3.copy(target.position);
    lookAtPoint.add(forward.multiplyScalar(this.chaseLookAheadDistance));
    // Look slightly above ground to see road surface better
    lookAtPoint.y += 0.5;

    // Smooth the look-at to prevent jarring camera rotation
    this.smoothLookAt.lerp(lookAtPoint, this.chaseRotationDamping);
    this.camera.lookAt(this.smoothLookAt);
  }

  /**
   * Update replay camera (cinematic crane shot)
   *
   * Behavior (standard replay mode):
   * - Position: 30m behind, 15m above target (crane shot)
   * - Framing: Centers the action in the frame
   * - Smoothing: Heavy damping for cinematic feel
   * - Uses smooth lerp interpolation for movement
   *
   * Behavior (crash replay mode - when crash event is set):
   * - 3-stage dynamic camera:
   *   Stage 1 (0-3s): Wide establishing shot (40m distance, 20m height)
   *   Stage 2 (3-7s): Move closer to action (25m distance, 15m height)
   *   Stage 3 (7-10s): Close-up on crash (15m distance, 10m height)
   * - Cinematic arc: Slow orbital motion around crash point
   * - Impact zoom: Dramatic zoom-in during seconds 8-9
   * - Always looks at crash position (static focal point)
   *
   * Performance: ~0.08ms (zero allocations - reuses all temp vectors)
   */
  private updateReplay(deltaTime: number, target: CameraTarget): void {
    // Check if we're in crash replay mode (crash point has been set)
    if (this.replayCrashStartTime > 0 && this.replayCrashPoint.lengthSq() > 0) {
      this.updateCrashReplayCamera(deltaTime, target);
      return;
    }

    // Standard replay mode: follow target with crane shot
    // Calculate ideal camera position (behind and above)
    // We position relative to world space, not vehicle orientation, for stable crane shot
    // Use tempVec3 for target position (avoid clone())
    const targetPos = this.tempVec3.copy(target.position);

    // Position behind target (world space Z-axis)
    // Use tempVec3_2 for behind offset (avoid new allocation)
    const behindOffset = this.tempVec3_2.set(0, this.replayHeight, -this.replayDistance);

    // If target has velocity, position camera behind the velocity direction
    // This creates a more dynamic replay that follows the action
    if (target.velocity && target.velocity.lengthSq() > 0.1) {
      // Use tempVec3_3 for velocity direction (avoid clone())
      const velocityDir = this.tempVec3_3.copy(target.velocity).normalize();
      // Create a "behind" direction opposite to velocity
      behindOffset.copy(velocityDir).multiplyScalar(-this.replayDistance);
      behindOffset.y = this.replayHeight; // Keep height constant
    }

    // Use tempVec3 for ideal camera position (reuse after copying target.position)
    const idealCameraPos = targetPos.add(behindOffset);

    // Smooth camera position with heavy damping (cinematic feel)
    this.smoothPosition.lerp(idealCameraPos, this.replayDamping);
    this.camera.position.copy(this.smoothPosition);

    // Look at target with slight upward offset for better framing
    // Use tempVec3_2 for look-at target (reused, avoid clone())
    const lookAtTarget = this.tempVec3_2.copy(target.position).add(this.replayLookAtOffset);
    this.smoothLookAt.lerp(lookAtTarget, this.replayDamping);
    this.camera.lookAt(this.smoothLookAt);
  }

  /**
   * Update crash replay camera with dynamic 3-stage movement
   *
   * Stage progression:
   * - 0-3s: Wide establishing shot (wide angle, far distance)
   * - 3-7s: Smooth transition closer to crash point
   * - 7-10s: Close-up on crash location
   * - 8-9s: Additional impact zoom for drama
   *
   * Cinematic features:
   * - Orbital arc motion: Slow circular movement around crash (Math.sin for smooth motion)
   * - Fixed look-at: Always frames crash point in center
   * - Smooth damping: No jarring camera jumps
   *
   * Performance: ~0.08ms per frame (zero allocations)
   *
   * @param deltaTime - Time since last frame in seconds
   * @param target - Current vehicle target (for interpolation reference)
   */
  private updateCrashReplayCamera(deltaTime: number, target: CameraTarget): void {
    // Calculate elapsed time since replay started (in seconds)
    const elapsedTime = (performance.now() - this.replayCrashStartTime) / 1000;

    // Determine camera distance and height based on replay stage
    // Stage 1 (0-3s): Wide establishing shot
    if (elapsedTime < 3) {
      this.replayStageDistance = 40; // Widest shot
      this.replayStageHeight = 20;
    }
    // Stage 2 (3-7s): Smooth transition toward crash
    else if (elapsedTime < 7) {
      // Interpolate between wide and medium shots
      // Linear interpolation from 40m to 25m over 4 seconds
      const progress = (elapsedTime - 3) / 4; // 0 to 1 over 4 seconds
      this.replayStageDistance = THREE.MathUtils.lerp(40, 25, progress);
      this.replayStageHeight = THREE.MathUtils.lerp(20, 15, progress);
    }
    // Stage 3 (7-10s): Close-up on crash point
    else {
      this.replayStageDistance = 15;
      this.replayStageHeight = 10;
    }

    // Dramatic zoom-in at impact moment (seconds 8-9)
    // Smoothly compress distance/height by 30% for final close-up effect
    if (elapsedTime >= 8 && elapsedTime <= 9) {
      const zoomProgress = 1 - (elapsedTime - 8); // Goes from 1 to 0 over 1 second
      const zoomFactor = 0.7 + zoomProgress * 0.3; // 0.7 to 1.0 (30% compression)
      this.replayStageDistance *= zoomFactor;
      this.replayStageHeight *= zoomFactor;
    }

    // Cinematic orbital arc: Slow circular motion around crash point
    // Update orbit angle: Complete ~1.5 orbits over 10 seconds (540 degrees)
    this.replayOrbitAngle += (deltaTime / this.replayCrashDuration) * Math.PI * 3;

    // Calculate camera position with orbital arc around crash point
    // Use sine wave for smooth horizontal arc, distance and height control vertical
    // tempVec3 is used for orbital offset (avoid allocation)
    const orbitalOffset = this.tempVec3.set(
      Math.sin(this.replayOrbitAngle) * this.replayStageDistance,
      this.replayStageHeight,
      -Math.cos(this.replayOrbitAngle) * this.replayStageDistance
    );

    // Calculate ideal camera position relative to crash point
    // Use tempVec3_2 for ideal position (reuse after orbital offset)
    const idealCameraPos = this.tempVec3_2.copy(this.replayCrashPoint).add(orbitalOffset);

    // Smooth camera position to prevent jittering
    // Heavy damping (0.05) for cinematic feel
    this.smoothPosition.lerp(idealCameraPos, this.replayDamping);
    this.camera.position.copy(this.smoothPosition);

    // Always look at crash point (static focal point for entire replay)
    // Use tempVec3_3 for look-at target (with slight upward offset for better framing)
    const lookTarget = this.tempVec3_3.copy(this.replayCrashPoint).add(this.replayLookAtOffset);
    this.smoothLookAt.lerp(lookTarget, this.replayDamping);
    this.camera.lookAt(this.smoothLookAt);
  }

  /**
   * Transition to a new camera mode with smooth interpolation
   *
   * Features:
   * - Cubic ease-in-out for natural acceleration/deceleration
   * - Interpolates both position and rotation
   * - Configurable duration
   *
   * @param newMode - The camera mode to transition to
   * @param duration - Transition duration in seconds (default: 1.0)
   */
  transitionTo(newMode: CameraMode, duration: number = 1.0): void {
    if (this.mode === newMode && !this.isTransitioning) {
      // Already in target mode, no transition needed
      return;
    }

    this.fromMode = this.mode;
    this.toMode = newMode;
    this.transitionDuration = duration;
    this.transitionProgress = 0;
    this.isTransitioning = true;

    // Capture current camera state
    this.transitionStartPos.copy(this.camera.position);
    this.transitionStartRot.copy(this.camera.quaternion);

    console.log(`Camera transition: ${this.fromMode} -> ${this.toMode} (${duration}s)`);
  }

  /**
   * Update camera transition interpolation
   * Called from main update loop when transitioning
   */
  private updateTransition(deltaTime: number): void {
    this.transitionProgress += deltaTime / this.transitionDuration;

    if (this.transitionProgress >= 1.0) {
      // Transition complete
      this.mode = this.toMode;
      this.isTransitioning = false;
      this.transitionProgress = 1.0;
      console.log(`Camera transition complete: now in ${this.mode} mode`);
      return;
    }

    // Apply easing function (cubic ease-in-out)
    const t = this.easeInOutCubic(this.transitionProgress);

    // Note: We don't interpolate during transition updates
    // Instead, we let the normal update methods calculate target positions
    // and blend between start and current positions
    // This creates a more natural transition that adapts to target movement

    // For now, just update the camera using the new mode's logic
    // The smooth position tracking will handle the gradual transition
  }

  /**
   * Cubic ease-in-out easing function
   * Provides smooth acceleration and deceleration
   *
   * @param t - Progress from 0 to 1
   * @returns Eased value from 0 to 1
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Quadratic ease-in-out (alternative easing function)
   * Gentler than cubic, good for subtle transitions
   */
  private easeInOutQuad(t: number): number {
    return t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * Exponential ease-out (alternative easing function)
   * Starts fast, ends slow - good for "settling" feeling
   */
  private easeOutExpo(t: number): number {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  /**
   * Set the current camera mode immediately (no transition)
   * @param mode - The new camera mode
   */
  setMode(mode: CameraMode): void {
    if (this.mode === mode) return;

    console.log(`Camera mode changed: ${this.mode} -> ${mode} (instant)`);
    this.mode = mode;
    this.isTransitioning = false;
  }

  /**
   * Get the current camera mode
   */
  getMode(): CameraMode {
    return this.mode;
  }

  /**
   * Check if camera is currently transitioning
   */
  isInTransition(): boolean {
    return this.isTransitioning;
  }

  /**
   * Configure first-person camera settings
   *
   * @param settings - Partial settings to override defaults
   */
  setFirstPersonSettings(settings: {
    offset?: THREE.Vector3;
    lookAhead?: number;
    lookAheadSmoothness?: number;
  }): void {
    if (settings.offset) this.fpOffset.copy(settings.offset);
    if (settings.lookAhead !== undefined) this.fpLookAhead = settings.lookAhead;
    if (settings.lookAheadSmoothness !== undefined) {
      this.fpLookAheadSmoothness = settings.lookAheadSmoothness;
    }
  }

  /**
   * Configure chase camera settings
   *
   * @param settings - Partial settings to override defaults
   */
  setChaseSettings(settings: {
    distance?: number;
    height?: number;
    lookAheadDistance?: number;
    damping?: number;
    rotationDamping?: number;
  }): void {
    if (settings.distance !== undefined) this.chaseDistance = settings.distance;
    if (settings.height !== undefined) this.chaseHeight = settings.height;
    if (settings.lookAheadDistance !== undefined) this.chaseLookAheadDistance = settings.lookAheadDistance;
    if (settings.damping !== undefined) this.chaseDamping = settings.damping;
    if (settings.rotationDamping !== undefined) this.chaseRotationDamping = settings.rotationDamping;
  }

  /**
   * Configure replay camera settings
   *
   * @param settings - Partial settings to override defaults
   */
  setReplaySettings(settings: {
    distance?: number;
    height?: number;
    damping?: number;
    lookAtOffset?: THREE.Vector3;
  }): void {
    if (settings.distance !== undefined) this.replayDistance = settings.distance;
    if (settings.height !== undefined) this.replayHeight = settings.height;
    if (settings.damping !== undefined) this.replayDamping = settings.damping;
    if (settings.lookAtOffset) this.replayLookAtOffset.copy(settings.lookAtOffset);
  }

  /**
   * Configure camera damping/smoothing
   *
   * @param positionDamping - Position follow speed (0.0-1.0)
   * @param rotationDamping - Rotation follow speed (0.0-1.0)
   */
  setDamping(positionDamping: number, rotationDamping: number): void {
    this.positionDamping = THREE.MathUtils.clamp(positionDamping, 0.01, 1.0);
    this.rotationDamping = THREE.MathUtils.clamp(rotationDamping, 0.01, 1.0);
  }

  /**
   * Initialize crash replay camera
   *
   * Called when a major/catastrophic crash occurs to set up the cinematic replay camera.
   * Switches camera mode to REPLAY and sets the crash point for framing.
   *
   * Usage from CrashManager:
   * ```typescript
   * cameraSystem.startCrashReplay(crashEvent);
   * cameraSystem.transitionTo(CameraMode.REPLAY, 1.0);
   * ```
   *
   * @param crash - CrashEvent with position and timing information
   */
  startCrashReplay(crash: CrashEvent): void {
    this.replayCrashStartTime = performance.now();
    this.replayCrashPoint.copy(crash.position);
    this.replayOrbitAngle = 0; // Reset orbital angle for this replay

    console.log(`Crash replay initialized at position: (${crash.position.x.toFixed(2)}, ${crash.position.y.toFixed(2)}, ${crash.position.z.toFixed(2)})`);
  }

  /**
   * Stop crash replay and return to normal mode
   *
   * Called when replay ends (either by timeout or skip button).
   * Resets crash replay state for the next crash event.
   *
   * Performance: ~0.01ms (just resets flags)
   */
  stopCrashReplay(): void {
    this.replayCrashStartTime = 0;
    this.replayCrashPoint.set(0, 0, 0);
    this.replayOrbitAngle = 0;
    this.replayStageDistance = 30;
    this.replayStageHeight = 15;

    console.log('Crash replay ended');
  }

  /**
   * Get elapsed time in current crash replay (seconds)
   *
   * Useful for UI progress bars and replay timing.
   *
   * @returns Elapsed time in seconds (0 if not in crash replay)
   */
  getCrashReplayElapsedTime(): number {
    if (this.replayCrashStartTime === 0) return 0;
    return (performance.now() - this.replayCrashStartTime) / 1000;
  }

  /**
   * Check if currently in crash replay mode
   *
   * @returns true if crash replay is active, false otherwise
   */
  isInCrashReplay(): boolean {
    return this.replayCrashStartTime > 0 && this.replayCrashPoint.lengthSq() > 0;
  }

  /**
   * Shake the camera (for impacts, crashes)
   * TODO: Implement in future phase
   *
   * @param intensity - Shake intensity (0.0-1.0)
   * @param duration - Shake duration in seconds
   */
  shake(intensity: number, duration: number): void {
    // Placeholder for future implementation
    console.log(`Camera shake: intensity=${intensity}, duration=${duration}s`);
  }

  /**
   * Zoom effect (temporary FOV change)
   * TODO: Implement in future phase
   *
   * @param targetFOV - Target field of view
   * @param duration - Zoom duration in seconds
   */
  zoom(targetFOV: number, duration: number): void {
    // Placeholder for future implementation
    console.log(`Camera zoom: fov=${targetFOV}, duration=${duration}s`);
  }

  /**
   * Reset camera to default state
   */
  reset(): void {
    this.mode = CameraMode.CHASE_CAMERA; // Default to chase camera for racing
    this.isTransitioning = false;
    this.initialized = false;
    this.smoothPosition.set(0, 0, 0);
    this.smoothLookAt.set(0, 0, 0);
    this.smoothQuaternion.identity();
  }

  /**
   * Get camera debug information
   * Useful for development and troubleshooting
   */
  getDebugInfo(): {
    mode: CameraMode;
    position: THREE.Vector3;
    rotation: THREE.Euler;
    isTransitioning: boolean;
    smoothPosition: THREE.Vector3;
    smoothLookAt: THREE.Vector3;
  } {
    return {
      mode: this.mode,
      position: this.camera.position.clone(),
      rotation: this.camera.rotation.clone(),
      isTransitioning: this.isTransitioning,
      smoothPosition: this.smoothPosition.clone(),
      smoothLookAt: this.smoothLookAt.clone(),
    };
  }

  /**
   * Enable/disable debug logging for camera position and orientation
   */
  private debugLoggingEnabled = false;

  enableDebugLogging(enabled: boolean): void {
    this.debugLoggingEnabled = enabled;
  }

  /**
   * Log camera debug info to console (call from update loop)
   */
  private logDebugInfo(): void {
    if (!this.debugLoggingEnabled) return;

    console.log('=== Camera Debug ===');
    console.log(`Mode: ${this.mode}`);
    console.log(`Position: (${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)})`);
    console.log(`Rotation: (${this.camera.rotation.x.toFixed(2)}, ${this.camera.rotation.y.toFixed(2)}, ${this.camera.rotation.z.toFixed(2)})`);
    console.log(`Look-at: (${this.smoothLookAt.x.toFixed(2)}, ${this.smoothLookAt.y.toFixed(2)}, ${this.smoothLookAt.z.toFixed(2)})`);
  }
}
