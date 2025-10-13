# Hard Drivin' Remake - Development Roadmap (Final)
## TypeScript + Three.js + Rapier.js Stack

---

## 📊 Project Overview

**Timeline**: 14 weeks (MVP)  
**Team Size**: 2-5 developers  
**Tech Stack**: TypeScript 5.3+, Three.js r160+, Rapier.js 0.13+, Vite 5.0+  
**Deployment**: Vercel/Cloudflare Pages  
**Testing**: Vitest + Playwright  

---


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

## Phase 5: Timing & Scoring System
**Duration**: Week 9 (5 days)  
**Status**: 🔴 Not Started  
**Dependencies**: Phase 3 complete  
**Team**: 2 developers  
**Parallel Work**: ⚡ Split into 5A (Timer) and 5B (Leaderboard)

### Phase 5A: Timer System ⚡
**Developer Focus**: Gameplay/Logic Developer

#### Tasks
- [ ] **Create TimerSystem.ts**
  ```typescript
  export interface TimerState {
    raceTime: number;        // Total elapsed time (ms)
    remainingTime: number;   // Countdown timer (ms)
    lapStartTime: number;    // Current lap start (ms)
    currentLap: number;
    lapTimes: number[];      // Array of completed lap times
    bestLapTime: number;
  }

  export class TimerSystem {
    private state: TimerState;
    private initialTime = 120000; // 120 seconds in ms
    private running = false;

    constructor() {
      this.state = {
        raceTime: 0,
        remainingTime: this.initialTime,
        lapStartTime: 0,
        currentLap: 1,
        lapTimes: [],
        bestLapTime: Infinity,
      };
    }

    start(): void {
      this.running = true;
      this.state.lapStartTime = performance.now();
    }

    update(deltaTime: number): void {
      if (!this.running) return;

      this.state.raceTime += deltaTime * 1000;
      this.state.remainingTime = Math.max(0, this.state.remainingTime - deltaTime * 1000);

      if (this.state.remainingTime <= 0) {
        this.onTimeExpired();
      }
    }

    onCheckpointPassed(timeBonus: number): void {
      this.state.remainingTime += timeBonus * 1000;
      console.log(`Time bonus! +${timeBonus}s`);
      
      // Visual feedback
      UISystem.getInstance().showTimeBonusAnimation(timeBonus);
      AudioSystem.getInstance().playSound('checkpoint');
    }

    onLapCompleted(): void {
      const lapTime = performance.now() - this.state.lapStartTime;
      this.state.lapTimes.push(lapTime);

      if (lapTime < this.state.bestLapTime) {
        this.state.bestLapTime = lapTime;
        console.log(`New best lap: ${this.formatTime(lapTime)}`);
        UISystem.getInstance().showNewRecordAnimation();
      }

      // Start next lap timer
      this.state.currentLap++;
      this.state.lapStartTime = performance.now();
    }

    private onTimeExpired(): void {
      this.running = false;
      GameEngine.getInstance().setState(GameState.RESULTS);
      
      // Show how far the player got
      const progress = WaypointSystem.getInstance().getProgress();
      console.log(`Time's up! Progress: ${(progress * 100).toFixed(1)}%`);
    }

    formatTime(milliseconds: number): string {
      const totalSeconds = Math.floor(milliseconds / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const ms = Math.floor((milliseconds % 1000) / 10);

      return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }

    getState(): TimerState {
      return { ...this.state };
    }

    applyPenalty(seconds: number): void {
      this.state.remainingTime = Math.max(0, this.state.remainingTime - seconds * 1000);
      console.log(`Penalty: -${seconds}s`);
      UISystem.getInstance().showPenaltyAnimation(seconds);
    }
  }
  ```

- [ ] **Add timer penalties**
  ```typescript
  // In appropriate systems:

  // Off-road timeout (in Vehicle.ts or OffRoadSystem.ts)
  if (timeOffRoad >= 10) {
    TimerSystem.getInstance().applyPenalty(5);
    Vehicle.getInstance().respawnAtLastWaypoint();
  }

  // Crash penalty (in CrashManager.ts)
  if (crashEvent.severity === 'major') {
    TimerSystem.getInstance().applyPenalty(10);
  } else if (crashEvent.severity === 'catastrophic') {
    TimerSystem.getInstance().applyPenalty(15);
  }
  ```

### Phase 5B: Scoring & Leaderboard ⚡
**Developer Focus**: Data/UI Developer

#### Tasks
- [ ] **Create LeaderboardSystem.ts**
  ```typescript
  export interface LeaderboardEntry {
    rank: number;
    playerName: string;
    lapTime: number;         // Best lap time in ms
    timestamp: Date;
    ghostData?: Uint8Array;  // Compressed replay data
  }

  export class LeaderboardSystem {
    private entries: LeaderboardEntry[] = [];
    private maxEntries = 10;
    private storageKey = 'harddriving_leaderboard';

    constructor() {
      this.load();
    }

    submitTime(playerName: string, lapTime: number, ghostData?: Uint8Array): boolean {
      // Check if time qualifies for leaderboard
      if (this.entries.length >= this.maxEntries && 
          lapTime >= this.entries[this.entries.length - 1].lapTime) {
        return false; // Not fast enough
      }

      const entry: LeaderboardEntry = {
        rank: 0, // Will be calculated after sorting
        playerName,
        lapTime,
        timestamp: new Date(),
        ghostData,
      };

      this.entries.push(entry);
      this.entries.sort((a, b) => a.lapTime - b.lapTime);
      
      // Keep only top 10
      if (this.entries.length > this.maxEntries) {
        this.entries = this.entries.slice(0, this.maxEntries);
      }

      // Update ranks
      this.entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      this.save();
      return true;
    }

    getLeaderboard(): LeaderboardEntry[] {
      return [...this.entries];
    }

    getGhostData(rank: number): Uint8Array | null {
      const entry = this.entries.find(e => e.rank === rank);
      return entry?.ghostData || null;
    }

    isTopTen(lapTime: number): boolean {
      if (this.entries.length < this.maxEntries) return true;
      return lapTime < this.entries[this.entries.length - 1].lapTime;
    }

    private save(): void {
      try {
        const data = {
          entries: this.entries.map(entry => ({
            ...entry,
            timestamp: entry.timestamp.toISOString(),
            ghostData: entry.ghostData ? Array.from(entry.ghostData) : undefined,
          })),
        };
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save leaderboard:', error);
      }
    }

    private load(): void {
      try {
        const data = localStorage.getItem(this.storageKey);
        if (!data) return;

        const parsed = JSON.parse(data);
        this.entries = parsed.entries.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
          ghostData: entry.ghostData ? new Uint8Array(entry.ghostData) : undefined,
        }));
      } catch (error) {
        console.error('Failed to load leaderboard:', error);
        this.entries = [];
      }
    }

    clearLeaderboard(): void {
      this.entries = [];
      this.save();
    }
  }
  ```

- [ ] **Create statistics tracking**
  ```typescript
  export interface GameStatistics {
    totalRaces: number;
    totalCrashes: number;
    totalDistance: number;       // meters
    bestLapTime: number;          // ms
    averageSpeed: number;         // m/s
    topSpeed: number;             // m/s
    timePlayedTotal: number;      // seconds
  }

  export class StatisticsSystem {
    private stats: GameStatistics;
    private storageKey = 'harddriving_stats';

    constructor() {
      this.load();
    }

    recordRaceComplete(lapTime: number, crashes: number, distance: number): void {
      this.stats.totalRaces++;
      this.stats.totalCrashes += crashes;
      this.stats.totalDistance += distance;

      if (lapTime < this.stats.bestLapTime) {
        this.stats.bestLapTime = lapTime;
      }

      this.save();
    }

    recordSpeed(speed: number): void {
      if (speed > this.stats.topSpeed) {
        this.stats.topSpeed = speed;
      }

      // Update rolling average
      const alpha = 0.01; // Smoothing factor
      this.stats.averageSpeed = this.stats.averageSpeed * (1 - alpha) + speed * alpha;
    }

    getStats(): GameStatistics {
      return { ...this.stats };
    }

    private save(): void {
      localStorage.setItem(this.storageKey, JSON.stringify(this.stats));
    }

    private load(): void {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        this.stats = JSON.parse(data);
      } else {
        this.stats = {
          totalRaces: 0,
          totalCrashes: 0,
          totalDistance: 0,
          bestLapTime: Infinity,
          averageSpeed: 0,
          topSpeed: 0,
          timePlayedTotal: 0,
        };
      }
    }
  }
  ```

### Testing Criteria
- [x] **Timer starts correctly**
- [x] **Timer counts down** accurately (verify with stopwatch)
- [x] **Checkpoint bonus applies** correctly (+30s)
- [x] **Lap times recorded** accurately
- [x] **Best lap tracked** correctly
- [x] **Time-out triggers** when timer reaches 0
- [x] **Penalties apply** correctly (crashes, off-road)
- [x] **Leaderboard saves** to localStorage
- [x] **Leaderboard loads** on page refresh
- [x] **Top 10 detection** works correctly
- [x] **Statistics persist** across sessions
- [x] **No localStorage errors** (quota exceeded handling)
- [x] **Time formatting** displays correctly (MM:SS.mmm)

### Deliverables
- ✅ Complete timing system
- ✅ Checkpoint/penalty mechanics
- ✅ Leaderboard with localStorage
- ✅ Statistics tracking
- ✅ Data persistence

### Performance Targets
- Timer update: <0.5ms per frame
- LocalStorage operations: <10ms
- Memory: <5MB for leaderboard data

---

## Phase 6: AI Opponent (Phantom Photon)
**Duration**: Week 10 (5 days)  
**Status**: 🔴 Not Started  
**Dependencies**: Phase 5 complete  
**Team**: 2 developers  
**Parallel Work**: ⚡ Split into 6A (Recording) and 6B (Playback)

### Phase 6A: Ghost Recording ⚡
**Developer Focus**: Recording/Data Developer

#### Tasks
- [ ] **Create GhostRecorder.ts**
  ```typescript
  export interface GhostFrame {
    time: number;                 // Delta time since race start
    position: [number, number, number];
    rotation: [number, number, number, number]; // quaternion
    wheelRotations: number[];
    speed: number;
  }

  export interface GhostData {
    lapTime: number;
    trackId: string;
    frames: GhostFrame[];
    recordedAt: Date;
  }

  export class GhostRecorder {
    private frames: GhostFrame[] = [];
    private recording = false;
    private startTime = 0;

    startRecording(): void {
      this.frames = [];
      this.recording = true;
      this.startTime = performance.now();
      console.log('Ghost recording started');
    }

    recordFrame(vehicle: Vehicle): void {
      if (!this.recording) return;

      const frame: GhostFrame = {
        time: (performance.now() - this.startTime) / 1000, // seconds
        position: vehicle.getPosition().toArray(),
        rotation: vehicle.getRotation().toArray(),
        wheelRotations: vehicle.getWheelRotations(),
        speed: vehicle.getSpeed(),
      };

      this.frames.push(frame);
    }

    stopRecording(lapTime: number): GhostData {
      this.recording = false;

      const ghostData: GhostData = {
        lapTime,
        trackId: Track.getInstance().getId(),
        frames: this.optimizeFrames(this.frames),
        recordedAt: new Date(),
      };

      console.log(`Ghost recorded: ${this.frames.length} frames, ${lapTime}ms`);
      return ghostData;
    }

    private optimizeFrames(frames: GhostFrame[]): GhostFrame[] {
      // Use keyframe compression: only store frames when significant change occurs
      const optimized: GhostFrame[] = [frames[0]]; // Always keep first frame
      const threshold = {
        position: 0.1,   // meters
        rotation: 0.05,  // radians
        speed: 1.0,      // m/s
      };

      for (let i = 1; i < frames.length - 1; i++) {
        const prev = frames[i - 1];
        const curr = frames[i];

        const posChanged = this.vectorDistance(prev.position, curr.position) > threshold.position;
        const rotChanged = this.quaternionDistance(prev.rotation, curr.rotation) > threshold.rotation;
        const speedChanged = Math.abs(prev.speed - curr.speed) > threshold.speed;

        if (posChanged || rotChanged || speedChanged) {
          optimized.push(curr);
        }
      }

      optimized.push(frames[frames.length - 1]); // Always keep last frame

      console.log(`Ghost optimized: ${frames.length} → ${optimized.length} frames`);
      return optimized;
    }

    private vectorDistance(a: number[], b: number[]): number {
      return Math.sqrt(
        (a[0] - b[0]) ** 2 +
        (a[1] - b[1]) ** 2 +
        (a[2] - b[2]) ** 2
      );
    }

    private quaternionDistance(a: number[], b: number[]): number {
      // Angle between quaternions
      const dot = a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3];
      return Math.acos(2 * dot * dot - 1);
    }

    serialize(ghostData: GhostData): Uint8Array {
      // Compress ghost data for storage
      const json = JSON.stringify(ghostData);
      const encoder = new TextEncoder();
      return encoder.encode(json);
    }

    deserialize(data: Uint8Array): GhostData {
      const decoder = new TextDecoder();
      const json = decoder.decode(data);
      return JSON.parse(json);
    }
  }
  ```

- [ ] **Integrate with leaderboard**
  ```typescript
  // In race complete handler:
  const lapTime = TimerSystem.getInstance().getState().bestLapTime;

  if (LeaderboardSystem.getInstance().isTopTen(lapTime)) {
    // Record ghost
    const ghostData = GhostRecorder.getInstance().stopRecording(lapTime);
    const serialized = GhostRecorder.getInstance().serialize(ghostData);

    // Submit to leaderboard
    const playerName = await PromptPlayerName();
    LeaderboardSystem.getInstance().submitTime(playerName, lapTime, serialized);

    UISystem.getInstance().showTopTenMessage();
  }
  ```

### Phase 6B: Ghost Playback ⚡
**Developer Focus**: AI/Rendering Developer

#### Tasks
- [ ] **Create Ghost.ts entity**
  ```typescript
  export class Ghost {
    private mesh: THREE.Mesh;
    private ghostData: GhostData;
    private playbackTime = 0;
    private currentFrame = 0;
    private material: THREE.ShaderMaterial;

    constructor(ghostData: GhostData, scene: THREE.Scene) {
      this.ghostData = ghostData;
      this.createMesh();
      this.createGhostShader();
      scene.add(this.mesh);
    }

    private createMesh(): void {
      // Clone vehicle model
      const vehicleModel = AssetLoader.getModel('vehicle').clone();
      
      // Create ghost material
      this.material = this.createGhostShader();
      
      vehicleModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = this.material;
        }
      });

      this.mesh = vehicleModel;
      this.mesh.name = 'phantom-photon';
    }

    private createGhostShader(): THREE.ShaderMaterial {
      return new THREE.ShaderMaterial({
        uniforms: {
          baseColor: { value: new THREE.Color(0x00ffff) },
          glowColor: { value: new THREE.Color(0xff00ff) },
          opacity: { value: 0.6 },
          time: { value: 0 },
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vPosition;

          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 baseColor;
          uniform vec3 glowColor;
          uniform float opacity;
          uniform float time;
          varying vec3 vNormal;
          varying vec3 vPosition;

          void main() {
            // Fresnel effect for glow
            vec3 viewDir = normalize(cameraPosition - vPosition);
            float fresnel = pow(1.0 - dot(vNormal, viewDir), 3.0);
            
            // Pulsing glow
            float pulse = 0.5 + 0.5 * sin(time * 2.0);
            vec3 glow = glowColor * fresnel * pulse;
            
            vec3 finalColor = baseColor + glow;
            
            gl_FragColor = vec4(finalColor, opacity);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    }

    update(deltaTime: number): void {
      this.playbackTime += deltaTime;

      // Update shader time for pulsing effect
      this.material.uniforms.time.value = this.playbackTime;

      // Find current and next frame
      while (
        this.currentFrame < this.ghostData.frames.length - 1 &&
        this.ghostData.frames[this.currentFrame + 1].time < this.playbackTime
      ) {
        this.currentFrame++;
      }

      const currentFrame = this.ghostData.frames[this.currentFrame];
      const nextFrame = this.ghostData.frames[this.currentFrame + 1];

      if (!nextFrame) {
        // Finished playback, loop back
        this.playbackTime = 0;
        this.currentFrame = 0;
        return;
      }

      // Interpolate between frames
      const t = (this.playbackTime - currentFrame.time) /
                (nextFrame.time - currentFrame.time);

      const pos = new THREE.Vector3().fromArray(currentFrame.position)
        .lerp(new THREE.Vector3().fromArray(nextFrame.position), t);

      const rot = new THREE.Quaternion().fromArray(currentFrame.rotation)
        .slerp(new THREE.Quaternion().fromArray(nextFrame.rotation), t);

      this.mesh.position.copy(pos);
      this.mesh.quaternion.copy(rot);
    }

    dispose(): void {
      this.material.dispose();
      this.mesh.removeFromParent();
    }
  }
  ```

- [ ] **Create GhostManager.ts**
  ```typescript
  export class GhostManager {
    private ghost: Ghost | null = null;
    private shouldSpawn = false;

    checkSpawnConditions(): void {
      const playerBestTime = TimerSystem.getInstance().getState().bestLapTime;
      this.shouldSpawn = LeaderboardSystem.getInstance().isTopTen(playerBestTime);
    }

    spawnGhost(scene: THREE.Scene): void {
      if (!this.shouldSpawn) return;

      // Load best ghost from leaderboard
      const leaderboard = LeaderboardSystem.getInstance().getLeaderboard();
      if (leaderboard.length === 0) return;

      const bestEntry = leaderboard[0]; // #1 ranked ghost
      if (!bestEntry.ghostData) return;

      const ghostData = GhostRecorder.getInstance().deserialize(bestEntry.ghostData);
      this.ghost = new Ghost(ghostData, scene);

      console.log(`Phantom Photon spawned! Chasing ${bestEntry.playerName}'s time: ${TimerSystem.formatTime(bestEntry.lapTime)}`);
      
      UISystem.getInstance().showPhantomPhotonMessage(bestEntry.playerName);
    }

    update(deltaTime: number): void {
      if (this.ghost) {
        this.ghost.update(deltaTime);
      }
    }

    despawn(): void {
      if (this.ghost) {
        this.ghost.dispose();
        this.ghost = null;
      }
    }
  }
  ```

- [ ] **Add particle trail effect**
  ```typescript
  export class GhostTrailEffect {
    private particles: THREE.Points;
    private particlePositions: THREE.Vector3[] = [];
    private maxParticles = 100;

    constructor(scene: THREE.Scene) {
      this.createParticleSystem();
      scene.add(this.particles);
    }

    private createParticleSystem(): void {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(this.maxParticles * 3);
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.PointsMaterial({
        color: 0x00ffff,
        size: 0.5,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
      });

      this.particles = new THREE.Points(geometry, material);
    }

    addParticle(position: THREE.Vector3): void {
      this.particlePositions.push(position.clone());
      
      if (this.particlePositions.length > this.maxParticles) {
        this.particlePositions.shift();
      }

      this.updateGeometry();
    }

    private updateGeometry(): void {
      const positions = this.particles.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < this.particlePositions.length; i++) {
        const pos = this.particlePositions[i];
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
      }

      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }
  ```

### Testing Criteria
- [x] **Ghost records on top 10 time**
- [x] **Ghost data serializes/deserializes** correctly
- [x] **Ghost spawns at race start** when conditions met
- [x] **Ghost follows recorded path** accurately
- [x] **Ghost interpolation smooth** (no jerky movement)
- [x] **Ghost shader looks good** (transparent, glowing)
- [x] **No collision with ghost** (passes through player)
- [x] **Ghost loops correctly** after finishing lap
- [x] **Particle trail renders** (optional)
- [x] **Performance: <2ms overhead** for ghost system
- [x] **Ghost data <500KB** per recording

### Deliverables
- ✅ Ghost recording system
- ✅ Ghost playback with interpolation
- ✅ Phantom Photon visual effects
- ✅ Ghost spawn conditions
- ✅ Particle trail (optional enhancement)

### Performance Targets
- Ghost playback: <1ms per frame
- Memory: <10MB for ghost data
- Visual quality: Matches vehicle model

---

## Phase 7: UI & Audio
**Duration**: Week 11-12 (10 days)  
**Status**: 🔴 Not Started  
**Dependencies**: All core systems (Phases 1-6)  
**Team**: 3-4 developers  
**Parallel Work**: ⚡ Split into 7A (UI), 7B (Audio), 7C (Polish)

### Phase 7A: User Interface ⚡
**Developer Focus**: UI/Frontend Developer

#### Tasks
- [ ] **Create UISystem.ts**
  ```typescript
  export enum UIState {
    LOADING = 'loading',
    MAIN_MENU = 'main-menu',
    GAMEPLAY = 'gameplay',
    PAUSE_MENU = 'pause-menu',
    RESULTS = 'results',
    LEADERBOARD = 'leaderboard',
    SETTINGS = 'settings',
  }

  export class UISystem {
    private state: UIState = UIState.LOADING;
    private containers: Map<UIState, HTMLElement> = new Map();

    constructor() {
      this.createAllUI();
      this.attachEventListeners();
    }

    setState(state: UIState): void {
      // Hide all containers
      this.containers.forEach((container) => {
        container.style.display = 'none';
      });

      // Show target container
      const target = this.containers.get(state);
      if (target) {
        target.style.display = 'flex';
      }

      this.state = state;
    }

    private createAllUI(): void {
      this.containers.set(UIState.LOADING, this.createLoadingScreen());
      this.containers.set(UIState.MAIN_MENU, this.createMainMenu());
      this.containers.set(UIState.GAMEPLAY, this.createHUD());
      this.containers.set(UIState.PAUSE_MENU, this.createPauseMenu());
      this.containers.set(UIState.RESULTS, this.createResultsScreen());
      this.containers.set(UIState.LEADERBOARD, this.createLeaderboard());
      this.containers.set(UIState.SETTINGS, this.createSettings());
    }
  }
  ```

- [ ] **Create main menu**
  ```typescript
  private createMainMenu(): HTMLElement {
    const menu = document.createElement('div');
    menu.className = 'main-menu';
    menu.innerHTML = `
      <div class="menu-container">
        <h1 class="game-title">HARD DRIVIN'</h1>
        <div class="menu-buttons">
          <button id="start-race" class="menu-btn primary">START RACE</button>
          <button id="time-trial" class="menu-btn">TIME TRIAL</button>
          <button id="leaderboard" class="menu-btn">LEADERBOARD</button>
          <button id="settings" class="menu-btn">SETTINGS</button>
          <button id="credits" class="menu-btn">CREDITS</button>
        </div>
        <div class="version">v1.0.0</div>
      </div>
      <div id="bg-scene"></div>
    `;
    document.body.appendChild(menu);
    return menu;
  }
  ```

- [ ] **Create HUD**
  ```typescript
  private createHUD(): HTMLElement {
    const hud = document.createElement('div');
    hud.className = 'hud';
    hud.innerHTML = `
      <div class="hud-top-left">
        <div class="lap-counter">
          <span class="label">LAP</span>
          <span id="current-lap">1</span>
          <span class="separator">/</span>
          <span id="total-laps">2</span>
        </div>
        <div class="minimap" id="minimap-container">
          <canvas id="minimap-canvas" width="150" height="150"></canvas>
        </div>
      </div>

      <div class="hud-top-center">
        <div class="timer" id="race-timer">2:00.00</div>
        <div class="checkpoint-bonus" id="checkpoint-bonus">+30s</div>
      </div>

      <div class="hud-top-right">
        <div class="damage-indicator">
          <div class="damage-bar">
            <div id="damage-fill" class="damage-fill"></div>
          </div>
        </div>
      </div>

      <div class="hud-bottom-left">
        <div class="speed-display">
          <div class="speed-value" id="speed-value">0</div>
          <div class="speed-unit">MPH</div>
        </div>
      </div>

      <div class="hud-bottom-right">
        <div class="speedometer">
          <svg viewBox="0 0 200 120" class="speedo-svg">
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#333" stroke-width="8"/>
            <path id="speedo-arc" d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#0ff" stroke-width="8"/>
            <line id="speedo-needle" x1="100" y1="100" x2="100" y2="40" stroke="#f00" stroke-width="3"/>
          </svg>
        </div>
      </div>

      <div class="hud-center-bottom">
        <div class="message-display" id="message-display"></div>
      </div>
    `;
    document.body.appendChild(hud);
    return hud;
  }

  updateHUD(gameState: any): void {
    // Update lap counter
    document.getElementById('current-lap')!.textContent = gameState.currentLap.toString();
    
    // Update timer
    const timerEl = document.getElementById('race-timer')!;
    const time = TimerSystem.getInstance().formatTime(gameState.remainingTime);
    timerEl.textContent = time;
    
    // Color code based on time remaining
    if (gameState.remainingTime < 30000) {
      timerEl.classList.add('warning');
    } else if (gameState.remainingTime < 10000) {
      timerEl.classList.add('critical');
    }

    // Update speed
    document.getElementById('speed-value')!.textContent = 
      Math.round(gameState.speed * 2.237).toString(); // m/s to mph

    // Update speedometer needle
    const speedPercent = gameState.speed / 55; // max speed
    const angle = -90 + (speedPercent * 180); // -90° to 90°
    document.getElementById('speedo-needle')!.setAttribute(
      'transform',
      `rotate(${angle} 100 100)`
    );

    // Update damage
    const damagePercent = gameState.health / 100;
    document.getElementById('damage-fill')!.style.width = `${damagePercent * 100}%`;
  }
  ```

- [ ] **Create results screen**
  ```typescript
  private createResultsScreen(): HTMLElement {
    const results = document.createElement('div');
    results.className = 'results-screen';
    results.innerHTML = `
      <div class="results-container">
        <h2 class="results-title">RACE COMPLETE</h2>
        
        <div class="results-stats">
          <div class="stat-row main-stat">
            <span class="stat-label">FINAL TIME</span>
            <span id="final-time" class="stat-value">0:00.00</span>
          </div>
          
          <div class="stat-row">
            <span class="stat-label">Best Lap</span>
            <span id="best-lap" class="stat-value">0:00.00</span>
          </div>
          
          <div class="stat-row">
            <span class="stat-label">Avg Speed</span>
            <span id="avg-speed" class="stat-value">0 MPH</span>
          </div>
          
          <div class="stat-row">
            <span class="stat-label">Crashes</span>
            <span id="crash-count" class="stat-value">0</span>
          </div>
        </div>

        <div id="new-record-banner" class="new-record hidden">
          🏆 NEW RECORD! 🏆
        </div>

        <div class="results-buttons">
          <button id="retry-btn" class="btn primary">RETRY</button>
          <button id="view-leaderboard-btn" class="btn">VIEW LEADERBOARD</button>
          <button id="main-menu-btn" class="btn">MAIN MENU</button>
        </div>
      </div>
    `;
    document.body.appendChild(results);
    return results;
  }
  ```

- [ ] **Create settings panel**
  ```typescript
  private createSettings(): HTMLElement {
    const settings = document.createElement('div');
    settings.className = 'settings-panel';
    settings.innerHTML = `
      <div class="settings-container">
        <h2>SETTINGS</h2>
        
        <div class="settings-section">
          <h3>Graphics</h3>
          <div class="setting-row">
            <label>Quality</label>
            <select id="quality-select">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div class="setting-row">
            <label>Shadows</label>
            <input type="checkbox" id="shadows-toggle" checked>
          </div>
          <div class="setting-row">
            <label>Anti-aliasing</label>
            <input type="checkbox" id="aa-toggle" checked>
          </div>
        </div>

        <div class="settings-section">
          <h3>Audio</h3>
          <div class="setting-row">
            <label>Master Volume</label>
            <input type="range" id="master-volume" min="0" max="100" value="80">
            <span id="master-volume-value">80%</span>
          </div>
          <div class="setting-row">
            <label>SFX Volume</label>
            <input type="range" id="sfx-volume" min="0" max="100" value="70">
            <span id="sfx-volume-value">70%</span>
          </div>
          <div class="setting-row">
            <label>Music Volume</label>
            <input type="range" id="music-volume" min="0" max="100" value="50">
            <span id="music-volume-value">50%</span>
          </div>
        </div>

        <div class="settings-section">
          <h3>Controls</h3>
          <div class="setting-row">
            <label>Speed Unit</label>
            <select id="speed-unit">
              <option value="mph">MPH</option>
              <option value="kmh">KM/H</option>
            </select>
          </div>
          <div class="setting-row">
            <label>Steering Sensitivity</label>
            <input type="range" id="steering-sens" min="50" max="150" value="100">
          </div>
        </div>

        <div class="settings-buttons">
          <button id="save-settings" class="btn primary">SAVE</button>
          <button id="cancel-settings" class="btn">CANCEL</button>
        </div>
      </div>
    `;
    document.body.appendChild(settings);
    return settings;
  }
  ```

- [ ] **Add CSS styling (styles.css)**
  ```css
  /* Main Menu */
  .main-menu {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  }

  .game-title {
    font-size: 72px;
    font-weight: bold;
    color: #00ffff;
    text-shadow: 0 0 20px #00ffff, 0 0 40px #ff00ff;
    margin-bottom: 40px;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { text-shadow: 0 0 20px #00ffff, 0 0 40px #ff00ff; }
    50% { text-shadow: 0 0 30px #00ffff, 0 0 60px #ff00ff; }
  }

  .menu-btn {
    width: 300px;
    padding: 15px;
    margin: 10px;
    font-size: 20px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid #00ffff;
    color: white;
    cursor: pointer;
    transition: all 0.3s;
  }

  .menu-btn:hover {
    background: rgba(0, 255, 255, 0.2);
    transform: scale(1.05);
  }

  .menu-btn.primary {
    background: #00ffff;
    color: #000;
    font-weight: bold;
  }

  /* HUD */
  .hud {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    font-family: 'Courier New', monospace;
  }

  .hud-top-left {
    position: absolute;
    top: 20px;
    left: 20px;
  }

  .lap-counter {
    font-size: 24px;
    color: white;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
  }

  .timer {
    font-size: 48px;
    font-weight: bold;
    color: #00ff00;
    text-shadow: 0 0 10px #00ff00;
    transition: color 0.3s;
  }

  .timer.warning {
    color: #ffff00;
    text-shadow: 0 0 10px #ffff00;
  }

  .timer.critical {
    color: #ff0000;
    text-shadow: 0 0 10px #ff0000;
    animation: blink 0.5s ease-in-out infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .speed-display {
    font-size: 48px;
    font-weight: bold;
    color: white;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
  }

  .minimap {
    width: 150px;
    height: 150px;
    border: 2px solid #00ffff;
    background: rgba(0, 0, 0, 0.7);
    margin-top: 10px;
  }

  /* Results Screen */
  .results-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.9);
  }

  .results-container {
    text-align: center;
    color: white;
  }

  .results-title {
    font-size: 48px;
    color: #00ffff;
    margin-bottom: 40px;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 20px;
    font-size: 20px;
  }

  .stat-row.main-stat {
    font-size: 36px;
    color: #00ffff;
    border-bottom: 2px solid #00ffff;
    margin-bottom: 20px;
  }

  .new-record {
    font-size: 32px;
    color: #ffd700;
    margin: 20px 0;
    animation: recordPulse 1s ease-in-out infinite;
  }

  @keyframes recordPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
  ```

### Phase 7B: Audio System ⚡
**Developer Focus**: Audio Engineer

#### Tasks
- [ ] **Create AudioSystem.ts**
  ```typescript
  import { Howl, Howler } from 'howler';

  export class AudioSystem {
    private sounds: Map<string, Howl> = new Map();
    private music: Map<string, Howl> = new Map();
    private currentMusic: Howl | null = null;
    
    private masterVolume = 0.8;
    private sfxVolume = 0.7;
    private musicVolume = 0.5;

    async init(): Promise<void> {
      // Load all sound effects
      await this.loadSounds();
      await this.loadMusic();
      
      Howler.volume(this.masterVolume);
      console.log('Audio system initialized');
    }

    private async loadSounds(): Promise<void> {
      const soundFiles = {
        'engine_idle': 'assets/audio/engine_idle.ogg',
        'engine_rev': 'assets/audio/engine_rev.ogg',
        'tire_squeal': 'assets/audio/tire_squeal.ogg',
        'crash_major': 'assets/audio/crash_major.ogg',
        'crash_minor': 'assets/audio/crash_minor.ogg',
        'checkpoint': 'assets/audio/checkpoint.ogg',
        'offroad': 'assets/audio/offroad.ogg',
        'ui_click': 'assets/audio/ui_click.ogg',
        'countdown': 'assets/audio/countdown.ogg',
      };

      for (const [name, path] of Object.entries(soundFiles)) {
        const sound = new Howl({
          src: [path],
          volume: this.sfxVolume,
          preload: true,
        });
        
        this.sounds.set(name, sound);
      }
    }

    private async loadMusic(): Promise<void> {
      const musicFiles = {
        'menu': 'assets/audio/menu_music.mp3',
        'race': 'assets/audio/race_music.mp3',
      };

      for (const [name, path] of Object.entries(musicFiles)) {
        const music = new Howl({
          src: [path],
          volume: this.musicVolume,
          loop: true,
          preload: true,
        });
        
        this.music.set(name, music);
      }
    }

    playSound(name: string, volume = 1.0): void {
      const sound = this.sounds.get(name);
      if (sound) {
        sound.volume(volume * this.sfxVolume);
        sound.play();
      }
    }

    playSoundAt(name: string, position: THREE.Vector3, listenerPos: THREE.Vector3): void {
      const sound = this.sounds.get(name);
      if (!sound) return;

      const distance = position.distanceTo(listenerPos);
      const maxDistance = 50;
      const volume = Math.max(0, 1 - (distance / maxDistance));

      sound.volume(volume * this.sfxVolume);
      sound.play();
    }

    loopSound(name: string, volume = 1.0): number {
      const sound = this.sounds.get(name);
      if (sound) {
        sound.volume(volume * this.sfxVolume);
        sound.loop(true);
        return sound.play();
      }
      return -1;
    }

    stopSound(name: string, id?: number): void {
      const sound = this.sounds.get(name);
      if (sound) {
        if (id !== undefined) {
          sound.stop(id);
        } else {
          sound.stop();
        }
      }
    }

    playMusic(name: string): void {
      // Stop current music
      if (this.currentMusic) {
        this.currentMusic.fade(this.musicVolume, 0, 1000);
        setTimeout(() => {
          this.currentMusic?.stop();
        }, 1000);
      }

      // Start new music
      const music = this.music.get(name);
      if (music) {
        music.volume(0);
        music.play();
        music.fade(0, this.musicVolume, 1000);
        this.currentMusic = music;
      }
    }

    setMasterVolume(volume: number): void {
      this.masterVolume = Math.max(0, Math.min(1, volume));
      Howler.volume(this.masterVolume);
    }

    setSFXVolume(volume: number): void {
      this.sfxVolume = Math.max(0, Math.min(1, volume));
      this.sounds.forEach(sound => {
        sound.volume(this.sfxVolume);
      });
    }

    setMusicVolume(volume: number): void {
      this.musicVolume = Math.max(0, Math.min(1, volume));
      if (this.currentMusic) {
        this.currentMusic.volume(this.musicVolume);
      }
    }
  }
  ```

- [ ] **Add engine sound with RPM variation**
  ```typescript
  export class EngineSoundManager {
    private idleSound: number;
    private revSound: number;
    private currentRPM = 0;

    start(): void {
      this.idleSound = AudioSystem.getInstance().loopSound('engine_idle', 0.5);
      this.revSound = AudioSystem.getInstance().loopSound('engine_rev', 0);
    }

    updateRPM(rpm: number, maxRPM: number): void {
      this.currentRPM = rpm;
      const rpmPercent = rpm / maxRPM;

      // Fade between idle and rev sounds
      const idleVolume = Math.max(0, 0.5 - rpmPercent * 0.5);
      const revVolume = Math.min(0.8, rpmPercent);

      const idleSound = AudioSystem.getInstance().sounds.get('engine_idle');
      const revSound = AudioSystem.getInstance().sounds.get('engine_rev');

      if (idleSound && this.idleSound !== -1) {
        idleSound.volume(idleVolume, this.idleSound);
        idleSound.rate(0.8 + rpmPercent * 0.4, this.idleSound); // Pitch shift
      }

      if (revSound && this.revSound !== -1) {
        revSound.volume(revVolume, this.revSound);
        revSound.rate(0.9 + rpmPercent * 0.5, this.revSound);
      }
    }

    stop(): void {
      AudioSystem.getInstance().stopSound('engine_idle', this.idleSound);
      AudioSystem.getInstance().stopSound('engine_rev', this.revSound);
    }
  }
  ```

### Phase 7C: Visual Polish ⚡
**Developer Focus**: Effects/Graphics Developer

#### Tasks
- [ ] **Create ParticleEffects.ts**
  ```typescript
  export class ParticleEffects {
    private scene: THREE.Scene;
    private pools: Map<string, THREE.Points[]> = new Map();

    constructor(scene: THREE.Scene) {
      this.scene = scene;
      this.createPools();
    }

    private createPools(): void {
      // Pre-create particle systems for reuse
      this.pools.set('dust', this.createDustPool(20));
      this.pools.set('smoke', this.createSmokePool(10));
      this.pools.set('sparks', this.createSparksPool(15));
    }

    spawnDust(position: THREE.Vector3, velocity: THREE.Vector3): void {
      const particles = this.getFromPool('dust');
      if (!particles) return;

      particles.position.copy(position);
      this.scene.add(particles);

      // Animate
      this.animateDust(particles, velocity);
    }

    spawnSparks(position: THREE.Vector3): void {
      const particles = this.getFromPool('sparks');
      if (!particles) return;

      particles.position.copy(position);
      this.scene.add(particles);

      this.animateSparks(particles);
    }

    private animateDust(particles: THREE.Points, velocity: THREE.Vector3): void {
      const material = particles.material as THREE.PointsMaterial;
      let opacity = 0.8;
      let life = 2.0; // seconds

      const animate = () => {
        life -= 0.016; // ~60fps
        opacity *= 0.95;

        particles.position.add(velocity.clone().multiplyScalar(0.016));
        material.opacity = opacity;

        if (life > 0) {
          requestAnimationFrame(animate);
        } else {
          this.returnToPool('dust', particles);
        }
      };

      animate();
    }
  }
  ```

- [ ] **Add screen effects (ScreenEffects.ts)**
  ```typescript
  export class ScreenEffects {
    private composer: THREE.EffectComposer;
    private bloomPass: THREE.UnrealBloomPass;
    private vignettePass: THREE.ShaderPass;

    constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
      this.composer = new THREE.EffectComposer(renderer);
      
      const renderPass = new THREE.RenderPass(scene, camera);
      this.composer.addPass(renderPass);

      // Subtle bloom for lights and effects
      this.bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.5,  // strength
        0.4,  // radius
        0.85  // threshold
      );
      this.composer.addPass(this.bloomPass);
    }

    flashCrash(): void {
      // White flash on crash
      const flash = document.createElement('div');
      flash.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: white;
        opacity: 0.8;
        pointer-events: none;
        animation: fadeOut 0.3s ease-out forwards;
      `;
      document.body.appendChild(flash);

      setTimeout(() => flash.remove(), 300);
    }

    applyDamageVignette(damagePercent: number): void {
      // Increase vignette as damage increases
      const intensity = (1 - damagePercent) * 0.5;
      // Apply to vignette shader uniform
    }
  }
  ```

- [ ] **Add loading screen with progress**
  ```typescript
  export class LoadingScreen {
    private container: HTMLElement;
    private progressBar: HTMLProgressElement;
    private statusText: HTMLSpanElement;

    constructor() {
      this.createUI();
    }

    private createUI(): void {
      this.container = document.createElement('div');
      this.container.className = 'loading-screen';
      this.container.innerHTML = `
        <div class="loading-container">
          <h1>HARD DRIVIN'</h1>
          <div class="loading-spinner"></div>
          <progress id="load-progress" value="0" max="100"></progress>
          <span id="load-status">Initializing...</span>
        </div>
      `;
      document.body.appendChild(this.container);

      this.progressBar = document.getElementById('load-progress') as HTMLProgressElement;
      this.statusText = document.getElementById('load-status') as HTMLSpanElement;
    }

    updateProgress(progress: number, status: string): void {
      this.progressBar.value = progress;
      this.statusText.textContent = status;
    }

    hide(): void {
      this.container.style.opacity = '0';
      setTimeout(() => {
        this.container.remove();
      }, 500);
    }
  }
  ```

### Testing Criteria
- [x] **All menus navigable** (keyboard + mouse)
- [x] **HUD updates in real-time**
- [x] **All UI elements visible** and readable
- [x] **Audio plays correctly** (all sounds)
- [x] **Music crossfades smoothly**
- [x] **Volume controls work**
- [x] **Engine sound varies with RPM**
- [x] **Particle effects render** correctly
- [x] **Screen effects don't tank FPS**
- [x] **Loading screen shows progress**
- [x] **UI scales on different resolutions**
- [x] **No audio distortion**
- [x] **Settings persist** across sessions
- [x] **Performance: 60fps maintained**

### Deliverables
- ✅ Complete UI system (all screens)
- ✅ Full audio implementation
- ✅ Particle effects system
- ✅ Screen effects (bloom, vignette)
- ✅ Loading screen with progress
- ✅ Polished HUD
- ✅ Settings persistence

### Performance Targets
- UI rendering: <2ms per frame
- Audio: <10 concurrent sounds
- Particles: <500 active at once
- Memory: <50MB for audio buffers

---

## Phase 8: Testing, Optimization & Polish
**Duration**: Week 13-14 (10 days)  
**Status**: 🔴 Not Started  
**Dependencies**: All previous phases complete  
**Team**: Entire team (all hands on deck)  
**Parallel Work**: ⚡ Multiple parallel testing/optimization streams

### Phase 8A: Performance Optimization ⚡

#### Tasks
- [ ] **Profile all systems**
  ```typescript
  export class PerformanceProfiler {
    private metrics: Map<string, number[]> = new Map();

    startProfile(name: string): void {
      if (!this.metrics.has(name)) {
        this.metrics.set(name, []);
      }
      performance.mark(`${name}_start`);
    }

    endProfile(name: string): void {
      performance.mark(`${name}_end`);
      performance.measure(name, `${name}_start`, `${name}_end`);
      
      const measure = performance.getEntriesByName(name).pop() as PerformanceMeasure;
      if (measure) {
        this.metrics.get(name)!.push(measure.duration);
      }
    }

    getReport(): string {
      let report = 'Performance Report:\n';
      
      this.metrics.forEach((times, name) => {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const max = Math.max(...times);
        report += `${name}: avg=${avg.toFixed(2)}ms, max=${max.toFixed(2)}ms\n`;
      });

      return report;
    }
  }

  // Use in game loop:
  profiler.startProfile('physics');
  physicsWorld.step(deltaTime);
  profiler.endProfile('physics');
  ```

- [ ] **Implement LOD system**
  ```typescript
  export class LODManager {
    private lodGroups: Map<THREE.Object3D, THREE.LOD> = new Map();

    createLOD(object: THREE.Object3D, distances: number[]): THREE.LOD {
      const lod = new THREE.LOD();
      
      // High detail (close)
      lod.addLevel(object.clone(), distances[0]);
      
      // Medium detail
      const mediumDetail = this.simplifyMesh(object, 0.5);
      lod.addLevel(mediumDetail, distances[1]);
      
      // Low detail (far)
      const lowDetail = this.simplifyMesh(object, 0.2);
      lod.addLevel(lowDetail, distances[2]);

      this.lodGroups.set(object, lod);
      return lod;
    }

    update(camera: THREE.Camera): void {
      this.lodGroups.forEach(lod => {
        lod.update(camera);
      });
    }
  }
  ```

- [ ] **Optimize assets**
  ```bash
  # Run optimization scripts

  # Compress textures
  npm run compress-textures

  # Optimize models
  npm run optimize-models

  # Bundle optimization
  npm run build -- --analyze
  ```

- [ ] **Implement quality presets**
  ```typescript
  export const QualityPresets = {
    low: {
      shadowMapSize: 512,
      shadowDistance: 50,
      maxParticles: 50,
      antialiasing: false,
      anisotropy: 1,
      physicsSubsteps: 1,
      renderScale: 0.8,
    },
    medium: {
      shadowMapSize: 1024,
      shadowDistance: 100,
      maxParticles: 200,
      antialiasing: true,
      anisotropy: 4,
      physicsSubsteps: 2,
      renderScale: 1.0,
    },
    high: {
      shadowMapSize: 2048,
      shadowDistance: 150,
      maxParticles: 500,
      antialiasing: true,
      anisotropy: 16,
      physicsSubsteps: 4,
      renderScale: 1.0,
    },
  };

  export function applyQualityPreset(preset: keyof typeof QualityPresets): void {
    const settings = QualityPresets[preset];
    
    // Apply to renderer
    SceneManager.getInstance().setShadowMapSize(settings.shadowMapSize);
    SceneManager.getInstance().setAntialiasing(settings.antialiasing);
    
    // Apply to physics
    PhysicsWorld.getInstance().setSubsteps(settings.physicsSubsteps);
    
    // Apply to particles
    ParticleEffects.getInstance().setMaxParticles(settings.maxParticles);
    
    console.log(`Applied ${preset} quality preset`);
  }
  ```

### Phase 8B: Bug Fixing & QA ⚡

#### Tasks
- [ ] **Run full playthrough tests**
  - [ ] Complete 10 full races from start to finish
  - [ ] Test all crash scenarios
  - [ ] Verify all UI transitions
  - [ ] Test edge cases (off-track, wrong-way, time-out)

- [ ] **Cross-browser testing matrix**
  | Browser | Version | OS | Status | Notes |
  |---------|---------|----|----|-------|
  | Chrome | Latest | Windows | ⬜ | |
  | Chrome | Latest | macOS | ⬜ | |
  | Firefox | Latest | Windows | ⬜ | |
  | Firefox | Latest | macOS | ⬜ | |
  | Safari | Latest | macOS | ⬜ | |
  | Safari | Latest | iOS | ⬜ | |
  | Edge | Latest | Windows | ⬜ | |

- [ ] **Create bug tracking template**
  ```markdown
  ## Bug Report Template
  
  **Title:** Brief description
  **Severity:** Critical / High / Medium / Low
  **Browser:** Chrome 120 / Firefox 121 / etc.
  **OS:** Windows 11 / macOS 14 / etc.
  
  **Steps to Reproduce:**
  1. Start race
  2. Drive to loop
  3. ...
  
  **Expected Behavior:**
  Vehicle should complete loop
  
  **Actual Behavior:**
  Vehicle clips through track
  
  **Screenshots/Video:**
  [Attach here]
  
  **Console Errors:**
  ```
  Error: ...
  ```
  ```

- [ ] **Fix critical bugs** (P0 - blockers)
  - Game crashes
  - Cannot complete race
  - Controls unresponsive
  - Data corruption

- [ ] **Fix high-priority bugs** (P1 - major issues)
  - Physics glitches
  - Visual artifacts
  - Audio not playing
  - UI not displaying correctly

- [ ] **Regression testing after fixes**
  - Re-run all tests after each fix
  - Verify fix doesn't break other systems

---

**🎮 LET'S BUILD THIS! 🏁**

This roadmap represents 14 weeks of focused development to create an amazing browser-based racing game. Each phase builds on the previous one, with clear checkpoints and testing gates to ensure quality.
