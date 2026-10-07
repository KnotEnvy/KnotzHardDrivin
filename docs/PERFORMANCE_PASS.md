# Pacific Run performance pass — October 5, 2026

The performance work preserves the authored models, texture pixels, lighting, water, and High-mode effects. The assessment found meaningful CPU and GPU costs in static scene traversal, full-screen post-processing, shadows, and model downloads. The game already had a fixed 60 Hz simulation, interpolation, bounded catch-up, instancing, scenery LODs, paused-menu throttling, and cached water reflections; those foundations remain.

The largest verified download improvement is lossless image sharing. The original public assets total 80.39 MB. The build removes 14.87 MB of duplicate embedded texture data, reducing that asset payload to approximately 65.53 MB (18.5% smaller). All 32 original GLBs in public/assets remain untouched. The optimizer supports the current single-buffer PNG/JPEG GLBs; future models using required compression extensions need explicit optimizer support. The build rewrites only dist/assets, keeping every geometry/accessor value, material, transform, animation, and image byte. The verifier compares semantic model data and SHA-256 hashes of the geometry and images. Production startup now fetches 19 shared images once each, instead of 55 image requests before startup caching.

| Preset | Pixel ratio ceiling | Pixel budget | Shadow map | Water reflection | Effects | Scenery LOD distances |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| High | 1.5 | 4.0 million | 2048 | 512 | Original bloom and finishing | Original |
| Auto | 1.0, with 0.6–1.0 adaptive scale | 2.07 million before adaptive scale | 1024 | 256 | Bloom and finishing retained | Original |
| Balanced | 1.0 | 2.07 million | 1024 | 256 | Direct rendering | Original |
| Performance | 0.75 | 0.92 million | 512 | 128 | Direct rendering | Existing levels selected at 70% of original distances |

Balanced remains the conservative default; Auto is an optional mode that retains bloom while adapting resolution. Existing High/Balanced saves retain their choice. Resolution decreases after sustained slow active-driving samples, with a floor and slower recovery. Loading, pauses, tab changes, and isolated large stalls are excluded from adaptation. The HUD stays at display resolution; adaptive rendering changes only the 3D buffer. Physics, road collision, traffic behavior, checkpoints, and race timing use the same fixed step for every preset.

Static coast transforms are computed once after asset placement. WorldLife is explicitly excluded so people, animals, kites, and birds continue to animate. Shader-driven wind, ocean waves, LOD selection, and checkpoint visibility remain live. New checkpoint gates have their transforms baked after insertion. Future moving objects must live in an excluded subtree, or keep automatic matrix updates enabled; a previously frozen object must be explicitly rebaked after relocation.

Independent model loads now run concurrently. Three.js loader caching coalesces image fetch/decode promises during startup and is cleared/restored afterward, avoiding indefinite retention of raw loading buffers. Shadow maps are retained during viewport resize when their resolution has not changed. HUD updates are limited to 20 Hz rather than a fraction of display refresh, unchanged text avoids DOM writes, and countdown markup changes only during countdown. Hidden tabs stop the animation loop and clear input; returning resumes the paused menu without accumulating simulation catch-up.

The build uses relative URLs, tested under /KnotzHardDrivin/. Stable Three.js and Rapier chunks let later game edits reuse engine downloads from the browser cache. This does not reduce the first-load engine payload: compressed JS is still approximately 1.05 MB, and the Rapier compatibility package remains the largest chunk. Production source maps are disabled. Publishing should use the output of npm run build, including assets/shared; copying public/assets back over dist would undo the optimization.

Validation: all 118 tests in 22 files pass in the final serial run, including physics, campaign, traffic, interpolation, graphics budgets, LOD restoration, saved graphics choices and menu controls. The final production build passes TypeScript and Vite. Production browser verification passes settings switching, driving and pausing, all 32 lossless model comparisons, 19 unique image fetches, and a repository Pages path, with no runtime or missing-resource errors and no production debug hook. A loading-screen selector error in the first verification script was corrected; the game had already loaded correctly.

The final isolated sample is in artifacts/performance/after-isolated/benchmark.json. All runtime checks passed: automatic scale reached 0.6 under sustained synthetic load, the animated world remained live, resize retained the shadow map, hiding stopped the loop, returning restarted it, and Performance at a 4K viewport used a 1280×720 buffer with no post-FX.

| Preset / route position | Baseline mean / p95 (ms) | Final mean / p95 (ms) | Final buffer |
| --- | ---: | ---: | --- |
| high / 720 m | 43.9 / 53.5 | 22.3 / 51.4 | 1280 × 800 |
| high / 2490 m | 16.7 / 18.5 | 17.8 / 31.3 | 1280 × 800 |
| high / 5230 m | 17.8 / 30.8 | 22.8 / 46.9 | 1280 × 800 |
| balanced / 720 m | 21.8 / 41.2 | 20.4 / 35.5 | 1280 × 800 |
| balanced / 2490 m | 17.9 / 23.8 | 17.6 / 25.5 | 1280 × 800 |
| balanced / 5230 m | 17.8 / 25.6 | 18.3 / 25.9 | 1280 × 800 |
| auto / 720 m | New preset | 24.0 / 49.5 | 1024 × 640 |
| auto / 2490 m | New preset | 26.9 / 58.7 | 896 × 560 |
| auto / 5230 m | New preset | 48.0 / 98.8 | 1152 × 720 |
| performance / 720 m | New preset | 44.8 / 112.9 | 960 × 600 |
| performance / 2490 m | New preset | 21.3 / 38.3 | 960 × 600 |
| performance / 5230 m | New preset | 22.5 / 43.6 | 960 × 600 |

The coastal High mean improved from 43.9 to 22.3 ms, but High headlands and the new Auto/Performance timings did not show consistent gains. This is not evidence of a universal FPS improvement. Performance still demonstrably reduces pixel, shadow, reflection and distant-geometry budgets; broader hardware testing must establish the resulting frame pacing. The final sequential samples were isolated from our tests/build, but other host/GPU activity was not controlled.

 The original baseline is in artifacts/performance/before/benchmark.json. The first after sample in artifacts/performance/after was contaminated by running tests concurrently and is not used as acceptance evidence. Measurements use headless Chromium with D3D11 on this host's NVIDIA GTX 1650 Ti at 1280×800. These short, stationary scene samples show local behavior, not a universal PC compatibility result. Dynamic traffic, shader warming, background applications, and GPU scheduling can affect comparisons. Before/after images retain the High presentation on visual inspection.

A compatibility release still needs an actual Intel/AMD integrated-GPU laptop, a modest older PC, and Chrome/Edge/Firefox coverage, including 1080p and high-DPI/4K screens. Use a full moving Grand Tour to check p95 pacing, checkpoint stalls, and memory growth, then test a cold load under a realistic connection. Remaining candidates are measured shadow/draw-call costs, batched static details, spatial road/wire chunks, and texture/mesh compression if first-load size remains too large. This pass does not establish the separate overall game review gate.

To repeat validation:

```powershell
npm run build
node scripts/verify-performance-build.mjs
node node_modules/vitest/vitest.mjs run --maxWorkers=1
# With the local Vite server running on port 4200, and no tests/build competing:
node scripts/benchmark-performance.mjs review
```

Sources checked during this pass: [Three.js resolution and pixel budgets](https://threejs.org/manual/pages/responsive.html), [static matrix updates](https://threejs.org/manual/pages/matrix-transformations.html), [loader cache](https://threejs.org/docs/pages/Cache.html), [resource disposal](https://threejs.org/manual/pages/cleanup.html), [glTF relative image URIs](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.pdf), and [Vite static deployment](https://vite.dev/guide/static-deploy.html).
