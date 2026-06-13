# Hard Drivin' — 2.0 (clean-slate rebuild)

**Status:** Alpha 2.0.0 — foundation in place (running Three + Rapier + fixed-step loop).
**Stack:** TypeScript (strict) · Three.js · Rapier3d (`-compat`, WASM) · Vite · Howler · Vitest · Playwright.
**Target:** A full 3D stunt-driving game optimised for **browser and mobile**.

> **History:** The v1.x engine (~25.5k lines) was archived and rebuilt from
> scratch on 2026-06-13. The old code is preserved on the `v1.0-archive` git tag
> and the `revival/foundation` branch — recover any piece with
> `git checkout v1.0-archive -- <path>`. Do **not** resurrect old files wholesale;
> port deliberately if at all.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:4200
npm run type-check   # tsc --noEmit
npm test             # vitest (unit)
npm run test:e2e     # playwright (must run HEADED — see gotchas)
npm run build        # tsc --noEmit && vite build
```

**Controls (current):** WASD/Arrows drive · Space handbrake · R reset · Esc pause · gamepad supported. Touch controls land in the UI phase.

---

## Project structure

```
src/
  main.ts            # entry → App
  app/               # App, GameLoop, fixedStep, state machine
  core/              # Renderer, Physics (Rapier), Input
  config/            # constants, tuning
  systems/           # gameplay/render systems (built out per phase)
  entities/          # vehicle, track, obstacles, ghost
  ui/                # HUD, menus (ui phase)
  shaders/           # GLSL / post FX (render phase)
  styles/            # CSS
  types/
tests/               # vitest + playwright
docs/                # DESIGN.md, ROADMAP.md
```

## Key files (foundation)

| File | Purpose |
|------|---------|
| `src/app/App.ts` | Root: owns subsystems + loop; currently a physics smoke scene |
| `src/app/GameLoop.ts` | Fixed-timestep loop (60Hz physics, interpolated render) |
| `src/app/fixedStep.ts` | Pure step-accounting (unit-tested) |
| `src/core/Renderer.ts` | Three.js renderer, scene, camera, lights, resize |
| `src/core/Physics.ts` | Rapier world wrapper (async WASM init) |
| `src/core/Input.ts` | Keyboard + gamepad → normalised `InputState` |

---

## The agent team (6 roles, structured for a driving game)

Defined in `.claude/agents/`. Delegate domain work to these:

- **engine-architect** — loop, state machine, Rapier world, input core, event bus, config, build, perf budgets, and cross-system integration/arbitration.
- **vehicle-dynamics** — the car: raycast wheels, suspension, drivetrain, tire grip, drift, steering, feel, respawn, impact signal. *The most important role — the car is the product.*
- **world-builder** — track spline + collision, race rules (laps/checkpoints/timing), spawn/respawn, replay/ghost, results persistence, environment.
- **presentation** — Three.js visuals, lighting, shaders, cameras (incl. cinematic replay), VFX, post FX, **and audio** (Howler).
- **ui-mobile** — HUD, menus, **on-screen touch controls**, responsive layout, settings persistence, accessibility.
- **qa** — Vitest + Playwright, CI, coverage, perf validation, doc accuracy, and the play-readiness gate.

---

## Engineering standards (enforced)

- **Fixed-timestep, deterministic physics** at 60Hz; render interpolates with `alpha`.
- **No per-frame allocations** in hot paths — reuse scratch vectors/quats, pool transients.
- **Mobile-first budget:** 60fps on mid-range phones → physics < 5ms, render < 8ms, logic < 2ms.
- **Strict TypeScript**, no `any` in committed code, TSDoc on public APIs, tests for pure logic.
- A green build with a black screen is a **failure** — verify real runtime behaviour.

## Project gotchas (learned the hard way)

- **Wheel raycasts must use the real surface normal**, not world-up — this is what
  made banked/looping tracks undrivable in v1. (See `vehicle-dynamics` agent notes.)
- **Don't force-close the track spline or flatten elevation/pitch** — drive the
  collision mesh off the same spline as the visuals.
- **E2E must run headed** — headless throttles `requestAnimationFrame` and freezes the loop.
- Rapier is the `-compat` build: WASM is inlined as base64, so no vite wasm plugin needed,
  but `await physics.init()` before touching the world.

## Where to look next

`docs/ROADMAP.md` — the phased build plan and current milestone.
