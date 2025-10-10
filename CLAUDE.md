# Hard Drivin' Remake - Claude Code Onboarding Guide

**Project**: Hard Drivin' Remake
**Stack**: TypeScript + Three.js + Rapier.js + Vite
**Current Phase**: Phase 3 (Track & Environment)
**Last Updated**: October 10, 2025

---

## TL;DR - What You Need to Know in 60 Seconds

This is a browser-based 3D racing game remake of the classic Hard Drivin' arcade game. We've completed Phase 0 (Project Setup), Phase 1 (Core Engine & Camera System), and Phase 2 (Vehicle Physics & Controls). You're joining at the start of Phase 3 (Track & Environment).

**Quick Facts**:
- 60fps target, <16.67ms frame budget
- TypeScript strict mode, no emojis in code
- >80% test coverage required
- Fixed timestep physics (60Hz always)
- 360 unit tests passing, >95% coverage on core systems
- Zero memory leaks, zero per-frame allocations in hot paths
- Fully functional vehicle with physics simulation

**Read These First**:
1. `D:\JavaScript Games\KnotzHardDrivin\__DOCS__\PRD.md` - Product Requirements (THE authoritative source)
2. `D:\JavaScript Games\KnotzHardDrivin\__DOCS__\roadmap.md` - Phase-by-phase development plan
3. `D:\JavaScript Games\KnotzHardDrivin\__DOCS__\phase2\PHASE_2_COMPLETION_REPORT.md` - What we just finished

**Key Commands**:
- `npm run dev` - Start dev server (localhost:4200)
- `npm test` - Run unit tests
- `npm run type-check` - TypeScript validation
- `npm run build` - Production build

---

## 1. Project Overview

### What We're Building

A modern, browser-based reimagining of the classic **Hard Drivin'** arcade racer. Think: physics-driven stunt racing with loops, jumps, crashes, and cinematic replays. All running at 60fps in the browser.

**Core Experience**:
- Drive a physics-based vehicle around a stunt track
- Hit waypoints, perform stunts, avoid crashes
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
| **Audio** | Howler.js | 2.2+ | Sound effects, spatial audio |
| **Testing** | Vitest + Playwright | Latest | Unit tests + E2E tests |
| **State** | Custom FSM | - | Game state management |

### Project Goals

1. **Performance**: Stable 60fps on modern hardware
2. **Quality**: >80% test coverage, TypeScript strict mode
3. **Maintainability**: Clean architecture, good documentation
4. **Fun**: Arcade feel with realistic physics constraints

---

## 2. Current Status

### Phase Completion Summary

**Phase 0: Project Setup** ✅ COMPLETE
- Vite + TypeScript + Three.js + Rapier.js configured
- Folder structure established
- Build pipeline working
- Dev server running

**Phase 1: Core Engine & Camera System** ✅ COMPLETE
- Fixed timestep game loop (60Hz physics)
- Finite State Machine (FSM) for game states
- Camera system (first-person + replay modes)
- Performance monitoring with live FPS display
- 169 unit tests (96%+ coverage on core systems)
- All memory leaks fixed
- Zero per-frame allocations in critical paths

**Phase 2: Vehicle Physics & Controls** ✅ COMPLETE
- Complete vehicle physics with Rapier.js (1,235 lines)
- 4-wheel independent raycasting system
- Spring-damper suspension simulation
- Engine/transmission simulation (5-speed auto)
- Tire force model with slip calculations
- Input system (keyboard + gamepad) (551 lines)
- Visual mesh rendering (chassis + wheels)
- 194 new unit tests (360 total, all passing)
- Zero per-frame allocations
- Vehicle fully functional and drivable

**Phase 3: Track & Environment** 🔴 NOT STARTED (NEXT)
- Track generation from spline curves
- Waypoint system for lap tracking
- Collision detection with track boundaries
- Surface type detection (tarmac, dirt, grass)
- Environment setup (skybox, props, decorations)

### Key Metrics (Phase 2 Completion)

| Metric | Value | Status |
|--------|-------|--------|
| **Frame Rate** | 200-300 fps (with vehicle) | ✅ Excellent |
| **Frame Time** | 1-3ms (with vehicle physics) | ✅ Excellent |
| **Memory Usage** | 30-40MB | ✅ Excellent |
| **Test Coverage** | >95% (core systems) | ✅ Excellent |
| **Unit Tests** | 360 (all passing) | ✅ Excellent |
| **Memory Leaks** | 0 | ✅ Excellent |
| **TypeScript Errors** | 0 | ✅ Excellent |

### What's Next: Phase 3 Preview

**Duration**: 2 weeks (10 days)
**Complexity**: High
**Primary Systems**: Track generation, waypoint tracking, environment

**Phase 3 Will Deliver**:
- Spline-based track generation system
- Waypoint tracking and lap timing
- Collision detection with track boundaries
- Surface type detection (enables tire grip variation)
- Environment setup (skybox, lighting, decorations)
- Minimap rendering
- >80% test coverage on all track systems

---

## 3. Essential Documents

All documentation lives in `D:\JavaScript Games\KnotzHardDrivin\__DOCS__\`

### Primary Documents (Read These First)

#### `PRD.md` - Product Requirements Document
**Path**: `D:\JavaScript Games\KnotzHardDrivin\__DOCS__\PRD.md`
**Purpose**: THE authoritative source for all product requirements
**What's Inside**:
- Complete vision and goals
- Detailed feature specifications (physics, track, crash/replay, UI, audio)
- Performance requirements (<16.67ms frame time for 60fps)
- Architecture diagrams
- Testing strategy
- Quality gates

**When to Read**: Before implementing ANY feature. This is the source of truth.

#### `roadmap.md` - Development Roadmap
**Path**: `D:\JavaScript Games\KnotzHardDrivin\__DOCS__\roadmap.md`
**Purpose**: Phase-by-phase development plan (14 weeks total)
**What's Inside**:
- Phase 0-8 task breakdowns
- Parallel work opportunities
- Testing criteria per phase
- Deliverables and timelines
- Code examples and implementation guidance

**When to Read**: At the start of each phase, and to understand dependencies.

#### `subAgentsUserGuide.md` - Subagent System Guide
**Path**: `D:\JavaScript Games\KnotzHardDrivin\__DOCS__\subAgentsUserGuide.md`
**Purpose**: How to use specialized agents effectively
**What's Inside**:
- Agent selection matrix (which agent for which task)
- Effective prompting strategies
- Multi-agent workflows
- Phase-specific agent recommendations
- Common scenarios and best practices

**When to Read**: When you need specialized help (physics, graphics, testing, etc.)

#### `PHASE_1_COMPLETION_REPORT.md` - Phase 1 Results
**Path**: `D:\JavaScript Games\KnotzHardDrivin\__DOCS__\phase1\PHASE_1_COMPLETION_REPORT.md`
**Purpose**: Summary of Phase 1 (Core Engine & Camera System)
**What's Inside**:
- All Phase 1 deliverables
- Test coverage reports
- Performance validation
- Issues identified and fixed
- Lessons learned
- Phase 2 preparation checklist

**When to Read**: To understand the foundation you're building on.

#### `PHASE_2_COMPLETION_REPORT.md` - Phase 2 Results
**Path**: `D:\JavaScript Games\KnotzHardDrivin\__DOCS__\phase2\PHASE_2_COMPLETION_REPORT.md`
**Purpose**: Summary of Phase 2 (Vehicle Physics & Controls)
**What's Inside**:
- All Phase 2 deliverables (Vehicle.ts, InputSystem.ts, etc.)
- Test coverage reports (360 tests, 194 new)
- Performance validation
- Architecture decisions
- Known issues and limitations
- Phase 3 preparation checklist

**When to Read**: To understand the vehicle system you're building on.

### Supporting Documents

- `__DOCS__/phase1/PHASE_1A_COMPLETION.md` - Game engine details
- `__DOCS__/phase1/PHASE_1B_COMPLETION_REPORT.md` - Camera system details
- `__DOCS__/phase2/PHASE_2A_VEHICLE_PHYSICS_SUMMARY.md` - Vehicle physics details
- `__DOCS__/phase2/PHASE_2B_INPUT_SYSTEM_SUMMARY.md` - Input system details
- `.claude/commands/` - Custom slash commands (if configured)

---

## 4. Subagent System

We use **specialized agents** for different aspects of development. Think of them as expert consultants you can call on.

### Available Agents (Quick Reference)

| Agent | Specialty | When to Use |
|-------|-----------|-------------|
| `@architect` | System design, architecture | New system design, refactoring, design patterns |
| `@physics-engineer` | Vehicle physics, Rapier.js | Vehicle dynamics, collisions, raycasts |
| `@graphics-engineer` | Three.js, rendering, shaders | Scene setup, cameras, visual effects |
| `@gameplay-designer` | Game loop, FSM, input | Game mechanics, state management, controls |
| `@track-builder` | Track geometry, splines | Track generation, obstacles, minimap |
| `@replay-specialist` | Recording, playback, ghost AI | Replay system, crash detection, ghost cars |
| `@ui-specialist` | Menus, HUD, results screens | All UI work, settings panels |
| `@audio-engineer` | Sound effects, music, spatial audio | Audio system, Howler.js, 3D audio |
| `@data-specialist` | Leaderboards, stats, storage | localStorage, serialization, data management |
| `@test-engineer` | Unit tests, E2E tests | All testing, coverage reports |
| `@performance-optimizer` | Profiling, optimization | Performance issues, memory leaks, bottlenecks |
| `@devops-specialist` | Build, CI/CD, deployment | Build config, deployment, asset optimization |
| `@documentation-writer` | README, API docs, guides | All documentation updates |

### How to Use Agents Effectively

**Single Agent Request**:
```
@physics-engineer "Implement vehicle wheel raycasting in Vehicle.ts using Rapier.js.
Requirements: 4 wheels, independent suspension, handle airborne state."
```

**Multi-Agent Workflow**:
```
1. @architect "Design the vehicle physics architecture"
2. @physics-engineer "Implement the design"
3. @test-engineer "Create unit tests"
4. @documentation-writer "Document the API"
```

**Code Review**:
```
@architect "Review src/entities/Vehicle.ts for design issues"
@performance-optimizer "Check for performance problems"
```

**Debugging**:
```
@physics-engineer "Vehicle flips on landing. Happens after jumps >5m at speeds >30m/s.
File: src/entities/Vehicle.ts, line 245 (suspension force application)"
```

### Pro Tips

1. **Be specific**: Mention file names, line numbers, requirements
2. **Reference docs**: Point to PRD.md, roadmap.md, config files
3. **Context matters**: Mention which phase you're in
4. **Ask before major changes**: Consult @architect for structural decisions
5. **Test early**: Use @test-engineer after each feature
6. **Document as you go**: Update docs with @documentation-writer

See `subAgentsUserGuide.md` for comprehensive examples and workflows.

---

## 5. Project Architecture

### Folder Structure

```
D:\JavaScript Games\KnotzHardDrivin\
├── src/
│   ├── core/                    # Core engine systems
│   │   ├── GameEngine.ts        # Main game loop, delta time (325 lines)
│   │   ├── SceneManager.ts      # Three.js scene, lighting (317 lines)
│   │   ├── PhysicsWorld.ts      # Rapier.js wrapper
│   │   └── StateManager.ts      # FSM for game states (213 lines)
│   ├── entities/                # Game entities (vehicles, obstacles)
│   │   ├── Vehicle.ts           # Player vehicle (1,235 lines) ✅
│   │   ├── Ghost.ts             # AI ghost opponent (Phase 6)
│   │   ├── Obstacle.ts          # Track obstacles (Phase 3)
│   │   └── Track.ts             # Track geometry (Phase 3)
│   ├── systems/                 # Game systems
│   │   ├── CameraSystem.ts      # First-person + replay cams (447 lines) ✅
│   │   ├── InputSystem.ts       # Keyboard + gamepad (551 lines) ✅
│   │   ├── AudioSystem.ts       # Sound effects + music (Phase 7)
│   │   ├── UISystem.ts          # HUD + menus (Phase 7)
│   │   ├── ReplaySystem.ts      # Recording + playback (Phase 4)
│   │   └── WaypointSystem.ts    # Progress tracking (Phase 3)
│   ├── components/              # Reusable components
│   │   ├── RigidBodyComponent.ts
│   │   ├── MeshComponent.ts
│   │   └── TransformComponent.ts
│   ├── utils/                   # Utilities
│   │   ├── AssetLoader.ts       # GLTF, texture, audio loading
│   │   ├── MathUtils.ts         # Vector operations
│   │   ├── Constants.ts         # Game configuration
│   │   ├── Logger.ts            # Debug logging
│   │   ├── PerformanceMonitor.ts # FPS tracking (359 lines) ✅
│   │   └── ObjectPool.ts        # Object pooling (335 lines) ✅
│   ├── config/                  # Configuration files
│   │   ├── PhysicsConfig.ts     # Vehicle physics settings (526 lines) ✅
│   │   ├── GraphicsConfig.ts    # Three.js settings ✅
│   │   └── GameConfig.ts        # Gameplay tuning (Phase 3+)
│   ├── types/                   # TypeScript definitions
│   │   ├── VehicleTypes.ts      # Vehicle type system (643 lines) ✅
│   │   └── index.d.ts
│   └── main.ts                  # Entry point
├── assets/
│   ├── models/                  # .glb files
│   ├── textures/                # .jpg/.png files
│   └── audio/                   # .mp3/.ogg files
├── tests/
│   ├── unit/                    # Vitest unit tests
│   │   ├── Vehicle.test.ts      # 84 tests ✅
│   │   ├── InputSystem.test.ts  # 50 tests ✅
│   │   ├── PhysicsConfig.test.ts # 60 tests ✅
│   │   ├── StateManager.test.ts # 50 tests ✅
│   │   ├── PerformanceMonitor.test.ts # 45 tests ✅
│   │   ├── CameraSystem.test.ts # 43 tests ✅
│   │   └── GameEngine.test.ts   # 31 tests ✅
│   ├── fixtures/
│   │   ├── vehicleFixtures.ts   # 30+ vehicle test fixtures ✅
│   │   └── testHelpers.ts       # 20+ test utilities ✅
│   ├── e2e/                     # Playwright E2E tests (Phase 8)
│   └── setup.ts                 # Global test mocks ✅
├── __DOCS__/                    # All documentation
│   ├── PRD.md                   # Product requirements ✅
│   ├── roadmap.md               # Development roadmap ✅
│   ├── subAgentsUserGuide.md   # Agent usage guide ✅
│   ├── phase1/                  # Phase 1 completion docs ✅
│   └── phase2/                  # Phase 2 completion docs ✅
│       ├── PHASE_2_COMPLETION_REPORT.md
│       ├── PHASE_2A_VEHICLE_PHYSICS_SUMMARY.md
│       ├── PHASE_2B_INPUT_SYSTEM_SUMMARY.md
│       └── README.md
├── public/                      # Static assets
├── coverage/                    # Test coverage reports
├── dist/                        # Production build output
├── index.html                   # HTML entry point
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── vite.config.ts               # Vite build config
└── vitest.config.ts             # Test config
```

### Key Files Explained

**`src/core/GameEngine.ts`** (325 lines) ✅ COMPLETE
- Main game loop with fixed timestep (60Hz)
- Accumulator pattern for frame-rate independence
- Delta time clamping (prevents "spiral of death")
- Game state management integration
- Tab visibility handling

**`src/core/StateManager.ts`** (213 lines) ✅ COMPLETE
- Finite State Machine (FSM)
- States: LOADING, MENU, PLAYING, PAUSED, CRASHED, REPLAY, RESULTS
- Transition validation (prevents invalid state changes)
- State graph visualization

**`src/systems/CameraSystem.ts`** (447 lines) ✅ COMPLETE
- Two camera modes: first-person and replay
- Smooth damping (lerp position, slerp rotation)
- Cubic ease-in-out transitions
- Zero per-frame allocations (reuses temp vectors)

**`src/utils/PerformanceMonitor.ts`** (359 lines) ✅ COMPLETE
- FPS tracking (rolling 100-frame average)
- Frame time monitoring
- Memory usage tracking
- Live FPS display with color coding
- Performance status: Good/Marginal/Poor

**`src/utils/ObjectPool.ts`** (335 lines) ✅ COMPLETE
- Generic object pooling with type safety
- Eliminates per-frame allocations
- Pre-configured pools: Vector3, Quaternion, Matrix4, Array
- Ready for particle systems in Phase 3+

**`src/config/GraphicsConfig.ts`** ✅ COMPLETE
- Quality presets: Low, Medium, High
- Shadow map sizes: 512, 1024, 2048
- Antialiasing, anisotropy settings
- Auto-detection of hardware capabilities

**`src/entities/Vehicle.ts`** (1,235 lines) ✅ COMPLETE
- Complete physics simulation with Rapier.js
- 4-wheel independent raycasting (not rigid body wheels)
- Spring-damper suspension (Hooke's law + damping)
- Engine simulation (torque curve, 1000-7000 RPM)
- 5-speed automatic transmission with gear shifting
- Tire force model (slip ratio/angle calculations)
- Aerodynamics (drag + downforce)
- Damage tracking system
- Visual mesh rendering (chassis + 4 wheels)
- Zero per-frame allocations (reuses temp objects)

**`src/systems/InputSystem.ts`** (551 lines) ✅ COMPLETE
- Keyboard support (WASD + arrows)
- Gamepad support (Xbox/PS layout)
- Input smoothing with configurable speed
- Deadzone support for analog sticks
- Device auto-switching (keyboard ↔ gamepad)
- Edge-triggered buttons (reset, pause)
- Zero per-frame allocations

**`src/types/VehicleTypes.ts`** (643 lines) ✅ COMPLETE
- Complete type system for vehicle physics
- Interfaces: VehicleConfig, WheelState, VehicleInput, VehicleTelemetry
- Enums: SurfaceType, DriveType, DamageSeverity, WheelIndex
- Full TypeScript strict mode compliance

**`src/config/PhysicsConfig.ts`** (526 lines) ✅ COMPLETE
- DEFAULT_VEHICLE_CONFIG with realistic physics
- 4 vehicle presets (DEFAULT, FWD, AWD, TRUCK)
- Physics constants and tuning parameters
- Brake configuration
- Anti-roll bar settings

### Design Patterns in Use

1. **Fixed Timestep Loop** (GameEngine.ts)
   - Physics runs at exactly 60Hz regardless of frame rate
   - Rendering runs at variable rate
   - Accumulator pattern prevents physics drift

2. **Finite State Machine** (StateManager.ts)
   - Game states with validated transitions
   - Prevents illegal state changes (e.g., LOADING → CRASHED)
   - Clean separation of concerns

3. **Object Pooling** (ObjectPool.ts)
   - Reuse objects instead of creating new ones
   - Eliminates garbage collection pauses
   - Critical for particle systems, projectiles

4. **Observer Pattern** (to be implemented)
   - Event bus for collision events, waypoint triggers
   - Decouples systems

5. **Component Pattern** (entities/)
   - Vehicles, obstacles use component composition
   - RigidBodyComponent, MeshComponent, TransformComponent

### Performance Budgets (Per Frame, 60fps = 16.67ms)

| System | Budget | Current | Status |
|--------|--------|---------|--------|
| **Physics** | 5ms | <0.1ms | ✅ Excellent |
| **Rendering** | 8ms | 1-2ms | ✅ Excellent |
| **Game Logic** | 2ms | <0.5ms | ✅ Excellent |
| **Other** | 1.67ms | <0.5ms | ✅ Excellent |
| **TOTAL** | 16.67ms | ~3ms | ✅ Excellent |

**Headroom**: ~13ms available for Phase 2+ features

---

## 6. Development Workflow

### Starting a New Phase

1. **Read the roadmap** for that phase (`__DOCS__/roadmap.md`)
2. **Consult @architect** for design guidance
3. **Review PRD.md** sections related to the phase
4. **Set up testing infrastructure** (consult @test-engineer)
5. **Implement features incrementally**
6. **Test after each feature** (>80% coverage required)
7. **Profile performance** (consult @performance-optimizer)
8. **Document as you go** (consult @documentation-writer)
9. **Code review** with @architect before marking phase complete

### Testing Requirements

**Unit Tests (Vitest)**:
- Target: >80% coverage (>90% preferred)
- Test BEFORE pushing to main
- Write tests for all public APIs
- Mock Three.js and Rapier.js dependencies
- Run: `npm test`

**Integration Tests**:
- Test system interactions (e.g., Vehicle + Track)
- Test state transitions (e.g., Crash → Replay → Respawn)
- Test data flow (e.g., Input → Vehicle → Physics)

**E2E Tests (Playwright)** - Phase 8:
- Full user flows (e.g., Start → Race → Crash → Replay → Complete)
- Cross-browser testing
- Run: `npm run test:e2e`

**Performance Tests**:
- Profile with Chrome DevTools
- Check frame times: `npm run dev` → F12 → Performance tab
- Memory leak detection: Heap snapshots over 10 minutes
- Validate <16.67ms frame time

### TypeScript Strict Mode Compliance

**All code MUST**:
- Pass `npm run type-check` with zero errors
- Use TypeScript strict mode (enabled in tsconfig.json)
- No `any` types (use `unknown` if type is truly unknown)
- Proper interfaces and type definitions
- Full type safety

### Code Review Process

1. **Self-review**: Check your own code first
2. **Automated checks**: `npm run type-check` and `npm test`
3. **Architect review**: `@architect "Review [file] for design issues"`
4. **Performance review**: `@performance-optimizer "Check [file] for issues"`
5. **Address feedback**: Fix issues before proceeding
6. **Document changes**: Update README, API docs, comments

### Performance Validation Steps

After implementing any feature:

1. **Run performance monitor**: FPS should stay >60
2. **Check frame time**: Should be <16.67ms
3. **Profile in Chrome**: Performance tab → Record → Analyze
4. **Check memory**: Should not grow unbounded (heap snapshots)
5. **Test on lower-end hardware**: Use Chrome throttling (4x slowdown)
6. **Consult @performance-optimizer**: If any concerns

---

## 7. Important Conventions

### Naming Conventions

**Files**:
- PascalCase for classes: `GameEngine.ts`, `Vehicle.ts`
- camelCase for utilities: `assetLoader.ts`, `mathUtils.ts`
- Test files: `[FileName].test.ts`

**Code**:
- Classes: `PascalCase` (e.g., `GameEngine`)
- Functions/methods: `camelCase` (e.g., `updatePhysics()`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_SPEED`)
- Private members: prefix `_` (e.g., `_internalState`)
- Interfaces: No `I` prefix unless ambiguous (e.g., `Vehicle` not `IVehicle`)

**Variables**:
- `const` preferred over `let`
- Never use `var`
- Descriptive names (e.g., `suspensionForce` not `sf`)

### File Organization

**Each file should**:
- Have a single, clear purpose
- Export one primary class/function
- Be <500 lines (refactor if larger)
- Have TSDoc comments on all public APIs
- Have inline comments for complex logic

**Import order**:
1. External libraries (Three.js, Rapier.js)
2. Internal core modules (@core/*)
3. Internal systems (@systems/*)
4. Internal utilities (@utils/*)
5. Types and interfaces

### TSDoc Documentation Requirements

**All public APIs MUST have TSDoc**:

```typescript
/**
 * Applies suspension forces to vehicle wheels based on raycast results.
 *
 * @param wheelIndex - Index of the wheel (0-3)
 * @param raycastHit - Rapier.js raycast result
 * @param deltaTime - Time step in seconds
 * @returns Applied suspension force in Newtons
 *
 * @example
 * ```typescript
 * const force = vehicle.applySuspensionForce(0, hit, 0.016);
 * ```
 */
public applySuspensionForce(
  wheelIndex: number,
  raycastHit: RaycastHit,
  deltaTime: number
): number {
  // Implementation...
}
```

**Include**:
- Description of what it does
- `@param` for each parameter
- `@returns` for return value
- `@throws` for exceptions
- `@example` for complex functions

### No Emojis in Code (Unless Requested)

- Do NOT add emojis to code comments
- Do NOT add emojis to console logs
- Do NOT add emojis to documentation
- EXCEPTION: If user explicitly requests emojis

### Error Handling Patterns

**Always handle errors explicitly**:

```typescript
// ✅ GOOD - Explicit error handling
try {
  await rapier.init();
} catch (error) {
  console.error('Failed to initialize Rapier:', error);
  throw new Error('Physics engine initialization failed');
}

// ❌ BAD - Silent failure
try {
  await rapier.init();
} catch (error) {
  // Silent failure - DON'T DO THIS
}
```

**Use TypeScript error types**:

```typescript
if (error instanceof RapierError) {
  // Handle Rapier-specific error
} else if (error instanceof NetworkError) {
  // Handle network error
} else {
  // Handle unknown error
}
```

---

## 8. Quick Start Commands

### Development

```bash
# Start dev server (http://localhost:4200)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing

```bash
# Run all unit tests
npm test

# Run tests with UI
npm run test:ui

# Run E2E tests (Phase 8)
npm run test:e2e

# Generate coverage report
npm test -- --coverage
```

### Code Quality

```bash
# TypeScript type checking
npm run type-check

# Lint code
npm run lint

# Format code with Prettier
npm run format
```

### Debugging

```bash
# Dev server with source maps (already enabled)
npm run dev

# Then open Chrome DevTools:
# - F12
# - Sources tab → see TypeScript source files
# - Set breakpoints
# - Step through code
```

---

## 9. Critical Notes

### Memory Leak Prevention

**Always clean up resources**:

```typescript
class MySystem {
  private resizeHandler = this.onResize.bind(this);

  init(): void {
    window.addEventListener('resize', this.resizeHandler);
  }

  dispose(): void {
    // ✅ CRITICAL: Remove event listeners
    window.removeEventListener('resize', this.resizeHandler);

    // ✅ Dispose Three.js resources
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();

    // ✅ Cancel RAF loops
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }
}
```

**Common leak sources**:
1. Event listeners not removed (resize, click, etc.)
2. requestAnimationFrame loops not cancelled
3. Three.js geometries/materials not disposed
4. Rapier.js bodies/colliders not removed
5. Timers/intervals not cleared

**Test for leaks**:
- Record heap snapshots every minute for 10 minutes
- Heap size should be stable (±5MB variance acceptable)
- Use Chrome DevTools → Memory → Heap Snapshot

### Performance Optimization

**No per-frame allocations in hot paths**:

```typescript
// ❌ BAD - Creates new vector every frame
update(deltaTime: number): void {
  const velocity = new Vector3(x, y, z); // ALLOCATES MEMORY
}

// ✅ GOOD - Reuses temp vector
private tempVec = new Vector3();

update(deltaTime: number): void {
  this.tempVec.set(x, y, z); // REUSES EXISTING MEMORY
}
```

**Use ObjectPool for temporary objects**:

```typescript
import { createVector3Pool } from '@utils/ObjectPool';

const vectorPool = createVector3Pool(100);

// Acquire from pool
const temp = vectorPool.acquire();
temp.set(x, y, z);

// Use it...

// Release back to pool
vectorPool.release(temp);
```

**Prefer `.copy()` over `.clone()`**:

```typescript
// ❌ BAD - Allocates new object
const newPos = oldPos.clone();

// ✅ GOOD - Reuses existing object
this.tempVec.copy(oldPos);
```

### Fixed Timestep Physics (60Hz Always)

**Physics MUST run at exactly 60Hz**:
- Independent of rendering frame rate
- GameEngine.ts uses accumulator pattern
- Physics step is always `1/60` seconds (0.01667s)
- This ensures deterministic physics (same inputs = same outputs)

**Why this matters**:
- Physics stability (prevents tunneling, instability)
- Replay accuracy (recorded frames are deterministic)
- Networked multiplayer (future) requires determinism

**Never change `fixedTimeStep` in GameEngine.ts** unless you have a very good reason and architect approval.

### State Machine Validation

**Invalid transitions are BLOCKED**:

```typescript
// ❌ This will fail - invalid transition
stateManager.setState(GameState.LOADING, GameState.CRASHED);
// Error: Cannot transition from LOADING to CRASHED

// ✅ Valid transitions only
stateManager.setState(GameState.LOADING, GameState.MENU); // OK
stateManager.setState(GameState.MENU, GameState.PLAYING); // OK
```

**Valid state graph**:
```
LOADING → MENU → PLAYING ↔ PAUSED
              → PLAYING → CRASHED → REPLAY → PLAYING
              → PLAYING → RESULTS → MENU or PLAYING
```

**Before adding new states**:
1. Consult @architect
2. Update StateManager.ts transition map
3. Add tests for new transitions
4. Update documentation

---

## 10. Next Steps Template

### How to Kick Off Phase 3 (Track & Environment)

**Step 1: Read Phase 3 Requirements**
```
Read: D:\JavaScript Games\KnotzHardDrivin\__DOCS__\roadmap.md (Weeks 5-6 section)
Read: D:\JavaScript Games\KnotzHardDrivin\__DOCS__\PRD.md (Section 4.2 - Track System)
```

**Step 2: Consult Architect for Design**
```
@architect "We're starting Phase 3 (Track & Environment). Please review:
- PRD.md Section 4.2 (Track System)
- roadmap.md Phase 3 tasks
- Provide implementation order recommendation
- Identify any design decisions needed upfront"
```

**Step 3: Set Up Testing Infrastructure**
```
@test-engineer "Prepare test plan for Phase 3 (Track & Environment):
- What needs mocking? (Three.js, track generation)
- Test fixtures needed
- Coverage targets per component"
```

**Step 4: Implement Incrementally**

Work with specialized agents:

```
# Session 1: Track spline system
@track-environment-specialist "Implement Track.ts with spline-based track generation
- Catmull-Rom splines for smooth curves
- Track width, banking support
- Reference: PRD.md Section 4.2.1"

# Session 2: Collision detection
@track-environment-specialist "Implement track boundary collision
- Detect vehicle-track collisions
- Trigger damage system from Phase 2
- Reference: PRD.md Section 4.2.2"

# Session 3: Waypoint system
@gameplay-systems-designer "Implement WaypointSystem.ts
- Lap counting and timing
- Progress tracking
- Reference: PRD.md Section 4.3"

# And so on...
```

**Step 5: Test After Each Session**
```
@test-engineer "Create unit tests for [feature just implemented]
- Test edge cases
- >80% coverage
- Mock Three.js dependencies"
```

**Step 6: Performance Validation**
```
@performance-optimizer "Profile track rendering performance
- Frame time budget: <8ms for rendering
- Check for memory allocations
- Validate smooth rendering"
```

**Step 7: Documentation**
```
@documentation-writer "Document Track.ts and WaypointSystem.ts APIs
- TSDoc comments on all public methods
- Update README with track system info
- Add usage examples"
```

**Step 8: Phase Completion Review**
```
@architect "Review Phase 3 completion:
- All roadmap tasks done?
- All tests passing?
- Performance targets met?
- Ready for Phase 4?"
```

### Which Agents to Consult First (Phase 3)

1. **@architect** - Review phase design, architecture decisions
2. **@track-environment-specialist** - Primary implementation agent for Phase 3
3. **@gameplay-systems-designer** - Waypoint system, lap timing
4. **@3d-graphics-renderer** - Environment visuals, skybox
5. **@test-engineer** - Testing infrastructure, coverage validation
6. **@performance-optimizer** - Performance profiling, optimization

### Testing Gates Between Phases

**Before proceeding to next phase, ALL must pass**:

- [ ] All roadmap tasks completed
- [ ] All unit tests passing
- [ ] Test coverage >80% on new code
- [ ] Performance targets met (frame time <16.67ms)
- [ ] Zero TypeScript errors (`npm run type-check`)
- [ ] No memory leaks (5-minute heap test)
- [ ] Code review by @architect approved
- [ ] Documentation updated
- [ ] Phase completion report written

**If ANY fail**: Fix issues before proceeding. Do not accumulate technical debt.

---

## Appendix: Useful Commands

### Git Workflow

```bash
# Check status
git status

# Stage changes
git add src/entities/Vehicle.ts

```

### Performance Profiling

```bash
# Start dev server
npm run dev

# Open Chrome DevTools (F12)
# Performance tab → Record → Perform actions → Stop
# Analyze flame graph, frame times, memory usage
```

### Debugging Three.js

```bash
# Install Three.js DevTools extension for Chrome/Firefox
# Then in browser console:
console.log(scene.children); // Inspect scene graph
console.log(renderer.info); // Render stats
```

### Debugging Rapier.js

```typescript
// Enable Rapier debug rendering (temporary)
import { PhysicsWorld } from '@core/PhysicsWorld';

physicsWorld.world.debugRender(); // Shows colliders, forces
```

### Quick Reference: File Paths

All paths are absolute from project root: `D:\JavaScript Games\KnotzHardDrivin\`

```
Core Engine:
- D:\JavaScript Games\KnotzHardDrivin\src\core\GameEngine.ts
- D:\JavaScript Games\KnotzHardDrivin\src\core\StateManager.ts
- D:\JavaScript Games\KnotzHardDrivin\src\core\SceneManager.ts
- D:\JavaScript Games\KnotzHardDrivin\src\core\PhysicsWorld.ts

Entities:
- D:\JavaScript Games\KnotzHardDrivin\src\entities\Vehicle.ts (NEW - Phase 2)

Systems:
- D:\JavaScript Games\KnotzHardDrivin\src\systems\CameraSystem.ts
- D:\JavaScript Games\KnotzHardDrivin\src\systems\InputSystem.ts (NEW - Phase 2)

Types:
- D:\JavaScript Games\KnotzHardDrivin\src\types\VehicleTypes.ts (NEW - Phase 2)

Utilities:
- D:\JavaScript Games\KnotzHardDrivin\src\utils\PerformanceMonitor.ts
- D:\JavaScript Games\KnotzHardDrivin\src\utils\ObjectPool.ts

Config:
- D:\JavaScript Games\KnotzHardDrivin\src\config\GraphicsConfig.ts
- D:\JavaScript Games\KnotzHardDrivin\src\config\PhysicsConfig.ts (NEW - Phase 2)

Tests:
- D:\JavaScript Games\KnotzHardDrivin\tests\unit\Vehicle.test.ts (NEW - Phase 2)
- D:\JavaScript Games\KnotzHardDrivin\tests\unit\InputSystem.test.ts (NEW - Phase 2)
- D:\JavaScript Games\KnotzHardDrivin\tests\unit\PhysicsConfig.test.ts (NEW - Phase 2)
- D:\JavaScript Games\KnotzHardDrivin\tests\fixtures\vehicleFixtures.ts (NEW - Phase 2)
- D:\JavaScript Games\KnotzHardDrivin\tests\fixtures\testHelpers.ts (NEW - Phase 2)
- D:\JavaScript Games\KnotzHardDrivin\tests\unit\StateManager.test.ts
- D:\JavaScript Games\KnotzHardDrivin\tests\unit\PerformanceMonitor.test.ts
- D:\JavaScript Games\KnotzHardDrivin\tests\unit\CameraSystem.test.ts
- D:\JavaScript Games\KnotzHardDrivin\tests\unit\GameEngine.test.ts
- D:\JavaScript Games\KnotzHardDrivin\tests\setup.ts

Documentation:
- D:\JavaScript Games\KnotzHardDrivin\__DOCS__\PRD.md
- D:\JavaScript Games\KnotzHardDrivin\__DOCS__\roadmap.md
- D:\JavaScript Games\KnotzHardDrivin\__DOCS__\subAgentsUserGuide.md
- D:\JavaScript Games\KnotzHardDrivin\__DOCS__\phase1\PHASE_1_COMPLETION_REPORT.md
- D:\JavaScript Games\KnotzHardDrivin\__DOCS__\phase2\PHASE_2_COMPLETION_REPORT.md (NEW - Phase 2)
```

---

## Final Thoughts

You're joining a well-architected project with solid foundations. Phases 0, 1, and 2 are complete with excellent test coverage, zero memory leaks, and great performance. The vehicle is fully functional and ready for track integration.

**Keys to Success**:
1. Read PRD.md and roadmap.md before implementing features
2. Use specialized agents for their expertise
3. Test early and often (>80% coverage)
4. Profile performance regularly (<16.67ms frame time)
5. No per-frame allocations in hot paths
6. Document as you go
7. Ask @architect before major design changes

**When in Doubt**:
- Consult PRD.md (the source of truth)
- Ask @architect for guidance
- Run tests (`npm test`)
- Check performance (`npm run dev` → F12 → Performance tab)

**You've Got This!** The foundation is solid (Phases 0-2 complete), the documentation is comprehensive, and the specialized agents are here to help. Welcome to Phase 3 of the Hard Drivin' Remake project.

---

**Document Version**: 2.0
**Last Updated**: October 10, 2025
**Status**: Ready for Phase 3
**Next Phase**: Track & Environment
