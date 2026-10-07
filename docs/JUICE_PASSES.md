# Pacific Run - three graphics passes and independent judging

See [the subsequent individual model detail pass](MODEL_DETAIL_PASS.md) for the later sky, traffic, asset and scenery improvements. Scores below describe this historical panel candidate.

October 4, 2026. Three initial juice passes and both authorized judge-driven revision rounds are complete. The visual approval gate remains **unmet**. The upgraded game is a development build with substantially improved original assets; it is not a finished AAA release.

## Delivered passes

1. **World and atmosphere:** authored Blender service station and coastal lodge replace the box buildings; redwood trees use an original packed needle atlas, two crown profiles and distant LODs. Clustered wind-driven grass, denser palm fronds, exposed soil, rocky shoreline groups, graded sites, corrugated guardrails, organic ocean highlights and surf improve the coast. Physical route/collider layout is retained.
2. **Hero vehicle:** original Blender Vela GT coachwork with smooth surfaces and open arches, tinted glazing, seats/dashboard/parcel shelf, fitted vents, badges, license plate, projector lights, exhausts and diffuser. Detailed procedural tires, split-spoke wheels, bolts and drilled rotors remain attached to the existing suspension. A local coast/road reflection probe improves metallic paint. Brake lamps respond to braking.
3. **Visual feedback:** bounded, time-based smoke/exhaust/spark pools; tire marks track traveled distance; sprite scaling follows viewport/FOV; overdrive changes the chase-camera field of view and adds restrained edge streaks. HDR bloom and subtle color treatment preserve the center driving view. Reduced-motion preference suppresses streaks and checkpoint pulses.

## Independent panel

Each judge inspected fresh rendered images after each revision under the same rubric. Art/model reviews are static visual judgments. The feedback judge also inspected scripted motion snapshots and their evidence, without certifying continuous animation or supported-device performance.

| Judge | Initial candidate | Revision one | Final revision |
| --- | ---: | ---: | ---: |
| Art direction | 6.4 | 6.7 | **7.2** |
| Models and materials | 6.7 | 7.0 | **7.4** |
| Visual feedback / technical art | 6.8 | 7.1 | **7.6** |

Initial concerns: opaque blue glass, sparse repeated foliage, broad uniform surfaces, weak site grounding and costly trees. Revision one added transparent glazing/local reflections, canopy volume, smaller clustered grass, site grading and LODs. The panel then identified missing-looking glass and bead-like forest tiers. Revision two corrected glass sidedness/tint, replaced solid crown lobes with textured sprays, varied crowns, lifted shadow detail, removed regular water highlights, added soil/talus/rail detail, and dispersed smoke.

Final verdict: all judges recognize material improvement; none approves against the existing 9.3 target. Both permitted revisions were used. Driving and completeness scores/caps from October 3 were not reclassified or silently reopened.

## Verification and evidence

- Final serial Vitest regression: **98 tests / 17 files passed**.
- Final TypeScript and Vite production build passed. Existing large-bundle warning remains: approximately 2.97 MB JS / 1.03 MB gzip.
- Eight GLBs pass the asset audit: valid GLB headers, finite mesh bounds, embedded textures, and a packed needle atlas for every redwood variant. Runtime imports use Vite's base URL.
- Actual game renders: desktop garage, coast, lighthouse, station, forest, sunset, hood camera, car close-ups, station/lodge details and 390 x 844 mobile garage. Captured runtime/shader errors: **none** in final static and motion runs.
- Scripted motion uses the real App fixed-step updates and Rapier physics: overdrive, drifting, 78 tire-mark segments and 34 live particles at the final sampled drift. The impact screenshot does not convincingly prove orange collision sparks; treat their visual quality as unresolved.
- Forest submissions including shadow and postprocessing passes fell from **11,135,049 to 1,190,303 triangles**, about 89%. This is a captured workload comparison, not an FPS claim.
- One short live headless Chromium/D3D11 sample: 211 frames, mean 20.05 ms, p95 18.3 ms. This does not establish sustained 60 FPS, representative mobile performance, human camera feel, controller feel, audio quality or touch behavior.
- Windows CUA/node sandbox initialization failed with the existing deny-read ACL helper error. Approved shell execution with Playwright hardware D3D11 provided working rendered inspection; the software-rendering attempt stalled. The capture scripts close their temporary browser in a finally block.

Evidence directories: `artifacts/juice/baseline`, `review-initial`, `review-round1`, `review-final`, and corresponding `motion-*` folders. `asset-audit.json` records asset sizes, actual triangle counts and material primitives. Editable final models are in `artifacts/juice/blender/*.blend`; the original lighthouse remains generated by `scripts/build_lighthouse.py`.

## Rebuild and inspect

PowerShell from the repository root:

```powershell
python scripts/build_needle_texture.py
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python scripts/build_juice_assets.py
node scripts/audit-assets.mjs
npm run build
npm run dev
```

Open http://127.0.0.1:4200. Settings offers Cinematic/high and Balanced; both retain shadows, while Balanced omits HDR postprocessing. Choose Just Drive to inspect the coast, or the Grand Tour to visit all regions. Existing saved progress is retained.

For reproducible inspection with a local Vite server running:

```powershell
node scripts/visual-capture.mjs fresh-review
node scripts/visual-motion.mjs fresh-motion
node node_modules/vitest/vitest.mjs run --maxWorkers=1
```

The capture scripts use the development-only `window.__app` hook to pose views and script motion. Captured motion is not human play. The narrow screenshot validates layout appearance, not touch interaction.

## Remaining craft gaps

The judges identify broad terrain ramps and procedural surface patterns, repeated sparse forest silhouettes, simple rock/tire surfaces, plain building side walls and very clean forecourts. The roadside sites remain decorative behind the continuous safety barriers; their visual approaches do not establish driveable station access. Grass can intersect a forecourt edge. The desktop garage is the strongest finished composition; the world still reads as a polished prototype. Further substantial art work would require a separately authorized round beyond this task's two-revision cap.

All original staged/unstaged work was preserved. No commits, resets, merges or deployment were performed.
