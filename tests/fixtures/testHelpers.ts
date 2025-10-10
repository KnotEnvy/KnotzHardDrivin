/**
 * Test helper utilities for Phase 2 (Vehicle Physics & Input) testing
 * Provides comparison functions, mock generators, and test utilities
 */

import * as THREE from 'three';

/**
 * Default tolerance for floating-point comparisons
 */
export const DEFAULT_TOLERANCE = 0.0001;

/**
 * Compares two numbers with tolerance for floating-point errors
 * @param a - First number
 * @param b - Second number
 * @param tolerance - Maximum acceptable difference (default: 0.0001)
 * @returns True if numbers are approximately equal
 */
export function approximatelyEqual(
  a: number,
  b: number,
  tolerance: number = DEFAULT_TOLERANCE
): boolean {
  return Math.abs(a - b) <= tolerance;
}

/**
 * Compares two THREE.Vector3 objects with tolerance
 * @param a - First vector
 * @param b - Second vector
 * @param tolerance - Maximum acceptable difference per component
 * @returns True if vectors are approximately equal
 */
export function vectorApproximatelyEqual(
  a: THREE.Vector3,
  b: THREE.Vector3,
  tolerance: number = DEFAULT_TOLERANCE
): boolean {
  return (
    approximatelyEqual(a.x, b.x, tolerance) &&
    approximatelyEqual(a.y, b.y, tolerance) &&
    approximatelyEqual(a.z, b.z, tolerance)
  );
}

/**
 * Compares two THREE.Quaternion objects with tolerance
 * @param a - First quaternion
 * @param b - Second quaternion
 * @param tolerance - Maximum acceptable difference
 * @returns True if quaternions are approximately equal
 */
export function quaternionApproximatelyEqual(
  a: THREE.Quaternion,
  b: THREE.Quaternion,
  tolerance: number = DEFAULT_TOLERANCE
): boolean {
  // Compare quaternions by checking if their dot product is close to 1 or -1
  const dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  return approximatelyEqual(Math.abs(dot), 1, tolerance);
}

/**
 * Checks if a number is within a specified range
 * @param value - Number to check
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns True if value is in range
 */
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Clamps a number between min and max
 * @param value - Number to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generates a random number between min and max
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random number in range
 */
export function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Generates a random THREE.Vector3 within specified bounds
 * @param minX - Minimum X
 * @param maxX - Maximum X
 * @param minY - Minimum Y
 * @param maxY - Maximum Y
 * @param minZ - Minimum Z
 * @param maxZ - Maximum Z
 * @returns Random vector
 */
export function randomVector3(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  minZ: number,
  maxZ: number
): THREE.Vector3 {
  return new THREE.Vector3(
    randomBetween(minX, maxX),
    randomBetween(minY, maxY),
    randomBetween(minZ, maxZ)
  );
}

/**
 * Creates a mock Rapier RigidBody for testing
 * @param position - Initial position
 * @param velocity - Initial velocity
 * @returns Mock rigid body object
 */
export function createMockRigidBody(
  position: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
  velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
) {
  const pos = { x: position.x, y: position.y, z: position.z };
  const vel = { x: velocity.x, y: velocity.y, z: velocity.z };
  const rot = { x: 0, y: 0, z: 0, w: 1 };
  const angVel = { x: 0, y: 0, z: 0 };

  return {
    translation: () => pos,
    setTranslation: (newPos: any) => {
      pos.x = newPos.x;
      pos.y = newPos.y;
      pos.z = newPos.z;
    },
    rotation: () => rot,
    setRotation: (newRot: any) => {
      rot.x = newRot.x;
      rot.y = newRot.y;
      rot.z = newRot.z;
      rot.w = newRot.w;
    },
    linvel: () => vel,
    setLinvel: (newVel: any) => {
      vel.x = newVel.x;
      vel.y = newVel.y;
      vel.z = newVel.z;
    },
    angvel: () => angVel,
    setAngvel: (newAngVel: any) => {
      angVel.x = newAngVel.x;
      angVel.y = newAngVel.y;
      angVel.z = newAngVel.z;
    },
    applyImpulse: vi.fn(),
    applyForce: vi.fn(),
    applyTorqueImpulse: vi.fn(),
    resetForces: vi.fn(),
    resetTorques: vi.fn(),
    mass: () => 1200,
    setAdditionalMass: vi.fn(),
  };
}

/**
 * Creates a mock Rapier World for testing with configurable raycast results
 * @param raycastResults - Array of raycast results to return (null = no hit)
 * @returns Mock world object
 */
export function createMockPhysicsWorld(raycastResults: Array<any | null> = []) {
  let raycastIndex = 0;

  return {
    world: {
      castRay: vi.fn(() => {
        const result = raycastResults[raycastIndex % raycastResults.length];
        raycastIndex++;
        return result;
      }),
      step: vi.fn(),
      createRigidBody: vi.fn(() => createMockRigidBody()),
      createCollider: vi.fn(() => ({
        handle: Math.random(),
        friction: 1.0,
        restitution: 0.3,
      })),
      removeRigidBody: vi.fn(),
      removeCollider: vi.fn(),
    },
  };
}

/**
 * Simulates multiple physics steps for a vehicle
 * @param vehicle - Vehicle instance
 * @param input - Input to apply
 * @param steps - Number of steps to simulate
 * @param deltaTime - Time step (default: 1/60)
 */
export function simulatePhysicsSteps(
  vehicle: any,
  input: any,
  steps: number,
  deltaTime: number = 1 / 60
): void {
  for (let i = 0; i < steps; i++) {
    vehicle.update(deltaTime, input);
  }
}

/**
 * Waits for a condition to be true (for async tests)
 * @param condition - Function that returns true when condition is met
 * @param timeout - Maximum time to wait in ms
 * @param pollInterval - How often to check condition in ms
 * @returns Promise that resolves when condition is true
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 5000,
  pollInterval: number = 100
): Promise<void> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (condition()) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        reject(new Error('Timeout waiting for condition'));
      }
    }, pollInterval);
  });
}

/**
 * Measures execution time of a function
 * @param fn - Function to measure
 * @returns Execution time in milliseconds
 */
export function measureExecutionTime(fn: () => void): number {
  const start = performance.now();
  fn();
  const end = performance.now();
  return end - start;
}

/**
 * Runs a function multiple times and returns average execution time
 * @param fn - Function to measure
 * @param iterations - Number of iterations
 * @returns Average execution time in milliseconds
 */
export function benchmarkFunction(fn: () => void, iterations: number = 100): number {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    times.push(measureExecutionTime(fn));
  }

  return times.reduce((sum, time) => sum + time, 0) / times.length;
}

/**
 * Creates a spy on console methods for test verification
 * @returns Object with spy functions
 */
export function createConsoleSpy() {
  return {
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  };
}

/**
 * Restores console methods after test
 * @param spy - Spy object from createConsoleSpy
 */
export function restoreConsoleSpy(spy: any) {
  spy.log.mockRestore();
  spy.warn.mockRestore();
  spy.error.mockRestore();
}

/**
 * Generates a sequence of input states for testing control smoothing
 * @param duration - Duration in seconds
 * @param deltaTime - Time step
 * @returns Array of input states
 */
export function generateInputSequence(
  duration: number,
  deltaTime: number = 1 / 60
): Array<{ throttle: number; brake: number; steering: number; handbrake: boolean }> {
  const steps = Math.floor(duration / deltaTime);
  const inputs: any[] = [];

  for (let i = 0; i < steps; i++) {
    const t = i / steps;

    // Generate smooth throttle curve (0 to 1 over duration)
    const throttle = Math.sin(t * Math.PI * 0.5);

    // Generate steering oscillation
    const steering = Math.sin(t * Math.PI * 4) * 0.5;

    inputs.push({
      throttle,
      brake: 0,
      steering,
      handbrake: false,
    });
  }

  return inputs;
}

/**
 * Validates that a value is a finite number
 * @param value - Value to check
 * @returns True if value is a finite number
 */
export function isFiniteNumber(value: any): boolean {
  return typeof value === 'number' && isFinite(value);
}

/**
 * Validates that a Vector3 has all finite components
 * @param vector - Vector to check
 * @returns True if all components are finite
 */
export function isFiniteVector3(vector: THREE.Vector3): boolean {
  return isFiniteNumber(vector.x) && isFiniteNumber(vector.y) && isFiniteNumber(vector.z);
}

/**
 * Validates that a Quaternion has all finite components and is normalized
 * @param quaternion - Quaternion to check
 * @returns True if quaternion is valid
 */
export function isValidQuaternion(quaternion: THREE.Quaternion): boolean {
  if (
    !isFiniteNumber(quaternion.x) ||
    !isFiniteNumber(quaternion.y) ||
    !isFiniteNumber(quaternion.z) ||
    !isFiniteNumber(quaternion.w)
  ) {
    return false;
  }

  // Check if normalized (length should be 1)
  const lengthSq =
    quaternion.x ** 2 + quaternion.y ** 2 + quaternion.z ** 2 + quaternion.w ** 2;
  return approximatelyEqual(lengthSq, 1, 0.01);
}

/**
 * Import vi from vitest for mocking
 */
import { vi } from 'vitest';
