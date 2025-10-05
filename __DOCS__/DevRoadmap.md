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

## Phase 0: Project Setup & Foundation
**Duration**: Week 1 (5 days)  
**Status**: 🔴 Not Started  
**Dependencies**: None  
**Team**: 1-2 developers (can be done solo)  
**Parallel Work**: None (foundational, must be completed first)

### 0.1 Repository & Build System

#### Tasks
- [ ] **Initialize Git repository**
  ```bash
  git init
  git branch -M main
  # Set up .gitignore (node_modules, dist, .env.local)
  ```
- [ ] **Set up package.json**
  ```bash
  npm init -y
  npm install three@latest @dimforge/rapier3d-compat@latest
  npm install -D typescript@latest vite@latest
  npm install -D @types/three vitest@latest playwright@latest
  npm install -D eslint@latest prettier@latest
  npm install -D eslint-config-prettier eslint-plugin-prettier
  npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser
  npm install howler@latest
  npm install -D @types/howler
  ```

- [ ] **Configure TypeScript (tsconfig.json)**
  ```json
  {
    "compilerOptions": {
      "target": "ES2020",
      "module": "ESNext",
      "lib": ["ES2020", "DOM", "DOM.Iterable"],
      "moduleResolution": "bundler",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "isolatedModules": true,
      "noEmit": true,
      "jsx": "preserve",
      "baseUrl": ".",
      "paths": {
        "@/*": ["src/*"],
        "@core/*": ["src/core/*"],
        "@entities/*": ["src/entities/*"],
        "@systems/*": ["src/systems/*"]
      }
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
  }
  ```

- [ ] **Configure Vite (vite.config.ts)**
  ```typescript
  import { defineConfig } from 'vite';
  import { resolve } from 'path';

  export default defineConfig({
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@core': resolve(__dirname, 'src/core'),
        '@entities': resolve(__dirname, 'src/entities'),
        '@systems': resolve(__dirname, 'src/systems'),
      },
    },
    server: {
      port: 3000,
      open: true,
    },
    build: {
      target: 'es2020',
      minify: 'terser',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'three': ['three'],
            'rapier': ['@dimforge/rapier3d-compat'],
          },
        },
      },
    },
  });
  ```

- [ ] **Set up ESLint + Prettier**
  - Create .eslintrc.json, .prettierrc
  - Add pre-commit hooks with Husky

- [ ] **Create folder structure**
  ```
  /src
    /core
      GameEngine.ts
      SceneManager.ts
      PhysicsWorld.ts
      StateManager.ts
    /entities
      Vehicle.ts
      Obstacle.ts
      Track.ts
      Ghost.ts
    /systems
      InputSystem.ts
      CameraSystem.ts
      AudioSystem.ts
      UISystem.ts
      ReplaySystem.ts
      WaypointSystem.ts
    /components
      RigidBodyComponent.ts
      MeshComponent.ts
      TransformComponent.ts
    /utils
      AssetLoader.ts
      MathUtils.ts
      Constants.ts
      Logger.ts
    /config
      PhysicsConfig.ts
      GraphicsConfig.ts
      GameConfig.ts
    /types
      index.d.ts
    main.ts
    index.html
  /assets
    /models
    /textures
    /audio
  /tests
    /unit
    /e2e
  /public
  package.json
  tsconfig.json
  vite.config.ts
  ```

- [ ] **Create basic HTML shell (index.html)**
  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hard Drivin' Remake</title>
    <style>
      body { margin: 0; overflow: hidden; }
      #game-canvas { width: 100vw; height: 100vh; display: block; }
    </style>
  </head>
  <body>
    <canvas id="game-canvas"></canvas>
    <script type="module" src="/src/main.ts"></script>
  </body>
  </html>
  ```

- [ ] **Create main.ts entry point**
  ```typescript
  import { GameEngine } from '@core/GameEngine';

  const engine = new GameEngine();
  engine.start();
  ```

### 0.2 Proof of Concept

#### Tasks
- [ ] **Create basic Three.js scene (SceneManager.ts)**
  ```typescript
  import * as THREE from 'three';

  export class SceneManager {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;

    constructor(canvas: HTMLCanvasElement) {
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(
        75, window.innerWidth / window.innerHeight, 0.1, 1000
      );
      this.renderer = new THREE.WebGLRenderer({ 
        canvas, 
        antialias: true 
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      
      // Test: Add a spinning cube
      const geometry = new THREE.BoxGeometry();
      const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
      const cube = new THREE.Mesh(geometry, material);
      this.scene.add(cube);
      
      // Lighting
      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(5, 5, 5);
      this.scene.add(light);
      this.scene.add(new THREE.AmbientLight(0x404040));
      
      this.camera.position.z = 5;
    }

    render(): void {
      this.renderer.render(this.scene, this.camera);
    }
  }
  ```

- [ ] **Initialize Rapier.js physics (PhysicsWorld.ts)**
  ```typescript
  import RAPIER from '@dimforge/rapier3d-compat';

  export class PhysicsWorld {
    public world: RAPIER.World;
    private initialized = false;

    async init(): Promise<void> {
      await RAPIER.init();
      const gravity = { x: 0.0, y: -9.81, z: 0.0 };
      this.world = new RAPIER.World(gravity);
      this.initialized = true;
      
      // Test: Create a sphere that falls
      const sphereBody = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(0, 10, 0)
      );
      const sphereCollider = this.world.createCollider(
        RAPIER.ColliderDesc.ball(1.0),
        sphereBody
      );
      
      console.log('Rapier initialized successfully!');
    }

    step(deltaTime: number): void {
      if (this.initialized) {
        this.world.step();
      }
    }
  }
  ```

- [ ] **Create game loop (GameEngine.ts)**
  ```typescript
  import { SceneManager } from './SceneManager';
  import { PhysicsWorld } from './PhysicsWorld';

  export class GameEngine {
    private sceneManager: SceneManager;
    private physicsWorld: PhysicsWorld;
    private lastTime = 0;
    private running = false;

    constructor() {
      const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
      this.sceneManager = new SceneManager(canvas);
      this.physicsWorld = new PhysicsWorld();
    }

    async start(): Promise<void> {
      await this.physicsWorld.init();
      this.running = true;
      this.lastTime = performance.now();
      this.gameLoop();
    }

    private gameLoop = (): void => {
      if (!this.running) return;

      const currentTime = performance.now();
      const deltaTime = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;

      // Update physics
      this.physicsWorld.step(deltaTime);

      // Render
      this.sceneManager.render();

      requestAnimationFrame(this.gameLoop);
    };

    stop(): void {
      this.running = false;
    }
  }
  ```

- [ ] **Set up dev server**
  ```bash
  npm run dev  # Should see spinning cube at localhost:3000
  ```

### 0.3 Development Tools

#### Tasks
- [ ] **Install browser extensions**
  - Three.js DevTools (Chrome/Firefox)
  - React DevTools (for future UI if needed)

- [ ] **Set up debugging**
  - VSCode launch.json for debugging
  - Source maps enabled

- [ ] **Create npm scripts (package.json)**
  ```json
  {
    "scripts": {
      "dev": "vite",
      "build": "tsc && vite build",
      "preview": "vite preview",
      "test": "vitest",
      "test:ui": "vitest --ui",
      "test:e2e": "playwright test",
      "lint": "eslint src --ext .ts,.tsx",
      "format": "prettier --write src/**/*.{ts,tsx}",
      "type-check": "tsc --noEmit"
    }
  }
  ```

### Testing Criteria
- [x] **Build compiles successfully** (`npm run build`)
- [x] **Dev server runs** (`npm run dev`)
- [x] **Three.js renders cube** (visible in browser)
- [x] **Rapier.js initializes** (console log confirms)
- [x] **Hot reload works** (edit code, see instant update)
- [x] **TypeScript type-checking** passes (`npm run type-check`)
- [x] **No console errors**
- [x] **All team members can run locally**

### Deliverables
- ✅ Git repository with initial commit
- ✅ Working dev environment (Vite + TypeScript)
- ✅ Three.js rendering a test scene
- ✅ Rapier.js physics initialized
- ✅ Hot module reloading functional
- ✅ Documentation: README.md with setup instructions

### Performance Baseline
- Frame rate: Should hit 60fps with test cube
- Memory: <50MB initial heap
- Load time: <2s for dev server

---

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

## Phase 2: Vehicle Physics & Controls
**Duration**: Week 3-4 (10 days)  
**Status**: 🔴 Not Started  
**Dependencies**: Phase 1 complete  
**Team**: 2-3 developers  
**Parallel Work**: ⚡ Split into 2A (Physics) and 2B (Input)

### Phase 2A: Vehicle Physics ⚡
**Developer Focus**: Physics/Gameplay Developer

#### Tasks
- [ ] **Create Vehicle.ts entity**
  ```typescript
  import * as THREE from 'three';
  import RAPIER from '@dimforge/rapier3d-compat';
  import type { PhysicsWorld } from '@core/PhysicsWorld';

  export interface VehicleConfig {
    mass: number;
    enginePower: number;
    maxSpeed: number;
    brakeForce: number;
    steeringAngle: number;
    wheelBase: number;
    wheelRadius: number;
    suspensionStiffness: number;
    suspensionDamping: number;
    suspensionRestLength: number;
  }

  export class Vehicle {
    private chassis: RAPIER.RigidBody;
    private mesh: THREE.Mesh;
    private config: VehicleConfig;
    
    // Wheel raycasts
    private wheelPositions: THREE.Vector3[];
    private wheelRotations: number[] = [0, 0, 0, 0];
    private wheelContacts: boolean[] = [false, false, false, false];

    constructor(world: PhysicsWorld, config: VehicleConfig) {
      this.config = config;
      this.createChassis(world);
      this.createWheels();
    }

    private createChassis(world: PhysicsWorld): void {
      const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, 2, 0)
        .setCanSleep(false);
      
      this.chassis = world.world.createRigidBody(bodyDesc);
      this.chassis.setAdditionalMass(this.config.mass);
      
      // Chassis collider (box shape)
      const colliderDesc = RAPIER.ColliderDesc.cuboid(1.0, 0.5, 2.0);
      world.world.createCollider(colliderDesc, this.chassis);
    }

    private createWheels(): void {
      // Wheel positions relative to chassis (FL, FR, RL, RR)
      this.wheelPositions = [
        new THREE.Vector3(-0.8, -0.5, 1.2),  // Front-left
        new THREE.Vector3(0.8, -0.5, 1.2),   // Front-right
        new THREE.Vector3(-0.8, -0.5, -1.2), // Rear-left
        new THREE.Vector3(0.8, -0.5, -1.2),  // Rear-right
      ];
    }

    update(deltaTime: number, input: VehicleInput): void {
      this.updateWheelRaycasts();
      this.applySuspensionForces();
      this.applyDriveForces(input);
      this.applySteeringForces(input);
      this.applyAerodynamics();
    }

    private updateWheelRaycasts(): void {
      const chassisPos = this.chassis.translation();
      const chassisRot = this.chassis.rotation();
      
      for (let i = 0; i < 4; i++) {
        const wheelWorld = this.wheelPositions[i].clone()
          .applyQuaternion(new THREE.Quaternion(
            chassisRot.x, chassisRot.y, chassisRot.z, chassisRot.w
          ))
          .add(new THREE.Vector3(chassisPos.x, chassisPos.y, chassisPos.z));
        
        // Raycast down from wheel position
        const ray = new RAPIER.Ray(
          wheelWorld,
          { x: 0, y: -1, z: 0 }
        );
        
        const hit = world.world.castRay(
          ray, 
          this.config.suspensionRestLength + 0.5,
          true
        );
        
        this.wheelContacts[i] = hit !== null;
        
        if (hit) {
          const compressionRatio = 1.0 - (hit.toi / this.config.suspensionRestLength);
          this.applySuspensionForce(i, compressionRatio);
        }
      }
    }

    private applySuspensionForce(wheelIndex: number, compression: number): void {
      const springForce = compression * this.config.suspensionStiffness;
      const dampingForce = -this.getWheelVelocity(wheelIndex).y * this.config.suspensionDamping;
      const totalForce = springForce + dampingForce;
      
      const forceVector = new THREE.Vector3(0, totalForce, 0);
      const worldForce = forceVector.applyQuaternion(
        this.getWorldRotation()
      );
      
      this.chassis.applyImpulse(
        { x: worldForce.x, y: worldForce.y, z: worldForce.z },
        true
      );
    }

    private applyDriveForces(input: VehicleInput): void {
      const onGround = this.wheelContacts.some(contact => contact);
      if (!onGround) return;
      
      const currentSpeed = this.getForwardSpeed();
      const targetSpeed = input.throttle * this.config.maxSpeed;
      
      if (input.brake > 0) {
        const brakeForce = -Math.sign(currentSpeed) * this.config.brakeForce * input.brake;
        this.applyForwardForce(brakeForce);
      } else if (Math.abs(currentSpeed) < Math.abs(targetSpeed)) {
        const accelerationForce = this.config.enginePower * input.throttle;
        this.applyForwardForce(accelerationForce);
      }
      
      // Apply grip-based traction
      this.applyTractionForces();
    }

    private applyTractionForces(): void {
      // Lateral (sideways) friction to prevent unrealistic sliding
      const lateralVel = this.getLateralVelocity();
      const lateralForce = -lateralVel.multiplyScalar(this.getTireGrip() * 0.9);
      
      this.chassis.applyImpulse(
        { x: lateralForce.x, y: 0, z: lateralForce.z },
        true
      );
    }

    private getTireGrip(): number {
      // TODO: Get surface type from collision
      return 1.0; // Full grip on tarmac
    }

    private applyAerodynamics(): void {
      const velocity = this.chassis.linvel();
      const speed = Math.sqrt(velocity.x**2 + velocity.y**2 + velocity.z**2);
      
      // Drag force (F = 0.5 * Cd * A * rho * v^2)
      const dragForce = -0.5 * this.config.dragCoefficient * speed * speed;
      const dragVector = new THREE.Vector3(velocity.x, velocity.y, velocity.z)
        .normalize()
        .multiplyScalar(dragForce);
      
      this.chassis.applyForce(
        { x: dragVector.x, y: dragVector.y, z: dragVector.z },
        true
      );
      
      // Downforce (increases grip at high speed)
      const downforce = -500 * (speed / this.config.maxSpeed) ** 2;
      this.chassis.applyForce({ x: 0, y: downforce, z: 0 }, true);
    }
  }
  ```

- [ ] **Create PhysicsConfig.ts**
  ```typescript
  export const DEFAULT_VEHICLE_CONFIG: VehicleConfig = {
    mass: 1200,              // kg
    enginePower: 3500,       // N
    maxSpeed: 55,            // m/s (~200 km/h)
    brakeForce: 5000,        // N
    steeringAngle: 0.61,     // radians (~35 degrees)
    wheelBase: 2.4,          // m
    wheelRadius: 0.35,       // m
    suspensionStiffness: 40, // N/m
    suspensionDamping: 0.5,  // damping coefficient
    suspensionRestLength: 0.4, // m
  };
  ```

- [ ] **Add damage system**
  ```typescript
  export class DamageSystem {
    private health = 100;
    private performanceMultiplier = 1.0;

    applyDamage(impactForce: number): void {
      const damage = Math.min(impactForce / 500, 30);
      this.health = Math.max(0, this.health - damage);
      
      // Reduce performance
      this.performanceMultiplier = 0.7 + (this.health / 100) * 0.3;
    }

    getSpeedMultiplier(): number {
      return this.performanceMultiplier;
    }

    getDamageLevel(): 'pristine' | 'scratched' | 'dented' | 'smoking' {
      if (this.health > 75) return 'pristine';
      if (this.health > 50) return 'scratched';
      if (this.health > 25) return 'dented';
      return 'smoking';
    }
  }
  ```

### Phase 2B: Input System ⚡
**Developer Focus**: Input/Controls Developer

#### Tasks
- [ ] **Create InputSystem.ts**
  ```typescript
  export interface VehicleInput {
    throttle: number;    // 0 to 1
    brake: number;       // 0 to 1
    steering: number;    // -1 to 1 (left to right)
    handbrake: boolean;
    reset: boolean;
    pause: boolean;
  }

  export class InputSystem {
    private keys: Map<string, boolean> = new Map();
    private gamepad: Gamepad | null = null;
    private input: VehicleInput = {
      throttle: 0,
      brake: 0,
      steering: 0,
      handbrake: false,
      reset: false,
      pause: false,
    };

    constructor() {
      this.setupKeyboardListeners();
      this.setupGamepadListeners();
    }

    private setupKeyboardListeners(): void {
      window.addEventListener('keydown', (e) => {
        this.keys.set(e.code, true);
      });

      window.addEventListener('keyup', (e) => {
        this.keys.set(e.code, false);
      });
    }

    private setupGamepadListeners(): void {
      window.addEventListener('gamepadconnected', (e) => {
        console.log('Gamepad connected:', e.gamepad);
        this.gamepad = e.gamepad;
      });

      window.addEventListener('gamepaddisconnected', () => {
        this.gamepad = null;
      });
    }

    update(): VehicleInput {
      this.updateKeyboard();
      this.updateGamepad();
      return { ...this.input };
    }

    private updateKeyboard(): void {
      // Throttle (W or Up Arrow)
      const forward = this.keys.get('KeyW') || this.keys.get('ArrowUp');
      const backward = this.keys.get('KeyS') || this.keys.get('ArrowDown');
      
      if (forward) {
        this.input.throttle = 1.0;
        this.input.brake = 0;
      } else if (backward) {
        this.input.throttle = 0;
        this.input.brake = 1.0;
      } else {
        this.input.throttle = 0;
        this.input.brake = 0;
      }

      // Steering (A/D or Left/Right Arrow)
      const left = this.keys.get('KeyA') || this.keys.get('ArrowLeft');
      const right = this.keys.get('KeyD') || this.keys.get('ArrowRight');
      
      if (left) {
        this.input.steering = -1.0;
      } else if (right) {
        this.input.steering = 1.0;
      } else {
        this.input.steering = 0;
      }

      // Other controls
      this.input.handbrake = this.keys.get('Space') || false;
      this.input.reset = this.keys.get('KeyR') || false;
      this.input.pause = this.keys.get('Escape') || false;
    }

    private updateGamepad(): void {
      if (!this.gamepad) return;

      // Update gamepad state
      const gamepads = navigator.getGamepads();
      this.gamepad = gamepads[this.gamepad.index];
      if (!this.gamepad) return;

      // Right trigger = throttle (typically axis 7 or button 7)
      this.input.throttle = Math.max(0, this.gamepad.buttons[7]?.value || 0);

      // Left trigger = brake
      this.input.brake = Math.max(0, this.gamepad.buttons[6]?.value || 0);

      // Left stick X-axis = steering
      const steeringRaw = this.gamepad.axes[0] || 0;
      const deadzone = 0.1;
      this.input.steering = Math.abs(steeringRaw) > deadzone ? steeringRaw : 0;

      // A button = handbrake
      this.input.handbrake = this.gamepad.buttons[0]?.pressed || false;

      // Start button = pause
      this.input.pause = this.gamepad.buttons[9]?.pressed || false;
    }
  }
  ```

- [ ] **Add input smoothing**
  ```typescript
  private smoothSteering(target: number, deltaTime: number): number {
    const smoothSpeed = 5.0; // How fast steering returns to center
    const current = this.input.steering;
    return THREE.MathUtils.lerp(current, target, smoothSpeed * deltaTime);
  }
  ```

- [ ] **Create key binding configuration**
  ```typescript
  export interface KeyBindings {
    forward: string[];
    backward: string[];
    left: string[];
    right: string[];
    handbrake: string[];
    reset: string[];
    pause: string[];
  }

  export const DEFAULT_KEY_BINDINGS: KeyBindings = {
    forward: ['KeyW', 'ArrowUp'],
    backward: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    handbrake: ['Space'],
    reset: ['KeyR'],
    pause: ['Escape'],
  };
  ```

### Testing Criteria
- [x] **Vehicle spawns correctly** (visible mesh, physics active)
- [x] **Responds to all inputs** (keyboard + gamepad)
- [x] **Drives forward/backward smoothly**
- [x] **Steering feels responsive** (not too twitchy, not too sluggish)
- [x] **Braking works effectively**
- [x] **Suspension dampens correctly** (no wild bouncing)
- [x] **Stays grounded on flat terrain** (doesn't float or sink)
- [x] **Can do donuts/circles** (steering at full lock)
- [x] **Jumping feels natural** (off ramps)
- [x] **No physics explosions** (vehicle doesn't flip randomly)
- [x] **Performance: <2ms for physics step**
- [x] **Gamepad disconnection handled gracefully**

### Deliverables
- ✅ Fully functional vehicle with realistic physics
- ✅ Keyboard and gamepad input support
- ✅ Configurable vehicle parameters
- ✅ Damage system foundation
- ✅ Input recording capability (for replays)
- ✅ Test scene with drivable vehicle

### Performance Targets
- Physics step: <2ms per frame
- Memory: <150MB with vehicle
- Input latency: <16ms (1 frame)

---

## Phase 3: Track System & Geometry
**Duration**: Week 5-6 (10 days)  
**Status**: 🔴 Not Started  
**Dependencies**: Phase 2 complete  
**Team**: 2-4 developers  
**Parallel Work**: ⚡ Split into 3A (Track), 3B (Waypoints), 3C (Environment)

### Phase 3A: Track Loading System ⚡
**Developer Focus**: Track/Geometry Developer

#### Tasks
- [ ] **Create Track.ts**
  ```typescript
  import * as THREE from 'three';
  import RAPIER from '@dimforge/rapier3d-compat';

  export interface TrackSection {
    type: 'straight' | 'curve' | 'ramp' | 'loop' | 'bank';
    length?: number;
    radius?: number;
    angle?: number;
    banking?: number;
    height?: number;
  }

  export interface TrackData {
    name: string;
    sections: TrackSection[];
    width: number;
    waypoints: WaypointData[];
    spawnPoint: { position: Vector3; rotation: Quaternion };
  }

  export class Track {
    private mesh: THREE.Mesh;
    private collider: RAPIER.Collider;
    private spline: THREE.CatmullRomCurve3;
    
    constructor(data: TrackData, world: PhysicsWorld, scene: THREE.Scene) {
      this.generateSpline(data.sections);
      this.generateMesh(data.width);
      this.generateCollider(world);
      scene.add(this.mesh);
    }

    private generateSpline(sections: TrackSection[]): void {
      const points: THREE.Vector3[] = [];
      let currentPos = new THREE.Vector3(0, 0, 0);
      let currentDir = new THREE.Vector3(0, 0, 1);

      for (const section of sections) {
        const sectionPoints = this.generateSectionPoints(
          section, 
          currentPos, 
          currentDir
        );
        points.push(...sectionPoints);
        
        // Update position and direction for next section
        currentPos = points[points.length - 1];
        currentDir = points[points.length - 1]
          .clone()
          .sub(points[points.length - 2])
          .normalize();
      }

      this.spline = new THREE.CatmullRomCurve3(points, true); // closed loop
    }

    private generateSectionPoints(
      section: TrackSection,
      startPos: THREE.Vector3,
      startDir: THREE.Vector3
    ): THREE.Vector3[] {
      const points: THREE.Vector3[] = [];
      const divisions = 20;

      switch (section.type) {
        case 'straight':
          for (let i = 0; i <= divisions; i++) {
            const t = i / divisions;
            const pos = startPos.clone()
              .add(startDir.clone().multiplyScalar(section.length! * t));
            points.push(pos);
          }
          break;

        case 'curve':
          const radius = section.radius!;
          const angle = section.angle! * (Math.PI / 180);
          for (let i = 0; i <= divisions; i++) {
            const t = i / divisions;
            const theta = angle * t;
            const pos = new THREE.Vector3(
              startPos.x + radius * Math.sin(theta),
              startPos.y,
              startPos.z + radius * (1 - Math.cos(theta))
            );
            points.push(pos);
          }
          break;

        case 'ramp':
          for (let i = 0; i <= divisions; i++) {
            const t = i / divisions;
            const pos = startPos.clone()
              .add(startDir.clone().multiplyScalar(section.length! * t))
              .setY(startPos.y + section.height! * t);
            points.push(pos);
          }
          break;

        case 'loop':
          // Full 360° vertical loop
          const loopRadius = section.radius!;
          for (let i = 0; i <= divisions; i++) {
            const t = i / divisions;
            const theta = Math.PI * 2 * t;
            const pos = new THREE.Vector3(
              startPos.x,
              startPos.y + loopRadius * (1 - Math.cos(theta)),
              startPos.z + loopRadius * Math.sin(theta)
            );
            points.push(pos);
          }
          break;
      }

      return points;
    }

    private generateMesh(width: number): void {
      const geometry = new THREE.BufferGeometry();
      const points = this.spline.getPoints(1000);
      const vertices: number[] = [];
      const indices: number[] = [];
      const uvs: number[] = [];

      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const tangent = this.spline.getTangent(i / points.length);
        const normal = new THREE.Vector3(0, 1, 0);
        const binormal = new THREE.Vector3().crossVectors(tangent, normal);

        // Left edge
        const left = point.clone().add(binormal.clone().multiplyScalar(-width / 2));
        vertices.push(left.x, left.y, left.z);
        uvs.push(0, i / points.length);

        // Right edge
        const right = point.clone().add(binormal.clone().multiplyScalar(width / 2));
        vertices.push(right.x, right.y, right.z);
        uvs.push(1, i / points.length);

        // Indices for triangles
        if (i < points.length - 1) {
          const base = i * 2;
          indices.push(base, base + 1, base + 2);
          indices.push(base + 1, base + 3, base + 2);
        }
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      const material = new THREE.MeshStandardMaterial({
        map: textureLoader.load('assets/textures/track_diffuse.jpg'),
        roughness: 0.8,
        metalness: 0.1,
      });

      this.mesh = new THREE.Mesh(geometry, material);
      this.mesh.receiveShadow = true;
    }

    private generateCollider(world: PhysicsWorld): void {
      // Create a static trimesh collider for the track
      const vertices = this.mesh.geometry.attributes.position.array;
      const indices = Array.from(this.mesh.geometry.index!.array);

      const colliderDesc = RAPIER.ColliderDesc.trimesh(
        new Float32Array(vertices),
        new Uint32Array(indices)
      );

      this.collider = world.world.createCollider(colliderDesc);
      this.collider.setFriction(1.0); // Good grip on track
    }
  }
  ```

- [ ] **Create track data JSON**
  ```typescript
  // assets/tracks/track01.json
  export const TRACK_01: TrackData = {
    name: "Hard Drivin' Classic",
    width: 10,
    sections: [
      { type: 'straight', length: 100 },
      { type: 'curve', radius: 50, angle: 90 },
      { type: 'ramp', length: 30, height: 10 },
      { type: 'straight', length: 50 },
      { type: 'loop', radius: 15 },
      { type: 'bank', radius: 40, angle: 180, banking: 30 },
      { type: 'straight', length: 80 },
    ],
    waypoints: [
      { id: 0, position: [0, 0, 0], isCheckpoint: false },
      { id: 1, position: [0, 0, 100], isCheckpoint: true },
      // ... more waypoints
    ],
    spawnPoint: {
      position: new THREE.Vector3(0, 2, 0),
      rotation: new THREE.Quaternion(),
    },
  };
  ```

### Phase 3B: Waypoint System ⚡
**Developer Focus**: Gameplay/Logic Developer

#### Tasks
- [ ] **Create WaypointSystem.ts**
  ```typescript
  export interface WaypointData {
    id: number;
    position: THREE.Vector3;
    direction: THREE.Vector3;
    triggerRadius: number;
    isCheckpoint: boolean;
    timeBonus?: number;
  }

  export class WaypointSystem {
    private waypoints: Waypoint[] = [];
    private currentWaypoint = 0;
    private lapCount = 0;
    private maxLaps = 2;

    constructor(waypointData: WaypointData[]) {
      this.waypoints = waypointData.map(data => new Waypoint(data));
    }

    update(vehiclePosition: THREE.Vector3): WaypointResult {
      const current = this.waypoints[this.currentWaypoint];
      const distance = vehiclePosition.distanceTo(current.position);

      if (distance < current.triggerRadius) {
        return this.onWaypointPassed(vehiclePosition);
      }

      // Check for wrong-way
      if (this.isGoingWrongWay(vehiclePosition)) {
        return { wrongWay: true };
      }

      return { progress: this.getProgress() };
    }

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

    private isGoingWrongWay(vehiclePos: THREE.Vector3): boolean {
      const current = this.waypoints[this.currentWaypoint];
      const toWaypoint = current.position.clone().sub(vehiclePos).normalize();
      const dot = toWaypoint.dot(current.direction);

      return dot < -0.5; // Facing more than 90° away
    }

    getProgress(): number {
      return (this.currentWaypoint + this.lapCount * this.waypoints.length) /
             (this.waypoints.length * this.maxLaps);
    }

    getNextWaypointPosition(): THREE.Vector3 {
      return this.waypoints[this.currentWaypoint].position.clone();
    }
  }
  ```

- [ ] **Create minimap generator**
  ```typescript
  export class MinimapGenerator {
    private texture: THREE.Texture;
    private camera: THREE.OrthographicCamera;

    generate(track: Track, size = 512): THREE.Texture {
      // Create orthographic camera looking down
      const bounds = track.getBounds();
      this.camera = new THREE.OrthographicCamera(
        bounds.min.x, bounds.max.x,
        bounds.max.z, bounds.min.z,
        0, 100
      );
      this.camera.position.set(0, 50, 0);
      this.camera.lookAt(0, 0, 0);

      // Render to texture
      const renderTarget = new THREE.WebGLRenderTarget(size, size);
      const scene = new THREE.Scene();
      scene.add(track.getMesh().clone());

      renderer.setRenderTarget(renderTarget);
      renderer.render(scene, this.camera);
      renderer.setRenderTarget(null);

      this.texture = renderTarget.texture;
      return this.texture;
    }

    drawPlayerMarker(position: THREE.Vector3, rotation: number): void {
      // Draw triangle on minimap canvas
      const ctx = this.getMinimapContext();
      const screenPos = this.worldToScreen(position);
      
      ctx.save();
      ctx.translate(screenPos.x, screenPos.y);
      ctx.rotate(rotation);
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(-3, 3);
      ctx.lineTo(3, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  ```

### Phase 3C: Environment & Obstacles ⚡
**Developer Focus**: Environment/Assets Developer

#### Tasks
- [ ] **Create Obstacle.ts**
  ```typescript
  export enum ObstacleType {
    CONE = 'cone',
    BARRIER = 'barrier',
    TIRE_WALL = 'tire_wall',
  }

  export class Obstacle {
    private mesh: THREE.Mesh;
    private collider: RAPIER.Collider;
    private type: ObstacleType;

    constructor(
      type: ObstacleType,
      position: THREE.Vector3,
      world: PhysicsWorld,
      scene: THREE.Scene
    ) {
      this.type = type;
      this.loadModel(type);
      this.createCollider(world);
      this.mesh.position.copy(position);
      scene.add(this.mesh);
    }

    private loadModel(type: ObstacleType): void {
      // Load GLTF model based on type
      switch (type) {
        case ObstacleType.CONE:
          this.mesh = this.createCone();
          break;
        case ObstacleType.BARRIER:
          this.mesh = this.createBarrier();
          break;
        case ObstacleType.TIRE_WALL:
          this.mesh = this.createTireWall();
          break;
      }
    }

    private createCollider(world: PhysicsWorld): void {
      const bodyDesc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(
          this.mesh.position.x,
          this.mesh.position.y,
          this.mesh.position.z
        );

      const body = world.world.createRigidBody(bodyDesc);

      // Different collision shapes based on type
      let colliderDesc: RAPIER.ColliderDesc;
      switch (this.type) {
        case ObstacleType.CONE:
          colliderDesc = RAPIER.ColliderDesc.cone(0.5, 0.3);
          break;
        case ObstacleType.BARRIER:
          colliderDesc = RAPIER.ColliderDesc.cuboid(2, 0.5, 0.2);
          break;
        case ObstacleType.TIRE_WALL:
          colliderDesc = RAPIER.ColliderDesc.cuboid(1, 1, 0.5);
          break;
      }

      this.collider = world.world.createCollider(colliderDesc, body);
    }
  }
  ```

- [ ] **Add surface types**
  ```typescript
  export enum SurfaceType {
    TARMAC = 'tarmac',
    DIRT = 'dirt',
    GRASS = 'grass',
    ICE = 'ice',
  }

  export const SURFACE_FRICTION: Record<SurfaceType, number> = {
    [SurfaceType.TARMAC]: 1.0,
    [SurfaceType.DIRT]: 0.6,
    [SurfaceType.GRASS]: 0.4,
    [SurfaceType.ICE]: 0.2,
  };

  // Add to collider creation:
  colliderDesc.setFriction(SURFACE_FRICTION[surfaceType]);
  ```

- [ ] **Add particle effects (tire marks, dust)**
  ```typescript
  export class ParticleSystem {
    private particles: THREE.Points;
    private particleCount = 1000;

    createDustCloud(position: THREE.Vector3, velocity: THREE.Vector3): void {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(this.particleCount * 3);
      const velocities: THREE.Vector3[] = [];

      for (let i = 0; i < this.particleCount; i++) {
        positions[i * 3] = position.x + (Math.random() - 0.5) * 2;
        positions[i * 3 + 1] = position.y;
        positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 2;

        velocities.push(
          velocity.clone().multiplyScalar(0.5).add(
            new THREE.Vector3(
              (Math.random() - 0.5) * 2,
              Math.random() * 2,
              (Math.random() - 0.5) * 2
            )
          )
        );
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.PointsMaterial({
        color: 0x8B7355,
        size: 0.2,
        transparent: true,
        opacity: 0.6,
      });

      this.particles = new THREE.Points(geometry, material);
    }

    update(deltaTime: number): void {
      // Update particle positions and fade out
      const positions = this.particles.geometry.attributes.position.array;
      const material = this.particles.material as THREE.PointsMaterial;

      material.opacity *= 0.95; // Fade out

      if (material.opacity < 0.01) {
        this.dispose();
      }
    }
  }
  ```

### Testing Criteria
- [x] **Full track loads without errors**
- [x] **Track mesh renders correctly** (no gaps, no z-fighting)
- [x] **Track collider works** (vehicle stays on track)
- [x] **Vehicle completes full lap** (reaches start again)
- [x] **All waypoints trigger** (verify in console logs)
- [x] **Lap counter increments** correctly
- [x] **Checkpoint grants time bonus**
- [x] **Wrong-way detection** triggers properly
- [x] **Minimap shows track** and player position
- [x] **Obstacles collision** works (vehicle bounces off)
- [x] **Off-road detection** activates (grass/dirt areas)
- [x] **Surface friction** affects vehicle handling
- [x] **Particle effects** spawn correctly
- [x] **Performance: 60fps with full track** loaded
- [x] **No visual glitches** (flickering, disappearing geometry)

### Deliverables
- ✅ Complete functional track with all features
- ✅ Waypoint system with progression tracking
- ✅ Minimap with real-time updates
- ✅ Obstacle system with collision
- ✅ Surface type system (multi-material track)
- ✅ Environmental assets (barriers, cones, scenery)
- ✅ Particle effects (dust, tire marks)

### Performance Targets
- Frame rate: 60fps with full track + obstacles
- Memory: <250MB
- Draw calls: <200
- Track collision: <1ms per frame

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

### Phase 8C: Documentation & Deployment ⚡

#### Tasks
- [ ] **Write README.md**
  ```markdown
  # Hard Drivin' Remake

  A modern browser-based remake of the classic Hard Drivin' arcade racer, built with TypeScript, Three.js, and Rapier.js.

  ## Features
  - Realistic vehicle physics powered by Rapier.js
  - Cinematic crash replay system
  - Ghost opponent (Phantom Photon)
  - Local leaderboards
  - Full audio implementation
  - 60fps performance

  ## Controls
  **Keyboard:**
  - W/Up Arrow: Accelerate
  - S/Down Arrow: Brake
  - A/Left Arrow: Steer left
  - D/Right Arrow: Steer right
  - Space: Handbrake
  - R: Reset
  - Esc: Pause

  **Gamepad:**
  - Right Trigger: Accelerate
  - Left Trigger: Brake
  - Left Stick: Steering
  - A Button: Handbrake

  ## Installation
  ```bash
  npm install
  npm run dev
  ```

  ## Building for Production
  ```bash
  npm run build
  npm run preview
  ```

  ## Technology Stack
  - TypeScript 5.3+
  - Three.js r160+
  - Rapier.js 0.13+
  - Vite 5.0+
  - Howler.js 2.2+

  ## License
  MIT
  ```

- [ ] **Create API documentation** (TypeDoc)
  ```bash
  npm install -D typedoc
  npx typedoc --out docs src/
  ```

- [ ] **Write deployment guide**
  ```markdown
  # Deployment Guide

  ## Vercel Deployment
  1. Push to GitHub
  2. Import project in Vercel
  3. Configure build settings:
     - Build Command: `npm run build`
     - Output Directory: `dist`
  4. Deploy

  ## Custom Server
  1. Build: `npm run build`
  2. Upload `dist/` folder
  3. Configure nginx/Apache
  4. Enable gzip compression
  5. Set cache headers

  ## Environment Variables
  - `VITE_API_URL`: API endpoint (if backend added)
  - `VITE_ANALYTICS_ID`: Analytics ID
  ```

- [ ] **Set up error tracking** (Sentry or similar)
  ```typescript
  import * as Sentry from "@sentry/browser";

  Sentry.init({
    dsn: "YOUR_SENTRY_DSN",
    environment: import.meta.env.MODE,
    beforeSend(event) {
      // Filter out development errors
      if (import.meta.env.DEV) return null;
      return event;
    },
  });
  ```

- [ ] **Final production build**
  ```bash
  # Clean build
  rm -rf dist node_modules
  npm install
  npm run build

  # Verify bundle size
  npm run build -- --analyze

  # Test production build locally
  npm run preview
  ```

- [ ] **Create release checklist**
  - [ ] All tests passing
  - [ ] No console errors
  - [ ] Bundle size <50MB
  - [ ] Load time <8s
  - [ ] 60fps on target hardware
  - [ ] Cross-browser tested
  - [ ] Documentation complete
  - [ ] Analytics configured
  - [ ] Error tracking active
  - [ ] Backup of localStorage format documented

### Testing Criteria (Final Acceptance)
- [x] **All Phase 0-7 criteria passed**
- [x] **60fps maintained** on RTX 2060 / M1 Mac
- [x] **Load time <8 seconds** on 10Mbps connection
- [x] **Zero critical bugs**
- [x] **<5 known medium bugs** (documented)
- [x] **Cross-browser compatibility** verified
- [x] **Code coverage >70%** on core systems
- [x] **Documentation complete** (README, API docs, deployment guide)
- [x] **Leaderboard functional** and persisting
- [x] **All audio/visual assets** working
- [x] **Gamepad support** functional
- [x] **Settings persistence** working
- [x] **Production build** optimized and tested
- [x] **Error tracking** configured
- [x] **Smooth gameplay** experience (playtested)

### Deliverables
- ✅ Production-ready build
- ✅ Optimized performance
- ✅ Complete documentation
- ✅ Deployment package
- ✅ Bug-free experience
- ✅ **MVP COMPLETE! 🎉🏁**

### Final Performance Targets
- Frame rate: 60fps (stable)
- Load time: <8s
- Bundle size: <50MB
- Memory usage: <400MB
- Zero critical bugs

---

## Post-MVP: What's Next?

### Immediate Priorities (Week 15+)
1. **Community Feedback**: Gather player feedback, prioritize improvements
2. **Bug Fixes**: Address any issues found post-launch
3. **Performance Tuning**: Fine-tune based on real-world usage data
4. **Analytics Review**: Analyze player behavior, identify pain points

### Future Roadmap (Months 4-12)
- **Additional Tracks**: Desert, city, mountain courses
- **More Vehicles**: Different handling characteristics
- **Online Leaderboards**: Backend integration
- **Multiplayer**: Ghost racing with friends
- **Track Editor**: Community-created content
- **Mobile Support**: Touch controls, optimized rendering
- **VR Mode**: WebXR implementation

---

## Emergency Contacts & Resources

### Team Roles
- **Tech Lead**: Overall architecture, critical decisions
- **Physics Developer**: Vehicle dynamics, Rapier.js integration
- **Graphics Developer**: Three.js, rendering, cameras
- **UI Developer**: Interface, menus, HUD
- **Audio Engineer**: Sound effects, music integration
- **QA Lead**: Testing coordination, bug tracking

### Key Resources
- **Three.js Docs**: https://threejs.org/docs/
- **Rapier.js Docs**: https://rapier.rs/docs/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Vite Guide**: https://vitejs.dev/guide/
- **Team Discord/Slack**: [Insert link]
- **GitHub Repo**: [Insert link]
- **Trello/Jira Board**: [Insert link]

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0 | Oct 2, 2025 | Initial draft | Draft |
| 2.0 | Oct 3, 2025 | Final version with full tech stack details | **APPROVED FOR DEV** ✅ |

---

## Appendix: Quick Reference Commands

```bash
# Development
npm run dev                    # Start dev server
npm run test                   # Run unit tests
npm run test:watch             # Watch mode
npm run test:e2e               # E2E tests
npm run lint                   # Check code quality
npm run format                 # Format code

# Building
npm run build                  # Production build
npm run preview                # Preview prod build
npm run build:analyze          # Analyze bundle

# Deployment
git push origin main           # Triggers CI/CD
npm run deploy:vercel          # Manual Vercel deploy
npm run deploy:netlify         # Manual Netlify deploy
```

---

**🎮 LET'S BUILD THIS! 🏁**

This roadmap represents 14 weeks of focused development to create an amazing browser-based racing game. Each phase builds on the previous one, with clear checkpoints and testing gates to ensure quality.

**Remember:**
- ✅ Complete Phase 0 setup before starting development
- ✅ Test thoroughly at each phase boundary
- ✅ Use the parallel work opportunities to maximize efficiency
- ✅ Don't skip the refactoring/testing steps
- ✅ Communicate blockers early
- ✅ Have fun building something awesome!

**Status**: 🚀 **READY TO START** 🚀  
**Next Action**: Begin Phase 0 - Project Setup