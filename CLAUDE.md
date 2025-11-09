# Hard Drivin' Remake - Alpha 1.0.5

**Status**: Alpha - UI Refactor Complete, Ready for Visual Enhancement
**Version**: 1.0.5
**Last Updated**: November 7, 2025
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
- **UI/HUD**: Main menu, car selection, in-game HUD, pause menu, results screen, settings screen, leaderboard screen (all refactored with external CSS)

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
| `GameEngine.ts` | 1443 | Fixed timestep loop, state machine, menu handlers |
| `Vehicle.ts` | 1235 | 4-wheel physics, suspension, engine |
| `Track.ts` | 538 | Spline generation, collision mesh |
| `CrashManager.ts` | 857 | Crash detection, replay triggering |
| `CameraSystem.ts` | 447 | 3 camera modes, cinematic replays |
| `UISystem.ts` | 815 | Complete UI management (7 screens, external CSS) |
| `AudioSystem.ts` | 502 | Howler.js integration, spatial audio |
| `menus.css` | 1076 | All menu styling, neon aesthetic, animations |

---

## Recent Fixes

### Session Nov 7, 2025 - UI Refactoring ✅
1. **Inline Styles Removed** - Refactored UISystem.ts (~95% of inline styles eliminated)
2. **External CSS Classes** - All UI elements now use semantic CSS classes
3. **Settings Screen** - Created full-featured settings panel (graphics/audio/controls)
4. **Leaderboard Screen** - Built grid-based leaderboard with dynamic population
5. **Menu Navigation** - Connected all menu buttons with proper screen transitions
6. **Keyboard Navigation** - ESC key returns from Settings/Leaderboard to main menu
7. **Neon Aesthetic** - Pure black backgrounds (#000) with intense green glows
8. **Button Polish** - Multi-layer box-shadow glows, 7-layer text shadows on titles

### Session Nov 6, 2025 - Critical Gameplay Fixes ✅
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
- UIPanel enum extended with SETTINGS and LEADERBOARD
- CSS color variables strengthened for retro arcade vibe

---

## Known Issues

### High Priority (Next Session - Visual Enhancement)
- Main menu lacks dynamic background (static black screen)
- No landing/attract mode (needs "INSERT COIN" / "PRESS START" screen)
- Missing animated visual effects (speed lines, particles, transitions)
- No 3D background elements (rotating car, track flythrough)
- Menu transitions are instant (need smooth fades/wipes)

### Low Priority
- 47 test failures (non-critical: AudioSystem timeouts, CrashManager thresholds)
- Some `any` types in codebase (deferred to polish phase)
- Cloud rendering visibility issue (clouds created but not in viewport)
- Missing sound effects for menu navigation

---

## Next Phase: Visual Enhancement - "The Facelift of the Century"

**Goal**: Transform functional menus into a jaw-dropping retro-arcade experience with dynamic backgrounds, animations, and cinematic effects

### Phase 1 - Quick Visual Wins (30 min)
**Immediate Impact Enhancements**:
1. **Animated Gradient Background** - Slow color-shifting backdrop (neon green/magenta/cyan)
2. **Speed Lines Animation** - Racing stripes pulsing from edges toward center
3. **Enhanced Logo Treatment** - Metallic chrome shader, scanlines, glitch effects
4. **Pulsing Start Button** - Intense breathing glow effect to draw attention
5. **Screen Transitions** - Fade to black with speed blur between menus

**Expected Result**: Professional polish, immediate visual upgrade

### Phase 2 - 3D Background Scene (60 min)
**Dynamic 3D Elements**:
1. **Choose One Background Style**:
   - **Option A**: Rotating 3D car model with spotlight in garage setting
   - **Option B**: Flythrough camera loop over the game track
   - **Option C**: Abstract neon tunnel with geometric grid patterns
2. **Particle System** - Floating sparks, dust, speed trails
3. **Depth Effects** - Depth of field blur, vignette, film grain
4. **Parallax Layers** - Multi-layer depth for 2.5D effect

**Expected Result**: Living, breathing background that showcases the game engine

### Phase 3 - Landing/Attract Mode (30 min)
**Arcade-Style Attract Screen**:
1. **"INSERT COIN" / "PRESS START"** splash screen
2. **Auto-Play Demo** - Looping track footage or high score replays
3. **Scrolling High Scores** - Animated ticker showing top 10
4. **Auto-Advance Logic** - Progress to main menu after 30s or any input
5. **CRT Scanline Overlay** - Optional retro TV effect

**Expected Result**: Authentic arcade cabinet experience

### Phase 4 - Polish & Details (Optional)
**Final Touches**:
- Sound effects for menu navigation (whoosh, beep, select)
- Button ripple effects on click
- Chromatic aberration shader (retro CRT edge distortion)
- Loading screen animations
- Responsive design tweaks

### Implementation Order
```
Session Start
    ↓
Phase 1: Quick Wins (Main Menu Visual Effects)
    ↓
Phase 2: 3D Background (Choose: Car/Track/Tunnel)
    ↓
Phase 3: Attract Mode Landing Page
    ↓
Phase 4: Polish (if time permits)
    ↓
Production Ready ✨
```

**Target**: AAA-quality presentation that rivals commercial arcade racers

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

**Status**: ✅ Alpha 1.0.5 - UI refactored, menus functional, ready for visual enhancement
**Next**: "The Facelift of the Century" - Dynamic backgrounds, 3D scenes, attract mode
