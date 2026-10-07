# Pacific water research and implementation - October 5, 2026

## References and visual direction

The official [Three.js Water addon](https://threejs.org/docs/pages/Water.html) and [ocean example](https://threejs.org/examples/webgl_shaders_ocean.html) establish a useful WebGL reference: moving normal layers, planar reflection, sunlight and angle-dependent Fresnel reflection. The installed game uses Three.js r180 and WebGLRenderer, so that renderer path fits this project.

[Three.js Reflector](https://threejs.org/docs/pages/Reflector.html) exposes its render target and disposal, which allows the ocean's reflection resolution to follow the graphics preset without leaking old targets. We use that maintained addon for the reflection camera and clipping, with an original ocean shader.

[NVIDIA GPU Gems, Effective Water Simulation from Physical Models](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models) separates broad geometric waves from smaller surface ripples and derives normals from the waves. It also describes bounded Gerstner steepness. This is the basis for the calm directional swell and fine ripples in this pass.

The art direction is a relaxing Pacific drive: broad gentle swell, teal shallows, darker offshore water, restrained sun sparkle, broken surf and foam around partially submerged rocks. The shoreline follows the existing terrain instead of the former two repeated surf stripes. Reflection captures are bounded by preset and refresh rate; the world clock controls water animation and pauses it with the rest of the coast.

## Integrated ocean

`Ocean.ts` owns a Three.js Reflector with an original shader. Four small directional Gerstner waves deform the surface and provide analytic slope normals. Two moving, differently oriented samples of a deterministic 512 x 512 ripple texture add surface detail; its alpha channel supplies broken foam grain. The mesh has 57,100 triangles, with more samples near the coast and broad offshore cells.

A 1,024-sample shoreline texture packs actual terrain/water intersections into two byte channels. It guides the shallow/deep color transition and breaking surf. Coordinates address texel centers to keep interpolation aligned. The former repeated surf ribbons are removed. One instanced draw supplies foam around 130 partly submerged rocks.

High uses a 512 x 512 reflection target with a 0.10 s refresh interval; Balanced uses 256 x 256 and 0.24 s. Significant position, orientation or projection changes refresh early. Subpixel field-of-view easing does not force an extra capture. Reflection captures preserve the sky, terrain, rocks, trees and landmarks while omitting tiny groundcover and living-world residents. Surface ripples and foam continue every rendered frame. The shader darkens deeper offshore color and restrains reflected light to preserve the earlier lighting calibration.

Water follows the world clock, so pause freezes waves and foam. Preset changes resize the owned render target. Ocean shutdown disposes the target, geometry and original data textures. Road physics, controls, vehicles and existing encounters are retained.

This is a visual coastal water system, with a mean-plane reflection approximation and a shoreline-based shallow-color approximation. It does not introduce a depth-prepass refraction system, underwater play, boats or fluid physics.

## Verification and reproduction

Production TypeScript/Vite build passes. The full serial suite passes **113 tests in 21 files**, including waterline/terrain agreement and ocean coverage/orientation. Final water captures contain 16 High/Balanced views plus phone driving, with zero browser or shader errors. Live checks verify seven shoreline samples within 0.001 m, 130 foam contacts, all earlier 48 residents, frozen paused time and resource disposal. Three consecutive preset cycles have stable texture counts: 62 Balanced and 75 High, including the renderer/postprocessing resources.

The final six short no-video samples average 16.61-22.12 ms; p95 values range 22.5-50.4 ms. Reflection captures occur 23 times per 2.5 s High sample and 10 times per Balanced sample. The camera-trigger correction and simpler reflection detail reduced the earlier excessive capture cost. Some capture frames still spike; these development-host samples are not sustained supported-device performance certification.

- `node scripts/visual-water.mjs after`: matched route locations and lighting, both presets and phone.
- `node scripts/visual-water-motion.mjs`: fresh actual water/shore animation and a six-second App/Rapier drive, advancing from route 660 m to about 752 m.
- `C:/Python311/python.exe scripts/build_water_movie.py`: locate the actual scenes in the recording and export WebM/MP4.
- `node scripts/visual-capture.mjs water-review`: fresh whole-game views for the independent panel.
- `node scripts/verify-water.mjs`: shoreline, preset/resource, pause, disposal and short pacing checks. Keep builds, recordings and tests idle during pacing samples.
- `C:/Python311/python.exe scripts/build_water_gallery.py` and `node scripts/verify-water-gallery.mjs`: generate and check the comparison/showcase gallery, including keyboard sliders, preset switches, actual playback and phone layout.

Evidence is in `artifacts/water/` and `artifacts/juice/water-review/`. The [water gallery](../artifacts/water/water-gallery.html) presents the film and before/after views. The original water textures are generated in code; there are no new third-party art assets. The 23-second in-engine film includes all three scenes. Gallery verification confirms all 17 images, actual playback, keyboard comparison sliders, preset switching and a 390-pixel phone layout without horizontal overflow. Earlier galleries link to the water gallery.

## Independent regrade

Three fresh independent critics completed the one requested regrade of the frozen visual candidate. They directly inspected current world renders and exported recorded frames; no critic conducted continuous video playback or human play. Scores were assigned from the current rubric independently of the historical grades.

| Critic | Overall graphics | Water |
| --- | ---: | ---: |
| [Art direction](WATER_REVIEW_ART.md) | 7.6 / 10 | 8.0 / 10 |
| [Models and materials](WATER_REVIEW_MODELS.md) | 7.5 / 10 | 7.8 / 10 |
| [Visual feedback and technical art](WATER_REVIEW_JUICE.md) | 7.7 / 10 | 8.0 / 10 |

The earlier graphics panel ended at 7.2 / 7.4 / 7.6. The fresh scores above describe the current candidate; different reviewers and intervening model, lighting, life and land passes mean this is not a controlled water-only improvement measurement.

**The 9.3 graphics gate remains unmet.** The strongest shared result is the calm reflective water. The common remaining priorities are a convincing wet-sand/wash transition, stronger rock contact, consistent material/contact shading, better light and HUD contrast, and less repeated cloud/terrain structure. Detailed findings are in the three linked reports. Driving, completeness, audio, supported-device performance and player-testing readiness were not regraded; prior category scores and limits remain unchanged. No second grading round was performed.

No commit or deployment was performed.
