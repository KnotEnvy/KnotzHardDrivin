# Hard Drivin' 2.0 — Design & Architecture

## Vision
A modern, browser- and mobile-native remake of the arcade classic *Hard Drivin'*:
fast stunt driving with a signature **loop-the-loop and ramp jumps**, an instant
**crash replay**, ghost-lap time trials, and a tight feel that holds 60fps on a
mid-range phone. Pick up and play in seconds; deep enough to chase lap times.

## Pillars
1. **Feel first.** The car must be a joy to drive before anything else is built.
2. **Runs anywhere.** One codebase, 60fps on mid-range mobile and desktop.
3. **Spectacle, cheaply.** Loops, jumps, crashes and replays — within budget.
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
