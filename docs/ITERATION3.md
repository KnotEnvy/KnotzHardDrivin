# Iteration 3 - car, scenery and replay depth

2026-09-05. The 9.0-9.3 review gate is still open.

## Implemented

- Preserved smooth vehicle normals during mesh batching; interpolated body shoulders and open wheel arches; added seats, console, steering wheel and translucent glazing.
- Repositioned hood camera behind the hood.
- Created an original lighthouse and keeper cottage in Blender, exported to public/assets/pacific-point.glb. Source: scripts/build_lighthouse.py. No third-party model license dependency.
- Added multiscale terrain/rock detail, gravel shoulders and road reflectors; removed below-road dips on the inland hills.
- Added bounded best-run ghost recording, faster-run retention, validated local storage, shortest-angle playback and recovery discontinuities. Settings provide a ghost toggle.
- Added visible result-save failure notices, driving frame-time readout in pause, and separate result cue output with audio-node cleanup.
- Reduced traffic mesh detail relative to the hero car; skipped hidden-document rendering.

## Evidence and limits

Parent viewed the upgraded garage and car in the running browser. Later live driving inspections repeatedly timed out; no verified current hood/lighthouse driving screenshot, sustained performance measurement or audio audition.

Five initial ghost tests passed. Parent full suite: 47 passed, one collision-test timeout under severe host stalls. Independent judge suite: 45 passed, three physics timeouts and a worker timeout. Do not label these as a passing suite. TypeScript passed in the independent review. The production build and Blender material-batching export completed successfully (the lighthouse exports seven material primitives). A final serial test rerun follows the initially overloaded runs.

Independent systems judge: driving 8.5, completeness 8.1, current visuals/audio unscored. Subsequent fixes address toggle, save warning, endpoint and audio-cue findings. The target is not met. Do not reuse older visual scores as a fresh review or reclassify this short campaign as AAA to pass the gate.

## Resume

1. Confirm pending build/export results and rerun affected checks with a responsive host. Preserve original staged/unstaged work and artifacts/pre-pacific-run.zip.
2. Use CUA to inspect the actual car, hood camera, lighthouse, ghost setting, results/save warning and pause frame-time readout. Browser automation repeatedly timed out across discovery and tab calls; do not infer success from source.
3. Complete a manual chapter and replay its ghost. Add meaningful route/activity depth and authored environment assets; request two fresh judge reviews only after an inspectable candidate is ready.
