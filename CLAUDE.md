# Hard Drivin' Remake - Claude Code Onboarding Guide

**Project**: Hard Drivin' Remake
**Stack**: TypeScript + Three.js + Rapier.js + Vite
**Current Phase**: Phase 4 (Crash & Replay System)
**Last Updated**: October 17, 2025
**Document Version**: 4.0

---

## TL;DR - What You Need to Know in 60 Seconds

This is a browser-based 3D racing game remake of the classic Hard Drivin' arcade game. **Phases 0-3 are COMPLETE and TESTED**. The game is fully functional and playable. You're joining at the start of Phase 4 (Crash & Replay System).

**Quick Facts**:
- 60fps target, <16.67ms frame budget (currently ~4-5ms - excellent headroom)
- TypeScript strict mode, zero compilation errors
- 676 unit tests passing, >94% coverage on core systems
- Zero memory leaks, zero per-frame allocations in hot paths
- Fully functional drivable vehicle with realistic physics
- Complete track system with waypoints and lap tracking
- **Game is playable**: http://localhost:4201/ (after `npm run dev`)

**🚨 IMPORTANT - Recent Fixes (Oct 17, 2025)**:
The completion reports for Phases 1-3 contained inaccuracies. We just fixed:
- ✅ 15 TypeScript compilation errors → 0 errors
- ✅ 66 failing tests → all 676 tests passing
- ✅ Per-frame allocations in InputSystem and WaypointSystem
- ✅ Updated CameraSystem default to CHASE_CAMERA (better for racing)
- ✅ Complete RAPIER.js mocks for testing

**Known Technical Debt** (deferred):
- Some usage of `any` types instead of proper TypeScript types (low priority)
- 7 debug E2E tests with Playwright config issues (non-critical)

**Read These First**:
1. `__DOCS__\PRD.md` - Product Requirements (THE authoritative source)
2. `__DOCS__\phase4\Phase_4_ROADMAP.md` - Your phase development plan
3. This file (you're reading it) - Current state and context

**Key Commands**:
```bash
npm run dev          # Start dev server (http://localhost:4201)
npm test             # Run 676 unit tests (all passing)
npm run type-check   # TypeScript validation (zero errors)
npm run build        # Production build
```

---

## 1. Project Overview

### What We're Building

A modern, browser-based reimagining of the classic **Hard Drivin'** arcade racer. Physics-driven stunt racing with loops, jumps, crashes, and cinematic replays. All running at 60fps in the browser.

**Core Experience**:
- Drive a physics-based vehicle around a stunt track
- Hit waypoints, perform stunts, avoid obstacles
- When you crash: watch dramatic replay, then respawn
- Beat your best time, race against your ghost
- Pure single-player arcade fun

### Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Language** | TypeScript | 5.9+ | Type safety, fewer runtime errors |
| **3D Rendering** | Three.js | r180 | Scene management, cameras, lighting |
| **Physics** | Rapier.js | 0.19+ | Vehicle physics, collisions, raycasts |
| **Build Tool** | Vite | 7.1+ | Fast dev server, optimized builds |
| **Audio** | Howler.js | 2.2+ | Sound effects, spatial audio (Phase 7) |
| **Testing** | Vitest + Playwright | Latest | Unit tests + E2E tests |
| **State** | Custom FSM | - | Game state management |

### Project Goals

1. **Performance**: Stable 60fps on modern hardware
2. **Quality**: >80% test coverage, TypeScript strict mode
3. **Maintainability**: Clean architecture, comprehensive documentation
4. **Fun**: Arcade feel with realistic physics constraints

---

## 2. Current Status (October 17, 2025)

### What's Working RIGHT NOW

**✅ Fully Playable Game**:
- Start dev server: `npm run dev`
- Open browser: http://localhost:4201/
- Drive with keyboard: W/S (throttle/brake), A/D (steer), Space (handbrake), R (reset)
- Or use gamepad: RT/LT (throttle/brake), Left stick (steer), A button (handbrake)
- Vehicle drives on track with physics simulation
- Waypoints track lap progress
- Camera follows vehicle (toggle with C key)

### Phase Completion Summary

**Phase 0: Project Setup** ✅ COMPLETE
- Vite + TypeScript + Three.js + Rapier.js configured
- Folder structure established
- Build pipeline working
- Dev server running on port 4201

**Phase 1: Core Engine & Camera System** ✅ COMPLETE
*(Completion Report: `__DOCS__\phase1\PHASE_1B_COMPLETION_REPORT.md`)*
- Fixed timestep game loop (60Hz physics, variable rendering)
- Finite State Machine (FSM) with 7 states
- Camera system (first-person, chase, replay modes)
- Performance monitoring with live FPS display
- 169 unit tests, 96%+ coverage
- Zero memory leaks
- Zero per-frame allocations

**Phase 2: Vehicle Physics & Controls** ✅ COMPLETE
*(Completion Report: `__DOCS__\phase2\PHASE_2_COMPLETION_REPORT.md`)*
- Complete vehicle physics (1,235 lines)
- 4-wheel independent raycasting (NOT rigid body wheels)
- Spring-damper suspension simulation
- Engine/transmission (5-speed automatic, torque curve)
- Tire force model (slip ratio/angle calculations)
- Input system (keyboard + gamepad, 551 lines)
- Visual mesh (chassis + 4 wheels)
- 194 new unit tests (360 total)
- Vehicle fully drivable

**Phase 3: Track & Environment** ✅ COMPLETE
*(Completion Report: `__DOCS__\phase3\PHASE_3_COMPLETION_REPORT.md`)*
- Spline-based track generation (538 lines)
- 5 section types: straight, curve, ramp, loop, bank
- Waypoint system (243 lines) - lap tracking, wrong-way detection
- Surface types (88 lines) - tarmac, dirt, grass, ice, sand
- Obstacle system (224 lines) - cones, barriers, tire walls
- Minimap generator (151 lines) - orthographic rendering
- 309 new unit tests (669 total)
- GameEngine integration complete

**Phase 3.5: Critical Fixes** ✅ COMPLETE (October 17, 2025)
*The completion reports overstated completion status. We fixed:*
- **TypeScript Errors**: 15 → 0 (material types, Vehicle.ts mesh handling)
- **Test Failures**: 66 → 0 (incomplete RAPIER mocks)
- **Per-frame Allocations**: Fixed InputSystem.getInput() and WaypointSystem.getNextWaypointPosition()
- **Test Count**: 669 → 676 (all passing)
- **CameraSystem**: Updated default mode to CHASE_CAMERA (better for racing)

### Key Metrics (Current - October 17, 2025)

| Metric | Value | Status |
|--------|-------|--------|
| **Frame Rate** | 200+ fps | ✅ Excellent (4x headroom) |
| **Frame Time** | ~4-5ms | ✅ Excellent (~12ms budget left) |
| **Memory Usage** | 50-70MB | ✅ Excellent |
| **Test Coverage** | >94% | ✅ Excellent |
| **Unit Tests** | 676 passing, 3 skipped | ✅ All passing |
| **TypeScript Errors** | 0 | ✅ Clean build |
| **Memory Leaks** | 0 detected | ✅ Excellent |
| **Track Loading** | 59ms | ✅ Excellent (target: <100ms) |

### What's Next: Phase 4 - Crash & Replay System

**Duration**: 1 week (5 days estimated)
**Complexity**: High
**Primary Systems**: Crash detection, replay recording/playback

**Phase 4 Will Deliver**:
1. **CrashManager.ts** - Collision force thresholds, damage calculation, crash state transitions
2. **ReplayRecorder.ts** - 60Hz state capture, data compression, circular buffer (30 seconds)
3. **ReplayPlayer.ts** - Smooth playback, interpolation, speed controls (pause/rewind/slow-mo)
4. **Cinematic camera** - Dramatic replay camera angles
5. **Respawn system** - Vehicle reset after replay viewing
6. **Integration** - Connect with Vehicle, Track, WaypointSystem
7. **Tests** - >80% coverage on all crash/replay components

**Performance Target**: Replay recording <1ms overhead per frame

---

## 3. Essential Documents

All documentation: `D:\JavaScript Games\KnotzHardDrivin\__DOCS__\`

### Primary Documents (Read These First)

**`PRD.md`** - Product Requirements Document
**Path**: `__DOCS__\PRD.md`
**Purpose**: THE authoritative source for all requirements
**Content**: Vision, features, physics specs, performance budgets, architecture
**When to Read**: Before implementing ANY feature

**`Phase_4_ROADMAP.md`** - Your Development Plan
**Path**: `__DOCS__\phase4\Phase_4_ROADMAP.md`
**Purpose**: Detailed Phase 4 task breakdown
**Content**: Implementation order, testing criteria, deliverables
**When to Read**: Right now, before starting Phase 4

**Completion Reports** - What's Been Built
- `__DOCS__\phase1\PHASE_1B_COMPLETION_REPORT.md` - Engine & camera
- `__DOCS__\phase2\PHASE_2_COMPLETION_REPORT.md` - Vehicle & input
- `__DOCS__\phase3\PHASE_3_COMPLETION_REPORT.md` - Track & waypoints

**Note**: These reports overestimated completion. We fixed the issues on Oct 17, 2025.

**`subAgentsUserGuide.md`** - How to Use Specialized Agents
**Path**: `__DOCS__\subAgentsUserGuide.md`
**Purpose**: Agent selection guide, effective prompting
**When to Read**: When you need specialized help

---

## 4. Specialized Agents

Use these expert agents for different aspects of development:

| Agent | Specialty | When to Use |
|-------|-----------|-------------|
| **technical-architect** | System design, architecture | Design decisions, refactoring, pattern selection |
| **physics-specialist** | Vehicle physics, Rapier.js | Vehicle dynamics, collisions, suspension tuning |
| **3d-graphics-renderer** | Three.js, rendering | Scene setup, cameras, shaders, particle effects |
| **gameplay-systems-designer** | Game loop, FSM, input | Game mechanics, state management, controls |
| **replay-systems-engineer** | **PRIMARY FOR PHASE 4** | Crash detection, replay recording/playback, ghost AI |
| **track-environment-specialist** | Track geometry, splines | Track generation, obstacles, environment |
| **ui-ux-developer** | Menus, HUD, UI | All UI work, settings, HUD overlays |
| **audio-systems-specialist** | Sound, music | Audio system, spatial audio, sound effects |
| **data-persistence-expert** | Storage, leaderboards | localStorage, stats, serialization |
| **testing-qa-specialist** | Unit tests, E2E tests | All testing, coverage, test infrastructure |
| **performance-optimization-specialist** | Profiling, optimization | Performance issues, memory leaks, bottlenecks |
| **build-deploy-infra** | Build, CI/CD | Build config, deployment, optimization |
| **technical-documentation-specialist** | Docs, API docs | All documentation updates |

### How to Use Agents

**Single Agent**:
```
I need to implement crash detection. Can you help design the collision force threshold system?
```
This will automatically route to the replay-systems-engineer.

**Multiple Agents in Parallel**:
```
I need you to run these agents in parallel:
1. replay-systems-engineer - implement CrashManager.ts
2. testing-qa-specialist - create unit tests for CrashManager
```

**Code Review**:
```
Can you have the architect and performance optimizer review src/systems/ReplayRecorder.ts?
```

### Pro Tips

1. **Be specific**: Mention file names, line numbers, requirements
2. **Reference docs**: Point to PRD.md, roadmaps, config files
3. **Use parallel execution**: "run in parallel" for faster results
4. **Test early**: Use testing-qa-specialist after each feature
5. **Ask before major changes**: Consult technical-architect for structural decisions

---

## 5. Project Architecture

### Folder Structure

```
D:\JavaScript Games\KnotzHardDrivin\
├── src/
│   ├── core/                    # Core engine systems
│   │   ├── GameEngine.ts        # Main game loop (563 lines) ✅
│   │   ├── SceneManager.ts      # Three.js scene, lighting
│   │   ├── PhysicsWorld.ts      # Rapier.js wrapper
│   │   └── StateManager.ts      # FSM (213 lines) ✅
│   ├── entities/                # Game entities
│   │   ├── Vehicle.ts           # Player vehicle (1,235 lines) ✅
│   │   ├── Track.ts             # Track geometry (538 lines) ✅
│   │   ├── Obstacle.ts          # Track obstacles (224 lines) ✅
│   │   ├── Ghost.ts             # Ghost AI (Phase 6)
│   │   └── models/              # Vehicle models (Corvette, Cybertruck)
│   ├── systems/                 # Game systems
│   │   ├── CameraSystem.ts      # Camera modes (447 lines) ✅
│   │   ├── InputSystem.ts       # Keyboard + gamepad (551 lines) ✅
│   │   ├── WaypointSystem.ts    # Lap tracking (243 lines) ✅
│   │   ├── MinimapGenerator.ts  # Minimap (151 lines) ✅
│   │   ├── ReplaySystem.ts      # ⏳ Phase 4 - YOU'LL BUILD THIS
│   │   ├── CrashManager.ts      # ⏳ Phase 4 - YOU'LL BUILD THIS
│   │   ├── AudioSystem.ts       # Phase 7
│   │   └── UISystem.ts          # Phase 7
│   ├── config/                  # Configuration
│   │   ├── PhysicsConfig.ts     # Vehicle physics (526 lines) ✅
│   │   ├── SurfaceConfig.ts     # Friction coefficients (88 lines) ✅
│   │   └── GraphicsConfig.ts    # Three.js settings ✅
│   ├── types/                   # TypeScript definitions
│   │   └── VehicleTypes.ts      # Vehicle type system (643 lines) ✅
│   ├── utils/                   # Utilities
│   │   ├── PerformanceMonitor.ts # FPS tracking (359 lines) ✅
│   │   ├── ObjectPool.ts        # Object pooling (335 lines) ✅
│   │   └── ...
│   └── main.ts                  # Entry point
├── assets/
│   ├── tracks/                  # Track JSON files
│   │   └── track01.json         # Test track ✅
│   ├── models/                  # .glb files
│   ├── textures/                # .jpg/.png
│   └── audio/                   # .mp3/.ogg (Phase 7)
├── tests/
│   ├── unit/                    # 676 passing tests ✅
│   ├── fixtures/                # Test helpers ✅
│   └── setup.ts                 # RAPIER mocks (fixed) ✅
├── __DOCS__/                    # All documentation
└── coverage/                    # Test coverage reports
```

### Key Files Explained

**`src/core/GameEngine.ts`** (563 lines) ✅
- Fixed timestep game loop (60Hz physics)
- Accumulator pattern for frame-rate independence
- Delta time clamping (prevents "spiral of death")
- Integration: Vehicle, Track, WaypointSystem, InputSystem, CameraSystem

**`src/entities/Vehicle.ts`** (1,235 lines) ✅
- 4-wheel independent raycasting (raycast-based, NOT rigid body wheels)
- Spring-damper suspension (Hooke's law)
- Engine simulation (torque curve, 1000-7000 RPM, 5-speed auto)
- Tire force model (slip ratio/angle, Pacejka-inspired)
- Aerodynamics (drag + downforce)
- Damage tracking (ready for crash system integration)
- Zero per-frame allocations (reuses temp vectors)

**`src/systems/CameraSystem.ts`** (447 lines) ✅
- **CHASE_CAMERA** (default) - Third-person racing view
- **FIRST_PERSON** - Cockpit view with velocity look-ahead
- **REPLAY** - Cinematic crane shot (ready for Phase 4)
- Smooth damping, cubic ease-in-out transitions
- Zero per-frame allocations

**`src/systems/InputSystem.ts`** (551 lines) ✅ **FIXED**
- Keyboard + gamepad support
- Input smoothing, deadzones
- Device auto-switching
- **Fixed**: getInput() now returns reference (not spread operator)
- Zero per-frame allocations

**`src/systems/WaypointSystem.ts`** (243 lines) ✅ **FIXED**
- Sequential waypoint validation (anti-shortcut)
- Lap counting, wrong-way detection (dot product)
- Progress tracking (0-100%)
- **Fixed**: getNextWaypointPosition() uses temp vector
- Zero per-frame allocations

**`src/entities/Track.ts`** (538 lines) ✅
- Spline-based track generation (Catmull-Rom)
- 5 section types, 1000-point tessellation
- Trimesh physics collider
- Surface type detection
- Bounds calculation for minimap

### Design Patterns

1. **Fixed Timestep Loop** (GameEngine.ts)
   - Physics: Always 60Hz (1/60s = 0.01667s)
   - Rendering: Variable rate
   - Accumulator pattern prevents drift

2. **Finite State Machine** (StateManager.ts)
   - States: LOADING, MENU, PLAYING, PAUSED, CRASHED, REPLAY, RESULTS
   - Validated transitions (prevents invalid state changes)

3. **Object Pooling** (ObjectPool.ts)
   - Reuse objects instead of allocating
   - Eliminates GC pauses
   - Critical for particles, projectiles

4. **Zero Per-Frame Allocations**
   - Reuse temp vectors/quaternions
   - Prefer `.copy()` over `.clone()`
   - Return references not new objects

### Performance Budgets (60fps = 16.67ms per frame)

| System | Budget | Current | Status |
|--------|--------|---------|--------|
| Physics | 5ms | ~0.5ms | ✅ Excellent |
| Rendering | 8ms | 3-4ms | ✅ Excellent |
| Game Logic | 2ms | <0.5ms | ✅ Excellent |
| Other | 1.67ms | <0.5ms | ✅ Excellent |
| **TOTAL** | 16.67ms | ~4-5ms | ✅ **12ms headroom** |

---

## 6. Development Workflow

### Starting Phase 4

1. **Read Phase 4 roadmap**: `__DOCS__\phase4\Phase_4_ROADMAP.md`
2. **Read PRD Section 4.5**: Crash & Replay specifications
3. **Consult technical-architect**: Design review for replay system
4. **Set up testing**: Work with testing-qa-specialist for test plan
5. **Implement incrementally**: Use replay-systems-engineer as primary agent
6. **Test after each feature**: >80% coverage required
7. **Profile performance**: Replay recording <1ms overhead
8. **Document**: Update docs as you build

### Testing Requirements

**Unit Tests (Vitest)**:
- Target: >80% coverage (>90% preferred)
- All 676 current tests must keep passing
- Mock Three.js and Rapier.js
- Run: `npm test`
- Coverage: `npm test -- --coverage`

**Integration Tests**:
- Test crash → replay → respawn flow
- Test replay recording/playback accuracy
- Test state transitions (PLAYING → CRASHED → REPLAY → PLAYING)

**Performance Validation**:
- Replay recording overhead: <1ms per frame
- Replay playback smooth at 60fps
- No memory leaks during recording/playback
- Chrome DevTools Performance profiling

### TypeScript Strict Mode

**All code MUST**:
- Pass `npm run type-check` with zero errors
- Use TypeScript strict mode (enabled)
- Minimize `any` types (use proper types or `unknown`)
- Have proper interfaces and type definitions

**Known Technical Debt**:
- Some `any` types exist in codebase (deferred to Phase 7)
- Not blocking, but avoid adding new `any` types

---

## 7. Important Conventions

### Naming Conventions

**Files**:
- PascalCase for classes: `CrashManager.ts`, `ReplayRecorder.ts`
- camelCase for utilities: `mathUtils.ts`
- Test files: `CrashManager.test.ts`

**Code**:
- Classes: `PascalCase` (e.g., `ReplaySystem`)
- Functions: `camelCase` (e.g., `recordFrame()`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `CRASH_FORCE_THRESHOLD`)
- Private members: prefix `_` or use `private` keyword

### TSDoc Requirements

**All public APIs MUST have TSDoc**:

```typescript
/**
 * Records current vehicle state for replay playback.
 *
 * @param vehicle - Vehicle instance to record
 * @param deltaTime - Time step in seconds
 * @returns Frame data object
 *
 * @example
 * ```typescript
 * const frame = recorder.recordFrame(vehicle, 0.016);
 * ```
 */
public recordFrame(vehicle: Vehicle, deltaTime: number): FrameData {
  // Implementation...
}
```

### No Emojis in Code

- Do NOT add emojis to code comments
- Do NOT add emojis to console logs
- Do NOT add emojis to documentation
- Exception: If user explicitly requests emojis

### Error Handling

**Always handle errors explicitly**:

```typescript
// ✅ GOOD
try {
  await replayRecorder.saveToStorage();
} catch (error) {
  console.error('Failed to save replay:', error);
  throw new Error('Replay save failed');
}

// ❌ BAD - Silent failure
try {
  await replayRecorder.saveToStorage();
} catch (error) {
  // Silent - DON'T DO THIS
}
```

---

## 8. Critical Performance Guidelines

### No Per-Frame Allocations

```typescript
// ❌ BAD - Allocates every frame
update(deltaTime: number): void {
  const temp = new Vector3(); // ALLOCATES
}

// ✅ GOOD - Reuse temp vector
private tempVec = new Vector3();
update(deltaTime: number): void {
  this.tempVec.set(0, 0, 0); // REUSES
}
```

### Prefer .copy() Over .clone()

```typescript
// ❌ BAD - Allocates new object
const newPos = oldPos.clone();

// ✅ GOOD - Reuses existing
this.tempVec.copy(oldPos);
```

### Object Pooling for Frequent Allocations

```typescript
import { createVector3Pool } from '@utils/ObjectPool';

const pool = createVector3Pool(100);
const temp = pool.acquire();
// Use it...
pool.release(temp);
```

### Memory Leak Prevention

**Always clean up**:

```typescript
dispose(): void {
  // Remove event listeners
  window.removeEventListener('resize', this.resizeHandler);

  // Dispose Three.js resources
  this.mesh.geometry.dispose();
  this.mesh.material.dispose();

  // Cancel animation frames
  if (this.rafId) cancelAnimationFrame(this.rafId);

  // Clear intervals/timers
  clearInterval(this.intervalId);
}
```

---

## 9. Quick Reference Commands

### Development

```bash
npm run dev          # Dev server (http://localhost:4201)
npm run build        # Production build
npm run preview      # Preview production build
```

### Testing

```bash
npm test             # Run all 676 tests
npm run test:ui      # Vitest UI
npm test -- --coverage   # Coverage report
npm run type-check   # TypeScript validation (zero errors)
```

### Debugging

```bash
npm run dev          # Start server with source maps
# F12 → Sources tab → Set breakpoints in TypeScript
# F12 → Performance tab → Record → Analyze
# F12 → Memory tab → Heap snapshots
```

---

## 10. Phase 4 Kickoff Template

### Step 1: Read Requirements

```
Read: __DOCS__\phase4\Phase_4_ROADMAP.md
Read: __DOCS__\PRD.md (Section 4.5 - Crash & Replay)
```

### Step 2: Consult Architect

```
"I'm starting Phase 4 (Crash & Replay System). Please review:
- PRD.md Section 4.5
- Phase 4 roadmap
- Provide implementation order recommendation
- Identify design decisions needed upfront"
```

### Step 3: Implement with replay-systems-engineer

```
"Implement CrashManager.ts with:
- Collision force threshold detection
- Damage severity calculation
- Crash state transition triggers
- Reference: PRD.md Section 4.5.1"
```

```
"Implement ReplayRecorder.ts with:
- 60Hz state capture
- Circular buffer (last 30 seconds)
- Data compression
- Reference: PRD.md Section 4.5.2"
```

```
"Implement ReplayPlayer.ts with:
- Smooth interpolation
- Playback controls (pause/rewind/slow-mo)
- Cinematic camera integration
- Reference: PRD.md Section 4.5.3"
```

### Step 4: Test with testing-qa-specialist

```
"Create unit tests for CrashManager:
- Test collision force thresholds
- Test damage calculations
- Test state transitions
- >80% coverage target"
```

### Step 5: Performance Validation

```
"Profile replay system:
- Replay recording overhead (<1ms target)
- Playback frame times
- Memory usage for 30-second buffer
- Validate smooth 60fps playback"
```

### Step 6: Documentation

```
"Document CrashManager, ReplayRecorder, ReplayPlayer APIs:
- TSDoc on all public methods
- Update README
- Add usage examples"
```

---

## 11. Known Issues & Technical Debt

### Low Priority (Deferred)

1. **Some `any` type usage** (deferred to Phase 7)
   - Location: Various files
   - Impact: Type safety slightly reduced
   - Fix: Replace with proper types during Phase 7 polish

2. **7 E2E test failures** (Playwright config issues)
   - Location: tests/e2e/*.spec.ts
   - Impact: Debug tests, not critical
   - Fix: Phase 8 (Testing & Optimization)

### No Critical Blockers

All critical issues from the completion report review (Oct 17, 2025) have been fixed:
- ✅ TypeScript errors resolved
- ✅ Test infrastructure complete
- ✅ Per-frame allocations eliminated
- ✅ All unit tests passing

---

## 12. Testing Gates Between Phases

**Before proceeding to Phase 5, ALL must pass**:

- [ ] All Phase 4 roadmap tasks completed
- [ ] All unit tests passing (676+ with new tests)
- [ ] Test coverage >80% on crash/replay systems
- [ ] Performance targets met (<1ms replay recording overhead)
- [ ] Zero TypeScript errors (`npm run type-check`)
- [ ] No memory leaks (5-minute heap test)
- [ ] Code review by technical-architect approved
- [ ] Documentation updated
- [ ] Phase 4 completion report written

**If ANY fail**: Fix before proceeding. Do not accumulate technical debt.

---

## Final Thoughts

You're joining a **well-tested, working game**. Phases 0-3 are complete with 676 passing tests, zero compilation errors, and excellent performance. The game is playable right now at http://localhost:4201/.

**Your Mission**: Build the crash detection and replay system that makes crashes dramatic and fun.

**Keys to Success**:
1. Read PRD.md Section 4.5 before coding
2. Use replay-systems-engineer as your primary agent
3. Test early and often (>80% coverage)
4. Profile performance (<1ms replay overhead)
5. Zero per-frame allocations in hot paths
6. Document as you go

**When in Doubt**:
- Consult PRD.md (source of truth)
- Ask technical-architect for guidance
- Run tests: `npm test`
- Check performance: F12 → Performance tab

**You've Got This!** The foundation is solid, the game is working, and the specialized agents are here to help.

---

**Document Version**: 4.0
**Last Updated**: October 17, 2025
**Status**: ✅ Ready for Phase 4
**Next Phase**: Crash & Replay System
**Game Status**: ✅ Fully playable
