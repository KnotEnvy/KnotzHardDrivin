# Crash Effects Testing Guide

**Purpose**: Verify enhanced crash effects (sparks, debris, camera shake)
**Testing Time**: ~10 minutes
**Build**: Production-ready (TypeScript compiled, no errors)

---

## Quick Test Procedure

### Test 1: Minor Crash (Wall Tap)
**Setup**:
1. Launch game: `npm run dev`
2. Start race (any track, any vehicle)
3. Drive at moderate speed (~30 mph)
4. Gently tap wall or obstacle

**Expected Results**:
- ✅ **15 orange/yellow sparks** spray from impact point
- ✅ **5 gray debris pieces** tumble away
- ✅ **Gentle camera shake** (0.3 intensity, 0.5s)
- ✅ No replay triggered (impact too light)

**Visual Checklist**:
- [ ] Sparks visible as orange/yellow glowing points
- [ ] Sparks fall with gravity (arc trajectory)
- [ ] Sparks fade out in 0.3-0.6 seconds
- [ ] Debris pieces are gray/chrome colored
- [ ] Debris tumbles (rotation visible)
- [ ] Debris lasts 1-2 seconds
- [ ] Camera shakes briefly, smoothly stops

---

### Test 2: Major Crash (High-Speed Wall Hit)
**Setup**:
1. Accelerate to high speed (~70+ mph)
2. Crash directly into wall or barrier

**Expected Results**:
- ✅ **30 orange/yellow sparks** - dense spray
- ✅ **15 gray debris pieces** - significant scatter
- ✅ **Moderate camera shake** (0.6 intensity, 1.0s)
- ✅ **Crash replay triggered** (10s cinematic camera)

**Visual Checklist**:
- [ ] Spark count noticeably higher than minor crash
- [ ] Debris cloud visible around impact
- [ ] Camera shake feels impactful (not jarring)
- [ ] Shake smoothly decays over 1 second
- [ ] Replay camera activated (overhead view)
- [ ] No effects during replay playback

---

### Test 3: Catastrophic Crash (Jump + Hard Landing)
**Setup**:
1. Find a jump or ramp
2. Launch vehicle at high speed
3. Land hard (nose-first if possible)

**Expected Results**:
- ✅ **50 orange/yellow sparks** - maximum burst
- ✅ **25 gray debris pieces** - large scatter
- ✅ **Full camera shake** (1.0 intensity, 1.5s)
- ✅ **Extended crash replay** triggered

**Visual Checklist**:
- [ ] Massive spark explosion on landing
- [ ] Debris flies in all directions
- [ ] Strong camera shake (most dramatic)
- [ ] Shake lasts 1.5 seconds (longest duration)
- [ ] Vehicle shows visible damage (smoke, deformation)
- [ ] Replay captures the crash moment

---

## Performance Tests

### FPS Monitoring
**During Normal Driving** (no crash):
- Expected FPS: 60-200+ fps
- Particle count: 0-10 (only smoke if damaged)

**During Crash Event** (particle burst):
- Expected FPS drop: <5 fps (brief, <100ms)
- Particle count: 15-75 total (sparks + debris + smoke)
- Recovery: Instant (back to 60+ fps)

**Performance Checklist**:
- [ ] No sustained FPS drops during crashes
- [ ] No stuttering or freezing
- [ ] Particle count returns to baseline after 2 seconds
- [ ] Camera shake doesn't cause jittering

### Memory Check
Open DevTools (F12) → Performance tab:
- [ ] No memory spikes during crashes (object pooling working)
- [ ] No "yellow triangles" (no per-frame allocations)
- [ ] Memory usage stable over multiple crashes

---

## Visual Quality Tests

### Spark Particles
**Expected Appearance**:
- Color: Orange (#ff8800) and yellow-orange (#ffaa00)
- Blending: Additive (glowing effect)
- Size: Small points (0.15-0.35m)
- Lifetime: Short (0.3-0.6s)
- Trajectory: Radial spray, falling with gravity

**Quality Checklist**:
- [ ] Sparks glow brightly (additive blending visible)
- [ ] Orange/yellow colors clearly visible
- [ ] Sparks don't look "blobby" (appropriate size)
- [ ] Sparks fade out smoothly (no pop-out)

### Debris Particles
**Expected Appearance**:
- Color: Dark gray (#333), medium gray (#666), chrome (#aaa)
- Size: Mixed (0.1-0.35m)
- Lifetime: Medium (1-2s)
- Rotation: Tumbling (visible spin)
- Trajectory: Scattered, influenced by vehicle velocity

**Quality Checklist**:
- [ ] Debris colors varied (not all same shade)
- [ ] Size variation visible (small + medium pieces)
- [ ] Tumbling rotation clear
- [ ] Debris flies away from impact realistically

### Camera Shake
**Expected Feel**:
- Frequency: Fast (15 Hz) - rapid shake
- Falloff: Smooth linear decay
- Direction: Multi-axis (X/Y/Z)
- No "synchronized" repetition (multi-frequency)

**Quality Checklist**:
- [ ] Shake feels "jarring" not smooth (impact feel)
- [ ] Shake doesn't look repetitive or patterned
- [ ] Decay is smooth (no abrupt stop)
- [ ] Shake doesn't make player nauseous (too fast/strong)

---

## Edge Case Tests

### Test 4: Rapid Sequential Crashes
**Setup**:
1. Crash into wall
2. Immediately reverse and crash again
3. Repeat 5-10 times quickly

**Expected Behavior**:
- [ ] Particle pool doesn't overflow (max 100 particles)
- [ ] Warning in console if pool exhausted
- [ ] No crashes or errors
- [ ] Camera shake doesn't stack (one at a time)
- [ ] FPS remains stable

### Test 5: Crash During Replay
**Setup**:
1. Trigger major crash (start replay)
2. Wait for replay to finish
3. Vehicle respawns
4. Immediately crash again

**Expected Behavior**:
- [ ] No effects during replay playback
- [ ] Effects trigger immediately on next crash
- [ ] No leftover particles from previous crash
- [ ] Camera shake works correctly after replay

### Test 6: Multiple Particle Types
**Setup**:
1. Damage vehicle to HEAVY state (smoke emitting)
2. While smoking, trigger major crash

**Expected Behavior**:
- [ ] Smoke + sparks + debris all visible simultaneously
- [ ] Total particle count ≤ 100 (budget enforced)
- [ ] No visual glitches or overlap issues
- [ ] All particle types update correctly

---

## Console Log Verification

### Expected Console Messages

**On Crash Detection**:
```
Crash detected! Force: 45000N, Severity: major, Position: (12.5, 2.3, 8.9)
```

**On Particle Burst**:
```
Crash effects triggered: 30 sparks + 15 debris (major)
```

**On Camera Shake**:
```
Camera shake triggered: intensity=0.60, duration=1.00s
```

**If Pool Exhausted** (warning):
```
Particle pool exhausted, cannot emit sparks
Particle pool exhausted, cannot emit debris
```

### Console Checklist
- [ ] Crash force printed correctly
- [ ] Severity matches visual effects (minor/major/catastrophic)
- [ ] Particle counts match severity
- [ ] Camera shake intensity/duration match severity
- [ ] No errors or warnings (except pool exhaustion if >100 particles)

---

## Regression Tests

### Existing Features Still Work
- [ ] Vehicle physics normal (steering, acceleration)
- [ ] Visual damage system works (deformation, smoke)
- [ ] Replay system triggers correctly
- [ ] Camera modes switch properly (chase, first-person, replay)
- [ ] HUD updates (damage meter, speed, timer)
- [ ] Audio plays correctly (engine sound, etc.)

---

## Performance Benchmarks

### Target Metrics
| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Crash overhead | <2ms | DevTools Performance tab |
| Camera shake | <0.1ms/frame | Console.time() in updateCameraShake() |
| Particle update | <0.5ms/frame | Console.time() in update() |
| Total FPS drop | <5 fps | Stats.js / browser FPS counter |

### How to Measure
1. Open DevTools (F12)
2. Go to Performance tab
3. Click "Record"
4. Trigger crash
5. Stop recording
6. Look for:
   - `triggerCrashVisualEffects()` duration
   - `updateCameraShake()` duration
   - `DamageVisualizationSystem.update()` duration

**Benchmark Checklist**:
- [ ] triggerCrashVisualEffects() <2ms
- [ ] updateCameraShake() <0.1ms
- [ ] DamageVisualizationSystem.update() <0.5ms
- [ ] No yellow "long task" warnings

---

## Known Issues / Limitations

### Current Limitations
1. **Particle Budget**: Max 100 total particles (smoke + sparks + debris)
   - If exceeded, console warning displayed
   - Older particles expire to make room

2. **Camera Shake**: No FOV change yet
   - Future enhancement: Dynamic FOV on impact

3. **Sound**: No crash sound effects yet
   - Placeholder for Sprint 3 audio integration

### Not Bugs (Expected Behavior)
- Particle pool exhaustion warning (if >100 particles active)
- No effects during replay playback (by design)
- Camera shake stops immediately when entering pause menu
- Spark colors limited to orange/yellow (realistic metal sparks)

---

## Quick Reference: Severity Thresholds

| Severity | Impact Force | Sparks | Debris | Shake Intensity | Shake Duration |
|----------|-------------|--------|--------|----------------|----------------|
| NONE | <25k N | 0 | 0 | 0.0 | 0s |
| MINOR | 25k-50k N | 15 | 5 | 0.3 | 0.5s |
| MAJOR | 50k-75k N | 30 | 15 | 0.6 | 1.0s |
| CATASTROPHIC | >75k N | 50 | 25 | 1.0 | 1.5s |

**Impact Force Calculation**:
```typescript
F = mass × Δv / Δt
mass = 1200 kg (vehicle)
Δv = velocity change (m/s)
Δt = 0.01667s (60Hz timestep)
```

**Example**:
- 50 mph → 0 mph collision = ~22 m/s change
- F = 1200 × 22 / 0.01667 ≈ 1,584,000 N = CATASTROPHIC

---

## Test Report Template

```markdown
### Crash Effects Test Report
**Date**: [DATE]
**Tester**: [NAME]
**Build**: [COMMIT HASH]

#### Minor Crash
- Sparks: [ ] PASS / [ ] FAIL - Notes: _______
- Debris: [ ] PASS / [ ] FAIL - Notes: _______
- Shake: [ ] PASS / [ ] FAIL - Notes: _______

#### Major Crash
- Sparks: [ ] PASS / [ ] FAIL - Notes: _______
- Debris: [ ] PASS / [ ] FAIL - Notes: _______
- Shake: [ ] PASS / [ ] FAIL - Notes: _______

#### Catastrophic Crash
- Sparks: [ ] PASS / [ ] FAIL - Notes: _______
- Debris: [ ] PASS / [ ] FAIL - Notes: _______
- Shake: [ ] PASS / [ ] FAIL - Notes: _______

#### Performance
- FPS: [AVG FPS] - [ ] PASS / [ ] FAIL
- Crash overhead: [MS] - [ ] PASS / [ ] FAIL
- Memory stable: [ ] PASS / [ ] FAIL

#### Overall Status
- [ ] APPROVED FOR MERGE
- [ ] NEEDS FIXES
- [ ] BLOCKED

**Notes**: _______________________________________
```

---

## Troubleshooting

### Issue: No sparks visible
**Possible Causes**:
- Particle pool exhausted (check console for warning)
- Crash severity too low (impact force <25k N)
- Camera not positioned to see impact point

**Solutions**:
- Check console logs for crash force
- Try higher speed collision
- Switch camera to replay mode to see particles better

### Issue: Camera shake too strong/weak
**Adjustment**:
Edit `CrashManager.ts` lines 674-692:
```typescript
case CrashSeverity.MINOR:
  shakeIntensity = 0.3; // Change to 0.2 for weaker
```

### Issue: Too many particles (FPS drop)
**Solution**:
Reduce particle counts in `DamageVisualizationSystem.ts` lines 126-132:
```typescript
private readonly SPARK_COUNT_MINOR = 10; // Was 15
private readonly DEBRIS_COUNT_MINOR = 3; // Was 5
```

### Issue: Particles don't look right
**Check**:
1. DevTools → Console → Any errors?
2. Network tab → `game-canvas` loading?
3. Browser compatibility (WebGL 2.0 required)

---

**Status**: Ready for testing
**Estimated Test Time**: 10-15 minutes
**Risk Level**: Low (no breaking changes to existing systems)
