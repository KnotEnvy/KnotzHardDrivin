# Road and land detail pass - October 5, 2026

The road now has granular asphalt, subtle tire wear, dusty edges, mineral shoulders, worn paint, sealed cracks and occasional repairs. The land blends grass, soil, sand, redwood needles and stone, with damp material at the waterline. Smaller erosion shapes and finer nearby geometry give the banks more definition.

## Surfaces and scenery

Seven original deterministic 1024 x 1024 surface sets contain 17 color, packed height/roughness/AO and normal maps. Color maps use sRGB; data maps remain linear. Meter-based pavement UVs and triplanar cliff sampling keep the surface scales consistent. The lane markings remain readable, with filtered paint wear instead of a regular pixel pattern.

There are 28 irregular repair patches and 78 groups of fine sealed cracks, plus a narrow construction joint. They sit below the painted lines and add no physics shapes. Road edges vary subtly within the existing shoulder.

Three original Blender assets add 956 ferns and coastal sage/wildflower clusters and 225 sandstone outcrops. Vegetation sways with the existing world clock and freezes when paused. Station and overlook clearance regions keep the new groundcover away from the developed spaces. Outcrops have angled fracture faces, uneven crowns and original packed mineral maps; 130 offshore instances extend below the shared ocean level.

The land uses 32 sectors with 5 m nearby samples and 20 m distant samples. Geometry switches at 450 m; the first sector contains 7,040 nearby triangles and 700 distant triangles. Plants are grouped into instanced habitats and hidden beyond 330 m. Rocks switch to simpler geometry at 240 m. The terrain profile and surface sampler share the same triangle interpolation, keeping plants and earlier roadside actors on the visible surface. Forecourt cuts remain level and the pavement stays clear of the land.

The four exports contain 896 triangles for the nearby outcrop, 124 for its distant version, 810 for the fern and 2,022 for the scrub cluster. Original Blender sources retain their materials and packed textures.

The prior vehicles, calibrated lighting, living-world encounters, controls and driving rules carry through this pass.

## Rebuild and review

- `C:/Python311/python.exe scripts/build_land_textures.py`: generate the seven original surface sets in `public/assets/land/`.
- `"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python scripts/build_land_models.py`: rebuild the outcrop, distant outcrop, fern and scrub GLBs in `public/assets/`. Editable sources are in `artifacts/road-land/blender/`.
- `node scripts/audit-assets.mjs`: inspect all 32 model exports.
- `node scripts/visual-road-land.mjs after`: capture eight locations in High and Balanced, a phone view and three model studies. Keep source and public assets unchanged during capture to avoid a Vite reload.
- `node scripts/verify-road-land.mjs`: check live terrain intersections, offshore placement, actor integration, paused wind, short warmed frame samples and gallery controls/layout.
- `C:/Python311/python.exe scripts/build_road_gallery.py`: regenerate the interactive [road and land gallery](../artifacts/road-land/road-gallery.html).

The gallery contains eight before/after sliders, a High/Balanced selector, original model studies and a phone driving view. Comparisons use the same route locations and lighting. The ground-study camera follows the sampled ground height, so that camera changes vertically by about 12 cm. The earlier vehicle and living-coast galleries link to this pass.

## Validation

The full serial regression suite passes **111 tests in 20 files**, including three new checks for pavement clearance, level forecourts and agreement with actual Three.js terrain raycasts. The scripted traffic tour still passes all 12 checkpoints, with 11 passes and zero hits. TypeScript and the production build pass; the existing large-bundle advisory remains.

The final captures include 16 environment views, three original model studies and a phone view with zero browser or shader errors. Live browser verification and short performance evidence are recorded in `artifacts/road-land/verification.json`.

Live checks confirm 32 terrain sectors, 956 plants, 225 outcrops and the earlier 48 living-world actors. Six raycast samples agree with the terrain sampler within 0.001 m. All 130 offshore rock bounds extend below the water and above its surface. Paused plant wind remains frozen. All 20 gallery images load, keyboard comparison sliders and High/Balanced switching work, and the phone gallery has no horizontal overflow.

Six short samples at 1280 x 800, warmed for at least 20 frames, average 16.66-17.85 ms with p95 values of 17.8-23.9 ms. These mostly display-capped measurements check live pacing at the coast, redwoods and headlands; they do not establish a GPU throughput limit. No video recording, asset build or regression run overlapped these samples.

These headless D3D11 checks are development-host samples. Supported-device performance remains unverified. This graphics pass adds no independent judge score or review-gate certification. No commit or deployment was performed.
