> Historical phased roadmap, retained for context. Current status and open 9.3 review gate: [ITERATION5.md](ITERATION5.md). Do not treat these old phase labels as current release evidence.

# Hard Drivin' 2.0 — Build Roadmap

A phased plan from the running foundation to a full, mobile-ready **driving &
racing** game (race circuits + long cross-country drives; no stunts/loops). Each
phase ends **green**: type-check clean, tests passing, and verified in a real
headed run (a green build with a black screen does not count).

Lead agent in **bold**; supporting agents in parentheses.

---

## ✅ Phase 0 — Foundation (DONE, 2026-06-13)
Clean-slate scaffold that proves the stack works together.
- Vite + strict TS + Vitest + Playwright config.
- `GameLoop` (fixed 60Hz, interpolated render) + pure `fixedStep` (unit-tested, 7/7).
- `Renderer` (Three scene, lights, shadows, resize, capped DPR).
- `Physics` (Rapier async-init wrapper) + `Input` (keyboard/gamepad → `InputState`).
- Smoke scene: a physics cube drops onto a lit ground plane and is steerable.
- 6-agent team defined; old engine archived to `v1.0-archive`.

---

## Phase 1 — Vehicle that drives well  ·  **vehicle-dynamics** (engine-architect)
**Status: BUILT — awaiting human playtest to validate feel/tuning.**
The single most important phase; everything else is content around it.
- Raycast 4-wheel vehicle: suspension, engine/transmission, tire forces, drift.
- **Surface-normal-correct wheel raycasts** (the v1 killer bug). Banking-aware.
- Symmetric Ackermann steering; respawn resets steering.
- Chase camera good enough to feel the car (handed to presentation to polish).
- **Done when:** the cube is replaced by a car that accelerates, brakes, steers
  and drifts predictably on flat ground at 60fps. Unit tests on pure math.

## Phase 2 — Track 1 (oval) & race loop  ·  **world-builder** (vehicle-dynamics, presentation)
**Status: DONE — oval is playable with a full race loop.**
- ✅ `Track` entity: analytic stadium-oval centreline → road ribbon, rumble
  strips, lane markings, start/finish line, grass + scattered trees, and a flat
  ground collider. Car spawns on the start line, facing along the track.
- ✅ `RaceController` (deterministic, fixed-step, unit-tested): countdown →
  ordered checkpoints around the loop (reverse/cut guards) → lap counting + lap
  timing (current/last/best) → finish after N laps. `R` re-grids.
- TODO: out-of-bounds handling / auto-respawn when stuck or off-track.
- **Done when:** ✅ you can drive timed laps of the oval with correct lap
  counting and a working re-grid. *(Out-of-bounds polish remains.)*

> Later tracks (see Phase 6): (2) long one-way point-to-point drive, (3) a second
> circuit, (4) a cross-country drive. The flat oval keeps Track 1 simple; the
> spline/cross-section machinery generalises to elevation later if wanted.

## Phase 3 — Crash, replay & ghost  ·  **world-builder** (vehicle-dynamics, presentation)
- Force-based crash detection → state machine: PLAYING → CRASHED → REPLAY → respawn.
- 60Hz replay recorder/player with smooth interpolation.
- Cinematic crash camera (presentation). Ghost of best lap.
- **Done when:** a crash triggers a clean cinematic replay, then re-arms and
  respawns; a second crash also replays; ghost plays back accurately.

## Phase 4 — Presentation pass  ·  **presentation** (vehicle-dynamics, world-builder)
**Status: PARTIALLY DELIVERED alongside Track 1.**
- ✅ Procedural vehicle (PBR clearcoat paint, metal rims, emissive lights) +
  procedural track meshes/textures, physical `Sky`, image-based-lighting env
  map, tuned fog, car-following sun + soft shadows.
- ✅ Cheap HDR post-processing (`EffectComposer`: bloom + ACES tone-map output).
- TODO: VFX — tire smoke, sparks, skid marks, speed lines.
- TODO: Audio (Howler): RPM engine, impacts, surface/skid, ambience, UI cues.
- TODO: quality presets (toggle bloom/shadow res) to hold the mobile budget.
- **Done when:** it looks and sounds like a game, still ≥ 60fps mid-range.

## Phase 5 — UI, menus & mobile controls  ·  **ui-mobile** (engine-architect)
- ✅ In-race HUD (`src/ui/Hud.ts`): lap, live lap timer, best/last, big speed
  readout, centre flash (countdown / lap / finish); safe-area aware.
- Boot/menu/car-select/pause/results/settings/leaderboard screens, state-driven.
- HUD additions: position, minimap.
- **On-screen touch controls** + responsive layout (portrait & landscape, safe areas).
- Settings persistence; accessibility pass.
- **Done when:** fully playable on a phone with touch, and on desktop with kbd/pad.

## Phase 6 — Content & progression  ·  **world-builder** (ui-mobile)
- The four-track plan: (1) ✅ oval circuit, (2) long one-way point-to-point
  drive, (3) a second circuit, (4) a cross-country drive.
- Unlock progression, star ratings / objectives, persistent leaderboard + ghosts.
- **Done when:** a short campaign is completable with saved progress.

## Phase 7 — Hardening & ship  ·  **qa** (all)
- E2E across the full flow, cross-browser + mobile, perf profiling, memory checks,
  CI pipeline, deploy. Docs reconciled with reality.
- **Done when:** the Beta checklist is met and it deploys.

---

## Working agreement
- One phase at a time; land it green before starting the next.
- The main session orchestrates; domain work is delegated to the agent above.
- Verify gameplay/visual changes in a **headed** run, not just the build.
- Keep this file and `CLAUDE.md` honest as phases complete.
