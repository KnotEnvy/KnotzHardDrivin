# Independent Grand Tour systems review

2026-09-19. Source and focused runtime review of the current working tree. This is not a fresh visual, audio, or manual driving certification.

## Verdict

The 9.3 gate is **not met**. Grand Tour is a coherent addition: a continuous 5.9 km run links the existing three regions, with twelve ordered gates, independent medals and best time, and an independent pace ghost. It improves replay and session length, but does not by itself establish the requested full AAA game scope.

| Category | Assessment |
|---|---|
| Driving / gameplay / robustness | 8.5 / 10 provisional systems assessment; no fresh manual handling evidence |
| Visual / audio presentation | Unscored; live browser inspection unavailable |
| Completeness / usability | 8.2 / 10 provisional source-based assessment |

Do not average these into a passing score or reuse an older visual score as current evidence.

## Concrete finding

**Resolved P2 — timed finish could succeed after the advertised deadline.** `Journey.update` increments elapsed, accepts the final gate, and calls `finish(true)` before testing the time limit. A focused execution of the current TypeScript source reproduced chapter success at 100.01166666666667 seconds with a 100-second limit and Grand Tour success at 240.01166666666668 seconds with a 240-second limit. Setup: final gate pending, elapsed = limit - 0.005, dt = 1/60, position at the destination. This is small at a normal fixed step but violates the timing contract. Establish whether equality is allowed, then reject a finish beyond the limit and cover the boundary. Applied to all timed modes; it predated Grand Tour's integration. The parent fixed final-gate completion to require elapsed <= limit and added boundary regressions for both modes. Independent re-execution confirmed exact-deadline success and over-deadline failure in chapter and Grand Tour modes. No remaining must-fix Grand Tour integration defect was found in the reviewed scope.

## Inspected behavior

- `Journey.route`, `gateCount`, `recordingSlot`, and `bestTime` select the Grand Tour definition and independent save/ghost storage. Chapter medals remain separate intentionally.
- `App.startJourney` resets timer, input, cruise, boost, traffic and ghost state. Grand Tour starts at route start and creates twelve gates.
- `Coast.setGates` disposes and rebuilds gates for the chosen route, with its last gate at 5.9 km. Free drive removes timed gates.
- Recovery selects the last credited gate using the active route's length and gate count, adds three seconds, and resets collision sampling. It cannot skip to the next pending gate.
- Pause retry and results retry preserve the current mode. Only successful chapter runs advance to another chapter; Grand Tour replays itself.
- Failed Grand Tours do not store a time. Faster-run and higher-medal retention remain separate from chapter progression. Existing saves migrate with empty Grand Tour records. Failed persistent storage preserves current-session progress and produces a results warning.
- Ghost slot 3 is separate from chapter slots 0-2. The 300-second/3,000-frame read bounds and 3,000-frame recording cap cover a 240-second Grand Tour sampled at approximately 10 Hz. Recovery gaps are sampled as discontinuities. No new Grand Tour ghost bounds defect found.
- Ocean shader replacement strings were checked at the character level: they contain valid JavaScript newline escapes. No malformed-newline finding is justified from this source.

## Evidence and limits

Read Journey.ts, App.ts, Experience.ts, Coast.ts, route.ts, Ghost.ts and ghostData.ts, and existing/new tests and previous review notes. Ran a narrow reproduction against the installed TypeScript transpiler and current Journey source for the deadline finding. Did not repeat the parent's full suite or claim its pending tests as independent results.

Browser/computer-use startup is blocked by the Windows deny-read ACL setup in this session. Shell inspection required the approved workspace escalation. Consequently this review does not certify rendering, actual hood framing, landmarks, audio, frame pacing, physical touch/gamepad behavior, traffic-inclusive Grand Tour completion, or sustained manual play. Those remain material gaps before a 9.3 claim.

## Remaining quality work

A continuous mode on the same short road is useful, but more authored route variation, activities with distinct goals, meaningful vehicle/progression depth, and tested presentation/performance are still needed for the original ambition. Reviewers should assess those outcomes in the running game and keep the requested bar fixed.

Final review update: inspected lazy PostFX allocation/disposal and frame-sample reset on graphics-quality changes. This removes unnecessary Balanced-mode allocations in source; it does not establish a measured frame-rate gain. The parent reports 48 baseline tests passed, 11 affected expedition/UI tests passed, and a real-physics twelve-gate Grand Tour completion in 147.5833 seconds. Those parent-run results are distinguished from this reviewer''s focused deadline execution. Fresh visual/audio/manual-play evidence remains absent.
