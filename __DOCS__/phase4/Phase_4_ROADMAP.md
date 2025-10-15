## Phase 4: Crash & Replay System
**Duration**: Week 7-8 (10 days)  
**Status**: 🔴 Not Started  
**Dependencies**: Phases 2, 3 complete  
**Team**: 2-3 developers  
**Parallel Work**: ⚡ Split into 4A (Crash) and 4B (Replay)

### Phase 4A: Crash Detection ⚡
**Developer Focus**: Physics/Collision Developer

#### Tasks
- [ ] **Implement collision detection (PhysicsWorld.ts)**
  ```typescript
  export class PhysicsWorld {
    private eventQueue: RAPIER.EventQueue;

    init(): void {
      // ... existing code
      this.eventQueue = new RAPIER.EventQueue(true);
    }

    step(deltaTime: number): void {
      this.world.step(this.eventQueue);
      this.handleCollisionEvents();
    }

    private handleCollisionEvents(): void {
      this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
        if (!started) return;

        const collider1 = this.world.getCollider(handle1);
        const collider2 = this.world.getCollider(handle2);

        const entity1 = this.getEntityFromCollider(collider1);
        const entity2 = this.getEntityFromCollider(collider2);

        if (entity1 instanceof Vehicle || entity2 instanceof Vehicle) {
          this.onVehicleCollision(entity1, entity2);
        }
      });
    }

    private onVehicleCollision(entity1: Entity, entity2: Entity): void {
      const vehicle = entity1 instanceof Vehicle ? entity1 : entity2 as Vehicle;
      const other = entity1 instanceof Vehicle ? entity2 : entity1;

      // Calculate impact force
      const velocity = vehicle.getVelocity();
      const speed = velocity.length();
      const impactForce = speed * vehicle.getMass();

      const crashEvent: CrashEvent = {
        timestamp: performance.now(),
        position: vehicle.getPosition().clone(),
        velocity: velocity.clone(),
        impactForce,
        severity: this.calculateSeverity(impactForce),
        collidedWith: other,
      };

      // Emit crash event
      this.emitEvent('crash', crashEvent);
    }

    private calculateSeverity(force: number): CrashSeverity {
      if (force < 5000) return 'minor';
      if (force < 15000) return 'major';
      return 'catastrophic';
    }
  }
  ```

- [ ] **Create CrashManager.ts**
  ```typescript
  export interface CrashEvent {
    timestamp: number;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    impactForce: number;
    severity: 'minor' | 'major' | 'catastrophic';
    collidedWith: Entity;
  }

  export class CrashManager {
    private lastCrash: CrashEvent | null = null;

    onCrash(event: CrashEvent): void {
      this.lastCrash = event;

      if (event.severity === 'minor') {
        // Just a bump, no replay needed
        this.playMinorCrashSound();
        return;
      }

      // Major or catastrophic crash - trigger replay
      this.triggerReplaySequence(event);
    }

    private triggerReplaySequence(event: CrashEvent): void {
      // 1. Freeze game
      GameEngine.getInstance().setState(GameState.CRASHED);

      // 2. Start replay recording
      ReplaySystem.getInstance().startPlayback(event.timestamp - 10000); // Last 10 seconds

      // 3. Transition camera
      CameraSystem.getInstance().transitionTo(CameraMode.REPLAY, 1.0);

      // 4. Apply damage
      Vehicle.getInstance().applyDamage(event.impactForce);

      // 5. Schedule respawn
      setTimeout(() => {
        this.respawnVehicle();
      }, 10000); // 10 second replay
    }

    private respawnVehicle(): void {
      const lastWaypoint = WaypointSystem.getInstance().getLastPassedWaypoint();

      // Reset vehicle to last waypoint
      Vehicle.getInstance().reset(
        lastWaypoint.position,
        lastWaypoint.rotation
      );

      // Transition back to gameplay
      GameEngine.getInstance().setState(GameState.PLAYING);
      CameraSystem.getInstance().transitionTo(CameraMode.FIRST_PERSON, 0.5);
    }
  }
  ```

- [ ] **Add hard landing detection**
  ```typescript
  private checkHardLanding(vehicle: Vehicle): void {
    const velocity = vehicle.getVelocity();
    const isOnGround = vehicle.isOnGround();
    const wasAirborne = vehicle.wasAirborne();

    if (isOnGround && wasAirborne) {
      const verticalSpeed = Math.abs(velocity.y);
      
      if (verticalSpeed > 15) { // m/s
        // Hard landing! Trigger crash
        this.onCrash({
          timestamp: performance.now(),
          position: vehicle.getPosition(),
          velocity,
          impactForce: verticalSpeed * vehicle.getMass(),
          severity: verticalSpeed > 25 ? 'catastrophic' : 'major',
          collidedWith: 'ground',
        });
      }
    }
  }
  ```

### Phase 4B: Replay Recording & Playback ⚡
**Developer Focus**: Replay/Camera Developer

#### Tasks
- [ ] **Create ReplaySystem.ts**
  ```typescript
  export interface ReplayFrame {
    time: number;
    vehicleTransform: {
      position: [number, number, number];
      rotation: [number, number, number, number]; // quaternion
    };
    wheelRotations: number[];
    cameraTransform: {
      position: [number, number, number];
      rotation: [number, number, number, number];
    };
  }

  export class ReplaySystem {
    private buffer: ReplayFrame[] = [];
    private maxBufferSize = 900; // 15 seconds at 60fps
    private isRecording = true;
    private isPlaying = false;
    private playbackStartTime = 0;
    private playbackIndex = 0;

    recordFrame(vehicle: Vehicle, camera: THREE.Camera): void {
      if (!this.isRecording) return;

      const frame: ReplayFrame = {
        time: performance.now(),
        vehicleTransform: {
          position: vehicle.getPosition().toArray(),
          rotation: vehicle.getRotation().toArray(),
        },
        wheelRotations: vehicle.getWheelRotations(),
        cameraTransform: {
          position: camera.position.toArray(),
          rotation: camera.quaternion.toArray(),
        },
      };

      this.buffer.push(frame);

      // Keep buffer at max size (rolling window)
      if (this.buffer.length > this.maxBufferSize) {
        this.buffer.shift();
      }
    }

    startPlayback(fromTimestamp: number): void {
      this.isRecording = false;
      this.isPlaying = true;
      this.playbackStartTime = performance.now();

      // Find starting frame
      this.playbackIndex = this.buffer.findIndex(
        frame => frame.time >= fromTimestamp
      );
      if (this.playbackIndex === -1) this.playbackIndex = 0;
    }

    update(deltaTime: number): void {
      if (!this.isPlaying) return;

      const elapsed = performance.now() - this.playbackStartTime;
      const targetTime = this.buffer[this.playbackIndex]?.time + elapsed;

      // Find the correct frame for current time
      while (
        this.playbackIndex < this.buffer.length - 1 &&
        this.buffer[this.playbackIndex + 1].time < targetTime
      ) {
        this.playbackIndex++;
      }

      // Interpolate between current and next frame
      const currentFrame = this.buffer[this.playbackIndex];
      const nextFrame = this.buffer[this.playbackIndex + 1];

      if (currentFrame && nextFrame) {
        const t = (targetTime - currentFrame.time) /
                  (nextFrame.time - currentFrame.time);
        return this.interpolateFrames(currentFrame, nextFrame, t);
      }

      return currentFrame;
    }

    private interpolateFrames(
      frame1: ReplayFrame,
      frame2: ReplayFrame,
      t: number
    ): ReplayFrame {
      const pos1 = new THREE.Vector3().fromArray(frame1.vehicleTransform.position);
      const pos2 = new THREE.Vector3().fromArray(frame2.vehicleTransform.position);
      const interpolatedPos = pos1.lerp(pos2, t);

      const rot1 = new THREE.Quaternion().fromArray(frame1.vehicleTransform.rotation);
      const rot2 = new THREE.Quaternion().fromArray(frame2.vehicleTransform.rotation);
      const interpolatedRot = rot1.slerp(rot2, t);

      return {
        time: THREE.MathUtils.lerp(frame1.time, frame2.time, t),
        vehicleTransform: {
          position: interpolatedPos.toArray(),
          rotation: interpolatedRot.toArray(),
        },
        wheelRotations: frame1.wheelRotations.map((rot, i) =>
          THREE.MathUtils.lerp(rot, frame2.wheelRotations[i], t)
        ),
        cameraTransform: frame1.cameraTransform, // Camera handled separately
      };
    }

    stopPlayback(): void {
      this.isPlaying = false;
      this.isRecording = true;
      this.playbackIndex = 0;
    }

    skip(): void {
      this.stopPlayback();
      // Trigger respawn immediately
      GameEngine.getInstance().onReplaySkipped();
    }
  }
  ```

- [ ] **Enhance replay camera (CameraSystem.ts)**
  ```typescript
  private updateReplayCamera(vehicle: Vehicle, crash: CrashEvent): void {
    const crashTime = (performance.now() - crash.timestamp) / 1000; // seconds
    const totalDuration = 10;

    // Dynamic camera movement during replay
    if (crashTime < 3) {
      // First 3 seconds: Wide establishing shot
      this.replayDistance = 40;
      this.replayHeight = 20;
    } else if (crashTime < 7) {
      // Seconds 3-7: Move closer to action
      this.replayDistance = 25;
      this.replayHeight = 15;
    } else {
      // Final 3 seconds: Close-up on crash point
      this.replayDistance = 15;
      this.replayHeight = 10;
    }

    // Zoom in on crash impact moment
    if (crashTime >= 8 && crashTime <= 9) {
      const zoomFactor = 1 - (crashTime - 8);
      this.replayDistance *= 0.7 + zoomFactor * 0.3;
    }

    // Calculate camera position (smooth crane shot)
    const targetPos = vehicle.getPosition();
    const offset = new THREE.Vector3(
      Math.sin(crashTime * 0.2) * this.replayDistance,
      this.replayHeight,
      -this.replayDistance
    );

    const cameraPos = targetPos.clone().add(offset);
    this.camera.position.lerp(cameraPos, 0.05);
    
    // Always look at crash point
    const lookTarget = crash.position;
    this.camera.lookAt(lookTarget);
  }
  ```

- [ ] **Add replay UI overlay**
  ```typescript
  export class ReplayUI {
    private container: HTMLElement;
    private skipButton: HTMLButtonElement;
    private progressBar: HTMLProgressElement;

    constructor() {
      this.createUI();
      this.attachEventListeners();
    }

    private createUI(): void {
      this.container = document.createElement('div');
      this.container.id = 'replay-ui';
      this.container.innerHTML = `
        <div class="replay-overlay">
          <div class="replay-title">CRASH REPLAY</div>
          <progress class="replay-progress" value="0" max="10"></progress>
          <button class="skip-button">SKIP (Enter)</button>
        </div>
      `;
      document.body.appendChild(this.container);
    }

    show(): void {
      this.container.style.display = 'block';
    }

    hide(): void {
      this.container.style.display = 'none';
    }

    updateProgress(current: number, total: number): void {
      this.progressBar.value = current;
      this.progressBar.max = total;
    }

    private attachEventListeners(): void {
      this.skipButton.addEventListener('click', () => {
        ReplaySystem.getInstance().skip();
      });

      window.addEventListener('keydown', (e) => {
        if (e.code === 'Enter' && this.container.style.display === 'block') {
          ReplaySystem.getInstance().skip();
        }
      });
    }
  }
  ```

### Testing Criteria
- [x] **Crashes detected accurately** (collisions, hard landings)
- [x] **Minor crashes don't trigger replay** (just sound/effect)
- [x] **Major crashes trigger replay** every time
- [x] **Replay captures last 10+ seconds** before crash
- [x] **Replay plays back smoothly** (no stuttering)
- [x] **Replay camera shows crash clearly** (frames action well)
- [x] **Camera movement smooth** (no jumpy transitions)
- [x] **Skip button works immediately**
- [x] **Respawn places vehicle correctly** (at last waypoint)
- [x] **Vehicle state resets** (velocity, rotation)
- [x] **Damage persists after respawn**
- [x] **No physics glitches** after respawn
- [x] **Multiple crashes in sequence** work correctly
- [x] **Performance: <30MB** for replay buffer
- [x] **No memory leaks** from replay system

### Deliverables
- ✅ Complete crash detection system
- ✅ Replay recording and playback
- ✅ Cinematic replay camera
- ✅ Respawn mechanics
- ✅ Replay UI with skip functionality
- ✅ Damage system integration

### Performance Targets
- Replay buffer: <30MB memory
- Replay recording: <1ms overhead per frame
- Playback: 60fps maintained

---
