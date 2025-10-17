# Cinematic Replay Camera - Visual Progression Guide

This document visualizes the camera movement during a 10-second crash replay.

---

## Timeline Overview

```
Time (s)    0     1     2     3     4     5     6     7     8     9     10
            |-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
Stage 1     [WIDE ESTABLISHING SHOT           ]
Stage 2                           [SMOOTH APPROACH / ZOOM-IN            ]
Stage 3                                               [CLOSE-UP        ]
Impact Zoom                                                     [X X]
Orbital                  [  1/3 ORBIT  ][  2/3 ORBIT  ][  1.5 ORBIT  ]
```

---

## Stage-by-Stage Camera Movement

### Stage 1: Wide Establishing Shot (0-3 seconds)

**Visual Purpose**: Establish the crash context. Show the environment.

```
                        CAMERA
                           *
                          /|\
                         / | \
                        /  |  \
                       /   |   \
                      |    |    |
           40m←-------|    |    |--------→ TRACK
                   20m↑    |    ↓ CRASH POINT
                      |    |    |
                      |    |    |
                      └────┴────┘
                      OVERHEAD VIEW
```

**Camera Position**:
- Distance: 40m behind crash point
- Height: 20m above crash point
- Orbital Position: 0° (starting at Z-axis behind)

**Movement**:
- Static position (no transition from Stage 0)
- Begins slow orbital rotation

**Lighting & Framing**:
- Wide angle, crash site visible in context
- Road markings, surroundings visible
- Dramatic height emphasizes impact magnitude

---

### Stage 2: Smooth Approach / Zoom-In (3-7 seconds)

**Visual Purpose**: Gradually focus on crash point. Cinematic zoom-in effect.

```
Time 3s:  Distance = 40m, Height = 20m  [Starting Stage 2]
            40m
             ← [CAMERA]
             20m↑

Time 5s:  Distance = 32.5m, Height = 17.5m  [Midway]
            32.5m
             ← [CAMERA]
             17.5m↑

Time 7s:  Distance = 25m, Height = 15m  [End Stage 2, Start Stage 3]
            25m
             ← [CAMERA]
             15m↑
```

**Interpolation**:
```
progress = (elapsedTime - 3) / 4  // 0 to 1 over 4 seconds

distance = lerp(40, 25, progress)
height = lerp(20, 15, progress)
```

**Orbital Motion**:
- Rotation: Approximately 1/3 of full orbit
- Smooth sine/cosine arc
- Camera circles crash point

**Visual Effect**:
- Gradual zoom-in toward crash
- Maintains crash in center of frame
- Dramatic approach builds tension

---

### Stage 3: Close-up on Crash (7-10 seconds)

**Visual Purpose**: Final dramatic frame on impact point.

```
Time 7-8s:  Distance = 15m, Height = 10m [Entering Stage 3]
             15m
             ← [CAMERA]
             10m↑

Time 9-10s: Distance = 15m, Height = 10m [Held at close-up]
             15m
             ← [CAMERA]
             10m↑

                FINAL FRAME: Crash point fills camera view
```

**Orbital Motion**:
- Continues rotating
- Final 2/3 to 1.5 orbits
- Smooth circular motion

**Visual Effect**:
- Close-up dramatically emphasizes crash location
- Crash fills most of frame
- Ground impact details visible

---

## Impact Zoom Window (8-9 seconds)

**Special Effect During Stage 3**

Superimposed 1-second zoom effect:

```
Without Impact Zoom:
Time 8s-9s: Distance = 15m, Height = 10m

With Impact Zoom:
Time 8.0s: Distance = 15 × 1.0   = 15m,    Height = 10 × 1.0   = 10m
Time 8.2s: Distance = 15 × 0.94  = 14.1m,  Height = 10 × 0.94  = 9.4m
Time 8.4s: Distance = 15 × 0.88  = 13.2m,  Height = 10 × 0.88  = 8.8m
Time 8.5s: Distance = 15 × 0.85  = 12.75m, Height = 10 × 0.85  = 8.5m  [CLOSEST]
Time 8.6s: Distance = 15 × 0.82  = 12.3m,  Height = 10 × 0.82  = 8.2m
Time 8.8s: Distance = 15 × 0.76  = 11.4m,  Height = 10 × 0.76  = 7.6m
Time 9.0s: Distance = 15 × 0.70  = 10.5m,  Height = 10 × 0.70  = 7.0m
```

**Calculation**:
```
zoomProgress = 1.0 - (elapsedTime - 8)  // 1.0 at 8s, 0.0 at 9s
zoomFactor = 0.7 + zoomProgress * 0.3   // 1.0 at 8s, 0.7 at 9s

distance *= zoomFactor  // Progressive 30% closer
height *= zoomFactor
```

**Visual Effect**:
- Dramatic 1-second push-in for final impact
- Creates visceral emphasis on crash moment
- Slow, cinematic (not jarring)

---

## Orbital Motion Throughout

**Total Rotation**: 1.5 complete orbits (540 degrees)

### Orbit Visualization

```
Top-down view showing camera orbit around crash point:

Orbit Position Over Time:
                    0s (0°)
                      |
           3s (120°)  |  ?s (45°)
              \       |       /
               \      |      /
                \ CRASH |   /
         6s →  ←        /  ← 9s (270°)
                /      |      \
               /       |       \
              /        |        \
           ?s (?)      |         ?s (?)
                      |
                   12s+ (540°+)


Parametric Path:
X = sin(angle) × distance
Z = -cos(angle) × distance

angle increases: 0 → 3π (0° → 540°)
duration: 10 seconds
rate: 3π / 10 = 0.942 radians/second
```

### Orbit Snapshots

**0 seconds (0°)**:
```
        -Z (NORTH)
          |
    [CAM] |
      \   |
    -X←--|-->X
        \ |
         \|
          + CRASH
          |
         +Z (SOUTH)
```

**3.3 seconds (120°)**:
```
        -Z (NORTH)
          |
          |
    -X←--|-->X [CAM]
          |  /
          | /
          + CRASH
        / |
       /  |
         +Z (SOUTH)
```

**5 seconds (180°)**:
```
        -Z (NORTH)
          |
          |
    -X←--|-->X
          |
          + CRASH
          |
      [CAM]
      +Z (SOUTH)
```

**6.7 seconds (240°)**:
```
        -Z (NORTH)
        /|
    [CAM]|
      / |
    -X←-|-->X
      \ |
       \|
        + CRASH
         |
         |
      +Z (SOUTH)
```

**10 seconds (540°, 1.5 orbits complete)**:
```
        -Z (NORTH)
          |
    [CAM] |
      \   |
    -X←--|-->X
        \ |
         \|
          + CRASH
          |
         +Z (SOUTH)

(Back to starting position, having orbited 1.5 times)
```

---

## Combined Movement: Distance + Orbit + Zoom

### Visual Example: 8-second mark (impact zoom window)

```
       STAGE 3 + IMPACT ZOOM

Top View:
         12.75m
          ←[CAMERA at 270° orbit]
         8.5m↑

              |
    -X←-----  + CRASH  --|-->X
              |

          +Z SOUTH

Side View:
         8.5m HEIGHT

          [CAMERA]
           \
            \
             \ 12.75m DISTANCE
              \
               └──────+ CRASH POINT

Ground Level (0m)
```

### Comparison: Before & After Impact Zoom

**Before (7.5s)**:
```
Distance: 15m, Height: 10m
Full view of crash site region
```

**During (8.5s - peak zoom)**:
```
Distance: 12.75m, Height: 8.5m
30% closer, crash fills more of frame
```

**After (9.5s)**:
```
Distance: 10.5m, Height: 7.0m
Gradual return to Stage 3 close-up
```

---

## Frame Composition Over Time

### 0-2 seconds: Establishing

```
[Wide Aerial View]
                ↑ 20m
                |
         CRASH→X←─ Far background visible
                |
            ←40m→

Visual: Context. Where did they crash?
```

### 3-5 seconds: Approaching

```
[Closer Aerial View]
                ↑ 17m
                |
         CRASH→X←─ Close surroundings visible
                |
            ←32m→

Visual: Zoom in. Focus on impact point.
```

### 6-7 seconds: Framing

```
[Tight Aerial View]
                ↑ 15m
                |
         CRASH→X←─ Immediate surroundings visible
                |
            ←25m→

Visual: Ready for impact frame.
```

### 8-9 seconds: Impact Zoom

```
[ULTRA TIGHT - Peak Drama]
                ↑ 8.5m
                |
         CRASH→X←─ Crash point fills frame
                |
            ←12.75m→

Visual: MAXIMUM IMPACT. Dramatic close-up.
```

### 9-10 seconds: Hold on Close-up

```
[Tight Aerial View - Settling]
                ↑ 10m
                |
         CRASH→X←─ Immediate surroundings
                |
            ←15m→

Visual: Final frame. Hold on crash point.
Fadeout/skip prompt appears.
```

---

## Camera Path in 3D Space

### Full Orbit Path

If we trace the camera's path in 3D space over the 10-second replay:

```
3D CAMERA TRAJECTORY:
(X-axis: left-right, Y-axis: up-down, Z-axis: forward-back)

Time 0s:   Position = (0, 20, -40)          [Starting: behind, high, far]
Time 1s:   Position ≈ (11.8, 20, -38.8)    [Orbiting, still far]
Time 2s:   Position ≈ (23.1, 20, -33.3)    [Continuing orbit, far]
Time 3s:   Position ≈ (31.4, 20, -23.1)    [Stage 1 end, preparing zoom]
Time 4s:   Position ≈ (28.1, 18.5, -13)    [Zooming in, height dropping]
Time 5s:   Position ≈ (16.3, 17.5, -28.1)  [Halfway through approach]
Time 6s:   Position ≈ (8, 16, -24)         [Continuing approach]
Time 7s:   Position ≈ (-12.5, 15, -19)     [Stage 3 starts, close-up distance]
Time 8s:   Position ≈ (-15, 10, -0)        [Impact zoom starts]
Time 8.5s: Position ≈ (-12.75, 8.5, -0)   [PEAK ZOOM - closest approach]
Time 9s:   Position ≈ (-10.5, 7, 0)        [Zoom fading]
Time 10s:  Position ≈ (0, 10, -15)         [Final position, ready for next scene]

Visual: Smooth spiral path downward and inward, then settling at final frame.
```

---

## Effect Checklist During Replay

### Second-by-Second Progression

**0-1s**: "Oh no, what happened?"
- Wide view, establishing shot
- Camera at maximum distance
- Smooth orbital start

**1-2s**: "Where's the impact?"
- Still wide, beginning to focus
- Orbital motion becomes apparent
- Dramatic music swells

**2-3s**: "There it is!"
- Transitioning to approach
- Crash point becoming focal point
- Orbit continues smoothly

**3-4s**: "That looks bad"
- Zooming in noticeably
- Getting closer to crash
- Heights dropping with distance

**4-5s**: "That really looks bad"
- Halfway through approach
- Crash impact becoming visible
- Cinematic feel building

**5-6s**: "Focus on the damage"
- Continuing zoom toward close-up
- Crash details becoming visible
- Orbit at full speed

**6-7s**: "Close-up on impact"
- Final approach complete
- Close-up framing locked
- Ready for impact frame

**7-8s**: "The moment of impact"
- Holding close-up distance
- Orbiting around crash
- Tension building

**8-9s**: "IMPACT MOMENT!" (Extra Zoom)
- Dramatic 1-second push-in
- 30% additional zoom
- Peak cinematic drama
- Impact feels visceral

**9-10s**: "And scene..."
- Zoom settling
- Final frame holding
- Ready to skip or auto-timeout
- Music/effects underscore

---

## Integration Notes

### For ReplayUI

Show this information to player:

```
CRASH REPLAY
━━━━━━━━━━━━━━━━
[████████████░░░░] 70%  (7/10 seconds)

Press ENTER to skip
```

Progress bar visual:
```
0-3s:   [████░░░░░░] Wide shot active
3-7s:   [██████░░░░] Approaching
7-8s:   [████████░░] Close-up
8-9s:   [█████████░] IMPACT ZOOM
9-10s:  [██████████] Final frame
```

### For Audio System

Timing for sound effects:

```
0-3s:   Ambient wind, subtle music swell
3-7s:   Music builds intensity
7-8s:   Ominous tone, focus on crash sound
8-9s:   IMPACT effect! (crash sound peak)
9-10s:  Fade to silence, prepare for next
```

### For State Management

```
CRASHED state (10s total):
  0-1s:  Freeze scene, show replay UI
  1-10s: Play crash replay camera
  10s:   Auto-respawn or accept skip input
```

---

## Technical Summary

### Movement Equations

```typescript
// Stage 1 & 2: Distance and Height
if (time < 3) {
  distance = 40;
  height = 20;
} else if (time < 7) {
  const progress = (time - 3) / 4;
  distance = lerp(40, 25, progress);
  height = lerp(20, 15, progress);
} else {
  distance = 15;
  height = 10;
}

// Impact Zoom (8-9s only)
if (time >= 8 && time <= 9) {
  const zoomProg = 1 - (time - 8);
  const zoomFactor = 0.7 + zoomProg * 0.3;
  distance *= zoomFactor;
  height *= zoomFactor;
}

// Orbital Position
angle = time * (3 * Math.PI / 10); // 3π over 10s
X = sin(angle) * distance;
Z = -cos(angle) * distance;
Y = height;

// Smooth to camera position
camera.position.lerp(target, 0.05);
```

---

## Conclusion

The cinematic replay camera provides a dramatic, multi-layered experience:

1. **Establishes** context with wide shot (0-3s)
2. **Builds** tension with gradual approach (3-7s)
3. **Focuses** with close-up framing (7-8s)
4. **Amplifies** drama with impact zoom (8-9s)
5. **Settles** into final frame (9-10s)

All while smoothly **orbiting** the crash point for cinematic motion, maintaining the impact location in the center of the frame throughout the entire sequence.

This creates maximum visual impact when showcasing the player's crash - transforming a failure moment into a memorable cinematic event.
