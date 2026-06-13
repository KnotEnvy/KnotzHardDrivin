# Hard Drivin' 2.0 — Build Roadmap

A phased plan from the running foundation to a full, mobile-ready stunt-driving
game. Each phase ends **green**: type-check clean, tests passing, and verified in
a real headed run (a green build with a black screen does not count).

Lead agent in **bold**; supporting agents in parentheses.

---

## ✅ Phase 0 — Foundation (DONE, 2026-06-13)
Clean-slate scaffold that proves the stack works together.
- Vite + strict TS + Vitest + Playwright config.
- `GameLoop` (fixed 60Hz, interpolated render) + pure `fixedStep` (unit-tested, 7/7).
- `Renderer` (Three scene, lights, shadows, resize, capped DPR).
- `Physics` (Rapier async-init wrapper) + `Input` (keyboard/gamepad → `InputState`).
- Smoke scene: a physics cube drops onto a lit ground plane and is steerable.
- 5-agent team defined; old engine archived to `v1.0-archive`.

---

## Phase 1 — Vehicle that drives well  ·  **gameplay** (engine-core)
The single most important phase; everything else is content around it.
- Raycast 4-wheel vehicle: suspension, engine/transmission, tire forces, drift.
- **Surface-normal-correct wheel raycasts** (the v1 killer bug). Banking-aware.
- Symmetric Ackermann steering; respawn resets steering.
- Chase camera good enough to feel the car (handed to render-art to polish).
- **Done when:** the cube is replaced by a car that accelerates, brakes, steers
  and drifts predictably on flat ground at 60fps. Unit tests on pure math.

## Phase 2 — Track & race loop  ·  **gameplay** (engine-core, render-art)
- Spline track with elevation, banking, a ramp and a loop — collision mesh built
  from the *same* spline the car drives (no force-close, no flatten).
- Checkpoints, waypoints, lap counting (with reverse-driving guards), race timer.
- Respawn / reset-to-track. Out-of-bounds handling.
- **Done when:** you can drive a full lap on a stunt track including the loop,
  with correct lap timing and respawn.

## Phase 3 — Crash, replay & ghost  ·  **gameplay** (render-art)
- Force-based crash detection → state machine: PLAYING → CRASHED → REPLAY → respawn.
- 60Hz replay recorder/player with smooth interpolation.
- Cinematic crash camera (render-art). Ghost of best lap.
- **Done when:** a crash triggers a clean cinematic replay, then re-arms and
  respawns; a second crash also replays; ghost plays back accurately.

## Phase 4 — Presentation pass  ·  **render-art** (gameplay)
- Procedural vehicle + track meshes, PBR materials, skybox/environment, fog.
- VFX: tire smoke, sparks, skid marks, speed lines.
- Audio (Howler): RPM engine, impacts, surface/skid, ambience, UI cues.
- Cheap post-processing (bloom + grading) within the mobile budget; quality presets.
- **Done when:** it looks and sounds like a game, still ≥ 60fps mid-range.

## Phase 5 — UI, menus & mobile controls  ·  **ui-ux** (engine-core)
- Boot/menu/car-select/pause/results/settings/leaderboard screens, state-driven.
- HUD: speed, lap, timer, position, minimap.
- **On-screen touch controls** + responsive layout (portrait & landscape, safe areas).
- Settings persistence; accessibility pass.
- **Done when:** fully playable on a phone with touch, and on desktop with kbd/pad.

## Phase 6 — Content & progression  ·  **gameplay** (ui-ux)
- 3–5 tracks, unlock progression, star ratings, persistent leaderboard + ghosts.
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
