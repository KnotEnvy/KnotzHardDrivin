# Hard Drivin' Remake - Product Requirements Document (Final)

## 1. Executive Summary

### 1.1 Vision
A modern, browser-based reimagining of the classic Hard Drivin' arcade racer, leveraging TypeScript, Three.js, and Rapier.js to deliver an authentic yet polished 3D stunt racing experience that captures the spirit of the original while meeting contemporary performance and UX standards.

### 1.2 Project Goals
- Recreate the iconic Hard Drivin' gameplay with improved physics fidelity
- Achieve stable 60fps performance across modern browsers and hardware
- Build a maintainable, well-documented TypeScript codebase
- Create a compelling single-player experience with high replay value
- Establish a foundation for future expansions (tracks, vehicles, multiplayer)

### 1.3 Success Metrics
- **Technical**: 60fps on target hardware, <8s load time, <1% crash rate
- **Engagement**: 70%+ retry rate, 60%+ completion rate, 12+ min avg session
- **Quality**: Zero critical bugs at launch, 70%+ code coverage

---

## 2. Technology Stack

### 2.1 Core Technologies
| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| Language | TypeScript | 5.3+ | Type safety, better tooling, fewer runtime errors |
| 3D Rendering | Three.js | r160+ | Industry standard, mature ecosystem, excellent documentation |
| Physics Engine | Rapier.js | 0.13+ | Best-in-class physics, deterministic, WASM-powered performance |
| Build Tool | Vite | 5.0+ | Lightning-fast HMR, optimized production builds, great DX |
| Audio | Howler.js | 2.2+ | Cross-browser compatibility, spatial audio, reliable |
| Testing | Vitest + Playwright | Latest | Fast unit tests, comprehensive E2E coverage |
| State Management | Custom FSM | N/A | Simple, game-specific, no external dependencies needed |

### 2.2 Development Environment
- **Node.js**: 18.x or 20.x LTS
- **Package Manager**: pnpm (preferred) or npm
- **Version Control**: Git with conventional commits
- **Code Quality**: ESLint, Prettier, Husky pre-commit hooks
- **CI/CD**: GitHub Actions (or equivalent)

### 2.3 Browser Support Matrix
| Browser | Minimum Version | Target Version | Notes |
|---------|----------------|----------------|-------|
| Chrome | 90+ | Latest | Primary development target |
| Firefox | 88+ | Latest | Full support |
| Safari | 14+ | Latest | WebGL 2.0 required, test on macOS/iOS |
| Edge | 90+ | Latest | Chromium-based, same as Chrome |

**Requirements**: WebGL 2.0, WASM support, ES6+ modules

### 2.4 Asset Specifications
- **3D Models**: GLTF 2.0 / GLB format, max 50k tris per vehicle, max 200k tris total scene
- **Textures**: PNG/JPG, power-of-two dimensions, 2K max resolution, BC7/ETC2 compressed
- **Audio**: MP3 (fallback) + OGG Vorbis, 44.1kHz, stereo, 128-192kbps
- **Total Bundle**: <25MB initial load, <75MB total with lazy-loaded assets

---

## 3. Architecture Overview

### 3.1 High-Level System Design
```
┌─────────────────────────────────────────────────┐
│              Game Engine Core                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  Update  │→ │ Physics  │→ │  Render  │     │
│  │   Loop   │  │  Step    │  │  Frame   │     │
│  └──────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────────────────────┘
         ↓              ↓              ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Systems    │ │   Entities   │ │    Scene     │
│              │ │              │ │              │
│ • Input      │ │ • Vehicle    │ │ • Three.js   │
│ • Audio      │ │ • Obstacles  │ │ • Cameras    │
│ • UI         │ │ • Track      │ │ • Lights     │
│ • State      │ │ • Ghost      │ │ • Effects    │
└──────────────┘ └──────────────┘ └──────────────┘
         ↓              ↓              ↓
┌─────────────────────────────────────────────────┐
│              Rapier Physics World                │
│  • Rigid Bodies  • Colliders  • Raycasts        │
└─────────────────────────────────────────────────┘
```

### 3.2 Code Organization
```
/src
  /core
    GameEngine.ts          # Main game loop, delta time
    SceneManager.ts        # Three.js scene setup
    PhysicsWorld.ts        # Rapier.js world wrapper
    StateManager.ts        # FSM for game states
  /entities
    Vehicle.ts             # Player vehicle class
    Ghost.ts               # AI ghost opponent
    Obstacle.ts            # Static/dynamic obstacles
    Track.ts               # Track geometry and waypoints
  /systems
    InputSystem.ts         # Keyboard + gamepad handling
    AudioSystem.ts         # Sound effects + music
    CameraSystem.ts        # First-person + replay cams
    UISystem.ts            # HUD + menus
    ReplaySystem.ts        # Recording + playback
    WaypointSystem.ts      # Progress tracking
  /components
    RigidBodyComponent.ts  # Physics body wrapper
    MeshComponent.ts       # Three.js mesh wrapper
    TransformComponent.ts  # Position, rotation, scale
  /utils
    AssetLoader.ts         # GLTF, texture, audio loading
    MathUtils.ts           # Vector operations, etc.
    Constants.ts           # Game configuration
    Logger.ts              # Debug logging
  /config
    PhysicsConfig.ts       # Rapier settings
    GraphicsConfig.ts      # Three.js settings
    GameConfig.ts          # Gameplay tuning values
  /types
    index.d.ts             # TypeScript definitions
/assets
  /models                  # .glb files
  /textures                # .jpg/.png files
  /audio                   # .mp3/.ogg files
/tests
  /unit                    # Vitest unit tests
  /e2e                     # Playwright E2E tests
```

### 3.3 Design Patterns
- **Entity-Component Pattern**: Vehicles, obstacles use component composition
- **System Architecture**: Update systems independently (input → physics → render)
- **Observer Pattern**: Event bus for collision events, waypoint triggers
- **Object Pool**: Reuse particle effects, audio sources
- **State Machine**: Game states (Menu, Playing, Paused, Crashed, Replay, Results)

---

## 4. Core Features (Detailed)

### 4.1 Vehicle Physics System
**Priority**: Critical | **Complexity**: High

#### 4.1.1 Rapier.js Vehicle Controller
- **Chassis**: Single dynamic rigid body with proper mass distribution
- **Wheels**: 4 raycasts from chassis (not separate rigid bodies for stability)
- **Suspension**: Spring-damper system per wheel
  - Stiffness: 30-50 N/m
  - Damping: 0.3-0.7
  - Rest length: 0.3-0.5m
- **Tire Physics**: 
  - Forward force: Applied based on wheel RPM and grip
  - Lateral force: Slip angle calculation for realistic drifting
  - Grip multiplier by surface type (tarmac: 1.0, dirt: 0.6, ice: 0.3)

#### 4.1.2 Vehicle Configuration
```typescript
interface VehicleConfig {
  mass: number;              // 1200 kg
  centerOfMass: Vector3;     // Slightly forward and low
  enginePower: number;       // 300 HP equivalent
  maxSpeed: number;          // 200 km/h (55 m/s)
  brakeForce: number;        // 3000 N
  steeringAngle: number;     // 35 degrees max
  downforce: number;         // 500 N at max speed
  dragCoefficient: number;   // 0.3
}
```

#### 4.1.3 Damage System
- Visual damage states: Pristine → Scratched → Dented → Smoking
- Performance degradation: -5% speed per major crash (max 3 crashes)
- Repair at respawn: Partial recovery (returns to previous damage level)

### 4.2 Track System
**Priority**: Critical | **Complexity**: High

#### 4.2.1 Track Architecture
- **Spline-Based Generation**: Catmull-Rom splines for smooth curves
- **Modular Sections**: Library of track pieces
  - Straights: 50m, 100m, 200m variants
  - Curves: 30°, 45°, 90° with varying radii
  - Ramps: 5°, 10°, 15° inclines with jump potential
  - Loops: 10m, 15m diameter (360° vertical loops)
  - Banks: 15°, 30°, 45° banking angles
- **Surface Types**: Multi-material mesh with friction zones
- **Track Boundaries**: Invisible collision boxes + visual barriers

#### 4.2.2 Waypoint System
```typescript
interface Waypoint {
  id: number;
  position: Vector3;
  direction: Vector3;       // Forward direction
  triggerRadius: number;    // 10m detection sphere
  isCheckpoint: boolean;    // Grants time bonus
  timeBonus?: number;       // +30 seconds at midpoint
}
```

- Sequential validation: Must pass waypoints in order
- Wrong-way detection: Dot product check with waypoint direction
- Progress calculation: Current waypoint / total waypoints

#### 4.2.3 Minimap Generation
- Top-down orthographic view captured at startup
- Real-time player icon (triangle)
- Waypoint markers (circles)
- Next waypoint highlight (pulsing)

### 4.3 Crash & Replay System
**Priority**: High | **Complexity**: High

#### 4.3.1 Crash Detection
```typescript
interface CrashEvent {
  timestamp: number;
  position: Vector3;
  velocity: Vector3;
  impactForce: number;      // Newtons
  collisionNormal: Vector3;
  collidedWith: Entity;
  severity: 'minor' | 'major' | 'catastrophic';
}
```

**Crash Thresholds**:
- Minor: Impact force < 5000 N (scratch, continue)
- Major: Impact force 5000-15000 N (trigger replay)
- Catastrophic: Impact force > 15000 N (long replay, major damage)

**Hard Landing Detection**: Vertical velocity > -15 m/s on ground contact

#### 4.3.2 Replay Recording
- **Ring Buffer**: Rolling 15-second history
- **Data Structure**:
```typescript
interface ReplayFrame {
  time: number;              // Delta from start
  vehicleTransform: {
    position: [x, y, z];
    rotation: [x, y, z, w];  // Quaternion
  };
  wheelRotations: number[];
  cameraTransform: Transform;
  gameState: Partial<GameState>;
}
```
- **Sampling Rate**: 60 fps (match game loop)
- **Compression**: Keyframe + delta encoding (only store changes)
- **Memory Budget**: ~10 MB for 15-second buffer

#### 4.3.3 Replay Camera
- **Camera Type**: Smooth crane shot (aerial)
- **Positioning**: 30m behind, 15m above crash point
- **Behavior**: 
  - Frames the crash in center
  - Smoothly tracks vehicle motion
  - Uses Catmull-Rom interpolation
  - Automatic crash zoom-in at impact moment
- **Duration**: Exactly 10 seconds
- **Controls**: Skip button (Enter/A button)

### 4.4 Timing & Scoring
**Priority**: Critical | **Complexity**: Medium

#### 4.4.1 Timer System
```typescript
interface TimerState {
  raceTime: number;          // Elapsed ms since start
  remainingTime: number;     // Countdown timer
  lapStartTime: number;      // Per-lap timing
  currentLap: number;
  lapTimes: number[];
  bestLapTime: number;
}
```

**Time Configuration**:
- Initial time: 120 seconds
- Checkpoint bonus: +30 seconds (one per lap)
- Off-road penalty: -5 seconds per timeout
- Crash penalty: -10 seconds per major crash

#### 4.4.2 Leaderboard
```typescript
interface LeaderboardEntry {
  rank: number;
  playerName: string;
  lapTime: number;           // Best lap in ms
  timestamp: Date;
  ghostData?: Uint8Array;    // Compressed replay
}
```

**Storage**: LocalStorage (max 10 entries, ~2KB per entry)
**Sorting**: Ascending by lap time
**Ghost Activation**: Automatic when player achieves top 10 time

### 4.5 AI Ghost Opponent
**Priority**: Medium | **Complexity**: Medium

#### 4.5.1 Recording
- Triggered automatically on new personal best in top 10
- Stores full transform data at 60fps
- Compression: ~500KB for full lap (acceptable for localStorage)

#### 4.5.2 Playback
- Spawns at race start if conditions met
- Pure kinematic (no physics simulation)
- Interpolates between keyframes for smoothness
- Visual: 60% opacity + cyan glow shader
- Collision: None (ghost passes through player)

#### 4.5.3 Visual Effects
```glsl
// Ghost shader (simplified)
uniform float opacity;
uniform vec3 glowColor;
varying vec3 vNormal;

void main() {
  float fresnel = pow(1.0 - dot(vNormal, cameraDir), 3.0);
  vec3 glow = glowColor * fresnel;
  gl_FragColor = vec4(baseColor + glow, opacity);
}
```

### 4.6 Audio System
**Priority**: Medium | **Complexity**: Medium

#### 4.6.1 Sound Assets
| Sound | Type | Trigger | Format |
|-------|------|---------|--------|
| Engine idle | Loop | Always (RPM 0-20%) | OGG 128kbps |
| Engine rev | Loop | Dynamic (RPM 20-100%) | OGG 128kbps |
| Tire squeal | Loop | Lateral slip > 0.5 | OGG 96kbps |
| Crash impact | One-shot | Collision force > 5000N | OGG 96kbps |
| Off-road rumble | Loop | Off-track | OGG 64kbps |
| Checkpoint | One-shot | Waypoint pass | OGG 64kbps |
| UI click | One-shot | Button press | MP3 32kbps |
| Menu music | Loop | Main menu | MP3 128kbps |
| Race music | Loop | Gameplay | MP3 128kbps |

#### 4.6.2 Spatial Audio
- 3D positioning for collision sounds
- Doppler effect for passing vehicles (ghost)
- Reverb zones (tunnels, enclosed areas)

#### 4.6.3 Audio Manager
```typescript
class AudioSystem {
  private context: AudioContext;
  private masterGain: GainNode;
  private sfxGain: GainNode;
  private musicGain: GainNode;
  private pool: Map<string, AudioBuffer>;
  
  playSound(id: string, position?: Vector3, volume?: number): void;
  setMasterVolume(volume: number): void;
  preloadAssets(urls: string[]): Promise<void>;
}
```

### 4.7 User Interface
**Priority**: High | **Complexity**: Medium

#### 4.7.1 Main Menu
- **Buttons**: Start Race, Time Trial, Leaderboard, Settings, Credits
- **Background**: Rotating 3D car model with subtle camera pan
- **Styling**: Retro-futuristic (cyan/magenta gradient accents)

#### 4.7.2 HUD (Heads-Up Display)
```typescript
interface HUDElements {
  speedometer: {
    type: 'analog' | 'digital';
    position: 'bottom-right';
    value: number;          // km/h or mph
    maxValue: 220;
  };
  timer: {
    position: 'top-center';
    format: 'MM:SS.mmm';
    color: 'white' | 'yellow' | 'red';  // Based on time remaining
  };
  lapCounter: {
    position: 'top-left';
    format: 'LAP X / 2';
  };
  minimap: {
    position: 'bottom-left';
    size: '150x150px';
    opacity: 0.8;
  };
  damageIndicator: {
    position: 'top-right';
    type: 'bar' | 'icon';
  };
}
```

#### 4.7.3 Results Screen
- Final time (large, centered)
- Best lap time
- Statistics: Crashes, avg speed, completion %
- New record animation (if applicable)
- Buttons: Retry, View Leaderboard, Main Menu

#### 4.7.4 Settings Panel
```typescript
interface GameSettings {
  graphics: {
    quality: 'low' | 'medium' | 'high';
    shadows: boolean;
    antialiasing: boolean;
    particleCount: 'low' | 'medium' | 'high';
  };
  audio: {
    masterVolume: number;    // 0-1
    sfxVolume: number;
    musicVolume: number;
    spatialAudio: boolean;
  };
  controls: {
    keyBindings: Map<Action, Key>;
    gamepadDeadzone: number;
    steeringSensitivity: number;
  };
  gameplay: {
    speedUnit: 'kmh' | 'mph';
    difficultyLevel: 'easy' | 'normal' | 'hard';
  };
}
```

---

## 5. Performance Requirements

### 5.1 Target Specifications
| Metric | Target | Minimum | Notes |
|--------|--------|---------|-------|
| Frame Rate | 60 fps | 30 fps | Allow quality toggle for 30fps mode |
| Frame Time | <16.67ms | <33.33ms | 60fps / 30fps respectively |
| Load Time | <6s | <10s | On 10Mbps connection |
| Memory Usage | <400MB | <512MB | Peak during gameplay |
| Initial Bundle | <3MB (gzipped) | <5MB | Core JS/WASM |
| Total Assets | <50MB | <75MB | Including all textures/audio |

### 5.2 Optimization Strategies

#### 5.2.1 Rendering Optimizations
- **LOD (Level of Detail)**: 3 levels for vehicle/obstacles (far: 5k tris, mid: 15k, near: 50k)
- **Frustum Culling**: Three.js built-in
- **Occlusion Culling**: Manual for large static objects
- **Texture Atlasing**: Combine small textures
- **Instanced Rendering**: For repeated obstacles (cones, barriers)
- **Shader Optimization**: Minimize uniforms, use vertex calculations where possible

#### 5.2.2 Physics Optimizations
- **Fixed Time-Step**: 60Hz physics regardless of frame rate
- **Spatial Hashing**: For broad-phase collision detection
- **Sleep Detection**: Static objects don't update
- **Reduced Solver Iterations**: 4-6 iterations (default 10)
- **Simplified Collision Shapes**: Use primitive shapes where possible

#### 5.2.3 Asset Loading
- **Progressive Loading**:
  1. Critical: Game engine, physics, UI (300KB)
  2. Essential: Vehicle model, basic track (2MB)
  3. Lazy: Audio, effects, detailed textures (40MB)
- **Compression**: Gzip/Brotli for text, Basis Universal for textures
- **Preloading**: Show loading screen with progress bar

### 5.3 Quality Settings
```typescript
const QualityPresets = {
  low: {
    shadowMapSize: 512,
    maxParticles: 50,
    antialiasing: false,
    anisotropy: 1,
    physicsIterations: 4,
  },
  medium: {
    shadowMapSize: 1024,
    maxParticles: 200,
    antialiasing: true,
    anisotropy: 4,
    physicsIterations: 6,
  },
  high: {
    shadowMapSize: 2048,
    maxParticles: 500,
    antialiasing: true,
    anisotropy: 16,
    physicsIterations: 8,
  },
};
```

---

## 6. Accessibility & Usability

### 6.1 Accessibility Features
- **Keyboard Navigation**: Full menu navigation via Tab/Arrow keys
- **Colorblind Modes**: Optional color palette adjustments (future)
- **Text Scaling**: UI text respects browser zoom
- **Audio Cues**: Important events have audio feedback
- **Contrast**: Ensure 4.5:1 contrast ratio for HUD text
- **Motion**: Option to reduce motion effects for accessibility

### 6.2 Usability Considerations
- **Tutorial**: First-time user sees control overlay
- **Tooltips**: Hover/focus on UI elements shows hints
- **Feedback**: All actions have visual/audio confirmation
- **Error Messages**: Clear, actionable error text
- **Loading States**: Never leave user wondering if something is happening

---

## 7. Testing Strategy

### 7.1 Unit Testing (Vitest)
**Target Coverage**: 70%+

**Priority Areas**:
- Vehicle physics calculations (100% coverage)
- Waypoint progression logic (100%)
- Collision detection (90%)
- Timer/scoring systems (100%)
- Input normalization (80%)

### 7.2 Integration Testing
- Vehicle + track interaction
- Crash → replay → respawn flow
- Audio system + game events
- UI + game state synchronization
- Settings persistence

### 7.3 E2E Testing (Playwright)
**Critical User Flows**:
1. Start race → complete lap → view results
2. Crash → watch replay → skip → respawn
3. Achieve top 10 → ghost appears in next race
4. Adjust settings → settings persist on reload
5. Go off-road → countdown → auto-respawn

### 7.4 Performance Testing
- **Frame Time Profiling**: Chrome DevTools Performance tab
- **Memory Leak Detection**: Heap snapshots over 10-minute session
- **Physics Stability**: 1000-frame determinism test
- **Load Testing**: Test on 3G, 4G, and broadband connections

### 7.5 Cross-Browser Testing
**Required Tests**:
- Full playthrough on Chrome, Firefox, Safari, Edge
- Verify WebGL 2.0 fallback to WebGL 1.0
- Test gamepad support on each browser
- Audio playback verification (different codecs)

---

## 8. Risk Management

### 8.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Rapier.js WASM loading fails | High | Low | Provide error message, retry mechanism |
| Physics instability on loops/jumps | High | Medium | Extensive tuning, conservative constraints |
| Browser performance variance | Medium | High | Quality presets, performance monitoring |
| Asset loading timeout | Medium | Medium | Fallback assets, progressive loading |
| TypeScript build complexity | Low | Low | Well-documented tsconfig, team training |
| Mobile performance | High | High | Explicitly out of scope for MVP |

### 8.2 Design Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Vehicle handling feels wrong | High | Medium | Rapid prototyping, playtest early and often |
| Replay camera doesn't capture action | Medium | Medium | Configurable camera positions, multiple angles |
| Track too difficult/easy | Medium | High | Playtesting, adjustable difficulty settings |
| Minimap confusing | Low | Low | Clear icons, legends, tutorial callout |

### 8.3 Project Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Scope creep | High | High | Strict MVP definition, feature freeze after Phase 7 |
| Team knowledge gaps | Medium | Medium | Documentation, pair programming, code reviews |
| Timeline overrun | Medium | High | Buffer time, prioritize core features, cut scope if needed |
| Asset creation bottleneck | Medium | Low | Use placeholder assets, consider asset marketplace |

---

## 9. Non-Functional Requirements

### 9.1 Scalability
- Code architecture supports adding new tracks (Phase 2+)
- Vehicle system extensible for multiple car types
- UI system can accommodate new game modes
- Leaderboard can migrate to backend API (future)

### 9.2 Maintainability
- **Code Style**: Consistent via ESLint/Prettier
- **Documentation**: TSDoc comments on all public APIs
- **Modularity**: Each system in separate file/module
- **Testing**: Automated tests prevent regressions
- **Logging**: Debug mode with detailed performance logs

### 9.3 Security
- **Input Validation**: Sanitize all user text inputs (name entry)
- **LocalStorage**: No sensitive data stored
- **XSS Prevention**: Use textContent, not innerHTML
- **CSP Headers**: Content Security Policy for production

### 9.4 Analytics (Optional)
- **Event Tracking**:
  - Race started/completed
  - Crash count per race
  - Settings changed
  - Leaderboard entries
- **Performance Metrics**:
  - Average FPS
  - Load times
  - Browser/device info
- **Privacy**: Anonymous, opt-in only

---

## 10. Deployment

### 10.1 Build Process
```bash
# Development
npm run dev          # Vite dev server with HMR

# Testing
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E tests
npm run test:coverage # Coverage report

# Production
npm run build        # TypeScript compile + Vite bundle
npm run preview      # Preview production build
```

### 10.2 Production Build Output
```
dist/
  index.html           # Entry point (2KB)
  assets/
    index-[hash].js    # Main bundle (300KB gzipped)
    rapier-[hash].wasm # Physics engine (1.5MB)
    vehicle-[hash].glb # 3D model (500KB)
    track-[hash].glb   # Track model (2MB)
    *.mp3, *.ogg       # Audio files (8MB total)
```

### 10.3 Hosting Recommendations
**Option 1: Vercel** (Recommended)
- Zero-config deployment
- Edge CDN
- Automatic HTTPS
- Great DX

**Option 2: Cloudflare Pages**
- Free tier generous
- Excellent CDN
- Workers for future backend

**Option 3: Netlify**
- Similar to Vercel
- Good for static sites

### 10.4 Environment Configuration
```typescript
// .env.production
VITE_API_URL=https://api.harddriving.game
VITE_ANALYTICS_ID=UA-XXXXX
VITE_ENABLE_DEBUG=false
VITE_ASSET_CDN=https://cdn.harddriving.game
```

---

## 11. Future Enhancements (Post-MVP)

### 11.1 Phase 2 (Weeks 15-20)
- Additional tracks (desert, city, mountain)
- Multiple vehicle types (different handling)
- Advanced weather effects (rain, fog)
- Enhanced particle systems (smoke, sparks)

### 11.2 Phase 3 (Weeks 21-30)
- Online leaderboards (requires backend)
- Replay sharing (upload/download)
- Track editor (community content)
- Multiplayer ghost racing (async)

### 11.3 Phase 4 (Months 8-12)
- Real-time multiplayer (WebRTC)
- VR support (WebXR API)
- Mobile optimization (touch controls)
- Tournament system

---

## 12. Acceptance Criteria (Final Checklist)

### 12.1 MVP Completion
- [ ] Player can complete 2 full laps on the track
- [ ] All core mechanics functional (crash, respawn, waypoints, replay)
- [ ] Maintains 60fps on target hardware (RTX 2060 / M1 Mac equivalent)
- [ ] Audio fully implemented with spatial positioning
- [ ] UI complete and responsive (menu, HUD, results)
- [ ] Zero critical bugs, <5 known medium-priority bugs
- [ ] Leaderboard saves and displays correctly with ghost playback
- [ ] Phantom Photon ghost appears for top 10 times
- [ ] Cross-browser testing passed (Chrome, Firefox, Safari, Edge)
- [ ] Code coverage >70% on core systems
- [ ] Documentation complete (README, API docs, architecture)
- [ ] Production build optimized (<50MB total assets)

### 12.2 Quality Gates
Each phase must pass these gates before proceeding:
1. **Code Review**: 1+ approvals, no unresolved comments
2. **Unit Tests**: All tests pass, coverage targets met
3. **Performance**: Frame time within budget for phase
4. **Manual QA**: Checklist items verified
5. **Documentation**: Updated for new features

---

## 13. Glossary

| Term | Definition |
|------|------------|
| **ECS** | Entity-Component-System architecture pattern |
| **FSM** | Finite State Machine for game state management |
| **HMR** | Hot Module Replacement (Vite feature) |
| **LOD** | Level of Detail (optimization technique) |
| **WASM** | WebAssembly (compiled binary format for web) |
| **Raycast** | Physics query that shoots a ray to detect collisions |
| **Rigid Body** | Physics object that can move and collide |
| **Collider** | Invisible shape used for collision detection |
| **Quaternion** | 4D representation of rotation (avoids gimbal lock) |
| **Spline** | Smooth curve for track generation |

---

## 14. Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Oct 2, 2025 | Initial draft | Team |
| 2.0 | Oct 3, 2025 | Final version with TypeScript/Three.js/Rapier.js stack | Team |

---

## 15. Appendices

### Appendix A: Useful Resources
- **Three.js**: https://threejs.org/docs/
- **Rapier.js**: https://rapier.rs/docs/user_guides/javascript/getting_started_js
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Vite**: https://vitejs.dev/guide/
- **Howler.js**: https://howlerjs.com/
- **WebGL Best Practices**: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

### Appendix B: Code Style Guide
- Use TypeScript strict mode
- Prefer `const` over `let`, never `var`
- Use async/await over raw Promises
- Classes use PascalCase, functions use camelCase
- Interfaces prefix with `I` if ambiguous, otherwise no prefix
- Max line length: 100 characters
- Always handle errors explicitly (no silent failures)

### Appendix C: Performance Budget
```typescript
const PerformanceBudget = {
  frame: {
    total: 16.67,           // ms (60fps)
    physics: 5,             // ms
    rendering: 8,           // ms
    gameLogic: 2,           // ms
    other: 1.67,            // ms
  },
  memory: {
    jsHeap: 200,            // MB
    gpuMemory: 300,         // MB
    audioBuffers: 50,       // MB
  },
  network: {
    initialLoad: 3,         // MB (gzipped)
    lazyAssets: 45,         // MB
    totalBudget: 50,        // MB
  },
};
```

---

**Status**: ✅ **APPROVED FOR DEVELOPMENT**  
**Next Steps**: Begin Phase 0 setup, assign team members to phases  
**Point of Contact**: Tech Lead  

---

*This document is the single source of truth for the Hard Drivin' Remake project. All development should align with these specifications. Changes require team review and approval.*