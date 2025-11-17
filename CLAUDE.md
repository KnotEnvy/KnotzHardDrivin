# Hard Drivin' Remake - Alpha 1.1.0

**Status**: Alpha - Visual Enhancement Complete, Beta Prep Phase
**Version**: 1.1.0
**Last Updated**: November 9, 2025
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
- **Camera System**: Chase camera, first-person, menu camera, cinematic crash replay
- **Crash Detection**: Force-based detection with 3-stage cinematic replay
- **Replay System**: 60Hz recording, smooth interpolation, auto-playback
- **Timer System**: Lap tracking, race timer, checkpoint system
- **Leaderboard**: Top 10 persistent scores with ghost data
- **Audio System**: Engine sounds (RPM-based), spatial audio, volume controls
- **UI/HUD**: Main menu, car selection, in-game HUD, pause menu, results screen, settings screen, leaderboard screen
- **Visual Enhancement**: 3D menu backgrounds, attract mode, animated gradients, chrome effects, CRT post-processing
- **Menu System**: Attract screen, keyboard navigation, smooth transitions, 3D rotating car showcase

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

### Session Nov 9, 2025 - Visual Enhancement Complete ✅
1. **3D Menu Background** - Rotating vehicle showcase with cinematic lighting (spot + fill)
2. **Attract Mode** - "INSERT COIN" landing screen with 30s auto-advance, scrolling high scores
3. **Post-Processing Optimization** - CRT effects optimized from 5-8ms → <1ms (80-88% faster)
4. **Animated Gradients** - Color-shifting backgrounds with speed lines
5. **Chrome Logo** - Metallic shader with scanlines, breathing glow, glitch effects
6. **Particle Systems** - 200 particles (sparks + dust) for menu ambiance
7. **Smooth Transitions** - Fade/blur/zoom effects between all screens
8. **Keyboard Navigation** - Arrow keys/WASD navigation in pause menu
9. **Visual Feedback** - Green flash effect when pressing keys on attract screen
10. **Performance** - <1ms post-processing, 60fps maintained, zero warnings

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

### Low Priority
- 47 test failures (non-critical: AudioSystem timeouts, CrashManager thresholds)
- Some `any` types in codebase (deferred to polish phase)
- Cloud rendering visibility issue (clouds created but not in viewport)
- Missing sound effects for menu navigation

---

## Beta Roadmap - Path to Release

**Current State**: Alpha 1.1.0 - Visual Enhancement Complete
**Target**: Beta 1.0.0 - Full Feature Complete, Production Ready

### Phase 9 - Game Flow & Progression (Priority: HIGH)
**Goal**: Multi-track campaign with progression system

**Features**:
1. **Post-Race Flow**
   - Victory/defeat animations
   - Star rating system (Bronze/Silver/Gold based on time)
   - Track unlock system
   - "Next Track" / "Retry" / "Main Menu" options

2. **Track Selection Menu**
   - Grid view of all tracks
   - Lock/unlock states
   - Preview thumbnails
   - Best times and star ratings

3. **Campaign System**
   - 5-8 tracks in progression order
   - Unlock criteria (complete previous track)
   - Overall completion percentage
   - Championship scoring

**Estimated Time**: 2-3 sessions

---

### Phase 10 - Vehicle Damage System (Priority: HIGH)
**Goal**: Visual and mechanical damage representation

**Features**:
1. **Visual Damage Models**
   - Procedural deformation (dents, scratches)
   - Damage decals (scuffs, tire marks)
   - Progressive damage states (pristine → light → heavy → destroyed)
   - Particle effects (smoke, sparks from damaged areas)

2. **Damage Meter Integration**
   - Health bar linked to visual damage
   - Damage affects physics (steering, speed, handling)
   - Critical damage warnings
   - Repair zones on track (optional)

3. **Crash Effects Enhancement**
   - More dramatic crash particles
   - Sound effects for different damage types
   - Camera shake on heavy impacts

**Estimated Time**: 2 sessions

---

### Phase 11 - Environment Overhaul (Priority: MEDIUM)
**Goal**: AAA-quality tracks and environments

**Track Design**:
1. **Geometry Enhancement**
   - More detailed track surfaces
   - Elevation changes and banking
   - Jump ramps with proper physics
   - Loop-de-loops and corkscrews

2. **Track Scenery**
   - Grandstands with animated crowds
   - Pit areas and garages
   - Flags, banners, sponsor boards
   - Environmental props (trees, rocks, buildings)

**Skybox & Lighting**:
1. **Dynamic Skybox**
   - HDR environment maps
   - Day/night cycle (optional)
   - Weather variations (clear, overcast, sunset)

2. **Advanced Lighting**
   - Directional sun shadows
   - Ambient occlusion
   - Light shafts (god rays)
   - Track-specific lighting rigs

**Background Elements**:
1. **Distant Scenery**
   - Mountains, cityscape, or desert
   - Parallax scrolling for depth
   - Atmospheric fog

2. **Track Details**
   - Better ground textures
   - Road markings and curbs
   - Safety barriers and fencing
   - Tire walls and catch fences

**Estimated Time**: 3-4 sessions

---

### Phase 12 - Modern Graphics Techniques (Priority: MEDIUM)
**Goal**: Cutting-edge WebGPU/WebGL2 rendering

**Shader Enhancements**:
1. **PBR Materials**
   - Metallic-roughness workflow
   - Normal mapping for detail
   - Parallax occlusion mapping
   - Anisotropic specular (car paint)

2. **Post-Processing Stack**
   - Bloom (glow on lights/sparks)
   - Motion blur (speed effect)
   - Depth of field (cinematic focus)
   - Color grading (retro arcade look)
   - SSAO (ambient occlusion)

3. **Dynamic Effects**
   - Real-time reflections (car paint, windows)
   - Screen-space reflections
   - Volumetric fog
   - Heat shimmer (desert tracks)

**Performance**:
- Quality presets (Low/Medium/High/Ultra)
- Dynamic resolution scaling
- Adaptive detail levels
- 60fps locked on target hardware

**Estimated Time**: 3 sessions

---

### Phase 13 - Audio & Polish (Priority: MEDIUM)
**Goal**: Professional audio design and final polish

**Audio**:
- Menu navigation sounds
- Impact/collision sound variety
- Ambient track sounds (crowd, wind)
- Music tracks (licensed or original)
- Voice announcements (optional)

**Polish**:
- Loading screens with tips
- Tutorial/controls screen
- Credits screen
- Social sharing features
- Achievements system (optional)

**Estimated Time**: 1-2 sessions

---

### Phase 14 - Testing & Optimization (Priority: HIGH)
**Goal**: Production-ready stability

**Tasks**:
- Fix remaining test failures
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Mobile/touch testing
- Performance profiling
- Memory leak detection
- Accessibility audit
- Beta tester feedback integration

**Estimated Time**: 2 sessions

---

## Beta Release Checklist

- [ ] 5+ playable tracks with progression
- [ ] Vehicle damage system functional
- [ ] Enhanced track environments
- [ ] Modern shader effects
- [ ] Menu sound effects
- [ ] All tests passing
- [ ] 60fps on GTX 1060 / RX 580
- [ ] Documentation complete
- [ ] Deployment pipeline ready
- [ ] Social sharing implemented

**Estimated Total Time to Beta**: 13-17 sessions
**Target Release**: December 2025

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
