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
 * Creates a mock Three.js Scene for testing
 * @returns Mock scene object
 */
export function createMockScene() {
  return {
    add: vi.fn(),
    remove: vi.fn(),
    children: [],
    traverse: vi.fn(),
    getObjectByName: vi.fn(),
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

// ============================================================================
// PHASE 3: TRACK SYSTEM TEST HELPERS
// ============================================================================

/**
 * Creates a mock Track instance for testing
 * @param trackData - Optional track configuration
 * @returns Mock track object with essential methods
 */
export function createMockTrack(trackData?: any) {
  const data = trackData || {
    name: 'Test Track',
    width: 10,
    sections: [],
    waypoints: [],
  };

  return {
    data,
    mesh: null as any,
    collider: null as any,
    spline: null as any,

    generateSpline: vi.fn((sections: any[]) => {
      // Mock spline generation
      const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 100),
      ];
      return (global as any).MockCatmullRomCurve3
        ? new (global as any).MockCatmullRomCurve3(points, true)
        : { points, getPoints: () => points };
    }),

    generateMesh: vi.fn((width: number) => {
      // Mock mesh generation
      return {
        geometry: new (global as any).MockBufferGeometry(),
        material: {},
        position: new THREE.Vector3(),
        rotation: new THREE.Euler(),
      };
    }),

    generateCollider: vi.fn((world: any) => {
      // Mock collider generation
      return {
        handle: Math.random(),
        friction: 1.0,
        setFriction: vi.fn(),
      };
    }),

    getBounds: vi.fn(() => ({
      min: new THREE.Vector3(-50, 0, -50),
      max: new THREE.Vector3(50, 10, 200),
    })),

    getLength: vi.fn(() => 500),

    dispose: vi.fn(),
  };
}

/**
 * Creates a mock Waypoint instance for testing
 * @param waypointData - Waypoint configuration
 * @returns Mock waypoint object
 */
export function createMockWaypoint(waypointData?: any) {
  const data = waypointData || {
    id: 0,
    position: new THREE.Vector3(0, 0, 0),
    direction: new THREE.Vector3(0, 0, 1),
    triggerRadius: 5,
    isCheckpoint: false,
  };

  return {
    id: data.id,
    position: data.position,
    direction: data.direction,
    triggerRadius: data.triggerRadius,
    isCheckpoint: data.isCheckpoint,
    timeBonus: data.timeBonus,

    isTriggered: vi.fn((vehiclePosition: THREE.Vector3) => {
      const distance = vehiclePosition.distanceTo(data.position);
      return distance < data.triggerRadius;
    }),

    getDistanceFrom: vi.fn((position: THREE.Vector3) => {
      return position.distanceTo(data.position);
    }),
  };
}

/**
 * Creates a mock Obstacle instance for testing
 * @param obstacleData - Obstacle configuration
 * @returns Mock obstacle object
 */
export function createMockObstacle(obstacleData?: any) {
  const data = obstacleData || {
    type: 'cone',
    position: new THREE.Vector3(0, 0, 0),
    rotation: new THREE.Quaternion(),
    scale: new THREE.Vector3(1, 1, 1),
  };

  return {
    type: data.type,
    mesh: {
      position: data.position,
      rotation: data.rotation,
      scale: data.scale,
    },
    collider: {
      handle: Math.random(),
      friction: 0.5,
    },

    dispose: vi.fn(),
  };
}

/**
 * Validates spline generation correctness
 * @param spline - Spline to validate
 * @param expectedPointCount - Expected number of control points
 * @returns True if spline is valid
 */
export function validateTrackSpline(spline: any, expectedPointCount?: number): boolean {
  if (!spline) return false;
  if (!spline.points || !Array.isArray(spline.points)) return false;
  if (spline.points.length < 2) return false;

  if (expectedPointCount !== undefined) {
    if (spline.points.length !== expectedPointCount) return false;
  }

  // Check all points are valid Vector3
  for (const point of spline.points) {
    if (!isFiniteVector3(point)) return false;
  }

  return true;
}

/**
 * Validates collision mesh integrity
 * @param geometry - BufferGeometry to validate
 * @returns True if collision mesh is valid
 */
export function validateCollisionMesh(geometry: any): boolean {
  if (!geometry) return false;

  // Check for position attribute
  const positionAttr = geometry.attributes?.get('position') || geometry.getAttribute?.('position');
  if (!positionAttr) return false;
  if (!positionAttr.array || positionAttr.array.length === 0) return false;

  // Check for index
  if (!geometry.index) return false;
  if (!geometry.index.array || geometry.index.array.length === 0) return false;

  // Check triangles are valid (indices in range)
  const vertexCount = positionAttr.array.length / 3;
  const indices = geometry.index.array;

  for (let i = 0; i < indices.length; i++) {
    if (indices[i] < 0 || indices[i] >= vertexCount) return false;
  }

  return true;
}

/**
 * Simulates vehicle passing through a waypoint
 * @param waypointSystem - WaypointSystem instance
 * @param vehiclePosition - Vehicle position
 * @returns Waypoint result object
 */
export function simulateWaypointPass(waypointSystem: any, vehiclePosition: THREE.Vector3): any {
  return waypointSystem.update(vehiclePosition);
}

/**
 * Generates a sequence of positions along a straight path
 * @param start - Start position
 * @param end - End position
 * @param steps - Number of steps
 * @returns Array of Vector3 positions
 */
export function generatePathPositions(
  start: THREE.Vector3,
  end: THREE.Vector3,
  steps: number
): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const position = new THREE.Vector3().lerpVectors(start, end, t);
    positions.push(position);
  }

  return positions;
}

/**
 * Simulates vehicle driving along a path
 * @param vehicle - Vehicle instance
 * @param path - Array of positions
 * @param waypointSystem - Optional waypoint system to test
 * @returns Array of waypoint results
 */
export function simulateDrivingPath(
  vehicle: any,
  path: THREE.Vector3[],
  waypointSystem?: any
): any[] {
  const results: any[] = [];

  for (const position of path) {
    // Update vehicle position
    if (vehicle.setPosition) {
      vehicle.setPosition(position);
    }

    // Check waypoints if system provided
    if (waypointSystem) {
      const result = waypointSystem.update(position);
      if (result) {
        results.push(result);
      }
    }
  }

  return results;
}

/**
 * Validates track bounds calculation
 * @param bounds - Bounds object with min/max
 * @param trackSections - Track sections array
 * @returns True if bounds seem reasonable
 */
export function validateTrackBounds(bounds: any, trackSections: any[]): boolean {
  if (!bounds || !bounds.min || !bounds.max) return false;

  // Min should be less than max in all dimensions
  if (bounds.min.x >= bounds.max.x) return false;
  if (bounds.min.y >= bounds.max.y) return false;
  if (bounds.min.z >= bounds.max.z) return false;

  // Bounds should be finite
  if (!isFiniteVector3(bounds.min) || !isFiniteVector3(bounds.max)) return false;

  return true;
}

/**
 * Calculates expected track mesh vertex count
 * @param splinePoints - Number of spline points
 * @param trackWidth - Track width
 * @returns Expected vertex count
 */
export function calculateExpectedVertexCount(splinePoints: number, trackWidth: number): number {
  // Each spline point generates 2 vertices (left and right edge)
  return splinePoints * 2;
}

/**
 * Calculates expected track mesh triangle count
 * @param splinePoints - Number of spline points
 * @returns Expected triangle count
 */
export function calculateExpectedTriangleCount(splinePoints: number): number {
  // Each segment between points generates 2 triangles (quad)
  return (splinePoints - 1) * 2;
}

/**
 * Tests waypoint sequence progression
 * @param waypoints - Array of waypoint data
 * @param vehiclePath - Array of vehicle positions
 * @returns Array of triggered waypoint IDs in order
 */
export function testWaypointProgression(
  waypoints: any[],
  vehiclePath: THREE.Vector3[]
): number[] {
  const triggeredWaypoints: number[] = [];

  for (const position of vehiclePath) {
    for (const waypoint of waypoints) {
      const distance = position.distanceTo(waypoint.position);
      if (distance < waypoint.triggerRadius && !triggeredWaypoints.includes(waypoint.id)) {
        triggeredWaypoints.push(waypoint.id);
      }
    }
  }

  return triggeredWaypoints;
}

/**
 * Validates minimap rendering setup
 * @param minimap - Minimap object
 * @returns True if minimap is properly configured
 */
export function validateMinimapSetup(minimap: any): boolean {
  if (!minimap) return false;

  // Check for camera
  if (!minimap.camera) return false;

  // Check for render target or texture
  if (!minimap.texture && !minimap.renderTarget) return false;

  // Check for size
  if (!minimap.size || minimap.size <= 0) return false;

  return true;
}

/**
 * Simulates collision between vehicle and obstacle
 * @param vehicle - Vehicle instance
 * @param obstacle - Obstacle instance
 * @returns Collision result object
 */
export function simulateObstacleCollision(vehicle: any, obstacle: any): any {
  const vehiclePos = vehicle.getPosition ? vehicle.getPosition() : new THREE.Vector3();
  const obstaclePos = obstacle.mesh?.position || new THREE.Vector3();

  const distance = vehiclePos.distanceTo(obstaclePos);
  const collisionRadius = 2; // Approximate collision radius

  if (distance < collisionRadius) {
    return {
      collided: true,
      distance,
      position: obstaclePos,
      obstacle,
    };
  }

  return {
    collided: false,
    distance,
  };
}

/**
 * Generates test surface type data
 * @param surfaceType - Type of surface (tarmac, dirt, grass, ice)
 * @returns Surface configuration object
 */
export function generateSurfaceTypeData(surfaceType: string): any {
  const surfaceConfigs = {
    tarmac: { friction: 1.0, restitution: 0.1, color: 0x333333 },
    dirt: { friction: 0.6, restitution: 0.2, color: 0x8b7355 },
    grass: { friction: 0.4, restitution: 0.15, color: 0x228b22 },
    ice: { friction: 0.2, restitution: 0.05, color: 0xccffff },
  };

  return surfaceConfigs[surfaceType as keyof typeof surfaceConfigs] || surfaceConfigs.tarmac;
}

/**
 * Validates track section data
 * @param section - Track section to validate
 * @returns True if section is valid
 */
export function validateTrackSection(section: any): boolean {
  if (!section || !section.type) return false;

  const validTypes = ['straight', 'curve', 'ramp', 'loop', 'bank'];
  if (!validTypes.includes(section.type)) return false;

  // Type-specific validation
  switch (section.type) {
    case 'straight':
    case 'ramp':
      return typeof section.length === 'number' && section.length > 0;

    case 'curve':
    case 'bank':
      return (
        typeof section.radius === 'number' &&
        section.radius > 0 &&
        typeof section.angle === 'number' &&
        section.angle > 0
      );

    case 'loop':
      return typeof section.radius === 'number' && section.radius > 0;

    default:
      return false;
  }
}

/**
 * Measures track generation performance
 * @param trackGenerator - Function that generates a track
 * @param iterations - Number of iterations to average
 * @returns Average generation time in milliseconds
 */
export function benchmarkTrackGeneration(
  trackGenerator: () => any,
  iterations: number = 10
): number {
  return benchmarkFunction(trackGenerator, iterations);
}

/**
 * Creates a mock minimap for testing
 * @param size - Minimap size in pixels
 * @returns Mock minimap object
 */
export function createMockMinimap(size: number = 512) {
  return {
    size,
    camera: new (global as any).MockOrthographicCamera(-100, 100, 100, -100, 0, 100),
    renderTarget: new (global as any).MockWebGLRenderTarget(size, size),
    texture: null as any,

    generate: vi.fn((track: any) => {
      // Mock minimap generation
      return {
        width: size,
        height: size,
      };
    }),

    drawPlayerMarker: vi.fn((position: THREE.Vector3, rotation: number) => {
      // Mock player marker drawing
    }),

    worldToScreen: vi.fn((worldPos: THREE.Vector3) => {
      return new THREE.Vector2(
        (worldPos.x + 100) / 200 * size,
        (worldPos.z + 100) / 200 * size
      );
    }),

    dispose: vi.fn(),
  };
}
