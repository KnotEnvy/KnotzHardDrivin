# Track Coordinate System Reference

## Overview
This document explains the coordinate system and geometry generation for the Thunder Speedway Oval track.

## World Coordinate System

```
        Y (Up)
        |
        |
        |
        +--------> X (Right)
       /
      /
     Z (Forward)

Origin: (0, 0, 0)
Initial Direction: +Z (forward)
```

## Track Section Progression

### Section 0: Front Straight (0° → 0°)
```
Start:  (0, 0, 0)   facing +Z [0, 0, 1]
End:    (0, 0, 120) facing +Z [0, 0, 1]

         Z
         ^
         |
    120  •─────────────  WP1
         |
         |
         |
      10 •─────────────  WP0 (Checkpoint)
         |
       0 •─────────────  Start
         |
      -5 ★─────────────  Spawn Point
         |
         +-------------> X
         0
```

### Section 1: First Turn (0° → 90°)
```
Start:  (0, 0, 120)  facing +Z [0, 0, 1]
End:    (150, Y, 70) facing +X [1, 0, 0]

Banking: 15° inward
Turn Direction: Left (counter-clockwise when viewed from above)

         Z
         ^
         |
    170  •─────•─────•
         │    WP3   WP2
         │
         │    TURN 1
    120  •     (R=50m)
         |
         +─────•─────•───-> X
         0    50   100 150

Note: Y increases during banking transition
```

### Section 2: Back Straight (90° → 90°)
```
Start:  (150, Y, 170) facing +X [1, 0, 0]
End:    (150, Y, 50)  facing +X [1, 0, 0]

Actually faces -Z direction after turn completion

         Z
         ^
         |
    170  +─────────────• WP4
         |             |
         |             |
         |   BACK      |
         |   STRAIGHT  |
         |   (120m)    |
         |             |
      50 +─────────────• WP5
         |
         +--------------> X
                      150
```

### Section 3: Second Turn (90° → 180° = 0°)
```
Start:  (150, Y, 50) facing -Z [0, 0, -1]
End:    (0, 0, 0)    facing +Z [0, 0, 1]

Banking: 15° inward
Turn Direction: Left (counter-clockwise when viewed from above)

         Z
         ^
         |
      50 •
         |
         │    TURN 2
         │    (R=50m)
         │
         │    WP7   WP6
     -40 •─────•─────•
         |
         +─────•─────•───-> X
         0    50   100 150

Note: Completes 360° total rotation, returns to start
```

## Complete Track Loop (Top View)

```
         Z axis
         ^
         |
    170  +     3──────────4
         |     │          │
         |     │  TURN 1  │
    120  +  1──2          5──6
         |  │                 │
         |  │                 │
         |  │  FRONT    BACK  │
      10 +  0★               7│
         |  │                 │
         |  │                 │
     -40 +  └──────────────────┘
         |       TURN 2
         +────+────+────+────+───> X axis
              0   50  100  150

    ★ = Spawn Point (0, 2, -5)
    Numbers = Waypoint IDs
    0 = Start/Finish (Checkpoint)
```

## Waypoint Positions & Directions

| ID | Position (X, Y, Z) | Direction | Section | Notes |
|----|-------------------|-----------|---------|-------|
| 0 | (0, 0, 10) | +Z [0,0,1] | Front Straight | Start/Finish, Checkpoint |
| 1 | (0, 0, 120) | +Z [0,0,1] | End Front Straight | |
| 2 | (50, 0, 170) | +X [1,0,0] | First Turn Mid | On banked section |
| 3 | (100, 0, 170) | +X [1,0,0] | First Turn Exit | |
| 4 | (150, 0, 120) | -Z [0,0,-1] | Back Straight Start | |
| 5 | (150, 0, 10) | -Z [0,0,-1] | Back Straight End | |
| 6 | (100, 0, -40) | -X [-1,0,0] | Second Turn Mid | On banked section |
| 7 | (50, 0, -40) | -X [-1,0,0] | Second Turn Exit | |

## Banking Geometry

### How Banking Works
```
No Banking (flat):
    ═══════════

15° Banking (tilted inward):
         ╱───╲
       ╱       ╲
     ╱           ╲
    ─             ─

Effect: Outer edge raised, inner edge lowered
Purpose: Allows higher cornering speeds
```

### Banking Implementation
In `Track.ts`, banking is applied during point generation:
```typescript
case 'bank': {
  const banking = ((section.banking || 15) * Math.PI) / 180;

  for (let i = 0; i <= divisions; i++) {
    const t = i / divisions;
    const offset = new Vector3(
      -Math.sin(theta) * radius,
      Math.sin(banking) * radius * t,  // Y offset creates banking
      Math.cos(theta) * radius
    );
    // ...
  }
}
```

### Banking Angles
- **0°** - Flat (no banking)
- **15°** - Current (realistic oval racing)
- **30°** - High banking (Daytona-style)
- **45°** - Extreme banking (NASCAR super speedways)

## Spline Mathematics

### Catmull-Rom Spline Properties
```
P(t) = 0.5 × [
  (2 × P1) +
  (-P0 + P2) × t +
  (2×P0 - 5×P1 + 4×P2 - P3) × t² +
  (-P0 + 3×P1 - 3×P2 + P3) × t³
]

Where:
  P0, P1, P2, P3 = Four consecutive control points
  t = Parameter [0, 1]
  P(t) = Point on curve
```

### Control Point Density
- **Section Points:** 20 per section
- **Total Control Points:** 80 (20 × 4 sections)
- **Tessellation:** 1000 points for final mesh
- **Smoothness:** C1 continuous (no sharp corners)

## Distance Calculations

### Arc Length (Curved Sections)
```
Arc Length = θ × r

Where:
  θ = angle in radians
  r = radius

For 90° turn with R=50m:
  Arc = (π/2) × 50 = 78.54m
```

### Total Track Length
```
Front Straight:  120.00m
First Turn:       78.54m (90° @ R=50m)
Back Straight:   120.00m
Second Turn:      78.54m (90° @ R=50m)
────────────────────────
TOTAL:           397.08m (center line)

With 10m width, outer edge adds ~15.7m
Outer edge total: ~540m
```

## Collision Mesh Generation

### Process Flow
```
1. Generate spline control points
2. Tessellate to 1000 smooth points
3. Create track ribbon geometry
4. Extract vertex positions
5. Build triangle indices
6. Create Rapier trimesh collider
```

### Vertex Layout
```
For each point along spline:
  Left Edge:  point + (-binormal × width/2)
  Right Edge: point + (binormal × width/2)

Binormal = Tangent × Up
         = Track Direction × [0,1,0]
```

### Triangle Generation
```
For each segment:
  v0 = left[i]
  v1 = right[i]
  v2 = left[i+1]
  v3 = right[i+1]

  Triangle 1: [v0, v1, v2]
  Triangle 2: [v1, v3, v2]
```

## Performance Characteristics

### Mesh Complexity
```
Visual Mesh:
  - Vertices: ~2000
  - Triangles: ~2000
  - Normals: Computed
  - UVs: Generated

Collision Mesh:
  - Vertices: ~2000 (same as visual)
  - Triangles: ~2000
  - Type: Static trimesh
  - Friction: 1.0
```

### Generation Times
```
Spline Generation:    <5ms
Mesh Generation:     <20ms
Collider Creation:   <20ms
────────────────────────
Total Load Time:     <50ms
```

## Debugging Tips

### Console Output
Check for these log messages:
```
✓ Track data loaded from assets/tracks/track01.json: Thunder Speedway Oval
✓ Spline generated with 80 control points
✓ Track mesh generated: 2000 vertices, 2000 triangles
✓ Track rigid body created: isFixed=true
✓ Track collider created: 2000 vertices, 2000 triangles
✓ Track "Thunder Speedway Oval" loaded: 4 sections, 8 waypoints
```

### Common Issues

**Gap in track:**
- Check section continuity
- Verify direction vectors update correctly
- Ensure banking doesn't create Y-offset gaps

**Vehicle falls through:**
- Verify collision mesh created
- Check rigid body is static
- Ensure collision groups not filtering raycasts

**Waypoints not triggering:**
- Check trigger radius (12m recommended)
- Verify waypoint positions on track surface
- Ensure direction vectors point along track

**Spline looks jagged:**
- Increase tessellation (currently 1000)
- Add more control points per section
- Check for coincident control points

## Coordinate System Summary

**Axes:**
- X: Right (+X = east)
- Y: Up (+Y = sky)
- Z: Forward (+Z = north)

**Rotations (Right-Hand Rule):**
- Yaw: Rotation around Y axis
- Pitch: Rotation around X axis
- Roll: Rotation around Z axis

**Track Direction:**
- Starts at origin facing +Z
- Rotates counter-clockwise (left turns)
- Completes 360° back to origin

**Units:**
- Distance: meters
- Angles: degrees in JSON, radians in code
- Speed: m/s
- Time: seconds

---

**Reference complete!** Use this guide when modifying track geometry or adding new sections.
