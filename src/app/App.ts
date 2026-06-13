import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { FIXED_TIMESTEP } from '../config/constants';
import { Renderer } from '../core/Renderer';
import { Physics } from '../core/Physics';
import { Input } from '../core/Input';
import { GameLoop } from './GameLoop';

/**
 * Application root. Owns the engine subsystems and the main loop.
 *
 * The current scene is a deliberately small *integration smoke test*: a dynamic
 * cube falls under gravity and settles on a static ground plane. It proves that
 * Three.js rendering, Rapier physics and the fixed-timestep loop are wired
 * together correctly. Real gameplay (vehicle, track, camera) replaces it in the
 * upcoming phases.
 */
export class App {
  private readonly renderer: Renderer;
  private readonly physics: Physics;
  private readonly input: Input;
  private readonly loop: GameLoop;

  // Reusable scratch objects (no per-frame allocations).
  private readonly tmpQuat = new THREE.Quaternion();

  private demoMesh: THREE.Mesh | null = null;
  private demoBody: RAPIER.RigidBody | null = null;
  private angle = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.physics = new Physics();
    this.input = new Input(window);
    this.loop = new GameLoop({
      fixedStep: FIXED_TIMESTEP,
      update: (dt) => this.fixedUpdate(dt),
      render: (alpha) => this.render(alpha),
    });
  }

  async start(): Promise<void> {
    await this.physics.init();
    this.buildScene();
    this.input.attach();
    this.loop.start();
    document.getElementById('boot')?.classList.add('is-hidden');
  }

  stop(): void {
    this.loop.stop();
    this.input.detach();
    this.physics.dispose();
    this.renderer.dispose();
  }

  private buildScene(): void {
    const { RAPIER } = this.physics;
    const world = this.physics.world;

    // --- Ground: visual plane + static collider (top surface at y = 0). ---
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: 0x3a5f3a, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.renderer.scene.add(ground);

    const grid = new THREE.GridHelper(120, 60, 0x224422, 0x224422);
    (grid.material as THREE.Material).opacity = 0.25;
    (grid.material as THREE.Material).transparent = true;
    this.renderer.scene.add(grid);

    world.createCollider(RAPIER.ColliderDesc.cuboid(60, 0.5, 60).setTranslation(0, -0.5, 0));

    // --- Falling cube: visual mesh + dynamic body. ---
    this.demoMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.5, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x2bff88, roughness: 0.4, metalness: 0.1 }),
    );
    this.demoMesh.castShadow = true;
    this.renderer.scene.add(this.demoMesh);

    this.demoBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 9, 0).setLinearDamping(0.05),
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.75, 0.75, 0.75).setRestitution(0.45).setFriction(0.8),
      this.demoBody,
    );
  }

  private fixedUpdate(dt: number): void {
    this.input.update();
    // Nudge the cube with steering input so the controls are visibly alive.
    if (this.demoBody && this.input.state.steer !== 0) {
      this.demoBody.applyImpulse({ x: this.input.state.steer * 0.6, y: 0, z: 0 }, true);
    }
    this.physics.step(dt);
  }

  private render(_alpha: number): void {
    // Sync the rendered cube to the physics body.
    if (this.demoMesh && this.demoBody) {
      const t = this.demoBody.translation();
      const r = this.demoBody.rotation();
      this.demoMesh.position.set(t.x, t.y, t.z);
      this.demoMesh.quaternion.copy(this.tmpQuat.set(r.x, r.y, r.z, r.w));
    }

    // Slow orbit so the 3D scene reads as 3D at a glance.
    this.angle += 0.0025;
    const radius = 16;
    this.renderer.camera.position.set(
      Math.sin(this.angle) * radius,
      8,
      Math.cos(this.angle) * radius,
    );
    this.renderer.camera.lookAt(0, 1.5, 0);

    this.renderer.render();
  }
}
