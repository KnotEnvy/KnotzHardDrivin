/**
 * Test helper utilities for Phase 2 testing
 * Provides common test operations for vehicle physics and input systems
 */

import * as THREE from 'three';
import { expect } from 'vitest';

// ============================================================================
// VECTOR COMPARISON UTILITIES
// ============================================================================

/**
 * Compares two THREE.Vector3 objects with tolerance for floating point errors
 * @param actual - The actual vector
 * @param expected - The expected vector
 * @param tolerance - Acceptable difference per component (default: 0.0001)
 * @param message - Optional message for assertion failure
 */
export function expectVector3ToBe(
  actual: THREE.Vector3,
  expected: THREE.Vector3,
  tolerance = 0.0001,
  message?: string
): void {
  const dx = Math.abs(actual.x - expected.x);
  const dy = Math.abs(actual.y - expected.y);
  const dz = Math.abs(actual.z - expected.z);

  const fullMessage = message
    ? `${message} - Vector mismatch: actual(${actual.x}, ${actual.y}, ${actual.z}) vs expected(${expected.x}, ${expected.y}, ${expected.z})`
    : `Vector mismatch: actual(${actual.x}, ${actual.y}, ${actual.z}) vs expected(${expected.x}, ${expected.y}, ${expected.z})`;

  expect(dx).toBeLessThanOrEqual(tolerance);
  expect(dy).toBeLessThanOrEqual(tolerance);
  expect(dz).toBeLessThanOrEqual(tolerance);
}

/**
 * Compares vector magnitude with tolerance
 * @param actual - The actual vector
 * @param expectedMagnitude - Expected magnitude
 * @param tolerance - Acceptable difference (default: 0.0001)
 */
export function expectVectorMagnitudeToBe(
  actual: THREE.Vector3,
  expectedMagnitude: number,
  tolerance = 0.0001
): void {
  const actualMagnitude = actual.length();
  const diff = Math.abs(actualMagnitude - expectedMagnitude);
  expect(diff).toBeLessThanOrEqual(tolerance);
}

/**
 * Checks if two vectors are approximately parallel (within angle tolerance)
 * @param a - First vector
 * @param b - Second vector
 * @param angleTolerance - Max angle difference in radians (default: 0.01)
 */
export function expectVectorsToBeParallel(
  a: THREE.Vector3,
  b: THREE.Vector3,
  angleTolerance = 0.01
): void {
  const normA = a.clone().normalize();
  const normB = b.clone().normalize();
  const dotProduct = Math.abs(normA.dot(normB));

  // Parallel vectors have dot product of 1 or -1
  expect(dotProduct).toBeGreaterThan(1 - angleTolerance);
}

// ============================================================================
// QUATERNION COMPARISON UTILITIES
// ============================================================================

/**
 * Compares two THREE.Quaternion objects with tolerance
 * @param actual - The actual quaternion
 * @param expected - The expected quaternion
 * @param tolerance - Acceptable difference per component (default: 0.0001)
 */
export function expectQuaternionToBe(
  actual: THREE.Quaternion,
  expected: THREE.Quaternion,
  tolerance = 0.0001
): void {
  const dx = Math.abs(actual.x - expected.x);
  const dy = Math.abs(actual.y - expected.y);
  const dz = Math.abs(actual.z - expected.z);
  const dw = Math.abs(actual.w - expected.w);

  expect(dx).toBeLessThanOrEqual(tolerance);
  expect(dy).toBeLessThanOrEqual(tolerance);
  expect(dz).toBeLessThanOrEqual(tolerance);
  expect(dw).toBeLessThanOrEqual(tolerance);
}

/**
 * Compares rotation angles represented by quaternions
 * @param actual - The actual quaternion
 * @param expected - The expected quaternion
 * @param angleTolerance - Acceptable angle difference in radians (default: 0.01)
 */
export function expectQuaternionAngleToBe(
  actual: THREE.Quaternion,
  expected: THREE.Quaternion,
  angleTolerance = 0.01
): void {
  const angle = actual.angleTo(expected);
  expect(angle).toBeLessThanOrEqual(angleTolerance);
}

// ============================================================================
// PHYSICS TEST UTILITIES
// ============================================================================

/**
 * Creates a mock raycast hit result for testing
 * @param hit - Whether the ray hit something
 * @param toi - Time of impact (distance)
 * @param normal - Hit surface normal
 * @param point - Hit point in world space
 * @returns Mock raycast hit object
 */
export function createMockRaycastHit(
  hit: boolean,
  toi = 1.0,
  normal = new THREE.Vector3(0, 1, 0),
  point = new THREE.Vector3(0, 0, 0)
) {
  if (!hit) {
    return null;
  }

  return {
    toi,
    normal: { x: normal.x, y: normal.y, z: normal.z },
    point: { x: point.x, y: point.y, z: point.z },
  };
}

/**
 * Simulates multiple physics frames for testing stability
 * @param updateFn - Function to call each frame (receives deltaTime)
 * @param frames - Number of frames to simulate (default: 60)
 * @param deltaTime - Time per frame in seconds (default: 1/60)
 */
export function simulatePhysicsFrames(
  updateFn: (deltaTime: number) => void,
  frames = 60,
  deltaTime = 1 / 60
): void {
  for (let i = 0; i < frames; i++) {
    updateFn(deltaTime);
  }
}

// ============================================================================
// INPUT SIMULATION UTILITIES
// ============================================================================

/**
 * Creates a mock keyboard event for testing
 * @param key - Key code (e.g., 'ArrowUp', 'w')
 * @param type - Event type ('keydown' or 'keyup')
 * @returns Mock KeyboardEvent
 */
export function createMockKeyboardEvent(
  key: string,
  type: 'keydown' | 'keyup' = 'keydown'
): KeyboardEvent {
  return new KeyboardEvent(type, {
    key,
    code: key,
    bubbles: true,
    cancelable: true,
  });
}

/**
 * Creates a mock gamepad state for testing
 * @param axes - Axis values (default: [0, 0, 0, 0])
 * @param buttons - Button states (default: all unpressed)
 * @returns Mock Gamepad object
 */
export function createMockGamepad(
  axes: number[] = [0, 0, 0, 0],
  buttons: Array<{ pressed: boolean; value: number }> = []
): Gamepad {
  const defaultButtons = Array(16)
    .fill(null)
    .map(() => ({ pressed: false, value: 0, touched: false }));

  return {
    id: 'mock-gamepad',
    index: 0,
    connected: true,
    timestamp: performance.now(),
    mapping: 'standard',
    axes: [...axes],
    buttons: buttons.length > 0 ? buttons as any : defaultButtons,
    vibrationActuator: null as any,
    hapticActuators: [] as any,
  };
}

// ============================================================================
// TIME AND FRAME UTILITIES
// ============================================================================

/**
 * Waits for a specific number of frames (for async tests)
 * @param frames - Number of frames to wait
 * @returns Promise that resolves after the specified frames
 */
export async function waitFrames(frames: number): Promise<void> {
  return new Promise((resolve) => {
    let count = 0;
    const tick = () => {
      count++;
      if (count >= frames) {
        resolve();
      } else {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
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
 * Measures average execution time over multiple runs
 * @param fn - Function to measure
 * @param iterations - Number of iterations (default: 100)
 * @returns Average execution time in milliseconds
 */
export function measureAverageExecutionTime(
  fn: () => void,
  iterations = 100
): number {
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    times.push(measureExecutionTime(fn));
  }
  return times.reduce((sum, t) => sum + t, 0) / times.length;
}

// ============================================================================
// RANGE AND CONSTRAINT UTILITIES
// ============================================================================

/**
 * Checks if a value is within expected range
 * @param value - Value to check
 * @param min - Minimum expected value
 * @param max - Maximum expected value
 * @param message - Optional message for assertion failure
 */
export function expectValueInRange(
  value: number,
  min: number,
  max: number,
  message?: string
): void {
  const fullMessage = message
    ? `${message} - Value ${value} not in range [${min}, ${max}]`
    : `Value ${value} not in range [${min}, ${max}]`;

  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
}

/**
 * Checks if a value is approximately equal to expected (with tolerance)
 * @param actual - Actual value
 * @param expected - Expected value
 * @param tolerance - Acceptable difference (default: 0.0001)
 * @param message - Optional message for assertion failure
 */
export function expectApproximately(
  actual: number,
  expected: number,
  tolerance = 0.0001,
  message?: string
): void {
  const diff = Math.abs(actual - expected);
  const fullMessage = message
    ? `${message} - Actual ${actual} not close to expected ${expected} (diff: ${diff})`
    : `Actual ${actual} not close to expected ${expected} (diff: ${diff})`;

  expect(diff).toBeLessThanOrEqual(tolerance);
}

// ============================================================================
// VEHICLE TEST UTILITIES
// ============================================================================

/**
 * Creates deterministic test data for vehicle physics
 * @returns Object with common test vectors and values
 */
export function createVehicleTestData() {
  return {
    positions: {
      origin: new THREE.Vector3(0, 0, 0),
      elevated: new THREE.Vector3(0, 10, 0),
      forward: new THREE.Vector3(0, 0, 10),
      offset: new THREE.Vector3(5, 2, -3),
    },
    velocities: {
      stationary: new THREE.Vector3(0, 0, 0),
      slow: new THREE.Vector3(0, 0, 5),
      medium: new THREE.Vector3(0, 0, 20),
      fast: new THREE.Vector3(0, 0, 50),
      falling: new THREE.Vector3(0, -15, 0),
    },
    rotations: {
      identity: new THREE.Quaternion(),
      yaw90: new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        Math.PI / 2
      ),
      pitch45: new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        Math.PI / 4
      ),
      roll30: new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        Math.PI / 6
      ),
    },
    forces: {
      gravity: new THREE.Vector3(0, -9.81, 0),
      forward: new THREE.Vector3(0, 0, 1000),
      upward: new THREE.Vector3(0, 1000, 0),
      lateral: new THREE.Vector3(1000, 0, 0),
    },
  };
}

// ============================================================================
// DEBUGGING UTILITIES
// ============================================================================

/**
 * Pretty-prints a Vector3 for debugging
 * @param v - Vector to print
 * @param label - Optional label
 * @returns Formatted string
 */
export function formatVector3(v: THREE.Vector3, label?: string): string {
  const prefix = label ? `${label}: ` : '';
  return `${prefix}(${v.x.toFixed(4)}, ${v.y.toFixed(4)}, ${v.z.toFixed(4)})`;
}

/**
 * Pretty-prints a Quaternion for debugging
 * @param q - Quaternion to print
 * @param label - Optional label
 * @returns Formatted string
 */
export function formatQuaternion(q: THREE.Quaternion, label?: string): string {
  const prefix = label ? `${label}: ` : '';
  return `${prefix}(${q.x.toFixed(4)}, ${q.y.toFixed(4)}, ${q.z.toFixed(4)}, ${q.w.toFixed(4)})`;
}

/**
 * Logs test state for debugging (only in debug mode)
 * @param label - State label
 * @param data - Data to log
 */
export function logTestState(label: string, data: any): void {
  if (process.env.DEBUG_TESTS === 'true') {
    console.log(`[TEST STATE] ${label}:`, data);
  }
}
