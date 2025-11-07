# Hard Drivin' Remake - Alpha 1.0.4

**Status**: Alpha - Core Gameplay Complete
**Version**: 1.0.4
**Last Updated**: November 6, 2025
**Stack**: TypeScript + Three.js + Rapier.js + Vite + Howler.js

---

## Quick Start (5 Minutes)

```bash
npm install
npm run dev          # Opens http://localhost:4200
```

**Controls**:
- WASD or Arrow Keys: Drive
- Space: Handbrake
- R: Reset vehicle
- C: Toggle camera
- ESC: Pause

**Or use Gamepad**: Xbox/PlayStation controllers supported

---

## What's Working (Alpha Features)

### Core Gameplay Loop ✅
1. **Start Race** - Menu system with vehicle selection
2. **Drive** - Physics-based vehicle on stunt track
3. **Crash** - Cinematic replay system with 3-stage camera
4. **Respawn** - Automatic vehicle reset after replay
5. **Complete Race** - 2-lap race with timer system
6. **View Results** - Stats and leaderboard integration

### Systems Complete
- **Vehicle Physics**: 4-wheel raycasting, suspension, engine/transmission, tire forces
- **Track System**: Spline-based tracks with waypoints, obstacles, surface types
- **Camera System**: Chase camera, first-person, cinematic crash replay
- **Crash Detection**: Force-based detection with 3-stage cinematic replay
- **Replay System**: 60Hz recording, smooth interpolation, auto-playback
- **Timer System**: Lap tracking, race timer, checkpoint system
- **Leaderboard**: Top 10 persistent scores with ghost data
- **Audio System**: Engine sounds (RPM-based), spatial audio, volume controls
- **UI/HUD**: Main menu, car selection, in-game HUD, pause menu, results screen

### Performance Metrics
- **Frame Rate**: 77+ fps average (200+ fps peak)
- **Frame Time**: ~4-5ms (~12ms budget remaining)
- **Memory**: 20-70MB stable
- **Tests**: 1156 passing (95.9%)

---

## Project Structure

```
src/
├── core/              # Game engine, state machine, scene manager
├── entities/          # Vehicle, track, obstacles, ghost AI
├── systems/           # Camera, input, audio, crash, replay, timer, UI
├── config/            # Physics tuning, graphics settings
└── types/             # TypeScript definitions

assets/
├── tracks/            # Track JSON definitions
├── models/            # Vehicle .glb files
└── audio/             # Sound effects, engine samples

__DOCS__/              # All documentation
├── PRD.md            # Product requirements (source of truth)
└── phase*/           # Phase completion reports
```

---

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `GameEngine.ts` | 563 | Fixed timestep loop, state machine |
| `Vehicle.ts` | 1235 | 4-wheel physics, suspension, engine |
| `Track.ts` | 538 | Spline generation, collision mesh |
| `CrashManager.ts` | 857 | Crash detection, replay triggering |
| `CameraSystem.ts` | 447 | 3 camera modes, cinematic replays |
| `UISystem.ts` | 718 | Complete UI management |
| `AudioSystem.ts` | 502 | Howler.js integration, spatial audio |

---

## Recent Fixes (Session Nov 6, 2025)

### Critical Gameplay Fixes ✅
1. **Track Clipping** - Track now elevated 0.5m above ground (no more Z-fighting)
2. **Steering Asymmetry** - Fixed Ackermann steering (inner/outer wheel logic)
3. **Crash Replay Camera** - Cinematic 3-stage camera follows crash smoothly
4. **Replay UI** - Removed all overlays for pure crash viewing experience
5. **Wheel Reset** - Steering angles reset to 0 after respawn

### Technical Improvements
- Camera updates during REPLAY state for cinematic effect
- Improved Ackermann steering: applies to target angle before lerping
- Track debug visualization (green wireframe) available
- Clean replay experience (no UI blocking view)

---

## Known Issues

### High Priority (Next Session - UI Facelift)
- UI uses inline styles (prevents external CSS from applying)
- Menu screens need visual polish (gradients, animations, neon effects)
- Settings/Leaderboard screens are basic placeholders

### Low Priority
- 47 test failures (non-critical: AudioSystem timeouts, CrashManager thresholds)
- Some `any` types in codebase (deferred to polish phase)
- Cloud rendering visibility issue (clouds created but not in viewport)

---

## Next Phase: UI/UX Facelift

**Goal**: Transform functional UI into polished retro-arcade experience

**Tasks**:
1. Refactor UISystem.ts to remove inline styles
2. Apply external CSS (gradients, animations, neon glows)
3. Improve settings screen layout
4. Polish leaderboard presentation
5. Add visual feedback animations
6. Responsive design for different screen sizes

**Target**: Production-ready UI matching retro arcade aesthetic

---

## Development Guidelines

### Performance Requirements
- 60fps target (16.67ms budget)
- Physics: <5ms per frame
- Rendering: <8ms per frame
- Logic: <2ms per frame

### Code Standards
- TypeScript strict mode
- Zero per-frame allocations (reuse temp vectors)
- TSDoc comments on all public APIs
- Test coverage >80%

### Testing Commands
```bash
npm test                    # Run all tests
npm test -- --coverage      # Coverage report
npm run type-check          # TypeScript validation
npm run build               # Production build
```

---

## Architecture Highlights

### Fixed Timestep Physics (60Hz)
```typescript
// Physics always runs at 60fps (1/60 = 0.01667s)
// Rendering runs at variable rate
while (accumulator >= FIXED_TIMESTEP) {
  physicsWorld.step(FIXED_TIMESTEP);
  accumulator -= FIXED_TIMESTEP;
}
```

### Zero Per-Frame Allocations
```typescript
// ❌ BAD - Allocates every frame
const temp = new Vector3();

// ✅ GOOD - Reuse temp vector
private tempVec = new Vector3();
this.tempVec.set(0, 0, 0);
```

### Game State Machine
```
LOADING → MENU → PLAYING ⟷ PAUSED
                    ↓
                 CRASHED
                    ↓
                 REPLAY
                    ↓
                 PLAYING (respawn)
                    ↓
                 RESULTS → MENU
```

---

## Documentation

**Primary Docs**:
- `__DOCS__/PRD.md` - Product requirements (source of truth)
- `__DOCS__/PHASE_6_7_COMPLETION_REPORT.md` - Latest completion report
- This file - Current state and quick reference

**Phase Reports**: See `__DOCS__/phase*/` for detailed completion reports

---

## Contact & Repository

- **GitHub**: https://github.com/KnotEnvy/KnotzHardDrivin
- **Issues**: https://github.com/KnotEnvy/KnotzHardDrivin/issues
- **License**: ISC

---

**Status**: ✅ Alpha 1.0.4 - Core gameplay complete, ready for UI polish
**Next**: UI/UX facelift for production launch
