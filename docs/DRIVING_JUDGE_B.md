# Independent driving/gameplay judge B

Date: 2026-09-22. Scope: driving/gameplay only. Fixed passing gate: 9.3/10. User limit: three build-and-judge attempts.

| Attempt | Provisional score | Result |
| --- | --- | --- |
| 1 | 8.6 | Below gate |
| 2 | 8.8 | Below gate |
| 3 | 9.0 | Below gate; attempt limit reached |

These are independent code-review judgments informed by parent-reported executed checks. They are not live player-testing scores. Browser automation was unavailable due the Windows sandbox initialization error. I did not drive the browser game or test a physical controller in this round.

## Attempt 1

Reviewed Input, Vehicle, App, Traffic, Journey, Ghost and existing test coverage. Actual rear handbrake braking, a continuous scaled stick deadzone and controller-loss pause improved control reliability. Parent reported 15/15 targeted checks, including real-physics handbrake stopping in both directions and unchanged Grand Tour completion. Remaining priorities were traffic following/contact geometry and render interpolation.

## Attempt 2

Independently inspected trafficMath, Traffic and traffic tests. Snapshot-based following decisions, safe following gaps, obstacle braking, spawn spacing and oriented contact geometry improved traffic predictability. Parent reported the physical Grand Tour with eighteen traffic vehicles completing in 199.4333 seconds, twelve gates, eleven passes, zero hit encounters and no recovery. Ordinary braking is bounded; the emergency numerical gap cap can stop a vehicle more abruptly. The then-immediate near-pass reward could precede a subsequent impact. Render interpolation remained the highest bounded next improvement.

## Attempt 3

Independently inspected the final App, Vehicle, Traffic, trafficMath and driving-interpolation tests. App now consumes the fixed-step alpha. Vehicle body, wheels and steering interpolate previous/current states; traffic keeps separate previous/current render transforms. The camera and contact shadow follow the rendered car. Respawn and traffic teleports reset interpolation endpoints. Gameplay physics and route progression continue using fixed simulation state.

Completed-pass rewards now wait until the player clears the other car, reject any contact during the encounter and cannot repeat for that encounter. Parent reported ten targeted checks passing, TypeScript passing and the same physical traffic Grand Tour result, now with zero hits asserted. I found no must-fix regression in these changes during code review.

## Final judgment

Best achieved driving/gameplay score for this three-attempt round: **9.0/10 provisional**. **The 9.3 gate is not passed.** The allowed attempts are exhausted; this is not a claim that 9.0 is the category's inherent maximum.

Remaining evidence gaps are sustained human steering/braking/drift play, physical controller response, perceived camera comfort and smoothness, and frame pacing during real gameplay. The automated pursuit driver demonstrates completion and stability but does not establish human enjoyment. Traffic remains constrained kinematic lane traffic rather than reactive dynamic vehicles. Those limits prevent a defensible 9.3 certification from the evidence available.
