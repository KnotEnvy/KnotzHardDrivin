# Detailed models and living atmosphere

> Vehicle models and palette have since been rebuilt again. See [Complete vehicle bodies and color variants](VEHICLE_MODEL_PASS.md) for the current vehicle source, gallery, ten-color palette and verification. Vehicle statistics below describe the earlier detail pass.

October 4, 2026. This follow-up implements the requested individual model detailing, stable oncoming traffic, vehicle variety, and more coastal background life. It preserves the relaxing drive, with existing passing, overdrive, and timed routes available for excitement.

## Integrated assets

- **Vela GT:** rolled arch lips, fitted wipers, window demisters, seat bolsters and piping, head restraints, belts, steering wheel, gauge binnacle, infotainment, vents, gear selector, cup wells, visor panels, radiator mesh, side repeaters, fuel flap, and treaded tires. Existing suspension and handling remain in use.
- **Last Light station:** labeled pump displays and grade keys, nozzle hardware, glazing transoms, cafe counter/cups/menu/hours, roof HVAC and vents, rain gutters/downpipes, service cabinet/conduit, facade plinth, planters, parking paint, and storm drains. Original packed albedo/normal/roughness maps add material detail.
- **Horizon lodge:** numbered paneled room doors, latches, divided windows/curtains, side windows, roof gable infill/rake boards, gutters/downpipes, weatherboards, porch chairs, stair rails, chimney courses/cap, and packed plaster/cedar surfaces.
- **Pacific Point:** masonry courses, entrance steps/hardware, window sashes, prismatic Fresnel rings, lantern glazing, cottage gutter/downspout, textured slate, chimney cap, and keeper fence. Editable source now accompanies the GLB.
- **Vegetation:** new authored bowed palms with leaf scars, folded individual leaflets, crown fibers/coconuts, and a distant canopy LOD. Both redwood profiles and LODs have packed bark PBR maps alongside the needle atlas.
- **Traffic:** original sedan, wagon, compact, pickup, and camper; seven paint colors, variant-specific collision footprints, and detailed/distant LODs. The camper has a painted cabin with separate windows, sliding-door seams, vents and a roof hatch. Parked cars add variety at the station/lodge sites.
- **Background:** authored overlook furniture and interpretive boards, coastal utility poles/wires, road signs, driftwood, and small animated gull flocks. These are scenic details beyond the road barriers; they do not introduce new fuel or off-road gameplay.

## Atmosphere and the traffic fix

The sky uses the installed Three.js physical Rayleigh/Mie scattering shader with six depth samples for wind-advected cloud layers, erosion/detail and directional cloud shading, plus a separate cirrus layer. Sun elevation/azimuth/color vary slowly; moving cloud coverage softens the directional light and shadow strength. Ocean highlights share the moving sun direction. A continuous render clock avoids the former menu-to-drive time jump and freezes atmospheric time while paused. Reflections use the existing baked local probe; cloud reflections are not refreshed continuously.

The traffic issue was an Euler feedback loop: render interpolation changed the XYZ Euler decomposition, and simulation assigned only `rotation.y` on the next step. Oncoming yaw near pi could retain flipped X/Z angles. Simulation now assigns the entire authoritative quaternion. The regression failed before the fix with a facing dot product of 0.613, then passed. Loaded GLB traffic also stays aligned across 120 steps and four interpolation alphas (minimum dot 0.999999945).

## Verification

- Full serial suite: **99 passing tests in 17 files**. After the collision dimensions changed, the affected interpolation, full traffic-tour and physical campaign/impact checks passed again.
- TypeScript/production build passes. The existing large JavaScript bundle warning remains.
- Asset audit checks all 21 detailed GLBs for valid headers, finite bounds and packed images. Individual in-engine inspection validates traffic geometry against collision bounds.
- Desktop route, hood, close-up and mobile garage captures have **no browser/runtime errors**. Individual model studies and two-minute sky comparison also have no errors.
- Actual App/Rapier scripted drive, boost, drift, impact and braking captures have no runtime errors. The tour completes all 12 checkpoints with **11 passes, zero hits**.
- Short live headless D3D11 sample: **210 driving frames, 19.88 ms average, 19.5 ms p95**. This measures this browser/host, not supported-device certification or a human input/audio session.
- Representative high-quality coastal submission dropped from **2.46M to 1.66M triangles** after adding palm LODs. The count includes shadows and post-processing, not just visible mesh geometry. Distant traffic uses approximately 9–11k triangles per variant versus about 57–63k nearby.

No new independent judge round was conducted for this follow-up. The previous panel's 7.2 / 7.4 / 7.6 scores are historical, both revision rounds remain exhausted, and the earlier 9.3 gate has not been certified.

## Rebuild and inspect

```powershell
C:\Python311\python.exe scripts/build_surface_textures.py
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python scripts/build_detail_assets.py -- --model all
node scripts/audit-assets.mjs
node scripts/visual-models.mjs
node scripts/visual-capture.mjs details-final
node scripts/visual-motion.mjs detail-motion
C:\Python311\python.exe scripts/build_detail_gallery.py
npm run build
node node_modules/vitest/vitest.mjs run --maxWorkers=1
```

Rebuild an individual landmark with `--model vela-gt`, `last-light-station`, `horizon-lodge`, or `pacific-point`; use `traffic-camper` (or another traffic kind) for a single vehicle. `traffic`, `habitat`, and `forest` rebuild their respective families. The detail builder reuses the original base geometry and applies details before exporting. Use this builder for the finished assets; the older initial-pass scripts produce their original base versions.

Editable sources: `artifacts/juice/blender/*.blend`. Packed runtime assets: `public/assets/*.glb`. Original texture maps: `public/assets/detail/`. Model/sky evidence: `artifacts/juice/model-details/`. Driving evidence: `artifacts/juice/detail-motion/`. Open the [model gallery](../artifacts/juice/detail-gallery.html) or visit `http://127.0.0.1:4200/artifacts/juice/detail-gallery.html` while Vite runs. No commit or deployment was performed.
