# Iteration 4 - uninterrupted Pacific Grand Tour

Date: 2026-09-19. The requested 9.3-in-every-category gate remains unmet.

## Delivered

- Continuous 5.9 km Grand Tour through all three regions, twelve ordered gates, 240-second limit, gold at 175 seconds and silver at 205 seconds.
- Separate Grand Tour medals, best time and ghost recording slot. Existing chapter saves migrate with zero/default Grand Tour progress. Ghost limits now accommodate a full four-minute recording.
- Pre-drive briefing for timed modes, route/distance/gate/medal targets, live HUD medal targets and region changes during the Grand Tour. Result retry preserves the selected mode.
- Deadline crossing fixed: finishing exactly on the limit succeeds; a finish beyond the limit fails, for both chapter and Grand Tour modes.
- Balanced mode no longer allocates High-mode postprocessing buffers. Switching back disposes composer passes and buffers; quality changes reset frame-time samples. Paused frame statistics are calculated once on transition.
- Mixed source encodings normalized to UTF-8, fixing malformed UI text.

## Verification

- Baseline before changes: 48 tests passed, including previously timing-out physics checks.
- Final serial suite: 60 tests passed across 11 files (18.97 seconds). Includes save migration, independent progression, deadline boundaries, blocked storage, long ghost reload, DOM briefing/results/retry and real Rapier full-route tests.
- Full-route pursuit-controller test: 147.5833 seconds, all twelve gates, no reset, maximum lateral offset 3.6004 m, minimum chassis height 0.6198 m. This is automated route validation without traffic, not a human driving/playability verdict.
- Final TypeScript check and Vite production build passed. Existing large-bundle warning remains (about 2.94 MB minified / 1.02 MB gzip).
- Independent code judge verified the deadline fix and found no remaining must-fix Grand Tour integration defect in inspected scope. Provisional driving 8.5, completeness 8.2; presentation unscored. See JUDGE_GRAND_TOUR.md.

## Concrete live-review blocker

Browser automation cannot initialize: `windows sandbox failed: helper_unknown_error: apply deny-read ACLs`. This occurs before reaching a browser/page. Default shell launch has the same failure; reviewed elevated workspace commands work. No changes were made to system ACLs, permissions or sandbox configuration. Restarting the game alone has not been shown to resolve this tooling problem.

Do not claim fresh screenshots, responsive/mobile visual inspection, listened audio, measured live FPS, a passed 9.3 gate, or AAA readiness from this iteration. DOM tests establish flow, not rendered layout.

## Next work

Restore functioning computer-use runtime and inspect the actual menu/briefing/HUD at desktop and phone sizes; manually complete the Grand Tour with traffic, retry against its ghost, inspect the lighthouse/hood camera and record actual frame pacing/audio observations. The next substantive development still needs authored scenery, richer route/activity variety and sustained player-feel validation. Use fresh independent judges after an inspectable candidate exists. Preserve existing unrelated staged/unstaged changes and artifacts/pre-pacific-run.zip.
