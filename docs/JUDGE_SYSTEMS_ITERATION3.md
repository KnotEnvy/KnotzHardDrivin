# Independent systems review: iteration 3

Reviewed 2026-09-05. Scope: source inspection of App, Journey, Ghost, ghostData, and ghost tests, with prior independent systems evidence as context. No browser or listening review was performed by this reviewer. Changes being made concurrently by the parent are outside this snapshot until rechecked.

| Category | Score | Evidence boundary |
|---|---:|---|
| Driving / gameplay | 8.5 / 10 | Existing physical driving test evidence plus current source review; no fresh human handling certification |
| Visual / audio | Not scored | Current assets and sound were not independently viewed or heard; the previous 6.5 is historical, not a current verdict |
| Completeness / usability | 8.1 / 10 | Saved pace ghost adds replay motivation; short campaign scope and input/device acceptance gaps remain |

The requested 9.0–9.3 gate is not established by this review. No critical progression regression was found in the inspected source. Countdown, pause, ordered checkpoints, medal retention, recovery penalty and free-drive wrap protection remain present. Ghost storage is separated from progress storage, bounds recordings, rejects malformed/non-monotonic data, interpolates shortest-angle headings, and avoids interpolating through recovery penalty gaps. Traffic and physical driving evidence from the preceding review remains useful but does not establish sustained human play quality.

Actionable observations sent to the parent before this report:

- Ghost.enabled has no user-facing control in the inspected revision. An optional ghost should be configurable when overlapping motion is distracting.
- Medal and ghost writes catch storage errors, but their callers do not communicate failed persistence. A completed run can appear saved when storage is unavailable.
- App contains replacement characters in the ghost notice and performance-summary separators; correct the source encoding/text.
- sampleGhost returns the preceding frame at the exact final timestamp if the last interval is greater than 0.3 seconds. Check the exact endpoint before returning the held frame for a discontinuity. Normal 0.1-second recordings rarely expose this, but valid stored data can.

The parent acknowledged the first three items and is implementing changes; this report does not claim those later edits were verified. The fresh test run returned 45 passes and three 20-second timeouts in the physical chapter 2/3 and collision tests, plus a vitest-worker onTaskUpdate timeout. Total run time was 466 seconds while the host was severely stalled. Logged physical outcomes matched the preceding review (all four checkpoints in each chapter; finite collision), but this is not a passing suite. Re-run under low host load before making a validation claim. The separately queued type-check was still pending at report time.

Further source observation: the results cue uses the same master gain that render immediately fades toward zero outside driving/countdown, truncating the intended 0.6-second result sound. Sound.cue also lacks the onended node disconnection used by the music notes. These are source observations, not an auditory verdict.

Substantive remaining work to reach the requested standard includes richer route/challenge variety, a compelling longer progression loop, and sustained manual driving with real keyboard/gamepad/touch and performance measurements. More unit tests alone would not justify raising the gameplay score to 9.0.
