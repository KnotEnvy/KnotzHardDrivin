# Camera System - Developer Guide

## Quick Start

### Basic Usage

```typescript
import { CameraSystem, CameraMode } from '@systems/CameraSystem';

// Create camera system (pass Three.js camera)
const cameraSystem = new CameraSystem(camera);

// In your game loop:
cameraSystem.update(deltaTime, vehicleTarget);

// Switch camera modes:
cameraSystem.transitionTo(CameraMode.FIRST_PERSON, 1.0); // 1 second transition
cameraSystem.transitionTo(CameraMode.REPLAY, 1.5);       // 1.5 second transition
```

### Camera Target Interface

Your vehicle must implement the `CameraTarget` interface:

```typescript
interface CameraTarget {
  position: THREE.Vector3;      // Vehicle position
  quaternion: THREE.Quaternion; // Vehicle rotation
  velocity?: THREE.Vector3;     // Optional: for look-ahead
}
```

Example vehicle implementation:

```typescript
class Vehicle {
  private mesh: THREE.Mesh;
  private velocity = new THREE.Vector3();

  getCameraTarget(): CameraTarget {
    return {
      position: this.mesh.position,
      quaternion: this.mesh.quaternion,
      velocity: this.velocity,
    };
  }
}
```

---

## Camera Modes Explained

### First-Person (Cockpit View)

**When to use**: Primary gameplay camera

**Behavior**:
- Positioned inside vehicle cockpit
- Looks ahead based on velocity
- Smooth head movement
- Natural driving feel

**Configuration**:
```typescript
cameraSystem.setFirstPersonSettings({
  offset: new THREE.Vector3(0, 1.2, -0.5),  // Cockpit position
  lookAhead: 10,                             // Look ahead distance (meters)
  lookAheadSmoothness: 0.15,                 // Damping (0-1)
});
```

**Recommended for**:
- Normal gameplay
- Time trials
- Player control active

---

### Replay (Crane Shot)

**When to use**: Crash replays, cinematic moments

**Behavior**:
- Positioned behind and above target
- Smooth cinematic tracking
- Centers action in frame
- Dramatic presentation

**Configuration**:
```typescript
cameraSystem.setReplaySettings({
  distance: 30,                              // Distance behind (meters)
  height: 15,                                // Height above (meters)
  damping: 0.05,                             // Very smooth (cinematic)
  lookAtOffset: new THREE.Vector3(0, 0.5, 0) // Look slightly up
});
```

**Recommended for**:
- Crash replays
- Victory laps
- Replay mode
- Cinematic cutscenes

---

## Advanced Features

### Smooth Transitions

Transitions use cubic ease-in-out by default:

```typescript
// Smooth 1-second transition
cameraSystem.transitionTo(CameraMode.REPLAY, 1.0);

// Quick 0.5-second transition
cameraSystem.transitionTo(CameraMode.FIRST_PERSON, 0.5);

// Slow 2-second cinematic transition
cameraSystem.transitionTo(CameraMode.REPLAY, 2.0);
```

Check if transitioning:
```typescript
if (cameraSystem.isInTransition()) {
  console.log('Camera is transitioning...');
}
```

### Instant Mode Switching

For immediate changes (no transition):

```typescript
cameraSystem.setMode(CameraMode.FIRST_PERSON);
cameraSystem.setMode(CameraMode.REPLAY);
```

### Adjust Camera Smoothing

Control how quickly the camera follows the target:

```typescript
// More responsive (less smooth)
cameraSystem.setDamping(0.3, 0.3); // position, rotation

// Very smooth (cinematic)
cameraSystem.setDamping(0.05, 0.05);

// Default balanced
cameraSystem.setDamping(0.1, 0.1);
```

**Tips**:
- Lower values = smoother, more lag
- Higher values = more responsive, less smooth
- First-person: Use 0.1-0.15
- Replay: Use 0.03-0.08

---

## Integration Examples

### Example 1: Gameplay to Crash Replay

```typescript
class GameLogic {
  onCrash(vehicle: Vehicle) {
    // Switch to replay camera when crash detected
    this.cameraSystem.transitionTo(CameraMode.REPLAY, 1.0);

    // Play replay for 10 seconds
    setTimeout(() => {
      // Return to first-person after replay
      this.cameraSystem.transitionTo(CameraMode.FIRST_PERSON, 1.0);
      this.respawnVehicle();
    }, 10000);
  }
}
```

### Example 2: State-Based Camera

```typescript
class GameEngine {
  private updateCamera(deltaTime: number) {
    const state = this.state;

    // Auto-switch camera based on game state
    if (state === GameState.PLAYING) {
      if (this.cameraSystem.getMode() !== CameraMode.FIRST_PERSON) {
        this.cameraSystem.transitionTo(CameraMode.FIRST_PERSON, 1.0);
      }
    } else if (state === GameState.REPLAY) {
      if (this.cameraSystem.getMode() !== CameraMode.REPLAY) {
        this.cameraSystem.transitionTo(CameraMode.REPLAY, 1.5);
      }
    }

    this.cameraSystem.update(deltaTime, this.vehicle.getCameraTarget());
  }
}
```

### Example 3: Dynamic Camera Settings

```typescript
class RaceManager {
  onSpeedChange(speed: number) {
    // Adjust look-ahead based on speed
    const lookAhead = 5 + (speed / 10); // 5-15 meters

    this.cameraSystem.setFirstPersonSettings({
      lookAhead: lookAhead,
      lookAheadSmoothness: 0.15,
    });
  }

  onCrashSeverity(severity: 'minor' | 'major' | 'catastrophic') {
    // Adjust replay camera based on crash severity
    const settings = {
      minor: { distance: 20, height: 10 },
      major: { distance: 30, height: 15 },
      catastrophic: { distance: 50, height: 25 },
    };

    this.cameraSystem.setReplaySettings(settings[severity]);
    this.cameraSystem.transitionTo(CameraMode.REPLAY, 1.0);
  }
}
```

---

## Debugging

### Get Camera Information

```typescript
const info = cameraSystem.getDebugInfo();
console.log('Mode:', info.mode);
console.log('Position:', info.position);
console.log('Rotation:', info.rotation);
console.log('Transitioning:', info.isTransitioning);
```

### Common Issues

**Issue**: Camera is jerky/stuttering
- **Solution**: Lower damping values (0.05-0.1)
- **Solution**: Ensure update() is called every frame

**Issue**: Camera lags behind vehicle
- **Solution**: Increase damping values (0.2-0.3)
- **Solution**: Check that velocity is provided in target

**Issue**: Camera clips through objects
- **Solution**: Not implemented yet (future: collision detection)
- **Workaround**: Adjust camera offsets

**Issue**: First-person view doesn't look ahead
- **Solution**: Ensure vehicle provides velocity in CameraTarget
- **Solution**: Check velocity magnitude (>0.01)

**Issue**: Transitions are too fast/slow
- **Solution**: Adjust transition duration parameter
- **Solution**: Try different easing functions (future)

---

## Performance Tips

### Optimize for 60fps

1. **Call update() once per frame**
   ```typescript
   // Good
   cameraSystem.update(deltaTime, target);

   // Bad (multiple calls)
   cameraSystem.update(deltaTime, target);
   cameraSystem.update(deltaTime, target); // Don't do this!
   ```

2. **Reuse target objects**
   ```typescript
   // Good
   private cameraTarget: CameraTarget = {
     position: this.vehicle.position,
     quaternion: this.vehicle.quaternion,
     velocity: new THREE.Vector3(),
   };

   // Update velocity each frame (reuse object)
   this.cameraTarget.velocity.copy(this.vehicle.getVelocity());
   ```

3. **Limit transitions**
   - Don't transition every frame
   - Check if already in target mode
   - Wait for current transition to complete

### Memory Management

Camera system uses object pooling internally - no manual cleanup needed!

The system reuses these objects:
- `tempVec3` - Temporary vector calculations
- `tempQuat` - Temporary quaternion calculations
- `smoothPosition` - Smooth position tracking
- `smoothLookAt` - Smooth look-at tracking

No per-frame allocations = excellent performance!

---

## Testing

### Manual Testing Checklist

- [ ] First-person camera follows vehicle smoothly
- [ ] Look-ahead works when moving (not stationary)
- [ ] Replay camera centers action in frame
- [ ] Transitions are smooth (no jarring)
- [ ] Camera doesn't jump on first frame
- [ ] Works with null target (graceful failure)
- [ ] Works with zero velocity
- [ ] Mode switching is instantaneous
- [ ] Debug info is accurate

### Automated Testing

```typescript
describe('CameraSystem', () => {
  it('should initialize in first-person mode', () => {
    const camera = new THREE.PerspectiveCamera();
    const system = new CameraSystem(camera);
    expect(system.getMode()).toBe(CameraMode.FIRST_PERSON);
  });

  it('should transition between modes', () => {
    const system = new CameraSystem(camera);
    system.transitionTo(CameraMode.REPLAY, 1.0);
    expect(system.isInTransition()).toBe(true);
  });

  // Add more tests...
});
```

---

## Configuration Reference

### Default Settings

```typescript
// First-Person Defaults
{
  offset: new THREE.Vector3(0, 1.2, -0.5),
  lookAhead: 10,
  lookAheadSmoothness: 0.15,
}

// Replay Defaults
{
  distance: 30,
  height: 15,
  damping: 0.05,
  lookAtOffset: new THREE.Vector3(0, 0.5, 0),
}

// General Defaults
{
  positionDamping: 0.1,
  rotationDamping: 0.1,
  transitionDuration: 1.0,
}
```

### Recommended Settings by Use Case

**Racing Game (High Speed)**
```typescript
setFirstPersonSettings({
  lookAhead: 15,  // Longer look-ahead for high speed
  lookAheadSmoothness: 0.2,
});
```

**Stunt Game (Precision)**
```typescript
setFirstPersonSettings({
  lookAhead: 8,   // Shorter for better control
  lookAheadSmoothness: 0.1,
});
```

**Cinematic Replay**
```typescript
setReplaySettings({
  distance: 40,
  height: 20,
  damping: 0.03,  // Very smooth
});
```

**Action Replay (Fast-Paced)**
```typescript
setReplaySettings({
  distance: 25,
  height: 12,
  damping: 0.08,  // More responsive
});
```

---

## Future Extensions

### Add New Camera Mode

```typescript
// 1. Add to enum
export enum CameraMode {
  FIRST_PERSON = 'first_person',
  REPLAY = 'replay',
  CHASE = 'chase',  // New mode
}

// 2. Add update method
private updateChase(deltaTime: number, target: CameraTarget): void {
  // Your camera logic here
}

// 3. Add to main update switch
update(deltaTime: number, target: CameraTarget): void {
  if (this.mode === CameraMode.CHASE) {
    this.updateChase(deltaTime, target);
  }
  // ...
}
```

### Add Camera Shake

```typescript
shake(intensity: number, duration: number): void {
  this.shakeIntensity = intensity;
  this.shakeDuration = duration;
  this.shakeTime = 0;
}

private applyShake(): THREE.Vector3 {
  const shake = new THREE.Vector3(
    (Math.random() - 0.5) * this.shakeIntensity,
    (Math.random() - 0.5) * this.shakeIntensity,
    (Math.random() - 0.5) * this.shakeIntensity
  );
  return shake;
}
```

---

## API Reference

### Constructor

```typescript
constructor(camera: THREE.PerspectiveCamera)
```

### Main Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `update()` | `deltaTime, target` | `void` | Main update loop |
| `transitionTo()` | `mode, duration?` | `void` | Smooth transition |
| `setMode()` | `mode` | `void` | Instant mode change |
| `getMode()` | - | `CameraMode` | Current mode |
| `isInTransition()` | - | `boolean` | Transition status |
| `reset()` | - | `void` | Reset to defaults |

### Configuration Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `setFirstPersonSettings()` | `settings` | `void` | Configure FP camera |
| `setReplaySettings()` | `settings` | `void` | Configure replay |
| `setDamping()` | `pos, rot` | `void` | Adjust smoothing |

### Utility Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `getDebugInfo()` | - | `object` | Debug information |
| `shake()` | `intensity, duration` | `void` | Camera shake (TODO) |
| `zoom()` | `fov, duration` | `void` | FOV zoom (TODO) |

---

## Support

For questions or issues:
1. Check this guide
2. Review `CameraSystem.ts` TSDoc comments
3. Check Phase 1B completion report
4. Run the camera test (`CameraSystemTest.ts`)

---

**Last Updated**: Phase 1B Completion
**Maintainer**: 3D Graphics & Rendering Specialist
