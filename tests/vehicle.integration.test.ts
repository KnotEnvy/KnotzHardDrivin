import { describe, it, expect, beforeAll } from 'vitest';
import * as THREE from 'three';
import { Physics } from '../src/core/Physics';
import { Vehicle } from '../src/entities/Vehicle';
import type { InputState } from '../src/core/Input';

/**
 * Integration smoke test: boot the real Rapier world + Vehicle (no renderer /
 * WebGL needed — Three core objects are pure math) and verify the simulation
 * behaves. This is the "green build but black screen" guard: it proves the car
 * settles on its wheels and responds to throttle, deterministically in Node.
 */

const STEP = 1 / 60;

function neutral(): InputState {
  return { throttle: 0, brake: 0, steer: 0, handbrake: false, reset: false, pause: false };
}

function run(physics: Physics, vehicle: Vehicle, input: InputState, steps: number): void {
  for (let i = 0; i < steps; i++) {
    vehicle.fixedUpdate(STEP, input);
    physics.step(STEP);
  }
}

describe('Vehicle integration (real Rapier physics)', () => {
  let physics: Physics;
  let vehicle: Vehicle;
  const pos = new THREE.Vector3();

  beforeAll(async () => {
    physics = new Physics();
    await physics.init();
    // Flat ground, top surface at y = 0 (matches App.buildScene).
    physics.world.createCollider(
      physics.RAPIER.ColliderDesc.cuboid(200, 0.5, 200).setTranslation(0, -0.5, 0),
    );
    vehicle = new Vehicle(physics, new THREE.Scene());
  });

  it('settles onto all four wheels at rest', () => {
    run(physics, vehicle, neutral(), 180); // 3 s
    expect(vehicle.groundedCount).toBe(4);
    expect(vehicle.speed).toBeLessThan(0.5);

    vehicle.getPosition(pos);
    expect(Number.isFinite(pos.y)).toBe(true);
    expect(pos.y).toBeGreaterThan(0.3); // didn't sink through the floor
    expect(pos.y).toBeLessThan(1.6); // didn't get launched
  });

  it('accelerates forward (−Z) under throttle', () => {
    vehicle.respawn(new THREE.Vector3(0, vehicle.spawnHeight, 0), new THREE.Quaternion());
    run(physics, vehicle, neutral(), 60); // let it settle

    vehicle.getPosition(pos);
    const startZ = pos.z;

    const gas = neutral();
    gas.throttle = 1;
    run(physics, vehicle, gas, 180); // 3 s of throttle

    expect(vehicle.forwardSpeed).toBeGreaterThan(5); // m/s
    vehicle.getPosition(pos);
    expect(pos.z).toBeLessThan(startZ - 2); // moved forward (−Z)
    expect(Number.isFinite(vehicle.speed)).toBe(true);
  });

  it('stays stable (no NaN) after hard steering input', () => {
    vehicle.respawn(new THREE.Vector3(0, vehicle.spawnHeight, 0), new THREE.Quaternion());
    const turn = neutral();
    turn.throttle = 1;
    turn.steer = 1;
    run(physics, vehicle, turn, 240);

    vehicle.getPosition(pos);
    expect(Number.isFinite(pos.x)).toBe(true);
    expect(Number.isFinite(pos.y)).toBe(true);
    expect(Number.isFinite(pos.z)).toBe(true);
    expect(Number.isFinite(vehicle.speed)).toBe(true);
  });
});
