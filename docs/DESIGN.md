> Historical design from the oval prototype. Current build and remaining scope: [ASSESSMENT.md](ASSESSMENT.md) and [../README.md](../README.md).

# Hard Drivin' 2.0 — Design & Architecture

## Vision
A modern, browser- and mobile-native **driving & racing** game: tight arcade car
feel across a progression of tracks — race circuits (starting with a speedway
oval) through to long **cross-country drives** — with crash replays, ghost-lap
time trials, and a modern original look that holds 60fps on a mid-range phone.
Pick up and play in seconds; deep enough to chase lap times. *Hard Drivin'* is
inspiration only — no stunts/loops.

## Pillars
1. **Feel first.** The car must be a joy to drive before anything else is built.
2. **Runs anywhere.** One codebase, 60fps on mid-range mobile and desktop.
3. **Modern look, cheaply.** PBR + sky/IBL + post-FX that stays within budget.
4. **Honest engineering.** Deterministic sim, tested logic, verified at runtime.

## Architecture overview

```
                ┌─────────────── App ───────────────┐
                │  owns subsystems + the GameLoop    │
                └────────────────┬───────────────────┘
                                 │ fixed 60Hz update / interpolated render
   ┌───────────┬─────────────────┼──────────────────┬───────────────┐
   ▼           ▼                 ▼                  ▼               ▼
 Physics    Input            (gameplay)         Renderer          UI
 (Rapier)  (kbd/pad/touch)  vehicle/track/      (Three.js)      (DOM HUD/
  world    → InputState     race/replay/ghost   scene+camera     menus/touch)
                                 │                  ▲               ▲
                                 └── emits events ──┴── render-art ─┘
                                     (transforms, impacts, RPM, lap…)
```

### Key decisions
- **Fixed-timestep simulation (60Hz), decoupled render.** Determinism for
  physics/replay/ghost; rendering interpolates with the loop `alpha` so motion is
  smooth at 60/120/144Hz. (`src/app/GameLoop.ts`, `fixedStep.ts`.)
- **Rapier `-compat` (WASM inlined).** Fast, mobile-friendly physics with no
  special bundler config; one async `init()` at boot.
- **Simulation is the source of truth.** Visuals and audio (render-art) and the
  HUD (ui-ux) are *consumers* of gameplay state/events — they never own it.
- **Normalised input.** Keyboard, gamepad and touch all collapse into one
  `InputState`; gameplay never branches on device.
- **Event-driven, loosely coupled systems** rather than systems reaching into
  each other — keeps the agent ownership boundaries clean.

### Performance budget (per frame, mid-range mobile @60fps)
| Stage   | Budget |
|---------|--------|
| Physics | < 5 ms |
| Render  | < 8 ms |
| Logic   | < 2 ms |

Enforced via: no per-frame allocations (scratch reuse + pools), capped device
pixel ratio, LODs/instancing/culling, cheap post FX, and quality presets.

## Data & persistence
- Local-first (localStorage): settings, top-10 leaderboard, best-lap ghost,
  progression. Versioned schema with migration. (Owned by gameplay + ui-ux.)

## Non-goals (for now)
- Online multiplayer / netcode.
- Server backend (everything runs client-side).
- Photoreal graphics — stylised arcade look that performs everywhere.

See `ROADMAP.md` for the phased plan and `CLAUDE.md` for working conventions.
