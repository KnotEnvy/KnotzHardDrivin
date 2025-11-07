# Track Issues - Root Cause Analysis

## Issue 1: Track Clipping Through Ground

**Root Cause**: Track centerline starts at Y=0, which is the SAME level as the ground plane.

**Evidence**:
- `Track.ts` line 136: `let currentPos = new THREE.Vector3(0, 0, 0);` - track starts at Y=0
- `EnvironmentSystem.ts` creates ground plane at Y=0
- When track mesh is generated with width, the geometry vertices are at Y=0
- Any slight numerical imprecision or mesh deformation causes vertices to go below Y=0
- Result: Z-fighting and clipping through ground

**Fix**: Elevate track centerline to Y=0.5 (50cm above ground)

---

## Issue 2: Green Wireframe Sticking Out on Curves

**Root Cause**: Collision mesh vertices match visual mesh exactly, including any geometry issues.

**Evidence**:
- Curves generate points at Y=0 (see `Track.ts` line 242-244)
- When mesh is extruded with width, some vertices may have incorrect Y values
- Debug wireframe reveals the collision geometry is malformed on curves

**Fix**: Ensure all track points have consistent Y-elevation

---

## Issue 3: "Extra Track Pieces" Visible

**Possible Causes**:
1. **Obstacles**: track01.json has 19 obstacles (cones, barriers, tire walls)
2. **Ground Texture**: The ground plane visual might look like track sections
3. **Spline Artifacts**: Closed loop spline might be creating extra geometry at the seam

**Need to confirm**: User screenshot shows what exactly looks like "extra track"

---

## Issue 4: UI Changes Not Visible

**Root Cause**: Browser cache or Vite not properly serving new CSS files

**Evidence**:
- CSS files exist and are properly linked in index.html
- Hard refresh not clearing cache
- Vite hot-reload may not be triggering for CSS

**Fix**:
1. Clear browser cache completely
2. Try incognito mode
3. Check Vite console for CSS compilation errors
4. Verify CSS file paths are correct

---

## Immediate Fixes to Implement

### Fix 1: Elevate Track Above Ground (HIGH PRIORITY)
```typescript
// In Track.ts, line 136
// OLD: let currentPos = new THREE.Vector3(0, 0, 0);
// NEW: let currentPos = new THREE.Vector3(0, 0.5, 0); // 50cm above ground
```

### Fix 2: Set Consistent Y-Coordinate for All Sections
Ensure curves, straights, and all sections maintain Y=0.5 elevation

### Fix 3: Adjust Spawn Point
```json
// In track01.json
// OLD: "position": [0, 2, 5]
// NEW: "position": [0, 2.5, 5]  // Account for elevated track
```

### Fix 4: Force CSS Reload
- Add cache-busting query parameter
- Check Vite dev server console
- Verify CSS compilation

