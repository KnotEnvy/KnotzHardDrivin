# Play Pacific Run

[Play on GitHub Pages](https://knotenvy.github.io/KnotzHardDrivin/) · [Publishing and repository guide](docs/SHARING.md)

The publishing branch is **master**. Every push runs tests, builds the optimized game, verifies the production repository path, and publishes after those checks pass. Generated galleries, recordings and editable Blender outputs referenced in older notes remain local under artifacts/ and are excluded from Git and the deployed website.

## Performance update (October 5)

The published asset payload is 14.87 MB smaller through lossless shared textures; the original art assets remain intact. Static scenery avoids repeated transform calculations, and settings now offer optional Auto resolution and a Performance preset. Balanced remains the default. The build is verified at a GitHub Pages repository path. Frame pacing is mixed on this host; broad PC readiness still needs real low-end hardware testing. See [the assessment, measurements and repeatable checks](docs/PERFORMANCE_PASS.md).

## Water graphics and fresh review (October 5)

Gentle directional swell, moving fine ripples, reflected sky/coast and foam around 130 rocks now bring the Pacific into the scene. Open the [water film and before/after gallery](artifacts/water/water-gallery.html), or read [the research and verification notes](docs/WATER_PASS.md).

Production build and **113 tests in 21 files** pass. Live checks cover both presets, pause, shoreline alignment and resource cleanup. The one requested independent graphics regrade is **7.6 / 7.5 / 7.7**, with water at **8.0 / 7.8 / 8.0**. Critics inspected renders and recorded frames; the **9.3 gate remains unmet**. Shoreline contact, material/lighting consistency and environment variation remain the main craft gaps. Driving and completeness were not regraded.

## Road and land graphics update (October 5)

The road now has granular pavement, worn markings, mineral shoulders, crack seals and repairs. The land blends seven original surface sets with finer nearby contours, 956 ferns/coastal plant clusters and 225 original Blender outcrops. Open the [before/after gallery](artifacts/road-land/road-gallery.html) or read [the rebuild and verification notes](docs/ROAD_LAND_PASS.md).

Production build, 111 regression tests and the 32-asset audit pass. High/Balanced views and live browser checks have no shader/runtime errors. This pass adds no new independent score; earlier review gates remain open.

## Focused review update (October 3)

Controller menus, visible records and checkpoint Continue are implemented. Continue resumes an unfinished timed drive with a three-second recovery charge; partial resumed runs preserve the complete pace ghost. Restart prompts protect unfinished runs, and unavailable device storage is reported.

Both judges finished the three-attempt driving round at **9.0** and the completeness round at **8.8**, provisionally. **The 9.3 gate is unmet.** Tests and production build pass; live inspection remains blocked. See [the current verification and score ledger](docs/ITERATION5.md).

## Grand Tour update (September 19)

The garage now offers **The Grand Tour**: a continuous 5.9 km drive through all three regions with twelve checkpoints, a four-minute limit, separate medals/best time, and its own saved ghost. Gold is 2:55 and silver is 3:25. A briefing shows the route and targets before each timed drive; the HUD keeps medal targets visible. Existing chapter progress is preserved.

Balanced graphics now avoids allocating the High-mode bloom/MSAA buffers. Returning to Balanced releases those buffers. Frame-time samples reset after quality changes.

The 9.3 review gate remains unmet. See [Iteration 4](docs/ITERATION4.md) for current verification and the browser inspection blocker.

# Hard Drivin’: Pacific Run

A browser driving game about a sunset journey along the coast. Built with TypeScript, Three.js and Rapier physics.

**Current status: playable development build; the requested 9.3/10 player-testing gate is not met.** This is a short campaign, not a finished AAA game.

## Run locally

```powershell
npm install
npm run dev
```

Open http://localhost:4200. Choose **Play chapter** for the three-chapter campaign or **Just drive** for untimed exploration. Complete a chapter to unlock the next one. Medals, best times, paint, volume, radio and graphics settings are saved in this browser when storage is available.

```powershell
npm test            # unit and real-physics integration tests
npm run type-check
npm run build       # creates dist/
npm run preview     # serves the production build
```

There is no maintained Playwright E2E suite yet. Browser inspection has been performed separately; automated physical driving is covered by Vitest using real Rapier.

## Controls

| Action | Keyboard | Standard gamepad | Touch / on-screen |
|---|---|---|---|
| Accelerate | W / Up | RT | GAS |
| Brake, then reverse | S / Down | LT | BRAKE |
| Steer | A/D / Left/Right | Left stick | Arrow buttons |
| Handbrake | Space | A | DRIFT |
| Overdrive | Shift | RB | Hold OVERDRIVE above its meter |
| Camera | C | Y | CAMERA |
| Cruise | E | D-pad Up | CRUISE |
| Recover | R | B | RECOVER |
| Pause | Esc | Start | PAUSE |

Cruise controls the throttle; **you still steer**. Brake or handbrake disengages it. Recovery costs three seconds in the timed campaign. Radio Pacific plays an original synthesized arrangement and can be muted using its panel. Audio begins after starting a drive.

## Included

- Three timed chapters along approximately six kilometres of winding coastline, with a forest section and headlands.
- Ordered checkpoints, countdown, timeout, retry, medals, best times and chapter unlocking.
- Untimed free driving that loops at the end of the coast.
- Original procedural GT coupe with four paint choices, suspension, speed-sensitive steering, braking, reverse and handbrake.
- Moving traffic with physical collisions; close passes replenish overdrive.
- Sunset atmosphere, ocean shader, roadside scenery, tire smoke and contact shadows.
- Chase and hood cameras, minimap, pause/settings, touch controls and keyboard focus handling.
- High and Balanced graphics modes. Balanced is the initial default; broad hardware performance is not certified.

## Architecture

`src/app/App.ts` connects the fixed-step loop, simulation, presentation and UI. `Vehicle.ts` retains and tunes the old raycast suspension foundation. `world/Coast.ts` constructs the new highway and scenery. `systems/Journey.ts` owns campaign state and progress. `ui/Experience.ts` owns screens and HUD.

All shipped art and audio in this build are generated by project code. No downloaded car models or HDRI assets were incorporated. Fonts are requested from Google Fonts with system fallbacks. Three.js and Rapier retain their own licenses.

## Evaluation and preservation

- `docs/ASSESSMENT.md`: salvage decision, verified behavior and remaining scope.
- `docs/JUDGE_SYSTEMS.md`: independent systems review and its limits.
- `docs/JUDGE_PRESENTATION.md`: latest independent presentation review, when completed.
- `artifacts/pre-pacific-run.zip`: snapshot of the existing source, tests and documents before this rebuild.

The old oval-track classes and race tests remain in the repository for reference. The new application runs Pacific Run. Pre-existing staged/unstaged changes were preserved; no commits, branch resets, merges or deployment were performed.
