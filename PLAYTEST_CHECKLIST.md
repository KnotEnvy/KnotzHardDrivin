# Hard Drivin' Remake - Phase 5 Playtest Checklist

**Test Date**: _______________
**Tester**: _______________
**Build**: Phase 5 Complete (954 tests passing)
**URL**: http://localhost:4201/

---

## Pre-Test Setup

- [ ] Run `npm run dev` successfully
- [ ] Browser opens to http://localhost:4201/
- [ ] Game loads without console errors (check F12 Console tab)
- [ ] No TypeScript compilation errors shown
- [ ] Frame rate shown in top-left corner (should be 60+ fps)

---

## Phase 1: Core Engine & Camera System

### Game Loop & Performance

- [ ] **Frame rate**: Consistently 60+ fps (shown in top-left corner)
- [ ] **No stuttering**: Game runs smoothly without frame drops
- [ ] **No console errors**: F12 Console shows no red errors during gameplay

### Camera System (Toggle with 'C' key)

- [ ] **Chase Camera (default)**: Third-person view behind vehicle
  - [ ] Camera follows vehicle smoothly
  - [ ] Camera rotates with vehicle direction
  - [ ] Camera maintains proper distance

- [ ] **First-Person Camera**: Cockpit view
  - [ ] View is from driver's position
  - [ ] Camera looks ahead based on velocity
  - [ ] No clipping through vehicle mesh

- [ ] **Camera transitions**: Smooth fade between modes (no jarring cuts)

---

## Phase 2: Vehicle Physics & Controls

### Keyboard Controls

- [ ] **W key**: Accelerates vehicle forward
- [ ] **S key**: Brakes vehicle (or reverse when stopped)
- [ ] **A key**: Steers left
- [ ] **D key**: Steers right
- [ ] **Space bar**: Handbrake (locks rear wheels)
- [ ] **R key**: Resets vehicle to last waypoint
- [ ] **C key**: Cycles camera modes

### Gamepad Controls (if available)

- [ ] **RT/R2**: Accelerates vehicle
- [ ] **LT/L2**: Brakes vehicle
- [ ] **Left stick**: Steers left/right
- [ ] **A/X button**: Handbrake
- [ ] **Y/Triangle**: Reset vehicle
- [ ] **Right stick**: Camera control (if implemented)

### Vehicle Physics

- [ ] **Acceleration**: Vehicle accelerates smoothly when throttle applied
- [ ] **Braking**: Vehicle decelerates when brake applied
- [ ] **Steering**: Vehicle turns left/right based on input
- [ ] **Drift**: Handbrake causes vehicle to slide/drift
- [ ] **Suspension**: Vehicle bounces on rough terrain
- [ ] **Wheel rotation**: All 4 wheels rotate visibly
- [ ] **Engine sounds**: Rev changes with speed (if audio implemented)

### Physics Edge Cases

- [ ] **Airborne**: Vehicle flies through air on jumps/ramps
- [ ] **Landing**: Vehicle lands without exploding (unless high-speed)
- [ ] **Stuck detection**: Reset (R key) works when stuck
- [ ] **Flipping**: Vehicle can flip and recover (or reset)
- [ ] **Speed limit**: Vehicle reaches ~200+ km/h top speed

---

## Phase 3: Track & Environment

### Track Rendering

- [ ] **Track visible**: Track mesh renders correctly
- [ ] **Track textures**: Track has proper material/texture
- [ ] **Track boundaries**: Visual barriers on track edges
- [ ] **Sky**: Sky/background renders (even if simple)
- [ ] **Lighting**: Scene has proper lighting

### Waypoint System

- [ ] **Waypoints visible**: Can see waypoint markers (arrows/rings)
- [ ] **Waypoint progression**: Waypoints activate in sequence (1→2→3...)
- [ ] **Lap counter**: Shows current lap number
- [ ] **Lap completion**: Lap counter increments when lap completed
- [ ] **Wrong-way detection**: Detects when driving backwards
- [ ] **Anti-shortcut**: Cannot skip waypoints out of order

### Track Features

- [ ] **Straights**: Straight sections drive smoothly
- [ ] **Curves**: Curved sections have proper banking
- [ ] **Ramps**: Ramps launch vehicle into air
- [ ] **Loops**: Loop sections work (if implemented)
- [ ] **Obstacles**: Cones/barriers visible and collidable

### Minimap (if implemented)

- [ ] **Minimap visible**: Shows in corner of screen
- [ ] **Player position**: Shows player dot on minimap
- [ ] **Track outline**: Shows track shape
- [ ] **Waypoint markers**: Shows next waypoint on minimap

---

## Phase 4: Crash & Replay System

### Crash Detection

- [ ] **High-speed collision**: Crashing into wall at high speed triggers crash
- [ ] **Hard landing**: Falling from height triggers crash
- [ ] **Crash severity**: Different crash types (minor/major/catastrophic)
- [ ] **No false crashes**: Vehicle doesn't crash on spawn
- [ ] **No false crashes**: Normal bumps don't trigger crash

### Crash Replay

- [ ] **Replay triggers**: Major crash automatically starts replay
- [ ] **Replay camera**: Cinematic camera shows crash from different angle
- [ ] **Replay duration**: Replay plays for ~10 seconds
- [ ] **Replay interpolation**: Vehicle movement is smooth during replay
- [ ] **Skip replay**: Space bar or Enter skips replay immediately

### Replay UI

- [ ] **Overlay visible**: Replay UI overlay appears during replay
- [ ] **Progress bar**: Shows replay progress (0-100%)
- [ ] **Skip button**: "Press SPACE to Skip" button visible
- [ ] **Auto-hide**: UI fades after inactivity (if implemented)
- [ ] **Play/pause controls**: Can pause/resume replay (if implemented)
- [ ] **Speed controls**: Can change playback speed (if implemented)

### Post-Crash Respawn

- [ ] **Vehicle respawns**: Vehicle resets to track after replay
- [ ] **Respawn position**: Vehicle spawns at last waypoint
- [ ] **Respawn orientation**: Vehicle faces correct direction
- [ ] **Gameplay resumes**: Can drive normally after respawn
- [ ] **Timer continues**: Timer keeps counting (with penalty applied)

---

## Phase 5: Timing & Scoring System

### Timer System

- [ ] **Timer starts**: Timer starts when game begins
- [ ] **Timer counts down**: Remaining time decreases during play
- [ ] **Timer format**: Shows MM:SS.ms format (e.g., "01:23.45")
- [ ] **Timer visible**: Timer displayed on screen (check console if no HUD)

### Lap Timing

- [ ] **Lap timer starts**: Lap timer starts with race
- [ ] **Lap completion**: Lap time recorded when lap completed
- [ ] **Best lap tracking**: Best lap time saved and displayed
- [ ] **Lap times array**: All lap times stored (check console)

### Checkpoint Bonuses

- [ ] **Checkpoint detection**: Passing checkpoint detected
- [ ] **Time bonus applied**: +30 seconds added to timer
- [ ] **Bonus notification**: Bonus displayed (console or UI)
- [ ] **Correct timing**: Bonus applies at right moment

### Crash Penalties

- [ ] **Minor crash**: -5 seconds penalty applied
- [ ] **Major crash**: -10 seconds penalty applied
- [ ] **Catastrophic crash**: -15 seconds penalty applied
- [ ] **Penalty notification**: Penalty displayed (console or UI)
- [ ] **Time decreases**: Timer actually decreases by penalty amount

### Time Expiration

- [ ] **Timer reaches zero**: Game ends when timer hits 0:00.00
- [ ] **State transition**: Game transitions to RESULTS state
- [ ] **Progress tracking**: Shows how far player got (% complete)

### Leaderboard System

#### Testing Leaderboard Persistence (requires browser DevTools)

- [ ] **First lap completion**: Complete a lap and check console
- [ ] **Leaderboard entry**: Check if time was submitted to leaderboard
  - Open DevTools Console (F12)
  - Type: `localStorage.getItem('harddriving_leaderboard')`
  - Should show JSON data with your time

- [ ] **Top 10 qualification**: Complete a fast lap
- [ ] **Fast time saves**: Fast time appears in leaderboard
- [ ] **Slow time rejected**: Very slow time doesn't make top 10 (after 10 entries exist)

#### Leaderboard Data Integrity

- [ ] **localStorage persistence**: Close browser, reopen game, leaderboard still exists
  - Close browser tab completely
  - Run `npm run dev` again
  - Check `localStorage.getItem('harddriving_leaderboard')` - data should persist

- [ ] **Ranking order**: Leaderboard sorted by lap time (fastest first)
- [ ] **Max 10 entries**: Leaderboard limited to 10 entries
- [ ] **Ghost data saved**: Ghost replay data included (if applicable)

#### Testing in Console

```javascript
// Check leaderboard
const lb = JSON.parse(localStorage.getItem('harddriving_leaderboard') || '{}');
console.log('Leaderboard entries:', lb.entries?.length);
console.log('Top time:', lb.entries?.[0]?.lapTime, 'ms');

// Clear leaderboard (if needed to test fresh)
localStorage.removeItem('harddriving_leaderboard');
```

### Statistics System

#### Statistics Tracking

- [ ] **Stats initialized**: Check console for stats system initialization
- [ ] **Race count**: Total races increments after lap completion
- [ ] **Crash count**: Total crashes increments after crashes
- [ ] **Distance tracking**: Total distance increases during play
- [ ] **Speed tracking**: Average speed calculated from velocity
- [ ] **Top speed**: Maximum speed recorded
- [ ] **Play time**: Total play time accumulates

#### Statistics Persistence

- [ ] **localStorage saves**: Stats save to localStorage
  - Check: `localStorage.getItem('harddriving_stats')`
  - Should show JSON with totalRaces, totalCrashes, etc.

- [ ] **Stats persist**: Close/reopen browser, stats remain
- [ ] **Stats accumulate**: Stats increase across multiple sessions

#### Testing in Console

```javascript
// Check statistics
const stats = JSON.parse(localStorage.getItem('harddriving_stats') || '{}');
console.log('Total races:', stats.totalRaces);
console.log('Total crashes:', stats.totalCrashes);
console.log('Best lap:', stats.bestLapTime, 'ms');
console.log('Top speed:', stats.topSpeed, 'm/s');
console.log('Average speed:', stats.averageSpeed, 'm/s');
console.log('Total distance:', stats.totalDistance, 'm');
console.log('Time played:', stats.timePlayedTotal, 's');

// Clear stats (if needed to test fresh)
localStorage.removeItem('harddriving_stats');
```

### Timer Events (Developer Testing)

Open Console (F12) and monitor timer events:

- [ ] **TIMER_STARTED**: Event fires when race starts
- [ ] **LAP_COMPLETED**: Event fires when lap completed
- [ ] **CHECKPOINT_BONUS**: Event fires when checkpoint passed
- [ ] **PENALTY_APPLIED**: Event fires when penalty applied
- [ ] **TIME_EXPIRED**: Event fires when timer reaches zero
- [ ] **TIMER_PAUSED**: Event fires when game paused (if pause implemented)
- [ ] **TIMER_RESUMED**: Event fires when game resumed

---

## Integration Testing

### Full Race Flow

- [ ] **Start race**: Game initializes properly
- [ ] **Drive lap**: Can complete full lap without issues
- [ ] **Pass waypoints**: All waypoints activate in sequence
- [ ] **Checkpoint bonus**: Checkpoint gives time bonus
- [ ] **Crash**: Crash triggers replay
- [ ] **Watch replay**: Replay plays correctly
- [ ] **Skip replay**: Can skip with Space bar
- [ ] **Respawn**: Vehicle respawns correctly
- [ ] **Penalty applied**: Time penalty deducted from timer
- [ ] **Continue racing**: Can keep driving after respawn
- [ ] **Complete lap**: Lap completes and time recorded
- [ ] **Submit time**: Time submitted to leaderboard
- [ ] **Stats update**: Statistics updated correctly

### Multi-Lap Testing

- [ ] **Lap 1**: First lap completes correctly
- [ ] **Lap 2**: Second lap starts automatically
- [ ] **Lap 3**: Third lap works
- [ ] **Lap times**: All lap times recorded separately
- [ ] **Best lap**: Best lap time tracked correctly

### Edge Cases

- [ ] **Reset during race**: R key resets vehicle properly
- [ ] **Crash on spawn**: No false crash detection
- [ ] **Time runs out**: Game handles timer expiration gracefully
- [ ] **Very fast lap**: Fast lap saves to leaderboard
- [ ] **Very slow lap**: Slow lap rejected from leaderboard (if 10+ entries)
- [ ] **Multiple crashes**: Multiple crashes in one lap handled correctly
- [ ] **Backward driving**: Wrong-way detection works

---

## Performance Testing

### Frame Rate Monitoring

- [ ] **Idle**: 60+ fps when not moving
- [ ] **Driving**: 60+ fps during normal driving
- [ ] **High speed**: 60+ fps at maximum speed
- [ ] **Replay**: 60+ fps during replay playback
- [ ] **Multiple crashes**: No fps drops after multiple crashes

### Memory Leaks (5-minute test)

- [ ] **Play for 5 minutes**: Drive, crash, reset repeatedly
- [ ] **Check fps**: Frame rate remains stable
- [ ] **Check console**: No memory warnings
- [ ] **Check DevTools Memory**: Heap size stable (F12 → Memory → Take snapshot before/after)

### localStorage Quota

- [ ] **10+ laps**: Complete 10+ laps to fill leaderboard
- [ ] **Check storage**: No quota errors in console
- [ ] **11th entry**: 11th leaderboard entry handled (oldest removed)

---

## Browser Compatibility (Optional)

### Chrome/Edge (Primary)

- [ ] All features work in Chrome
- [ ] No console errors in Chrome

### Firefox (Secondary)

- [ ] All features work in Firefox
- [ ] No console errors in Firefox

### Safari (if available)

- [ ] All features work in Safari
- [ ] No console errors in Safari

---

## Known Issues to Verify

These are known issues from Phase 4/5 - verify they still exist:

- [ ] **8 CrashManager tests failing**: Timing-sensitive test failures (not user-facing)
- [ ] **Cloud visibility**: 50 clouds created but not visible (minor visual issue)
- [ ] **7 E2E test failures**: Playwright config issues (dev-only)

---

## Critical Bugs (If Found)

**Use this section to note any critical bugs discovered:**

### Blocker Bugs (Must fix before Phase 6)

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Major Bugs (Should fix before Phase 6)

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Minor Bugs (Can defer to Phase 8)

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## Features Not Yet Implemented (Expected)

These features are planned for future phases:

- [ ] UI/HUD overlay (Phase 7) - Currently using console output
- [ ] Main menu (Phase 7)
- [ ] Pause menu (Phase 7)
- [ ] Results screen (Phase 7)
- [ ] Settings menu (Phase 7)
- [ ] Audio system (Phase 6-7) - Engine sounds, crash effects
- [ ] Ghost AI opponent (Phase 6)
- [ ] Multiple tracks (Post-MVP)
- [ ] Multiple vehicles (Post-MVP)

---

## Sign-Off

**Playtest Completed**: _______________
**Overall Assessment**: _______________
**Ready for Phase 6**: [ ] YES  [ ] NO (fix bugs first)

**Notes**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

## Quick Console Testing Commands

Open DevTools Console (F12) and try these:

```javascript
// View timer state
console.log('Timer state:', window.gameEngine?.getTimerSystem().getState());

// View leaderboard
const lb = JSON.parse(localStorage.getItem('harddriving_leaderboard') || '{}');
console.log('Leaderboard:', lb.entries);

// View statistics
const stats = JSON.parse(localStorage.getItem('harddriving_stats') || '{}');
console.log('Statistics:', stats);

// Clear all data (fresh start)
localStorage.clear();

// Force a crash (for testing)
// Drive fast into a wall and check if replay triggers

// Check frame rate
// Look at top-left corner of game
```

---

**End of Playtest Checklist**

**Total Items**: ~150 test cases across all phases
**Estimated Test Time**: 30-45 minutes for complete playtest
**Required Tools**: Browser (Chrome/Firefox), DevTools (F12)

Good luck with the playtest! 🏎️
