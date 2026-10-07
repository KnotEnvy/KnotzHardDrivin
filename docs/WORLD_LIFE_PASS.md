# Life along the Pacific - October 4, 2026

The coast now has small animated scenes that notice passing drivers: retrievers at the service stations, visitors who wave and take photographs, gull flocks, deer families, touring cyclists and colorful kites over the overlooks. Their different starting phases make the scenes unfold at different times during a drive. The horn gives players a way to greet nearby residents.

## Models and scenes

Seven original Blender models are integrated into the live scene. Editable sources are in `artifacts/juice/blender/pacific-<name>.blend`; exported assets are in `public/assets/`.

| Scene element | Count | Detail and motion |
| --- | ---: | --- |
| Station retrievers | 4 | Four coat/collar combinations; articulated head, tail and legs; sniffing, wandering, looking toward the car and faster tail wags when greeted. Bowls and tennis balls accompany them. |
| Coastal visitors | 11 | Coordinated linen shirts, buttons, shorts, caps and shoes; head turns, waves, kite handling, camera poses and occasional brief camera flashes. |
| Pacific gulls | 18 | Six flocks with layered wing feathers; flapping, banking, climbing and swooping flight. |
| Redwood deer | 6 | Three adult/fawn groups; grazing and alert head turns. |
| Touring cyclists | 5 | Frames, spokes, chain, running gear, panniers and helmets; turning wheels/cranks and articulated legs that follow the pedals. |
| Beach kites | 4 | Stitched fabric panels and bamboo spars; bobbing, wind-tugged strings and animated colorful fabric tails. |
| Picnic sets | 4 | Woven baskets, folded blankets, coffee thermoses and cups at the existing overlook tables. |

The 48 actors share template geometry. Distance LODs hide character meshes beyond 190 m and flight objects beyond 600 m. Dog and shirt color variants clone only the relevant materials. The seven model exports total about 1.27 MB.

Station hosts stand on the authored forecourt rather than below its raised slab. Ground sampling follows the actual terrain triangles. Extra shoulder vertices keep bicycle wheels clear of the hillside, and the separate cycle path follows the visible ground. Dogs, deer and cyclists remain beyond the guardrails; wildlife introduces no new road colliders or driving penalties.

## Interaction and integration

Press **H**, **Gamepad X**, or the on-screen **HORN** button to sound a short warm horn and greet nearby residents. Quick keyboard and touch taps survive until the next simulation update. The horn uses the game's volume control.

Approaching within 45 m starts a greeting, with a 75 m departure threshold before another approach and a 20-second greeting cooldown. Attention fades over eight seconds; horn reactions within 65 m have a separate four-second cooldown. The horn sound has a 1.2-second input cooldown. Pausing freezes ambient animation and attention together with the sky clock.

`src/world/route.ts` shares station/lodge and overlook coordinates between the scenery and actors. `Coast.ts` owns loading and world updates; `WorldLife.ts` handles actors and rigs; `LifeEncounter.ts` holds greeting state. Earlier distant wing-only gull instances were replaced by the articulated models.

## Rebuild and review

- `"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python scripts/build_world_life.py -- --model all`
- `node scripts/visual-world-life.mjs`: seven individual model studies, eight actual scene views and an interaction/pose report.
- `node scripts/visual-world-motion.mjs`: five motion views, live pacing samples and a phone horn check.
- `node scripts/verify-world-life.mjs`: roadside spacing, actual keyboard horn, paused poses, short no-video pacing comparison and responsive gallery/media checks.
- `node scripts/verify-world-gallery.mjs`: recheck gallery images, responsive layout and actual video playback after a movie export.
- `C:/Python311/python.exe scripts/build_world_movie.py`: export the trimmed motion capture to WebM/MP4 using FFmpeg.
- `C:/Python311/python.exe scripts/build_world_gallery.py`: regenerate the living-coast gallery.

Open [the living-coast gallery](../artifacts/world-life/world-gallery.html) for the in-engine movie, roadside scenes and individual models. The 25-second showcase includes all five motion views. Both WebM and MP4 movie versions are available. The vehicle/detail gallery links to this showcase.

## Validation

Final production TypeScript/Vite build passes. The full serial regression suite passes **108 tests in 19 files**, including proximity hysteresis, horn cooldowns, frozen attention, keyboard/gamepad input, quick touch taps and the existing physical driving tests. The traffic tour still completes all 12 checkpoints with 11 passes and zero hits. The 28-asset audit passes.

No-video High-quality samples at 1280 x 800, after at least 20 warm-up frames, averaged 16.67-16.70 ms with the new geometry visible and 16.66-16.93 ms with that group hidden. The visible-group p95 values were 17.8-18.4 ms. These short, display-capped samples show no consistent added frame cost at the three inspected locations; they do not establish a GPU throughput limit. Geometry was hidden for the comparison while encounter updates continued. Movie-recording samples include recording overhead and are stored separately.

Final browser evidence and short performance samples are recorded in `artifacts/world-life/verification.json`; motion and model/scene captures have their own evidence reports. These headless D3D11 checks are development-host samples, not supported-device performance certification. The synthesized horn has not received a separate human listening review. This content pass adds no independent judge score and does not alter historical review gates.
