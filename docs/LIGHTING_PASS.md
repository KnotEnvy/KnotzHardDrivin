# Lighting calibration - October 4, 2026

The sun, sky fill, environment reflections and bloom were combining into pale paint and glowing roadside trim. A shared calibration now controls the live game and studio reviews in `src/config/lighting.config.ts`.

| Setting | Previous | Current |
| --- | ---: | ---: |
| ACES exposure | 0.94 | 0.88 |
| Direct sunlight | 3.1 | 2.15 |
| Sky fill in clear weather | 1.5 | 1.05 |
| Reflections in clear weather | 1.19 | 0.81 |
| Sky radiance multiplier | 1.65 | 0.90 |
| Bloom strength | 0.20 | 0.08 |
| Bloom threshold | 1.3 | 1.7 |
| Studio key light | 3.5-4.0 | 2.1 |
| Studio fill light | 1.0-1.2 | 0.50 |

The sky/ground fill colors are cooler and less bright. Mie scattering is reduced and spread more softly around the sun. Cloud motion, cloud shadows and changing sunlight remain active. The finite sky cube follows the camera, fixing the missing sky beyond the old box boundary near the last section of the route. Vehicle assets and gameplay behavior are unchanged.

## Review and reproduction

- `node scripts/visual-lighting.mjs lighting-after`: garage, coast, redwoods, headlands and paint studies on High and Balanced, plus a phone garage and moving-cloud comparison.
- `node scripts/visual-vehicles.mjs`: all six models from front/side/rear.
- `node scripts/visual-vehicle-colors.mjs`: 25 paint studies under the same studio calibration.
- `node scripts/visual-models.mjs`: detailed scenery and the living sky.
- `C:/Python311/python.exe scripts/build_detail_gallery.py`: regenerate the gallery, including lighting comparisons.

Original lighting screenshots remain in `artifacts/juice/lighting-before/`; final captures and settings are in `artifacts/juice/lighting-after/`. The gallery uses the refreshed studio and road images. This focused lighting pass does not add an independent score or change the historical review gates.

## Validation

Production TypeScript/Vite build passes. Ten desktop lighting views across both graphics presets, the phone garage, both cloud-time samples, 18 vehicle model angles, 25 color studies and 12 detailed model studies render with zero browser or shader errors. The far-route sky is visibly present on both presets at route position 5500 m. Original lighting captures are preserved for comparison. The existing bundle-size advisory remains unchanged.

The refreshed gallery passes image loading and front/side/rear controls. Desktop and phone garage paint selection, persistence after reload and narrow-screen layout checks also pass with zero browser errors.
