/**
 * Test fixtures for Phase 3 (Track System & Environment) testing
 * Provides pre-configured track data, waypoint configurations, and obstacle placements
 */

import * as THREE from 'three';

// ============================================================================
// TRACK SECTION FIXTURES
// ============================================================================

/**
 * Simple straight track section for basic testing
 */
export const straightSectionData = {
  type: 'straight' as const,
  length: 100,
};

/**
 * 90-degree curve section
 */
export const curve90SectionData = {
  type: 'curve' as const,
  radius: 50,
  angle: 90,
};

/**
 * 180-degree hairpin turn
 */
export const hairpinSectionData = {
  type: 'curve' as const,
  radius: 30,
  angle: 180,
};

/**
 * Ramp section (upward slope)
 */
export const rampSectionData = {
  type: 'ramp' as const,
  length: 30,
  height: 10,
};

/**
 * Full loop section (360 degrees vertical)
 */
export const loopSectionData = {
  type: 'loop' as const,
  radius: 15,
};

/**
 * Banked curve section
 */
export const bankedCurveSectionData = {
  type: 'bank' as const,
  radius: 40,
  angle: 90,
  banking: 30, // degrees
};

// ============================================================================
// COMPLETE TRACK DATA FIXTURES
// ============================================================================

/**
 * Minimal test track (straight line only)
 */
export const minimalTrackData = {
  name: 'Test Track - Minimal',
  width: 10,
  sections: [
    { type: 'straight' as const, length: 200 },
  ],
  waypoints: [
    {
      id: 0,
      position: new THREE.Vector3(0, 0, 0),
      direction: new THREE.Vector3(0, 0, 1),
      triggerRadius: 5,
      isCheckpoint: false,
    },
    {
      id: 1,
      position: new THREE.Vector3(0, 0, 100),
      direction: new THREE.Vector3(0, 0, 1),
      triggerRadius: 5,
      isCheckpoint: true,
      timeBonus: 30,
    },
    {
      id: 2,
      position: new THREE.Vector3(0, 0, 200),
      direction: new THREE.Vector3(0, 0, 1),
      triggerRadius: 5,
      isCheckpoint: false,
    },
  ],
  spawnPoint: {
    position: [0, 2, -10],
    rotation: [0, 0, 0, 1],
  },
};

/**
 * Simple oval track with curves
 */
export const ovalTrackData = {
  name: 'Test Track - Oval',
  width: 12,
  sections: [
    { type: 'straight' as const, length: 150 },
    { type: 'curve' as const, radius: 50, angle: 180 },
    { type: 'straight' as const, length: 150 },
    { type: 'curve' as const, radius: 50, angle: 180 },
  ],
  waypoints: [
    {
      id: 0,
      position: new THREE.Vector3(0, 0, 0),
      direction: new THREE.Vector3(0, 0, 1),
      triggerRadius: 5,
      isCheckpoint: false,
    },
    {
      id: 1,
      position: new THREE.Vector3(0, 0, 75),
      direction: new THREE.Vector3(0, 0, 1),
      triggerRadius: 5,
      isCheckpoint: true,
      timeBonus: 30,
    },
    {
      id: 2,
      position: new THREE.Vector3(50, 0, 150),
      direction: new THREE.Vector3(1, 0, 0),
      triggerRadius: 5,
      isCheckpoint: false,
    },
    {
      id: 3,
      position: new THREE.Vector3(0, 0, 225),
      direction: new THREE.Vector3(0, 0, -1),
      triggerRadius: 5,
      isCheckpoint: true,
      timeBonus: 30,
    },
  ],
  spawnPoint: {
    position: [0, 2, -10],
    rotation: [0, 0, 0, 1],
  },
};

/**
 * Stunt track with loop and ramp
 */
export const stuntTrackData = {
  name: 'Test Track - Stunt',
  width: 10,
  sections: [
    { type: 'straight' as const, length: 100 },
    { type: 'ramp' as const, length: 30, height: 10 },
    { type: 'straight' as const, length: 50 },
    { type: 'loop' as const, radius: 15 },
    { type: 'straight' as const, length: 80 },
    { type: 'bank' as const, radius: 40, angle: 180, banking: 30 },
    { type: 'straight' as const, length: 100 },
  ],
  waypoints: [
    {
      id: 0,
      position: new THREE.Vector3(0, 0, 0),
      direction: new THREE.Vector3(0, 0, 1),
      triggerRadius: 5,
      isCheckpoint: false,
    },
    {
      id: 1,
      position: new THREE.Vector3(0, 0, 100),
      direction: new THREE.Vector3(0, 0, 1),
      triggerRadius: 5,
      isCheckpoint: true,
      timeBonus: 30,
    },
    {
      id: 2,
      position: new THREE.Vector3(0, 10, 130),
      direction: new THREE.Vector3(0, 0, 1),
      triggerRadius: 5,
      isCheckpoint: false,
    },
    {
      id: 3,
      position: new THREE.Vector3(0, 0, 250),
      direction: new THREE.Vector3(0, 0, 1),
      triggerRadius: 5,
      isCheckpoint: true,
      timeBonus: 30,
    },
  ],
  spawnPoint: {
    position: [0, 2, -10],
    rotation: [0, 0, 0, 1],
  },
};

/**
 * Complex track with multiple surface types
 */
export const multiSurfaceTrackData = {
  name: 'Test Track - Multi-Surface',
  width: 10,
  sections: [
    { type: 'straight' as const, length: 100, surfaceType: 'tarmac' },
    { type: 'curve' as const, radius: 40, angle: 90, surfaceType: 'dirt' },
    { type: 'straight' as const, length: 80, surfaceType: 'grass' },
    { type: 'curve' as const, radius: 40, angle: 90, surfaceType: 'tarmac' },
  ],
  waypoints: [
    {
      id: 0,
      position: new THREE.Vector3(0, 0, 0),
      direction: new THREE.Vector3(0, 0, 1),
      triggerRadius: 5,
      isCheckpoint: false,
    },
    {
      id: 1,
      position: new THREE.Vector3(0, 0, 100),
      direction: new THREE.Vector3(0, 0, 1),
      triggerRadius: 5,
      isCheckpoint: true,
      timeBonus: 30,
    },
  ],
  spawnPoint: {
    position: [0, 2, -10],
    rotation: [0, 0, 0, 1],
  },
};

// ============================================================================
// WAYPOINT FIXTURES
// ============================================================================

/**
 * Standard waypoint at origin
 */
export const standardWaypoint = {
  id: 0,
  position: new THREE.Vector3(0, 0, 0),
  direction: new THREE.Vector3(0, 0, 1),
  triggerRadius: 5,
  isCheckpoint: false,
};

/**
 * Checkpoint waypoint with time bonus
 */
export const checkpointWaypoint = {
  id: 1,
  position: new THREE.Vector3(0, 0, 100),
  direction: new THREE.Vector3(0, 0, 1),
  triggerRadius: 5,
  isCheckpoint: true,
  timeBonus: 30,
};

/**
 * Waypoint on elevated section
 */
export const elevatedWaypoint = {
  id: 2,
  position: new THREE.Vector3(0, 10, 150),
  direction: new THREE.Vector3(0, 0, 1),
  triggerRadius: 5,
  isCheckpoint: false,
};

/**
 * Waypoint with tight trigger radius (for precise timing)
 */
export const tightWaypoint = {
  id: 3,
  position: new THREE.Vector3(0, 0, 200),
  direction: new THREE.Vector3(0, 0, 1),
  triggerRadius: 2,
  isCheckpoint: true,
  timeBonus: 50,
};

/**
 * Waypoint array for full lap test
 */
export const fullLapWaypoints = [
  {
    id: 0,
    position: new THREE.Vector3(0, 0, 0),
    direction: new THREE.Vector3(0, 0, 1),
    triggerRadius: 5,
    isCheckpoint: false,
  },
  {
    id: 1,
    position: new THREE.Vector3(0, 0, 100),
    direction: new THREE.Vector3(0, 0, 1),
    triggerRadius: 5,
    isCheckpoint: true,
    timeBonus: 30,
  },
  {
    id: 2,
    position: new THREE.Vector3(0, 0, 200),
    direction: new THREE.Vector3(0, 0, 1),
    triggerRadius: 5,
    isCheckpoint: false,
  },
  {
    id: 3,
    position: new THREE.Vector3(0, 0, 300),
    direction: new THREE.Vector3(0, 0, 1),
    triggerRadius: 5,
    isCheckpoint: true,
    timeBonus: 30,
  },
  {
    id: 4,
    position: new THREE.Vector3(0, 0, 400),
    direction: new THREE.Vector3(0, 0, 1),
    triggerRadius: 5,
    isCheckpoint: false,
  },
];

// ============================================================================
// OBSTACLE FIXTURES
// ============================================================================

/**
 * Cone obstacle
 */
export const coneObstacle = {
  type: 'cone' as const,
  position: new THREE.Vector3(5, 0, 50),
  rotation: new THREE.Quaternion(),
  scale: new THREE.Vector3(1, 1, 1),
};

/**
 * Barrier obstacle
 */
export const barrierObstacle = {
  type: 'barrier' as const,
  position: new THREE.Vector3(10, 0, 100),
  rotation: new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    Math.PI / 4
  ),
  scale: new THREE.Vector3(1, 1, 1),
};

/**
 * Tire wall obstacle
 */
export const tireWallObstacle = {
  type: 'tire_wall' as const,
  position: new THREE.Vector3(-8, 0, 150),
  rotation: new THREE.Quaternion(),
  scale: new THREE.Vector3(1, 1, 1),
};

/**
 * Array of obstacles for multi-obstacle testing
 */
export const obstacleArray = [
  {
    type: 'cone' as const,
    position: new THREE.Vector3(5, 0, 50),
    rotation: new THREE.Quaternion(),
    scale: new THREE.Vector3(1, 1, 1),
  },
  {
    type: 'cone' as const,
    position: new THREE.Vector3(-5, 0, 50),
    rotation: new THREE.Quaternion(),
    scale: new THREE.Vector3(1, 1, 1),
  },
  {
    type: 'barrier' as const,
    position: new THREE.Vector3(0, 0, 100),
    rotation: new THREE.Quaternion(),
    scale: new THREE.Vector3(1, 1, 1),
  },
  {
    type: 'tire_wall' as const,
    position: new THREE.Vector3(8, 0, 150),
    rotation: new THREE.Quaternion(),
    scale: new THREE.Vector3(1, 1, 1),
  },
];

// ============================================================================
// SURFACE TYPE FIXTURES
// ============================================================================

/**
 * Surface type definitions with friction coefficients
 */
export const surfaceTypes = {
  tarmac: {
    friction: 1.0,
    restitution: 0.1,
    color: 0x333333,
    name: 'Tarmac',
  },
  dirt: {
    friction: 0.6,
    restitution: 0.2,
    color: 0x8b7355,
    name: 'Dirt',
  },
  grass: {
    friction: 0.4,
    restitution: 0.15,
    color: 0x228b22,
    name: 'Grass',
  },
  ice: {
    friction: 0.2,
    restitution: 0.05,
    color: 0xccffff,
    name: 'Ice',
  },
};

/**
 * Surface type array for iteration testing
 */
export const allSurfaceTypes = Object.keys(surfaceTypes);

// ============================================================================
// SPLINE GENERATION FIXTURES
// ============================================================================

/**
 * Simple 3-point spline for basic testing
 */
export const simpleSplinePoints = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, 50),
  new THREE.Vector3(0, 0, 100),
];

/**
 * Curved spline points (quarter circle)
 */
export const curvedSplinePoints = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(25, 0, 25),
  new THREE.Vector3(50, 0, 50),
];

/**
 * Elevated spline points (ramp)
 */
export const elevatedSplinePoints = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 5, 15),
  new THREE.Vector3(0, 10, 30),
];

/**
 * Loop spline points (vertical circle)
 */
export const loopSplinePoints = Array.from({ length: 20 }, (_, i) => {
  const angle = (i / 20) * Math.PI * 2;
  const radius = 15;
  return new THREE.Vector3(
    0,
    radius * (1 - Math.cos(angle)),
    radius * Math.sin(angle)
  );
});

/**
 * Complex spline with multiple curves
 */
export const complexSplinePoints = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, 50),
  new THREE.Vector3(25, 0, 75),
  new THREE.Vector3(50, 0, 75),
  new THREE.Vector3(75, 0, 50),
  new THREE.Vector3(75, 0, 0),
  new THREE.Vector3(50, 0, -25),
  new THREE.Vector3(25, 0, -25),
  new THREE.Vector3(0, 0, 0),
];

// ============================================================================
// MINIMAP FIXTURES
// ============================================================================

/**
 * Minimap configuration for testing
 */
export const minimapConfig = {
  size: 512,
  trackColor: 0x333333,
  playerColor: 0x00ff00,
  waypointColor: 0xffff00,
  backgroundColor: 0x000000,
  opacity: 0.8,
};

/**
 * Minimap bounds for testing
 */
export const minimapBounds = {
  min: new THREE.Vector3(-100, 0, -100),
  max: new THREE.Vector3(100, 0, 300),
};

// ============================================================================
// COLLISION MESH FIXTURES
// ============================================================================

/**
 * Simple box collision mesh data
 */
export const boxCollisionMeshData = {
  vertices: new Float32Array([
    // Front face
    -5, 0, 5,
    5, 0, 5,
    5, 0, -5,
    -5, 0, -5,
    // Back face
    -5, 1, 5,
    5, 1, 5,
    5, 1, -5,
    -5, 1, -5,
  ]),
  indices: new Uint32Array([
    // Bottom
    0, 1, 2,
    0, 2, 3,
    // Top
    4, 5, 6,
    4, 6, 7,
    // Sides
    0, 4, 5,
    0, 5, 1,
    1, 5, 6,
    1, 6, 2,
    2, 6, 7,
    2, 7, 3,
    3, 7, 4,
    3, 4, 0,
  ]),
};

/**
 * Track segment collision mesh (flat plane)
 */
export const trackSegmentCollisionMeshData = {
  vertices: new Float32Array([
    -5, 0, 0,
    5, 0, 0,
    5, 0, 10,
    -5, 0, 10,
  ]),
  indices: new Uint32Array([
    0, 1, 2,
    0, 2, 3,
  ]),
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a deep copy of track data for mutation in tests
 * @param trackData - Source track data
 * @returns Deep copy of track data
 */
export function cloneTrackData(trackData: typeof minimalTrackData) {
  return JSON.parse(JSON.stringify(trackData, (key, value) => {
    // Handle THREE.Vector3 serialization
    if (value instanceof THREE.Vector3) {
      return { x: value.x, y: value.y, z: value.z };
    }
    // Handle THREE.Quaternion serialization
    if (value instanceof THREE.Quaternion) {
      return { x: value.x, y: value.y, z: value.z, w: value.w };
    }
    return value;
  }));
}

/**
 * Validates track data structure
 * @param trackData - Track data to validate
 * @returns True if valid, false otherwise
 */
export function isValidTrackData(trackData: any): boolean {
  if (!trackData) return false;

  // Check required fields
  if (
    typeof trackData.name !== 'string' ||
    typeof trackData.width !== 'number' ||
    !Array.isArray(trackData.sections) ||
    !Array.isArray(trackData.waypoints)
  ) {
    return false;
  }

  // Check sections array
  if (trackData.sections.length === 0) return false;

  // Check each section has required fields
  for (const section of trackData.sections) {
    if (!section.type) return false;
  }

  // Check waypoints array
  for (const waypoint of trackData.waypoints) {
    if (
      typeof waypoint.id !== 'number' ||
      !waypoint.position ||
      !waypoint.direction ||
      typeof waypoint.triggerRadius !== 'number'
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Generates waypoints along a straight path
 * @param start - Start position
 * @param end - End position
 * @param count - Number of waypoints
 * @param checkpointInterval - Every Nth waypoint is a checkpoint (0 = none)
 * @returns Array of waypoint data
 */
export function generateStraightWaypoints(
  start: THREE.Vector3,
  end: THREE.Vector3,
  count: number,
  checkpointInterval: number = 0
): any[] {
  const waypoints: any[] = [];
  const direction = new THREE.Vector3().subVectors(end, start).normalize();

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const position = new THREE.Vector3().lerpVectors(start, end, t);
    const isCheckpoint = checkpointInterval > 0 && i % checkpointInterval === 0 && i > 0;

    waypoints.push({
      id: i,
      position,
      direction: direction.clone(),
      triggerRadius: 5,
      isCheckpoint,
      ...(isCheckpoint && { timeBonus: 30 }),
    });
  }

  return waypoints;
}

/**
 * Generates random obstacles along a path
 * @param count - Number of obstacles
 * @param minZ - Minimum Z position
 * @param maxZ - Maximum Z position
 * @param trackWidth - Width of track (obstacles placed at edges)
 * @returns Array of obstacle data
 */
export function generateRandomObstacles(
  count: number,
  minZ: number,
  maxZ: number,
  trackWidth: number = 10
): any[] {
  const obstacles: any[] = [];
  const types = ['cone', 'barrier', 'tire_wall'] as const;

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const side = Math.random() < 0.5 ? -1 : 1;
    const z = minZ + Math.random() * (maxZ - minZ);

    obstacles.push({
      type,
      position: new THREE.Vector3(side * trackWidth / 2, 0, z),
      rotation: new THREE.Quaternion(),
      scale: new THREE.Vector3(1, 1, 1),
    });
  }

  return obstacles;
}

/**
 * Validates spline point array
 * @param points - Array of Vector3 points
 * @returns True if valid for spline generation
 */
export function isValidSplinePoints(points: THREE.Vector3[]): boolean {
  if (!Array.isArray(points) || points.length < 2) return false;

  for (const point of points) {
    if (!(point instanceof THREE.Vector3)) return false;
    if (!isFinite(point.x) || !isFinite(point.y) || !isFinite(point.z)) return false;
  }

  return true;
}

/**
 * Calculates approximate track length from sections
 * @param sections - Array of track sections
 * @returns Approximate total track length in meters
 */
export function calculateTrackLength(sections: any[]): number {
  let length = 0;

  for (const section of sections) {
    if (section.type === 'straight' || section.type === 'ramp') {
      length += section.length || 0;
    } else if (section.type === 'curve' || section.type === 'bank') {
      // Arc length = radius * angle (in radians)
      const radius = section.radius || 0;
      const angle = ((section.angle || 0) * Math.PI) / 180;
      length += radius * angle;
    } else if (section.type === 'loop') {
      // Full circle circumference
      const radius = section.radius || 0;
      length += 2 * Math.PI * radius;
    }
  }

  return length;
}

/**
 * Gets surface type for a given position along track
 * @param position - Position to check
 * @param trackData - Track data with surface type info
 * @returns Surface type string
 */
export function getSurfaceTypeAtPosition(
  position: THREE.Vector3,
  trackData: any
): string {
  // Simplified version for testing - just returns first section's surface type
  // Real implementation would need to calculate which section the position is in
  const firstSection = trackData.sections[0];
  return firstSection.surfaceType || 'tarmac';
}
