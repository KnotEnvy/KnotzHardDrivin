# Focused category rounds - October 3, 2026

The user requested one category at a time, with at most three build-and-judge attempts per category. The gate remains 9.3. Two independent source/test reviewers used the original full-game scope; the rubric was not narrowed to make the build pass.

| Category | Attempt 1 | Attempt 2 | Attempt 3 / best | Status |
| --- | --- | --- | --- | --- |
| Driving/gameplay | 8.6 / 8.6 | 8.8 / 8.8 | 9.0 / 9.0 | Three attempts used; gate unmet |
| Completeness/usability | 8.4 / 8.4 | 8.6 / 8.6 | 8.8 / 8.8 | Three attempts used; gate unmet |
| Presentation | Not rescored in these rounds | - | - | Fresh live inspection unavailable |

All scores above are provisional code/test judgments, not human play or rendered-device certification. Review reports: [driving A](DRIVING_JUDGE_A.md), [driving B](DRIVING_JUDGE_B.md), [completeness A](COMPLETENESS_JUDGE_A.md), [completeness B](COMPLETENESS_JUDGE_B.md). No category has established the requested 9.3 gate. These rounds stop at the authorized cap; this is the best demonstrated result, not a permanent ceiling on the project.

## Implemented

Driving now has smooth stick deadzone scaling, bidirectional handbraking without unintended reverse, controller-disconnect pause, traffic following and oriented contact checks, rewards only after a clean pass, and interpolated vehicle/traffic/camera rendering. The previous procedural physics foundation was retained.

Completeness now includes controller menu navigation and nested Back behavior, held-button suppression on resume, persistent device-storage failure feedback, visible chapter/Grand Tour medals and records, remembered chapter selection and retained route-card focus.

Timed drives save recovery points at start, each checkpoint, pause, backgrounding and context-loss shutdown. Continue returns to the last credited checkpoint at rest, adds three seconds to elapsed time and starts overdrive empty. It retains ordered progression and statistics. Medals/best times can still improve; a resumed partial recording never replaces a complete pace ghost. The briefing and results explain this. Returning to the garage preserves continuation; restarting/replacing a timed drive requires an explicit confirmation whose default is to keep the current run. Free driving preserves a pending timed run. Completed/failed timed drives clear recovery state. Invalid, expired or locked-chapter recovery records are rejected. Storage failures retain in-memory progress and show a warning.

## Verification

- Full regression suite: **97 tests across 17 files passed**.
- Both judges then flagged a free-drive restart wording ambiguity. It was corrected and a regression added: **all 12 Experience tests passed** after the correction. This covers 98 distinct tests; the entire suite was not rerun for the copy-only change.
- TypeScript and the final Vite production build passed after the correction. Final JS bundle: about 2.95 MB raw / 1.03 MB gzip; Vite's existing large-chunk warning remains.
- The real-Rapier traffic Grand Tour still completed in 199.433 seconds through all 12 gates, with 11 deliberate overtakes and zero detected hits. This is an automated flat-ground fixture, not a human driving the rendered coast.
- Browser inspection retry on October 3 failed before initialization: `windows sandbox failed: helper_unknown_error: apply deny-read ACLs`. The approved shell fallback allowed code/tests/build; it did not establish live visuals, physical controller/touch feel, audio quality or real frame pacing.

## Remaining gate blockers

The game still offers one short coastal corridor, three chapters and the combined Grand Tour, with limited campaign/activity variety relative to the original full-game ambition. A substantially richer game requires more than further menu polish. Presentation needs an operable live browser inspection path before a credible fresh score; the driving and completeness rounds should not silently receive additional attempts.

The project remains a development build, not a passed player-testing milestone or AAA release. No commits, merges, deployment, branch cleanup or unrelated-file restoration were performed. Pre-existing staged and unstaged work remains intact.
