# Hard Drivin' - Critical Fixes Plan
**Created**: 2025-11-06
**Status**: ACTIVE - Fundamental Issues Identified

## Problem Statement
The game has multiple fundamental issues blocking playable experience:
- Track rendering/collision broken (clipping, invisible walls)
- Crash replay system non-functional
- Steering physics asymmetric
- No visual damage feedback
- Race completion broken

## Root Cause Analysis

### Issue 1: Track Collision & Rendering Problems
**Symptoms**:
- Road tearing/clipping through ground
- Crashing into invisible barriers on curves
- Random crashes at specific track locations

**Root Causes**:
1. Track collision mesh may not match visual mesh
2. Possible Y-offset mismatch between visual and physics geometry
3. Track spline generation may create invalid collision triangles
4. Physics trimesh collider may have duplicate/inverted faces

**Files Involved**:
- `src/entities/Track.ts` (generateMesh, generateCollider)
- `src/entities/TrackSplineGenerator.ts`
- Track JSON data (`public/tracks/*.json`)

**Fix Strategy**:
1. Add visual debug overlay for collision mesh (render physics wireframe)
2. Validate track spline Y-coordinates are above ground plane (y=0)
3. Ensure collision mesh vertices match visual mesh exactly
4. Check for degenerate triangles in collision geometry
5. Verify track rigid body is static with correct position

---

### Issue 2: Crash Replay System Broken
**Symptoms**:
- No "Show Replay" button in crash UI
- Replay doesn't automatically play
- Can still drive during "replay" state
- Eventually transitions to crash view but allows input

**Root Causes**:
1. CrashReplayUI button not wired to GameEngine replay trigger
2. ReplayPlayer not automatically starting on crash
3. Input system not disabled during REPLAY state
4. State transitions PLAYING → CRASHED → REPLAY broken

**Files Involved**:
- `src/systems/CrashReplayUI.ts`
- `src/systems/CrashManager.ts`
- `src/systems/ReplayPlayer.ts`
- `src/core/GameEngine.ts` (state machine)

**Fix Strategy**:
1. Wire CrashReplayUI "Skip" button to skip replay
2. Auto-start ReplayPlayer when entering CRASHED state
3. Disable InputSystem during REPLAY state
4. Fix state flow: PLAYING → CRASHED → REPLAY → PLAYING
5. Add timeout to auto-skip replay after 10 seconds

---

### Issue 3: Steering Asymmetry
**Symptoms**:
- One wheel keeps turning/turning
- Other wheel turns properly
- Steering feels unresponsive or broken

**Root Causes**:
1. Wheel raycast positions may be incorrect (left/right swapped?)
2. Steering angle calculation asymmetric
3. Ackermann steering geometry incorrect
4. Wheel suspension forces unbalanced

**Files Involved**:
- `src/entities/Vehicle.ts` (wheel raycasts, steering)
- `src/config/PhysicsConfig.ts` (wheel positions)

**Fix Strategy**:
1. Add console logs for all 4 wheel raycast positions
2. Verify left/right wheel X-coordinates are symmetric
3. Check steering angle applied equally to both front wheels
4. Validate Ackermann steering calculations
5. Debug suspension force application

---

### Issue 4: No Visual Crash Damage
**Symptoms**:
- Vehicle model doesn't show damage after crashes
- No visual feedback for damage state

**Root Causes**:
1. Damage state tracked but not applied to model
2. Vehicle model materials not updated based on damage
3. No damage texture/color changes implemented

**Files Involved**:
- `src/entities/Vehicle.ts` (damage state, model updates)
- `src/entities/models/` (vehicle models)

**Fix Strategy**:
1. Add material color lerp based on damage percentage
2. Change vehicle color from normal → red as damage increases
3. Consider adding "crumpled" mesh deformation (advanced)
4. Show smoke particles at high damage levels

---

### Issue 5: Race Completion Not Working
**Symptoms**:
- Race doesn't end after 2 laps
- Only ends when 2-minute timer expires

**Root Causes**:
1. WaypointSystem.maxLaps correctly set to 2
2. raceFinished flag set correctly
3. GameEngine may not be detecting raceFinished flag
4. State transition PLAYING → RESULTS may be blocked

**Files Involved**:
- `src/systems/WaypointSystem.ts`
- `src/core/GameEngine.ts` (update loop)

**Fix Strategy**:
1. Verify waypointResult.raceFinished detection in GameEngine
2. Add logging (already added in previous changes)
3. Test with 2 lap completion
4. Check state machine allows PLAYING → RESULTS

---

## Prioritized Execution Plan

### PHASE 1: Track Foundation (2-3 hours)
**Goal**: Make track drivable without invisible walls

**Tasks**:
1. ✅ Add track collision debug visualization
2. ✅ Verify track Y-coordinates > 0
3. ✅ Check collision mesh matches visual mesh
4. ✅ Test drive entire track without crashes
5. ✅ Fix any collision geometry issues found

**Success Criteria**: Can drive full lap without hitting invisible walls

---

### PHASE 2: Crash Replay (1-2 hours)
**Goal**: Functional crash replay system

**Tasks**:
1. ✅ Wire CrashReplayUI buttons to GameEngine
2. ✅ Auto-start replay on crash
3. ✅ Disable input during REPLAY state
4. ✅ Fix CRASHED → REPLAY → PLAYING flow
5. ✅ Add auto-skip timeout

**Success Criteria**:
- Crash shows replay automatically
- Replay plays for 5-10 seconds
- Returns to gameplay after replay

---

### PHASE 3: Vehicle Physics (1-2 hours)
**Goal**: Symmetric, responsive steering

**Tasks**:
1. ✅ Debug wheel raycast positions
2. ✅ Fix steering asymmetry
3. ✅ Validate suspension forces
4. ✅ Test steering at various speeds
5. ✅ Add visual damage feedback

**Success Criteria**:
- Steering feels responsive and symmetric
- Vehicle handles predictably
- Damage visible on crash

---

### PHASE 4: Race Logic (30 min)
**Goal**: Race ends correctly after 2 laps

**Tasks**:
1. ✅ Test lap completion with debug logs
2. ✅ Verify state transitions work
3. ✅ Fix any blocking issues
4. ✅ Test results screen displays stats

**Success Criteria**:
- Race ends after completing 2 laps
- Results screen shows all stats
- Can restart race from results

---

## Testing Protocol

After each phase:
1. Run `npm run dev`
2. Play game for 5 minutes
3. Test specific fixed functionality
4. Document any new issues found
5. Verify fix doesn't break other systems

---

## Decision: Stop Chasing Symptoms, Fix Root Causes

We were stuck in "whack-a-mole" mode:
- Patching UI without fixing underlying systems
- Adding features before core gameplay works
- Debugging logs instead of fixing broken code

**NEW APPROACH**:
1. Fix one system completely before moving to next
2. Test thoroughly after each fix
3. Don't add features until core works
4. Prioritize playability over polish

---

## Next Steps

**IMMEDIATE** (Right now):
1. Start with Phase 1 (Track Foundation)
2. Add track collision debug visualization
3. Drive track and identify exact collision issues
4. Fix collision geometry

**THEN** (After track is fixed):
1. Move to Phase 2 (Crash Replay)
2. Get crash replay working end-to-end
3. Test multiple crash scenarios

**AFTER CORE WORKS**:
1. Polish UI/UX
2. Add audio feedback
3. Performance optimization
4. Deployment

---

## Success Metrics

**Core Gameplay Loop Must Work**:
- ✅ Start race from menu
- ✅ Drive vehicle around track (no invisible walls)
- ✅ Vehicle steers predictably
- ✅ Crash triggers replay automatically
- ✅ Replay plays and returns to gameplay
- ✅ Complete 2 laps to finish race
- ✅ Results screen shows stats
- ✅ Return to menu and restart

**Once this loop works flawlessly, THEN we polish.**

