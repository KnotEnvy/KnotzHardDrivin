# Complete vehicle bodies and color variants

October 4, 2026. This pass responds to the gallery review: the traffic vehicles previously changed their cabins while sharing the same lower shell. Every vehicle now has separately authored full-body proportions and fittings.

## Vehicle designs

| Vehicle | Complete body and running gear |
| --- | --- |
| Vela GT | Low wide coupe, rear haunches, fitted open arches, projector/DRL assemblies, hood/deck vents, ducktail, splitter, diffuser and exhaust. Its four runtime wheels remain on the original suspension. |
| Coastal sedan | Long hood and separate trunk, sedan belt molding, painted/chrome front bumper, divided rectangular lights, grille and eight-spoke wheels. |
| Surf wagon | Longer cargo body and wheelbase, upright tailgate with vertical lights, roof rails/crossbars, molded bumper and split-spoke wheels. |
| Compact | Short wheelbase and rear overhang, short hatch, oval headlights, fog lights, lower intake, small pressed-steel wheels and hatch spoiler. |
| Pickup | Raised body and hood, truck grille/lights, steel bumpers/steps, larger tires, fender trim, a genuinely recessed ribbed cargo bed, bed caps and stamped tailgate. |
| Weekend camper | Short van nose, full-height cabin sides and vertical rear door, separate framed windows, sliding-door seams, engine louvers, wraparound bumper, pressed-steel wheels and pop-top/skylight. |

Each body has its own longitudinal width/deck profile, hood and rear shape, wheel placement, tire size and fascia. Curved cabin headers close the roof joins. Body perimeter bevels, split edges and weighted normals improve the surfaces; lamps, mirrors and fender returns have fitted supports. The near models preserve individual named parts in their Blender sources, then batch meshes by material only for the runtime GLB. Separate simplified models remain in use beyond 95 meters.

## Colors and integration

The garage, moving traffic and parked traffic share ten choices: Sunburst, Sea glass, Carmine, Ivory, Forest, Pacific blue, Sky blue, Graphite, Burgundy and Coastal clay. Every traffic family repeats in several colors across the existing 18-car fleet. Camper clones also receive a coordinated pale upper body and roof.

Clones share geometry and unchanged trim/glass/lamp materials. Each clone owns its painted materials, so painting a car cannot recolor a different car or its template. Garage saves accept every palette entry, retain the earlier four colors, and preserve route progress. Garage swatches wrap on desktop; a scrollable paint tray on phones keeps all ten choices clear of the drive buttons. Vehicle-specific collision footprints now enclose the rebuilt bodies and bumpers; the oncoming quaternion fix remains intact.

## Inspection and verification

The [updated gallery](../artifacts/juice/detail-gallery.html) provides front, side and rear studies for all six vehicles, previous-model comparisons, and five rendered paint choices for each traffic family. These are in-engine renders of the exported assets.

- Full serial regression: **102 tests passed in 18 files**. This includes clone isolation, shared geometry, every garage paint save, the oncoming-direction regression, physical campaign drives and traffic encounters.
- The complete traffic tour passed all 12 checkpoints with **11 passes and zero hits** after the footprint changes.
- TypeScript/production build and the **21-asset audit pass**. The existing large JavaScript bundle warning remains.
- All six models pass precise in-engine bounds checks. Traffic tires retain a 2 mm tread allowance below the nominal collider floor; the vehicles remain above the road at their existing root height.
- All **18 angle studies and 25 paint studies** render without browser/runtime errors. Paint studies check the requested body color at both detail levels.
- Gallery front/side/rear controls and all ten mobile garage choices pass actual browser interaction checks. Coastal clay reaches the loaded Vela material and remains selected after an actual page reload. The 390-pixel garage keeps its label above the route controls and has no horizontal page overflow.
- Desktop/mobile garage, coastal/forest/sunset routes, close-up cars/parked vehicles, and scripted App/Rapier drive/boost/drift/impact/braking captures have no browser/runtime errors.
- Short live headless D3D11 sample: **203 frames, 21.14 ms average, 20.4 ms p95**. This is host/browser evidence, not supported-device or human input/audio certification.
- Continuous arch returns replace the segmented prototypes and reduce their submission cost. Final traffic bodies use about **58-69k triangles nearby and 11-13k at distance**. The representative high-quality coast capture submits **1.59M triangles** including shadow/post-processing draws.

No new independent visual judge round was performed for this focused vehicle pass. The prior scores and category gates remain historical.

## Rebuild

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python scripts/build_vehicle_assets.py -- --model all
node scripts/audit-assets.mjs
node scripts/visual-vehicles.mjs
node scripts/visual-vehicle-colors.mjs
node scripts/visual-capture.mjs vehicle-final
node scripts/visual-motion.mjs vehicle-motion
C:\Python311\python.exe scripts/build_detail_gallery.py
node scripts/verify-vehicle-gallery.mjs
npm run build
node node_modules/vitest/vitest.mjs run --maxWorkers=1
```

Individual selectors: `vela-gt`, `traffic-sedan`, `traffic-wagon`, `traffic-compact`, `traffic-pickup`, `traffic-camper`; `traffic` rebuilds the five traffic families. The existing `build_detail_assets.py` selectors delegate vehicles to this complete body authoring pipeline while keeping landmark and landscape detailing.

Editable sources: `artifacts/juice/blender/*.blend`. Runtime near/distant assets: `public/assets/*.glb`. Angle studies and measured model bounds: `artifacts/juice/vehicles-v2/`. Color-clone evidence: `artifacts/juice/vehicle-colors/`. The previous front studies are retained in `artifacts/juice/vehicle-before/`.

Open http://127.0.0.1:4200/artifacts/juice/detail-gallery.html with Vite running, or return to the game at http://127.0.0.1:4200. No commit or deployment was performed.
