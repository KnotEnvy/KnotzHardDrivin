# Phase 3 Test Infrastructure - Track System & Environment

**Author**: Test Engineering Team
**Date**: October 10, 2025
**Status**: Ready for Development
**Phase**: Phase 3 (Track System & Geometry)

---

## Overview

This document describes the comprehensive test infrastructure prepared for Phase 3 development. All necessary test fixtures, mocks, and utilities are in place to enable developers to write tests immediately alongside implementation.

---

## Test Infrastructure Components

### 1. Track Fixtures (`tests/fixtures/trackFixtures.ts`)

**Purpose**: Provides pre-configured track data, sections, waypoints, obstacles, and splines for consistent testing.

**Key Fixtures**:

#### Track Section Fixtures
- `straightSectionData` - Simple straight track segment
- `curve90SectionData` - 90-degree curve
- `hairpinSectionData` - 180-degree hairpin turn
- `rampSectionData` - Upward slope
- `loopSectionData` - Full 360-degree vertical loop
- `bankedCurveSectionData` - Banked curve section

#### Complete Track Data
- `minimalTrackData` - Straight line only (200m)
- `ovalTrackData` - Simple oval with curves
- `stuntTrackData` - Complex track with loop and ramp
- `multiSurfaceTrackData` - Track with multiple surface types

#### Waypoint Fixtures
- `standardWaypoint` - Basic waypoint
- `checkpointWaypoint` - Checkpoint with time bonus
- `elevatedWaypoint` - Waypoint on elevated section
- `tightWaypoint` - Tight trigger radius for precision
- `fullLapWaypoints` - Complete set for lap testing

#### Obstacle Fixtures
- `coneObstacle` - Traffic cone
- `barrierObstacle` - Barrier wall
- `tireWallObstacle` - Tire wall
- `obstacleArray` - Multiple obstacles for testing

#### Spline Point Arrays
- `simpleSplinePoints` - 3-point straight line
- `curvedSplinePoints` - Quarter circle
- `elevatedSplinePoints` - Ramp points
- `loopSplinePoints` - Vertical circle (20 points)
- `complexSplinePoints` - Multi-curve track

#### Helper Functions
- `cloneTrackData()` - Deep copy track data
- `isValidTrackData()` - Validate track structure
- `generateStraightWaypoints()` - Generate waypoints along path
- `generateRandomObstacles()` - Create random obstacle placements
- `calculateTrackLength()` - Compute total track length
- `getSurfaceTypeAtPosition()` - Get surface type at position

**Usage Example**:
```typescript
import { minimalTrackData, checkpointWaypoint } from '../fixtures/trackFixtures';

describe('Track', () => {
  it('should load minimal track data', () => {
    const track = new Track(minimalTrackData);
    expect(track.getLength()).toBeGreaterThan(0);
  });
});
```

---

### 2. Test Setup Extensions (`tests/setup.ts`)

**Purpose**: Provides comprehensive mocks for Three.js geometry classes and Rapier.js trimesh colliders.

**New Mocks Added**:

#### Three.js Geometry Mocks
- `MockBufferGeometry` - Track mesh geometry
  - `setAttribute()`, `getAttribute()`, `setIndex()`
  - `computeVertexNormals()`, `computeBoundingBox()`
  - `dispose()`, `clone()`

- `MockBufferAttribute` - Geometry attributes (vertices, normals, UVs)
  - `MockFloat32BufferAttribute` - Float32Array wrapper
  - `MockUint32BufferAttribute` - Uint32Array wrapper
  - `MockUint16BufferAttribute` - Uint16Array wrapper

- `MockCatmullRomCurve3` - Spline curve for track generation
  - `getPoints(divisions)` - Get interpolated points along curve
  - `getPoint(t)` - Get point at parameter t (0-1)
  - `getTangent(t)` - Get tangent vector at t
  - `getLength()` - Calculate curve length
  - Supports closed loops

- `MockTextureLoader` - Track texture loading
  - `load(url, onLoad)` - Load texture (async callback)
  - `loadAsync(url)` - Promise-based loading

- `MockOrthographicCamera` - Minimap rendering
  - Constructor with frustum parameters
  - `lookAt()`, `updateProjectionMatrix()`

- `MockWebGLRenderTarget` - Minimap texture generation
  - Width, height, texture properties
  - `dispose()`

#### Rapier.js Trimesh Support
- `MockColliderDesc.trimesh(vertices, indices)` - Track collision mesh
- `MockColliderDesc.cone(halfHeight, radius)` - Cone obstacles

**Usage Example**:
```typescript
import { MockCatmullRomCurve3 } from 'tests/setup';

describe('Track Spline', () => {
  it('should generate spline from points', () => {
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 100),
    ];
    const spline = new MockCatmullRomCurve3(points, true);
    const interpolated = spline.getPoints(50);

    expect(interpolated.length).toBe(51); // 50 divisions + 1
  });
});
```

---

### 3. Test Helper Extensions (`tests/fixtures/testHelpers.ts`)

**Purpose**: Track-specific test utilities for common testing patterns.

**New Helper Functions**:

#### Mock Creators
- `createMockTrack(trackData?)` - Mock Track instance
- `createMockWaypoint(waypointData?)` - Mock Waypoint instance
- `createMockObstacle(obstacleData?)` - Mock Obstacle instance
- `createMockMinimap(size?)` - Mock minimap renderer

#### Validation Functions
- `validateTrackSpline(spline, expectedPointCount?)` - Validate spline generation
- `validateCollisionMesh(geometry)` - Check collision mesh integrity
- `validateTrackBounds(bounds, trackSections)` - Verify bounds calculation
- `validateMinimapSetup(minimap)` - Check minimap configuration
- `validateTrackSection(section)` - Validate section data structure

#### Simulation Functions
- `simulateWaypointPass(waypointSystem, vehiclePosition)` - Test waypoint triggering
- `simulateDrivingPath(vehicle, path, waypointSystem?)` - Drive along path
- `simulateObstacleCollision(vehicle, obstacle)` - Test collision detection
- `testWaypointProgression(waypoints, vehiclePath)` - Track waypoint sequence

#### Calculation Functions
- `generatePathPositions(start, end, steps)` - Generate positions along line
- `calculateExpectedVertexCount(splinePoints, trackWidth)` - Mesh vertex count
- `calculateExpectedTriangleCount(splinePoints)` - Mesh triangle count

#### Performance Testing
- `benchmarkTrackGeneration(trackGenerator, iterations)` - Measure generation time

#### Utility Functions
- `generateSurfaceTypeData(surfaceType)` - Get surface config
- `testHelpers` from Phase 2 still available:
  - `approximatelyEqual()`, `vectorApproximatelyEqual()`
  - `createMockRigidBody()`, `createMockPhysicsWorld()`
  - `simulatePhysicsSteps()`, `benchmarkFunction()`

**Usage Example**:
```typescript
import {
  createMockTrack,
  validateTrackSpline,
  simulateWaypointPass
} from '../fixtures/testHelpers';

describe('WaypointSystem', () => {
  it('should trigger waypoint on approach', () => {
    const track = createMockTrack();
    const waypointSystem = new WaypointSystem(track.waypoints);

    const vehiclePos = new THREE.Vector3(0, 0, 2);
    const result = simulateWaypointPass(waypointSystem, vehiclePos);

    expect(result.waypointPassed).toBe(true);
  });
});
```

---

## Test Scenarios by Component

### Track.ts Testing

**What to Test**:
1. Spline generation from sections
2. Mesh generation (vertices, indices, UVs)
3. Collision mesh generation (trimesh)
4. Track bounds calculation
5. Surface type assignment
6. Texture loading
7. Memory cleanup (dispose)

**Coverage Target**: >85%

**Test Structure**:
```typescript
describe('Track', () => {
  describe('Spline Generation', () => {
    it('should generate spline from straight sections', () => {});
    it('should generate spline from curved sections', () => {});
    it('should generate spline from loop sections', () => {});
    it('should handle closed track loops', () => {});
    it('should validate section parameters', () => {});
  });

  describe('Mesh Generation', () => {
    it('should create vertices along spline', () => {});
    it('should generate correct number of vertices', () => {});
    it('should create triangle indices', () => {});
    it('should generate UVs for texturing', () => {});
    it('should compute vertex normals', () => {});
    it('should handle track width parameter', () => {});
  });

  describe('Collision Mesh', () => {
    it('should create trimesh collider from geometry', () => {});
    it('should set friction based on surface type', () => {});
    it('should validate mesh before collider creation', () => {});
  });

  describe('Bounds Calculation', () => {
    it('should calculate accurate track bounds', () => {});
    it('should update bounds when track changes', () => {});
  });
});
```

**Key Fixtures to Use**:
- `straightSectionData`, `curve90SectionData`, `loopSectionData`
- `minimalTrackData`, `stuntTrackData`
- `simpleSplinePoints`, `loopSplinePoints`

**Helper Functions**:
- `validateTrackSpline()`
- `validateCollisionMesh()`
- `validateTrackBounds()`
- `calculateExpectedVertexCount()`

---

### WaypointSystem.ts Testing

**What to Test**:
1. Waypoint triggering on proximity
2. Lap counting and progression
3. Checkpoint time bonuses
4. Wrong-way detection
5. Progress calculation
6. Race completion detection

**Coverage Target**: >90%

**Test Structure**:
```typescript
describe('WaypointSystem', () => {
  describe('Waypoint Triggering', () => {
    it('should trigger waypoint within radius', () => {});
    it('should not trigger waypoint outside radius', () => {});
    it('should only trigger each waypoint once per lap', () => {});
    it('should advance to next waypoint', () => {});
  });

  describe('Lap Counting', () => {
    it('should increment lap count on completion', () => {});
    it('should reset waypoint index on new lap', () => {});
    it('should detect race finish after max laps', () => {});
  });

  describe('Checkpoints', () => {
    it('should apply time bonus at checkpoints', () => {});
    it('should identify checkpoint waypoints', () => {});
  });

  describe('Wrong-Way Detection', () => {
    it('should detect when driving backwards', () => {});
    it('should not flag wrong-way during valid maneuvers', () => {});
  });

  describe('Progress Calculation', () => {
    it('should calculate progress percentage accurately', () => {});
    it('should account for current lap', () => {});
  });
});
```

**Key Fixtures to Use**:
- `fullLapWaypoints`
- `checkpointWaypoint`, `standardWaypoint`
- `minimalTrackData.waypoints`

**Helper Functions**:
- `simulateWaypointPass()`
- `simulateDrivingPath()`
- `testWaypointProgression()`
- `generatePathPositions()`

---

### Obstacle.ts Testing

**What to Test**:
1. Obstacle creation (cone, barrier, tire wall)
2. Mesh loading/generation
3. Collider creation
4. Position and rotation
5. Collision response
6. Memory cleanup

**Coverage Target**: >80%

**Test Structure**:
```typescript
describe('Obstacle', () => {
  describe('Creation', () => {
    it('should create cone obstacle', () => {});
    it('should create barrier obstacle', () => {});
    it('should create tire wall obstacle', () => {});
    it('should set position correctly', () => {});
    it('should set rotation correctly', () => {});
  });

  describe('Collision', () => {
    it('should create appropriate collider shape', () => {});
    it('should set friction value', () => {});
    it('should be static (not movable)', () => {});
  });

  describe('Disposal', () => {
    it('should dispose mesh and collider', () => {});
    it('should not cause memory leaks', () => {});
  });
});
```

**Key Fixtures to Use**:
- `coneObstacle`, `barrierObstacle`, `tireWallObstacle`
- `obstacleArray`

**Helper Functions**:
- `createMockObstacle()`
- `simulateObstacleCollision()`

---

### MinimapGenerator.ts Testing

**What to Test**:
1. Orthographic camera setup
2. Render target creation
3. Track rendering to texture
4. Bounds calculation
5. World-to-screen coordinate conversion
6. Player marker rendering
7. Memory cleanup

**Coverage Target**: >80%

**Test Structure**:
```typescript
describe('MinimapGenerator', () => {
  describe('Generation', () => {
    it('should create minimap texture', () => {});
    it('should set up orthographic camera', () => {});
    it('should calculate correct bounds', () => {});
    it('should render track to texture', () => {});
  });

  describe('Coordinate Conversion', () => {
    it('should convert world to screen coords', () => {});
    it('should handle out-of-bounds positions', () => {});
  });

  describe('Player Marker', () => {
    it('should draw player marker', () => {});
    it('should rotate marker based on heading', () => {});
  });

  describe('Disposal', () => {
    it('should dispose render target', () => {});
    it('should clean up resources', () => {});
  });
});
```

**Key Fixtures to Use**:
- `minimapConfig`
- `minimapBounds`
- `minimalTrackData`

**Helper Functions**:
- `createMockMinimap()`
- `validateMinimapSetup()`

---

## Coverage Targets

### Overall Phase 3 Coverage Goals

| Component | Target Coverage | Priority | Notes |
|-----------|----------------|----------|-------|
| **Track.ts** | >85% | Critical | Focus on spline and collision mesh |
| **WaypointSystem.ts** | >90% | Critical | All logic paths must be tested |
| **Obstacle.ts** | >80% | High | Simple component, easy coverage |
| **MinimapGenerator.ts** | >80% | Medium | Rendering can be partially mocked |
| **Surface Types** | >80% | Medium | Config validation mainly |

### Critical Test Paths (Must Have 100% Coverage)

1. Waypoint triggering logic
2. Lap completion detection
3. Wrong-way detection
4. Collision mesh validation
5. Spline point generation
6. Track bounds calculation

### Non-Critical Paths (Can Have Lower Coverage)

1. Visual mesh generation details
2. Texture loading (mocked in tests)
3. Minimap rendering specifics
4. Obstacle visual variations

---

## Test Execution

### Running Tests

```bash
# Run all Phase 3 tests
npm test tests/unit/Track.test.ts
npm test tests/unit/WaypointSystem.test.ts
npm test tests/unit/Obstacle.test.ts

# Run with coverage
npm test -- --coverage

# Run with UI
npm run test:ui

# Watch mode for development
npm test -- --watch
```

### Expected Test Count

Based on roadmap requirements and test structure:

- **Track.ts**: ~50-60 tests
  - Spline generation: 15 tests
  - Mesh generation: 20 tests
  - Collision: 10 tests
  - Bounds/Surface: 10 tests

- **WaypointSystem.ts**: ~40-50 tests
  - Triggering: 15 tests
  - Lap counting: 10 tests
  - Checkpoints: 10 tests
  - Wrong-way/Progress: 10 tests

- **Obstacle.ts**: ~20-30 tests
  - Creation: 10 tests
  - Collision: 5 tests
  - Disposal: 5 tests
  - Integration: 5 tests

- **MinimapGenerator.ts**: ~20-25 tests
  - Generation: 10 tests
  - Coordinates: 5 tests
  - Markers: 5 tests
  - Disposal: 3 tests

**Total Expected**: ~130-165 tests for Phase 3

---

## Performance Testing

### Benchmarks to Measure

1. **Track Generation Time**
   - Target: <100ms for 1000-point track
   - Test: `benchmarkTrackGeneration()`

2. **Spline Point Generation**
   - Target: <10ms for 1000 divisions
   - Test: `spline.getPoints(1000)`

3. **Collision Mesh Creation**
   - Target: <50ms for complex track
   - Test: Trimesh collider creation

4. **Waypoint Update**
   - Target: <1ms per frame
   - Test: `waypointSystem.update()`

5. **Minimap Rendering**
   - Target: <20ms initial generation
   - Test: `minimapGenerator.generate()`

### Performance Test Example

```typescript
import { benchmarkTrackGeneration } from '../fixtures/testHelpers';
import { stuntTrackData } from '../fixtures/trackFixtures';

describe('Track Performance', () => {
  it('should generate track in <100ms', () => {
    const avgTime = benchmarkTrackGeneration(() => {
      return new Track(stuntTrackData);
    }, 100);

    expect(avgTime).toBeLessThan(100);
  });
});
```

---

## Integration Testing

### System Interaction Tests

Test interactions between Phase 2 (Vehicle) and Phase 3 (Track) systems:

```typescript
describe('Vehicle-Track Integration', () => {
  it('should detect vehicle on track', () => {
    const track = new Track(minimalTrackData);
    const vehicle = new Vehicle(defaultVehicleConfig);

    // Position vehicle on track
    vehicle.setPosition(new THREE.Vector3(0, 1, 50));

    // Raycast should hit track
    const hit = physicsWorld.castRay(/* ... */);
    expect(hit).not.toBeNull();
  });

  it('should apply surface friction to vehicle', () => {
    const track = new Track(multiSurfaceTrackData);
    const vehicle = new Vehicle(defaultVehicleConfig);

    // Test on tarmac
    const tarmacFriction = track.getSurfaceFriction(new THREE.Vector3(0, 0, 50));
    expect(tarmacFriction).toBe(1.0);

    // Test on dirt
    const dirtFriction = track.getSurfaceFriction(new THREE.Vector3(0, 0, 150));
    expect(dirtFriction).toBe(0.6);
  });
});
```

---

## Common Testing Patterns

### Pattern 1: Track Creation and Validation

```typescript
it('should create valid track from data', () => {
  const track = new Track(minimalTrackData, physicsWorld, scene);

  expect(track).toBeDefined();
  expect(validateTrackSpline(track.spline)).toBe(true);
  expect(validateCollisionMesh(track.mesh.geometry)).toBe(true);
  expect(validateTrackBounds(track.getBounds(), minimalTrackData.sections)).toBe(true);
});
```

### Pattern 2: Waypoint Sequence Testing

```typescript
it('should trigger waypoints in sequence', () => {
  const waypointSystem = new WaypointSystem(fullLapWaypoints);
  const path = generatePathPositions(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 400),
    100
  );

  const triggered = testWaypointProgression(fullLapWaypoints, path);
  expect(triggered).toEqual([0, 1, 2, 3, 4]);
});
```

### Pattern 3: Edge Case Testing

```typescript
describe('Edge Cases', () => {
  it('should handle empty track sections', () => {
    const emptyTrack = { ...minimalTrackData, sections: [] };
    expect(() => new Track(emptyTrack)).toThrow();
  });

  it('should handle vehicle exactly on waypoint', () => {
    const waypoint = createMockWaypoint();
    const result = waypoint.isTriggered(waypoint.position);
    expect(result).toBe(true);
  });

  it('should handle negative track width', () => {
    const invalidData = { ...minimalTrackData, width: -10 };
    expect(() => new Track(invalidData)).toThrow();
  });
});
```

---

## Memory Leak Prevention

### Disposal Checks

```typescript
describe('Memory Management', () => {
  it('should dispose all resources on cleanup', () => {
    const track = new Track(minimalTrackData, physicsWorld, scene);
    const geometryDispose = vi.spyOn(track.mesh.geometry, 'dispose');
    const materialDispose = vi.spyOn(track.mesh.material, 'dispose');

    track.dispose();

    expect(geometryDispose).toHaveBeenCalled();
    expect(materialDispose).toHaveBeenCalled();
    expect(scene.children).not.toContain(track.mesh);
  });
});
```

---

## Troubleshooting

### Common Issues

1. **Mock not found errors**
   - Ensure `tests/setup.ts` is loaded (should be automatic)
   - Check that mock classes are exported to global

2. **Spline generation failures**
   - Verify point array has >2 points
   - Check all points are valid Vector3 instances
   - Use `validateTrackSpline()` helper

3. **Collision mesh errors**
   - Ensure vertices array length is multiple of 3
   - Check indices are valid (0 to vertexCount-1)
   - Use `validateCollisionMesh()` helper

4. **Waypoint not triggering**
   - Check trigger radius (default: 5 units)
   - Verify vehicle position is within radius
   - Use `simulateWaypointPass()` helper for debugging

---

## Next Steps for Developers

1. **Review this document** to understand available test infrastructure
2. **Read Phase 3 roadmap** (`__DOCS__/roadmap.md` lines 16-559)
3. **Import fixtures** from `tests/fixtures/trackFixtures.ts`
4. **Use helper functions** from `tests/fixtures/testHelpers.ts`
5. **Write tests first** (TDD approach) before implementing features
6. **Run tests frequently** (`npm test -- --watch`)
7. **Check coverage** after each feature (`npm test -- --coverage`)
8. **Validate performance** using benchmark helpers

---

## Contact

For questions about test infrastructure or assistance with test writing:
- Consult this document first
- Check existing Phase 2 tests for patterns (`tests/unit/Vehicle.test.ts`)
- Review test fixtures and helpers source code
- Ask the test-engineer agent for guidance

**Remember**: All mocks and fixtures are ready to use. You can start writing tests immediately!

---

**Document Version**: 1.0
**Last Updated**: October 10, 2025
**Status**: Ready for Phase 3 Development
