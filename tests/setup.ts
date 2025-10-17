/**
 * Test setup file for Vitest
 * Configures global test environment and mocks for Three.js, Rapier.js, and browser APIs
 */

import { vi } from 'vitest';

// ============================================================================
// THREE.JS MOCKS
// ============================================================================

// Mock HTMLCanvasElement for Three.js
class MockCanvas {
  width = 800;
  height = 600;
  style = {};

  getContext() {
    return {
      canvas: this,
      drawImage: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
      createImageData: vi.fn(),
      setTransform: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      translate: vi.fn(),
      transform: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      arc: vi.fn(),
      arcTo: vi.fn(),
      ellipse: vi.fn(),
      rect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      clip: vi.fn(),
      isPointInPath: vi.fn(),
      isPointInStroke: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      measureText: vi.fn(),
      createLinearGradient: vi.fn(),
      createRadialGradient: vi.fn(),
      createPattern: vi.fn(),
    };
  }

  getBoundingClientRect() {
    return {
      left: 0,
      top: 0,
      right: this.width,
      bottom: this.height,
      width: this.width,
      height: this.height,
      x: 0,
      y: 0,
    };
  }

  addEventListener() {}
  removeEventListener() {}
}

// Mock document.getElementById to return a mock canvas
global.document.getElementById = vi.fn((id) => {
  if (id === 'game-canvas') {
    return new MockCanvas() as any;
  }
  return null;
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  return setTimeout(() => callback(performance.now()), 16);
}) as any;

global.cancelAnimationFrame = vi.fn((id) => {
  clearTimeout(id);
});

// Mock performance.now()
global.performance.now = vi.fn(() => Date.now());

// Mock WebGL context
HTMLCanvasElement.prototype.getContext = vi.fn((contextType: string) => {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return {
      canvas: new MockCanvas(),
      getParameter: vi.fn(),
      getExtension: vi.fn(),
      createShader: vi.fn(),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(),
      getShaderInfoLog: vi.fn(),
      createProgram: vi.fn(),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(),
      useProgram: vi.fn(),
      createBuffer: vi.fn(),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      drawArrays: vi.fn(),
      clearColor: vi.fn(),
      clear: vi.fn(),
      viewport: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      blendFunc: vi.fn(),
      depthFunc: vi.fn(),
      cullFace: vi.fn(),
    };
  }
  return new MockCanvas().getContext();
}) as any;

// ============================================================================
// RAPIER.JS MOCKS
// ============================================================================

/**
 * Mock Rapier.js World for testing without actual physics engine
 * Provides deterministic behavior for unit tests
 */
class MockRapierWorld {
  private bodies: Map<number, any> = new Map();
  private colliders: Map<number, any> = new Map();
  private nextBodyId = 0;
  private nextColliderId = 0;
  public gravity = { x: 0, y: -9.81, z: 0 };

  createRigidBody(desc: any): any {
    const id = this.nextBodyId++;
    const body = {
      handle: id,
      translation: vi.fn(() => desc._translation || { x: 0, y: 0, z: 0 }),
      setTranslation: vi.fn((pos: any, wakeUp?: boolean) => {
        desc._translation = pos;
      }),
      rotation: vi.fn(() => desc._rotation || { x: 0, y: 0, z: 0, w: 1 }),
      setRotation: vi.fn((rot: any, wakeUp?: boolean) => {
        desc._rotation = rot;
      }),
      linvel: vi.fn(() => desc._linvel || { x: 0, y: 0, z: 0 }),
      setLinvel: vi.fn((vel: any, wakeUp?: boolean) => {
        desc._linvel = vel;
      }),
      angvel: vi.fn(() => desc._angvel || { x: 0, y: 0, z: 0 }),
      setAngvel: vi.fn((vel: any, wakeUp?: boolean) => {
        desc._angvel = vel;
      }),
      mass: vi.fn(() => desc._mass || 1.0),
      setAdditionalMass: vi.fn((mass: number) => {
        desc._mass = mass;
      }),
      applyImpulse: vi.fn((impulse: any, wakeUp?: boolean) => {
        // Simulate impulse by adding to velocity
        if (desc._linvel) {
          desc._linvel.x += impulse.x / (desc._mass || 1);
          desc._linvel.y += impulse.y / (desc._mass || 1);
          desc._linvel.z += impulse.z / (desc._mass || 1);
        }
      }),
      applyTorqueImpulse: vi.fn((torque: any, wakeUp?: boolean) => {
        // Simulate torque by adding to angular velocity
        if (desc._angvel) {
          desc._angvel.x += torque.x * 0.1;
          desc._angvel.y += torque.y * 0.1;
          desc._angvel.z += torque.z * 0.1;
        }
      }),
      applyForce: vi.fn((force: any, wakeUp?: boolean) => {
        // Forces are applied over time, for testing we'll track them
        if (!desc._appliedForces) desc._appliedForces = [];
        desc._appliedForces.push(force);
      }),
      applyForceAtPoint: vi.fn((force: any, point: any, wakeUp?: boolean) => {
        if (!desc._appliedForces) desc._appliedForces = [];
        desc._appliedForces.push({ force, point });
      }),
      resetForces: vi.fn((wakeUp?: boolean) => {
        desc._appliedForces = [];
      }),
      resetTorques: vi.fn((wakeUp?: boolean) => {
        desc._appliedTorques = [];
      }),
      isSleeping: vi.fn(() => false),
      wakeUp: vi.fn(() => {}),
      numColliders: vi.fn(() => 0),
      lockTranslations: vi.fn((locked: boolean, wakeUp?: boolean) => {
        desc._translationsLocked = locked;
      }),
      lockRotations: vi.fn((locked: boolean, wakeUp?: boolean) => {
        desc._rotationsLocked = locked;
      }),
      setEnabledRotations: vi.fn((x: boolean, y: boolean, z: boolean, wakeUp?: boolean) => {
        desc._enabledRotations = { x, y, z };
      }),
      setCcdEnabled: vi.fn((enabled: boolean) => {
        desc._ccdEnabled = enabled;
      }),
      setGravityScale: vi.fn((scale: number, wakeUp?: boolean) => {
        desc._gravityScale = scale;
      }),
      gravityScale: vi.fn(() => desc._gravityScale || 1.0),
      isFixed: vi.fn(() => desc._type === 'fixed'),
      isDynamic: vi.fn(() => desc._type === 'dynamic'),
    };
    this.bodies.set(id, body);
    return body;
  }

  createCollider(desc: any, parent?: any): any {
    const id = this.nextColliderId++;
    const collider = {
      handle: id,
      parent: parent || null,
      shape: desc._shape || 'cuboid',
      friction: desc._friction || 0.5,
      restitution: desc._restitution || 0.3,
      density: desc._density || 1.0,
      setFriction: vi.fn((f: number) => {
        desc._friction = f;
      }),
      setRestitution: vi.fn((r: number) => {
        desc._restitution = r;
      }),
      isSensor: vi.fn(() => desc._isSensor || false),
      setSensor: vi.fn((sensor: boolean) => {
        desc._isSensor = sensor;
      }),
    };
    this.colliders.set(id, collider);
    return collider;
  }

  removeRigidBody(body: any): void {
    this.bodies.delete(body.handle);
  }

  removeCollider(collider: any): void {
    this.colliders.delete(collider.handle);
  }

  step(): void {
    // Mock physics step - does nothing in tests
  }

  castRay(
    ray: any,
    maxToi: number,
    solid: boolean,
    filterFlags?: any,
    filterGroups?: any,
    filterExcludeCollider?: any,
    filterExcludeRigidBody?: any,
    filterPredicate?: any
  ): any | null {
    // Mock raycast - can be overridden in tests
    // Returns a hit at 0.3 meters down by default (ground contact)
    if ((this as any)._raycastResults) {
      const result = (this as any)._raycastResults.shift();
      return result !== undefined ? result : null;
    }

    // Default: ground contact at suspension rest length
    return {
      toi: 0.3,
      normal: { x: 0, y: 1, z: 0 },
      collider: this.getCollider(0),
    };
  }

  /**
   * Set custom raycast results for testing
   * @param results - Array of raycast results (null = no hit)
   */
  setRaycastResults(results: Array<any | null>): void {
    (this as any)._raycastResults = [...results];
  }

  /**
   * Clear custom raycast results
   */
  clearRaycastResults(): void {
    delete (this as any)._raycastResults;
  }

  castShape(
    shapePos: any,
    shapeRot: any,
    shapeVel: any,
    shape: any,
    maxToi: number,
    filterFlags?: any,
    filterGroups?: any,
    filterExcludeCollider?: any,
    filterExcludeRigidBody?: any,
    filterPredicate?: any
  ): any | null {
    return null;
  }

  getRigidBody(handle: number): any | null {
    return this.bodies.get(handle) || null;
  }

  getCollider(handle: number): any | null {
    return this.colliders.get(handle) || null;
  }

  /**
   * Set gravity for testing different environments
   * @param gravity - Gravity vector
   */
  setGravity(gravity: { x: number; y: number; z: number }): void {
    this.gravity = gravity;
  }

  /**
   * Get current gravity
   */
  getGravity(): { x: number; y: number; z: number } {
    return this.gravity;
  }
}

/**
 * Mock RigidBodyDesc for creating rigid bodies in tests
 */
class MockRigidBodyDesc {
  _translation = { x: 0, y: 0, z: 0 };
  _rotation = { x: 0, y: 0, z: 0, w: 1 };
  _linvel = { x: 0, y: 0, z: 0 };
  _angvel = { x: 0, y: 0, z: 0 };
  _mass = 1.0;
  _type = 'dynamic';

  static dynamic(): MockRigidBodyDesc {
    const desc = new MockRigidBodyDesc();
    desc._type = 'dynamic';
    return desc;
  }

  static fixed(): MockRigidBodyDesc {
    const desc = new MockRigidBodyDesc();
    desc._type = 'fixed';
    return desc;
  }

  static kinematicPositionBased(): MockRigidBodyDesc {
    const desc = new MockRigidBodyDesc();
    desc._type = 'kinematicPositionBased';
    return desc;
  }

  setTranslation(x: number, y: number, z: number): this {
    this._translation = { x, y, z };
    return this;
  }

  setRotation(quat: any): this {
    this._rotation = quat;
    return this;
  }

  setLinvel(x: number, y: number, z: number): this {
    this._linvel = { x, y, z };
    return this;
  }

  setAdditionalMass(mass: number): this {
    this._mass = mass;
    return this;
  }

  setLinearDamping(damping: number): this {
    (this as any)._linearDamping = damping;
    return this;
  }

  setAngularDamping(damping: number): this {
    (this as any)._angularDamping = damping;
    return this;
  }

  setCanSleep(canSleep: boolean): this {
    (this as any)._canSleep = canSleep;
    return this;
  }
}

/**
 * Mock ColliderDesc for creating colliders in tests
 */
class MockColliderDesc {
  _shape = 'cuboid';
  _friction = 0.5;
  _restitution = 0.3;
  _density = 1.0;
  _dimensions: any = null;

  static cuboid(hx: number, hy: number, hz: number): MockColliderDesc {
    const desc = new MockColliderDesc();
    desc._shape = 'cuboid';
    desc._dimensions = { hx, hy, hz };
    return desc;
  }

  static ball(radius: number): MockColliderDesc {
    const desc = new MockColliderDesc();
    desc._shape = 'ball';
    desc._dimensions = { radius };
    return desc;
  }

  static capsule(halfHeight: number, radius: number): MockColliderDesc {
    const desc = new MockColliderDesc();
    desc._shape = 'capsule';
    desc._dimensions = { halfHeight, radius };
    return desc;
  }

  static cylinder(halfHeight: number, radius: number): MockColliderDesc {
    const desc = new MockColliderDesc();
    desc._shape = 'cylinder';
    desc._dimensions = { halfHeight, radius };
    return desc;
  }

  setFriction(f: number): this {
    this._friction = f;
    return this;
  }

  setRestitution(r: number): this {
    this._restitution = r;
    return this;
  }

  setDensity(d: number): this {
    this._density = d;
    return this;
  }

  setCollisionGroups(groups: number): this {
    (this as any)._collisionGroups = groups;
    return this;
  }
}

/**
 * Mock Ray for raycasting in tests
 */
class MockRay {
  origin: any;
  dir: any;

  constructor(origin: any, dir: any) {
    this.origin = origin;
    this.dir = dir;
  }
}

// Mock Rapier module
vi.mock('@dimforge/rapier3d-compat', () => ({
  default: {
    init: vi.fn(async () => Promise.resolve()),
    World: MockRapierWorld,
    RigidBodyDesc: MockRigidBodyDesc,
    ColliderDesc: MockColliderDesc,
    Ray: MockRay,
  },
}));

// ============================================================================
// BROWSER API MOCKS
// ============================================================================

// Mock window.addEventListener/removeEventListener with proper event handling
const windowEventListeners = new Map<string, Set<EventListener>>();

(global.window as any).addEventListener = vi.fn((type: string, listener: EventListener) => {
  if (!windowEventListeners.has(type)) {
    windowEventListeners.set(type, new Set());
  }
  windowEventListeners.get(type)!.add(listener);
});

(global.window as any).removeEventListener = vi.fn((type: string, listener: EventListener) => {
  const listeners = windowEventListeners.get(type);
  if (listeners) {
    listeners.delete(listener);
  }
});

// Override window.dispatchEvent to actually call registered listeners
const originalDispatchEvent = global.window.dispatchEvent.bind(global.window);
(global.window as any).dispatchEvent = vi.fn((event: Event) => {
  const listeners = windowEventListeners.get(event.type);
  if (listeners) {
    listeners.forEach((listener) => {
      if (typeof listener === 'function') {
        listener(event);
      } else {
        listener.handleEvent(event);
      }
    });
  }
  return true;
});

// Mock document visibility API
Object.defineProperty(document, 'hidden', {
  writable: true,
  value: false,
});

global.document.addEventListener = vi.fn();
global.document.removeEventListener = vi.fn();

// Mock Gamepad API
Object.defineProperty(navigator, 'getGamepads', {
  writable: true,
  value: vi.fn(() => []),
});

// Mock GamepadEvent
(global as any).GamepadEvent = class GamepadEvent extends Event {
  gamepad: Gamepad;

  constructor(type: string, eventInitDict: { gamepad: Gamepad }) {
    super(type);
    this.gamepad = eventInitDict.gamepad;
  }
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// ============================================================================
// CONSOLE MOCKS
// ============================================================================

// Console spy setup for test verification
global.console.log = vi.fn();
global.console.warn = vi.fn();
global.console.error = vi.fn();

// ============================================================================
// PHASE 3: THREE.JS GEOMETRY MOCKS (Track System)
// ============================================================================

/**
 * Mock BufferGeometry for track mesh generation testing
 */
class MockBufferGeometry {
  attributes: Map<string, any> = new Map();
  index: any = null;
  boundingBox: any = null;
  boundingSphere: any = null;

  setAttribute(name: string, attribute: any): this {
    this.attributes.set(name, attribute);
    return this;
  }

  getAttribute(name: string): any {
    return this.attributes.get(name);
  }

  deleteAttribute(name: string): this {
    this.attributes.delete(name);
    return this;
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  setIndex(index: any): this {
    this.index = index;
    return this;
  }

  computeVertexNormals(): void {
    // Mock normal computation - does nothing in tests
  }

  computeBoundingBox(): void {
    // Mock bounding box computation
    this.boundingBox = {
      min: { x: -10, y: 0, z: -10 },
      max: { x: 10, y: 1, z: 10 },
    };
  }

  computeBoundingSphere(): void {
    // Mock bounding sphere computation
    this.boundingSphere = {
      center: { x: 0, y: 0.5, z: 0 },
      radius: 15,
    };
  }

  dispose(): void {
    this.attributes.clear();
    this.index = null;
  }

  clone(): MockBufferGeometry {
    const cloned = new MockBufferGeometry();
    this.attributes.forEach((value, key) => {
      cloned.setAttribute(key, value);
    });
    cloned.index = this.index;
    return cloned;
  }
}

/**
 * Mock BufferAttribute for geometry attribute testing
 */
class MockBufferAttribute {
  array: Float32Array | Uint32Array | Uint16Array;
  itemSize: number;
  count: number;
  private _needsUpdate: boolean = false;

  constructor(array: Float32Array | Uint32Array | Uint16Array, itemSize: number) {
    this.array = array;
    this.itemSize = itemSize;
    this.count = array.length / itemSize;
  }

  get needsUpdate(): boolean {
    return this._needsUpdate;
  }

  set needsUpdate(value: boolean) {
    this._needsUpdate = value;
  }

  clone(): MockBufferAttribute {
    return new MockBufferAttribute(this.array.slice() as any, this.itemSize);
  }
}

/**
 * Mock Float32BufferAttribute
 */
class MockFloat32BufferAttribute extends MockBufferAttribute {
  constructor(array: Float32Array | number[], itemSize: number) {
    const typedArray = array instanceof Float32Array ? array : new Float32Array(array);
    super(typedArray, itemSize);
  }
}

/**
 * Mock Uint32BufferAttribute
 */
class MockUint32BufferAttribute extends MockBufferAttribute {
  constructor(array: Uint32Array | number[], itemSize: number) {
    const typedArray = array instanceof Uint32Array ? array : new Uint32Array(array);
    super(typedArray, itemSize);
  }
}

/**
 * Mock Uint16BufferAttribute
 */
class MockUint16BufferAttribute extends MockBufferAttribute {
  constructor(array: Uint16Array | number[], itemSize: number) {
    const typedArray = array instanceof Uint16Array ? array : new Uint16Array(array);
    super(typedArray, itemSize);
  }
}

/**
 * Mock CatmullRomCurve3 for track spline generation
 */
class MockCatmullRomCurve3 {
  points: any[];
  closed: boolean;
  curveType: string;
  tension: number;

  constructor(points: any[] = [], closed: boolean = false, curveType: string = 'centripetal', tension: number = 0.5) {
    this.points = points;
    this.closed = closed;
    this.curveType = curveType;
    this.tension = tension;
  }

  /**
   * Get points along the curve
   * @param divisions - Number of points to generate
   * @returns Array of Vector3 points
   */
  getPoints(divisions: number = 50): any[] {
    if (this.points.length < 2) return [];

    const points: any[] = [];
    const segments = this.closed ? divisions : divisions;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = this.getPoint(t);
      points.push(point);
    }

    return points;
  }

  /**
   * Get point at parameter t (0 to 1)
   * @param t - Parameter (0 = start, 1 = end)
   * @returns Vector3 point on curve
   */
  getPoint(t: number): any {
    if (this.points.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }

    // Simple linear interpolation for testing
    // Real CatmullRom would use cubic interpolation
    const scaledT = t * (this.points.length - 1);
    const index = Math.floor(scaledT);
    const localT = scaledT - index;

    if (index >= this.points.length - 1) {
      return this.points[this.points.length - 1];
    }

    const p0 = this.points[index];
    const p1 = this.points[index + 1];

    return {
      x: p0.x + (p1.x - p0.x) * localT,
      y: p0.y + (p1.y - p0.y) * localT,
      z: p0.z + (p1.z - p0.z) * localT,
    };
  }

  /**
   * Get tangent at parameter t
   * @param t - Parameter (0 = start, 1 = end)
   * @returns Normalized tangent vector
   */
  getTangent(t: number): any {
    const epsilon = 0.001;
    const t1 = Math.max(0, t - epsilon);
    const t2 = Math.min(1, t + epsilon);

    const p1 = this.getPoint(t1);
    const p2 = this.getPoint(t2);

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;

    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (length === 0) {
      return { x: 0, y: 0, z: 1 };
    }

    return {
      x: dx / length,
      y: dy / length,
      z: dz / length,
    };
  }

  /**
   * Get length of curve
   * @returns Approximate curve length
   */
  getLength(): number {
    let length = 0;
    const divisions = 100;

    for (let i = 0; i < divisions; i++) {
      const p1 = this.getPoint(i / divisions);
      const p2 = this.getPoint((i + 1) / divisions);

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;

      length += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    return length;
  }
}

/**
 * Mock TextureLoader for track texture loading
 */
class MockTextureLoader {
  load(url: string, onLoad?: (texture: any) => void, onProgress?: (event: any) => void, onError?: (error: any) => void): any {
    const mockTexture = {
      image: {
        width: 512,
        height: 512,
      },
      needsUpdate: true,
      wrapS: 1000, // THREE.RepeatWrapping
      wrapT: 1000,
      minFilter: 1008, // THREE.LinearMipmapLinearFilter
      magFilter: 1006, // THREE.LinearFilter
      dispose: vi.fn(),
    };

    if (onLoad) {
      setTimeout(() => onLoad(mockTexture), 0);
    }

    return mockTexture;
  }

  loadAsync(url: string): Promise<any> {
    return new Promise((resolve) => {
      resolve(this.load(url));
    });
  }
}

/**
 * Mock OrthographicCamera for minimap rendering
 */
class MockOrthographicCamera {
  left: number;
  right: number;
  top: number;
  bottom: number;
  near: number;
  far: number;
  position: any = { x: 0, y: 0, z: 0, set: vi.fn() };
  rotation: any = { x: 0, y: 0, z: 0 };
  quaternion: any = { x: 0, y: 0, z: 0, w: 1 };

  constructor(left: number, right: number, top: number, bottom: number, near: number, far: number) {
    this.left = left;
    this.right = right;
    this.top = top;
    this.bottom = bottom;
    this.near = near;
    this.far = far;
  }

  lookAt(x: number | any, y?: number, z?: number): void {
    // Mock lookAt - does nothing in tests
  }

  updateProjectionMatrix(): void {
    // Mock projection matrix update
  }
}

/**
 * Mock WebGLRenderTarget for minimap texture generation
 */
class MockWebGLRenderTarget {
  width: number;
  height: number;
  texture: any;

  constructor(width: number, height: number, options?: any) {
    this.width = width;
    this.height = height;
    this.texture = {
      image: {
        width,
        height,
      },
      needsUpdate: true,
      dispose: vi.fn(),
    };
  }

  dispose(): void {
    this.texture.dispose();
  }
}

// Extend Rapier mock with trimesh support for track collision
class MockTrimeshColliderDesc extends MockColliderDesc {
  static trimesh(vertices: Float32Array, indices: Uint32Array): MockTrimeshColliderDesc {
    const desc = new MockTrimeshColliderDesc() as any;
    desc._shape = 'trimesh';
    desc._dimensions = { vertices, indices };
    return desc;
  }

  static cone(halfHeight: number, radius: number): MockColliderDesc {
    const desc = new MockColliderDesc();
    desc._shape = 'cone';
    desc._dimensions = { halfHeight, radius };
    return desc;
  }
}

// Add trimesh to Rapier mock
(MockColliderDesc as any).trimesh = MockTrimeshColliderDesc.trimesh;
(MockColliderDesc as any).cone = MockTrimeshColliderDesc.cone;

// Export mocks for use in tests (via global for now)
(global as any).MockBufferGeometry = MockBufferGeometry;
(global as any).MockBufferAttribute = MockBufferAttribute;
(global as any).MockFloat32BufferAttribute = MockFloat32BufferAttribute;
(global as any).MockUint32BufferAttribute = MockUint32BufferAttribute;
(global as any).MockUint16BufferAttribute = MockUint16BufferAttribute;
(global as any).MockCatmullRomCurve3 = MockCatmullRomCurve3;
(global as any).MockTextureLoader = MockTextureLoader;
(global as any).MockOrthographicCamera = MockOrthographicCamera;
(global as any).MockWebGLRenderTarget = MockWebGLRenderTarget;
