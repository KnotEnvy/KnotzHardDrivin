import * as THREE from 'three';
import { FIXED_TIMESTEP } from '../config/constants';
import { Renderer } from '../core/Renderer';
import { Physics } from '../core/Physics';
import { Input } from '../core/Input';
import { GameLoop } from './GameLoop';
import { Vehicle } from '../entities/Vehicle';

/**
 * Application root. Owns the engine subsystems and the main loop.
 *
 * Phase 1: a drivable raycast vehicle on a flat ground plane with a chase
 * camera. The track, race rules and presentation polish arrive in later phases.
 */
export class App {
  private readonly renderer: Renderer;
  private readonly physics: Physics;
  private readonly input: Input;
  private readonly loop: GameLoop;

  private vehicle: Vehicle | null = null;
  private readonly spawnPos = new THREE.Vector3();
  private readonly spawnRot = new THREE.Quaternion();

  // Chase-camera scratch (no per-frame allocation).
  private readonly carPos = new THREE.Vector3();
  private readonly fwdFlat = new THREE.Vector3();
  private readonly camDesired = new THREE.Vector3();
  private readonly camLookAt = new THREE.Vector3();
  private cameraInitialised = false;

  private hud: HTMLElement | null = null;
  private frame = 0;

  private static readonly CAM_DISTANCE = 8.5;
  private static readonly CAM_HEIGHT = 3.8;
  private static readonly CAM_LOOK_HEIGHT = 1.2;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.physics = new Physics();
    this.input = new Input(window);
    this.loop = new GameLoop({
      fixedStep: FIXED_TIMESTEP,
      update: (dt) => this.fixedUpdate(dt),
      render: () => this.render(),
    });
    this.createHud();
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

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: 0x3a5f3a, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.renderer.scene.add(ground);

    const grid = new THREE.GridHelper(400, 100, 0x2c4a2c, 0x254025);
    const gm = grid.material as THREE.Material;
    gm.transparent = true;
    gm.opacity = 0.3;
    this.renderer.scene.add(grid);

    world.createCollider(RAPIER.ColliderDesc.cuboid(200, 0.5, 200).setTranslation(0, -0.5, 0));

    this.vehicle = new Vehicle(this.physics, this.renderer.scene);
    this.spawnPos.set(0, this.vehicle.spawnHeight, 0);
    this.spawnRot.identity();
  }

  private fixedUpdate(dt: number): void {
    this.input.update();
    if (!this.vehicle) return;

    if (this.input.state.reset) {
      this.vehicle.respawn(this.spawnPos, this.spawnRot);
    } else {
      this.vehicle.fixedUpdate(dt, this.input.state);
    }
    this.physics.step(dt);
  }

  private render(): void {
    if (!this.vehicle) {
      this.renderer.render();
      return;
    }

    this.vehicle.syncMesh();
    this.updateCamera();
    this.renderer.render();

    if (++this.frame % 4 === 0) this.updateHud();
  }

  private updateCamera(): void {
    const cam = this.renderer.camera;
    this.vehicle!.getPosition(this.carPos);
    this.vehicle!.getFlatForward(this.fwdFlat);

    this.camDesired
      .copy(this.carPos)
      .addScaledVector(this.fwdFlat, -App.CAM_DISTANCE);
    this.camDesired.y += App.CAM_HEIGHT;

    if (!this.cameraInitialised) {
      cam.position.copy(this.camDesired);
      this.cameraInitialised = true;
    } else {
      cam.position.lerp(this.camDesired, 0.1);
    }

    this.camLookAt.copy(this.carPos);
    this.camLookAt.y += App.CAM_LOOK_HEIGHT;
    cam.lookAt(this.camLookAt);
  }

  private createHud(): void {
    const host = document.getElementById('hud');
    if (!host) return;
    this.hud = document.createElement('div');
    this.hud.style.cssText =
      'position:absolute;left:12px;bottom:12px;padding:8px 12px;border-radius:8px;' +
      'background:rgba(0,0,0,0.45);color:#bfffce;font:600 14px/1.4 system-ui,sans-serif;' +
      'white-space:pre;backdrop-filter:blur(4px);';
    host.appendChild(this.hud);
  }

  private updateHud(): void {
    if (!this.hud || !this.vehicle) return;
    const kmh = Math.round(Math.abs(this.vehicle.forwardSpeed) * 3.6);
    this.hud.textContent =
      `${kmh} km/h\n` +
      `wheels grounded: ${this.vehicle.groundedCount}/4\n` +
      `WASD/Arrows · Space handbrake · R reset`;
  }
}
