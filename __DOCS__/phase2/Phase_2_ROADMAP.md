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