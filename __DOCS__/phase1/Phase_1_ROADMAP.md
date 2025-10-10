## Phase 1: Core Engine & Camera System
**Duration**: Week 2 (5 days)  
**Status**: 🔴 Not Started  
**Dependencies**: Phase 0 complete  
**Team**: 2-3 developers  
**Parallel Work**: ⚡ Split into 1A (Engine) and 1B (Camera)

### Phase 1A: Core Game Loop ⚡
**Developer Focus**: Backend/Systems Developer

#### Tasks
- [ ] **Enhance GameEngine.ts**
  ```typescript
  export enum GameState {
    LOADING = 'loading',
    MENU = 'menu',
    PLAYING = 'playing',
    PAUSED = 'paused',
    CRASHED = 'crashed',
    REPLAY = 'replay',
    RESULTS = 'results',
  }

  export class GameEngine {
    private state: GameState = GameState.LOADING;
    private fixedTimeStep = 1 / 60;  // 60Hz physics
    private accumulator = 0;
    
    setState(newState: GameState): void {
      console.log(`State transition: ${this.state} → ${newState}`);
      this.state = newState;
      this.onStateChange(newState);
    }
    
    private gameLoop = (): void => {
      const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
      
      // Fixed timestep physics
      this.accumulator += deltaTime;
      while (this.accumulator >= this.fixedTimeStep) {
        this.physicsWorld.step(this.fixedTimeStep);
        this.accumulator -= this.fixedTimeStep;
      }
      
      // Variable timestep rendering
      this.update(deltaTime);
      this.render();
      
      requestAnimationFrame(this.gameLoop);
    };
  }
  ```

- [ ] **Create StateManager.ts (FSM)**
  ```typescript
  type StateTransitions = {
    [key in GameState]: GameState[];
  };

  export class StateManager {
    private transitions: StateTransitions = {
      [GameState.LOADING]: [GameState.MENU],
      [GameState.MENU]: [GameState.PLAYING],
      [GameState.PLAYING]: [GameState.PAUSED, GameState.CRASHED, GameState.RESULTS],
      [GameState.PAUSED]: [GameState.PLAYING, GameState.MENU],
      [GameState.CRASHED]: [GameState.REPLAY],
      [GameState.REPLAY]: [GameState.PLAYING],
      [GameState.RESULTS]: [GameState.MENU, GameState.PLAYING],
    };

    canTransition(from: GameState, to: GameState): boolean {
      return this.transitions[from]?.includes(to) ?? false;
    }
  }
  ```

- [ ] **Enhance SceneManager.ts**
  ```typescript
  export class SceneManager {
    private lightingRig: THREE.Group;
    
    setupLighting(): void {
      // Sun (directional light)
      const sun = new THREE.DirectionalLight(0xffffff, 1.0);
      sun.position.set(100, 200, 50);
      sun.castShadow = true;
      sun.shadow.camera.far = 500;
      sun.shadow.mapSize.set(2048, 2048);
      
      // Sky (hemisphere light)
      const sky = new THREE.HemisphereLight(0x87ceeb, 0x545454, 0.6);
      
      // Ambient fill
      const ambient = new THREE.AmbientLight(0x404040, 0.3);
      
      this.scene.add(sun, sky, ambient);
    }
    
    setupRenderer(): void {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;
    }
  }
  ```

- [ ] **Add performance monitoring**
  ```typescript
  export class PerformanceMonitor {
    private stats: { fps: number[]; frameTime: number[] } = {
      fps: [],
      frameTime: [],
    };
    
    recordFrame(deltaTime: number): void {
      const fps = 1 / deltaTime;
      this.stats.fps.push(fps);
      this.stats.frameTime.push(deltaTime * 1000);
      
      // Keep last 100 frames
      if (this.stats.fps.length > 100) {
        this.stats.fps.shift();
        this.stats.frameTime.shift();
      }
    }
    
    getAverageFPS(): number {
      return this.stats.fps.reduce((a, b) => a + b, 0) / this.stats.fps.length;
    }
  }
  ```

### Phase 1B: Camera System ⚡
**Developer Focus**: Graphics/Camera Developer

#### Tasks
- [ ] **Create CameraSystem.ts**
  ```typescript
  import * as THREE from 'three';
  import type { Vehicle } from '@entities/Vehicle';

  export enum CameraMode {
    FIRST_PERSON = 'first_person',
    REPLAY = 'replay',
  }

  export class CameraSystem {
    private camera: THREE.PerspectiveCamera;
    private mode: CameraMode = CameraMode.FIRST_PERSON;
    
    // First-person settings
    private fpOffset = new THREE.Vector3(0, 1.2, -0.5); // Inside cockpit
    private fpLookAhead = 5; // meters
    
    // Replay settings
    private replayDistance = 30;
    private replayHeight = 15;

    update(deltaTime: number, target: Vehicle): void {
      if (this.mode === CameraMode.FIRST_PERSON) {
        this.updateFirstPerson(target);
      } else if (this.mode === CameraMode.REPLAY) {
        this.updateReplay(target);
      }
    }

    private updateFirstPerson(target: Vehicle): void {
      const targetPos = target.getPosition();
      const targetRot = target.getRotation();
      
      // Position camera relative to vehicle
      const offset = this.fpOffset.clone()
        .applyQuaternion(targetRot);
      this.camera.position.copy(targetPos).add(offset);
      
      // Look ahead based on velocity
      const velocity = target.getVelocity();
      const lookAheadPoint = targetPos.clone()
        .add(velocity.normalize().multiplyScalar(this.fpLookAhead));
      
      this.camera.lookAt(lookAheadPoint);
    }

    private updateReplay(target: Vehicle): void {
      // Smooth crane shot
      const targetPos = target.getPosition();
      const behindPos = targetPos.clone()
        .add(new THREE.Vector3(0, this.replayHeight, -this.replayDistance));
      
      // Smooth follow
      this.camera.position.lerp(behindPos, 0.05);
      this.camera.lookAt(targetPos);
    }

    setMode(mode: CameraMode): void {
      this.mode = mode;
    }
  }
  ```

- [ ] **Add camera smoothing/damping**
  ```typescript
  private smoothPosition = new THREE.Vector3();
  private smoothRotation = new THREE.Quaternion();
  private dampingFactor = 0.1;

  private applyCameraSmoothing(targetPos: THREE.Vector3, targetRot: THREE.Quaternion): void {
    this.smoothPosition.lerp(targetPos, this.dampingFactor);
    this.smoothRotation.slerp(targetRot, this.dampingFactor);
    
    this.camera.position.copy(this.smoothPosition);
    this.camera.quaternion.copy(this.smoothRotation);
  }
  ```

- [ ] **Create camera transition system**
  ```typescript
  private transitionProgress = 0;
  private transitionDuration = 1.0; // seconds
  private isTransitioning = false;
  private fromMode: CameraMode;
  private toMode: CameraMode;

  transitionTo(newMode: CameraMode, duration = 1.0): void {
    this.fromMode = this.mode;
    this.toMode = newMode;
    this.transitionDuration = duration;
    this.transitionProgress = 0;
    this.isTransitioning = true;
  }

  private updateTransition(deltaTime: number): void {
    this.transitionProgress += deltaTime / this.transitionDuration;
    if (this.transitionProgress >= 1.0) {
      this.mode = this.toMode;
      this.isTransitioning = false;
      return;
    }
    
    // Blend between camera positions
    const t = this.easeInOutCubic(this.transitionProgress);
    // ... blend logic
  }
  ```

- [ ] **Add skybox**
  ```typescript
  setupSkybox(scene: THREE.Scene): void {
    const loader = new THREE.CubeTextureLoader();
    const skybox = loader.load([
      'assets/skybox/px.jpg', 'assets/skybox/nx.jpg',
      'assets/skybox/py.jpg', 'assets/skybox/ny.jpg',
      'assets/skybox/pz.jpg', 'assets/skybox/nz.jpg',
    ]);
    scene.background = skybox;
  }
  ```

### Testing Criteria
- [x] **Game loop runs at stable 60fps** (empty scene)
- [x] **No memory leaks** over 5-minute run (heap snapshots)
- [x] **State transitions work** (manual test: cycle through states)
- [x] **Camera follows imaginary target** (use dummy object moving)
- [x] **Camera transitions smoothly** (no jarring jumps)
- [x] **Fixed timestep physics** (consistent behavior across frame rates)
- [x] **Performance monitoring** displays correct FPS
- [x] **Lighting looks good** (test with simple sphere)

### Deliverables
- ✅ Complete game loop with fixed timestep
- ✅ State management system (FSM)
- ✅ Camera system with first-person and replay modes
- ✅ Smooth camera transitions
- ✅ Lighting setup
- ✅ Performance monitoring tools

### Performance Targets
- Frame time: <16ms (60fps)
- Memory: <100MB
- State transition: <50ms

---