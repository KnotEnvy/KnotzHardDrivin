# Current sharing handoff — October 7, 2026

Start with [Sharing and deployment](docs/SHARING.md) and [Performance assessment](docs/PERFORMANCE_PASS.md). The canonical publishing branch is master; GitHub Actions tests and publishes only the optimized dist output. Runtime art is retained; generated review media stays local and ignored. The earlier score ledger below remains historical and its review gate is unchanged.

---

# Current water handoff - October 5, 2026

Start with [Water research, implementation and independent regrade](docs/WATER_PASS.md). The ocean uses Three.js Reflector with an original shader: four gentle Gerstner waves, layered directional normals, angle-dependent reflection, shallow/deep color and terrain-aligned shore foam. Instanced contact foam surrounds 130 offshore rocks. Reflection detail and refresh cadence follow High/Balanced; the shared world clock freezes water on pause and owned resources are disposed on shutdown.

Production build and **113 tests in 21 files** pass. Final 16 High/Balanced water views plus phone and fresh whole-game captures contain zero browser/shader errors. Live checks verify terrain/waterline agreement below 0.001 m, stable resources through three preset cycles, pause and disposal. Short no-video frame samples average 16.61-22.12 ms with p95 22.5-50.4 ms; reflection frames can still spike, and supported-device performance remains unverified.

The [water gallery](artifacts/water/water-gallery.html) includes a 23-second in-engine water/shore/actual-driving film and eight matched before/after comparisons. Video playback, all 17 images, keyboard sliders, presets and phone overflow checks pass. All earlier galleries link to it. Evidence and reproduction scripts are under `artifacts/water/` and `scripts/`.

The one requested fresh panel scored overall graphics **7.6 (art), 7.5 (models/materials), 7.7 (visual feedback)** and water **8.0 / 7.8 / 8.0**. The reports are `docs/WATER_REVIEW_ART.md`, `docs/WATER_REVIEW_MODELS.md` and `docs/WATER_REVIEW_JUICE.md`. Reviews used actual renders and recorded frames, not continuous playback or human play. **The 9.3 graphics gate remains unmet.** Next craft priorities are wet sand and shore wash, localized rock contact, lighting/text contrast and material/terrain consistency. This panel does not reopen or regrade driving, completeness or audio. No second critic round, commit or deployment was performed. Vite remains available at http://127.0.0.1:4200.

---
# Current road and land handoff - October 5, 2026

Start with [Road and land detail](docs/ROAD_LAND_PASS.md). Granular asphalt, subtle tire wear, worn markings, mineral shoulders, sealed cracks and irregular repair patches add detail to the road. Seven original PBR surface sets blend grass, soil, sand, needles and rock across the three regions. Finer nearby terrain and small erosion shapes give the banks more definition. Original Blender outcrops, ferns and coastal sage/wildflowers add 956 plants and 225 rocks, with paused wind, instanced habitats and distant geometry.

The full serial suite passes **111 tests in 20 files**; terrain checks pass again after final placement changes. Final production build and 32-asset audit pass. The final 16 High/Balanced environment views, three model studies and phone view have zero browser/shader errors. Live browser checks confirm terrain intersections, 130 submerged offshore bases, all 48 earlier actors, paused wind and responsive gallery controls. Short warmed pacing samples average 16.66-17.85 ms; supported-device performance remains unverified.

The [road and land gallery](artifacts/road-land/road-gallery.html) contains before/after sliders, High/Balanced views and the original model studies. Both earlier galleries link to it. Editable Blender sources are in `artifacts/road-land/blender/`; `scripts/build_land_textures.py`, `scripts/build_land_models.py` and the road capture/verification/gallery scripts reproduce the pass. Verification evidence is under `artifacts/road-land/`. Vite remains at http://127.0.0.1:4200. Driving rules and earlier review gates remain unchanged. No new independent judge score, commit or deployment was performed.

---
# Current living-world handoff - October 4, 2026

Start with [Life along the Pacific](docs/WORLD_LIFE_PASS.md). Seven original articulated Blender models add 48 animated actors: four station retrievers, 11 visitors, 18 gulls, six deer, five touring cyclists and four kites. Water bowls, tennis balls and four picnic sets accompany the scenes. Different timing, nearby-car greetings, camera flashes and horn reactions bring activity to the route. Press H, Gamepad X or the on-screen HORN button to say hello.

The full serial suite passes **108 tests in 19 files**; final production build and the 28-asset audit pass. Final model/scene and motion captures have zero browser errors. Quick phone horn taps work. Actors fit the visible terrain; cyclists use a separate path beyond the rail, station hosts stand on the forecourt, and pausing freezes poses and attention. Browser checks and short same-host pacing evidence are saved under `artifacts/world-life/`.

The [living-coast gallery](artifacts/world-life/world-gallery.html) contains the in-engine WebM/MP4 showcase, eight roadside scenes and seven individual model studies. Editable sources are in `artifacts/juice/blender/pacific-*.blend`; `scripts/build_world_life.py`, the capture scripts and movie/gallery generators reproduce the assets and review material. Vite remains at http://127.0.0.1:4200. Supported-device performance and a separate human horn listening review remain unverified. No new independent judge score, commit or deployment was performed.

---
# Current lighting handoff - October 4, 2026

Start with [Lighting calibration](docs/LIGHTING_PASS.md). Exposure, sunlight, sky fill, reflections and bloom now preserve richer paint colors and clear surface detail. Studio lights use the shared calibration too. The sky follows the camera through the last section of the route, fixing the old missing background beyond the enclosing box.

Production build passes. High/Balanced garage, coast, redwoods, headlands and paint views, phone rendering, moving-cloud samples, 18 vehicle angles, 25 paint studies and 12 detailed model studies have no browser/shader errors. The [gallery](artifacts/juice/detail-gallery.html) includes lighting comparisons. Existing gameplay, vehicle geometry and historical review gates remain unchanged. No fresh independent score, commit or deployment was performed.

---
# Current vehicle-model handoff - October 4, 2026

Start with [Complete vehicle bodies and color variants](docs/VEHICLE_MODEL_PASS.md). All six vehicles now have separately authored full bodies, fitted fenders, distinct front/rear designs and running gear. The pickup has an open ribbed bed; the camper has a short van nose and full-height cabin/rear door. Ten shared paints are integrated into moving/parked traffic and the garage, including coordinated camper upper colors and persistent garage choices.

Full suite: **102 tests pass in 18 files**; paint/UI tests rechecked after the phone layout adjustment. Final production build and 21-asset audit pass. In-engine bounds, 18 model angles, 25 paint studies, gallery controls, mobile paint access and actual new-paint reload all pass. Road/motion captures have no runtime errors. The scripted traffic tour passes 12 checkpoints with 11 passes and zero hits. The short headless sample averages 21.14 ms; supported-device performance and human input/audio remain unverified. No fresh independent judge score or category-gate certification is claimed.

Use `scripts/build_vehicle_assets.py -- --model all` through Blender for the complete vehicle family. Existing detail-builder selectors delegate to it. Named editable Blender sources remain in `artifacts/juice/blender/`; the [updated gallery](artifacts/juice/detail-gallery.html) has front/side/rear views, previous-model comparisons and named color studies. Vite remains at http://127.0.0.1:4200. No commit or deployment was performed.

---
# Current model-detail handoff - October 4, 2026

Start with [Detailed models and living atmosphere](docs/MODEL_DETAIL_PASS.md). The new follow-up adds individually detailed hero/landmark assets, authored palms/overlook props, five traffic models with distant LODs, parked vehicles, coastal infrastructure/debris/birds, moving clouds, and changing sunlight. The oncoming traffic Euler flip is fixed and covered by a failing-before/passing-after regression and loaded-model inspection.

Full suite: 99 passing tests; affected driving/traffic tests rechecked after collider updates. Build and 21-asset audit pass. In-engine individual model studies, desktop/mobile captures, two-minute sky comparison, and actual scripted driving contain no runtime errors. The short headless pacing sample averages 19.88 ms; supported-device performance and human input/audio checks remain unverified. The earlier panel scores/caps below are historical; this follow-up has no fresh independent visual score and does not certify the 9.3 gate.

Use `scripts/build_detail_assets.py` for finished asset rebuilds. Editable Blender sources and [the model gallery](artifacts/juice/detail-gallery.html) are in `artifacts/juice/`. Vite remains available at http://127.0.0.1:4200. No commit/deployment or unrelated-work restoration was performed.

---
# Current graphics handoff - October 4, 2026

Start with [Three graphics passes and judging](docs/JUICE_PASSES.md). The three juice passes and both authorized revision rounds are complete. Final independent visual scores: **7.2 / 7.4 / 7.6**. The 9.3 gate remains unmet. Final serial regression: **98 tests passed**; TypeScript/production build and asset audit pass; actual desktop/mobile and scripted motion captures contain no runtime errors. Both revision rounds are exhausted.

Original Blender Vela GT, service station, lodge and textured redwoods are integrated. Editable sources and review screenshots are under `artifacts/juice/`; rebuild/capture commands and remaining art gaps are in the review report. Live shell/Playwright inspection now works through hardware D3D11 despite the CUA sandbox initialization error. Representative-device performance, continuous motion quality and human input/audio checks remain unverified.

Run `npm run dev`, then open http://127.0.0.1:4200. The game server started for this task is currently available there. No commit/deployment or unrelated-work restoration was performed. The October 3 driving and completeness scores/caps below remain unchanged.

---
# Current handoff - October 3, 2026

Start with [Iteration 5](docs/ITERATION5.md) and the two completeness judge reports. The latest user rule is one category at a time, at most three attempts per category, with a 9.3 gate.

- Driving/gameplay: both judges **9.0 provisional**, three attempts used.
- Completeness/usability: both judges **8.8 provisional**, three attempts used.
- Presentation: no fresh score in these focused rounds; live browser initialization remains blocked by the Windows sandbox ACL error.

Checkpoint Continue, controller menu navigation, progress/records, safe restart prompts and consistent save-failure feedback are implemented. Full regression: 97 passing tests; after a final copy correction, all 12 Experience tests pass (98 unique tests covered). Final TypeScript and production build pass. No 9.3 category or player-testing readiness claim is justified yet.

Run `npm run dev` and open http://localhost:4200. Chapter controls, Grand Tour and Just Drive are in the garage. A saved unfinished timed drive exposes Continue Drive in the collection header. Continue returns to its last checkpoint with a three-second charge and empty overdrive; complete pace ghosts remain intact.

Next meaningful step is restoring live inspection for presentation and supported-device flow checks. Respect the completed category caps; broader campaign/content work should be scoped explicitly for a future round rather than treating these scores as an intrinsic limit.

---

## Historical handoff (superseded status)

> Latest continuation: [Iteration 4](docs/ITERATION4.md), September 19. Grand Tour is implemented; 9.3 gate still open.

# Pacific Run handoff — 2026-09-05

The old physics foundation was retained and the oval prototype was rebuilt into a coastal driving game. Run `npm run dev`, then open http://localhost:4200.

Start with `README.md`, `docs/ASSESSMENT.md`, `docs/JUDGE_SYSTEMS.md`, and the final `docs/JUDGE_PRESENTATION.md` report. The requested >=9.3 score in all three categories is **not met**. This is a playable development build, not a finished AAA product or a passed player-testing milestone.

Implemented: three timed chapters, checkpoint progression and medals, free drive, original GT car/paint selection, traffic collisions, overdrive, cruise (throttle only), chase/hood cameras, sunset/ocean/coast/forest scenery, tire smoke, original synthesized engine/wind/radio, minimap, pause/settings/results, keyboard/gamepad/touch controls, storage validation and graphics presets.

The source tests include independent real-Rapier scripted completion of all chapters, collision/recovery checks and browser-input regressions. Actual human gamepad/touch handling, longer audio review and sustained representative-device performance still require validation.

The last independent systems review gave driving 8.5/10 and completeness 7.8/10; its presentation score was 6.5 provisional and not visually re-inspected. Do not present a provisional score as a final visual verdict. See the dedicated presentation report for the fresh visual review.

Next substantial work: more credible vehicle/environment assets and materials, meaningful varied roads/destinations/objectives, larger progression/content, replay/ghosts, and extended human/device testing. These are product gaps, not reasons to inflate ratings.

`artifacts/pre-pacific-run.zip` contains the pre-edit source/tests/documents. Existing staged and unstaged work was preserved. No Git commits, resets, merges or deployment were performed. Older oval code remains in `Track.ts`, `Race.ts`, and their tests, but App runs the new coast.
