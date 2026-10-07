# Independent driving judge A - three-attempt review

Date: 2026-09-22. Scope: driving/gameplay only. The user allowed a maximum of three build-and-judge attempts for this category. The 9.3 gate is unchanged.

| Attempt | Provisional score | Gate |
| --- | ---: | --- |
| 1 | 8.6 / 10 | Not met |
| 2 | 8.8 / 10 | Not met |
| 3 | 9.0 / 10 | Not met |

These scores reflect independent source/test review and execution results supplied by the parent agent. They are not a manual handling verdict. Browser automation could not initialize because of the Windows sandbox deny-read ACL error; this reviewer did not play the build, hear it, measure live frame pacing, or test physical keyboard/gamepad/touch feel. No credit was invented for those observations.

## Attempt 1

Reviewed Input, Vehicle, vehicle configuration, App integration, Traffic, Journey, Ghost, route definitions and focused tests. Continuous scaled stick deadzone removes the threshold jump. Rear handbraking now opposes travel in either direction without selecting reverse. Controller loss pauses the run and disengages cruise. Parent reported 15 targeted checks passing, stopping below 0.15 m/s, and unchanged 147.5833-second automated Grand Tour completion through twelve gates without traffic.

Remaining priority: same-lane traffic could catch/interpenetrate slower cars; axis-aligned proximity was unreliable on curves; full-route evidence did not include overtaking traffic.

## Attempt 2

Reviewed trafficMath, Traffic, traffic unit tests and the live-traffic integration driver. Snapshot-based following, acceleration/braking, stationary-player stopping in either direction, minimum separation and oriented overlap materially improve fairness. Parent reported a successful real-Rapier Grand Tour: 199.4333 seconds, twelve gates, eleven deliberate passing maneuvers, zero detected hit encounters, maximum lateral offset 3.6725 m, no recovery. An earlier test-driver run failed after six gates; the parent corrected its stale passing target before this successful run.

Remaining priority: the close-pass reward fired before a pass finished, so a reward could precede a later collision. Contact consumption was limited by the close-pass window. The integration test logged hits without asserting zero.

## Attempt 3 - final

Reviewed PassEncounter, Traffic pose history, Vehicle fixed-pose history/interpolation, GameLoop alpha consumption, App camera/shadow anchoring, encounter/interpolation tests and the strengthened traffic-tour assertion.

A close approach now becomes a reward only after the other car clears behind the player. Any overlap consumes the encounter, including overlaps outside the former narrow window. Tests cover clean completion, duplicate reward prevention, approach-then-contact, contact-then-slide, low-speed and abandoned approaches. The traffic-tour test now asserts zero detected hits. Vehicle and traffic rendering interpolate previous/current simulation poses while keeping physics separate; respawn/reset collapses both interpolation endpoints. Parent reported ten focused checks and TypeScript passing, with the same successful full-route traffic metrics.

No additional must-fix defect was established in this final inspected change. This does not certify the complete game: tests use a flat ground fixture and automated steering with knowledge of traffic positions, not a human navigating the rendered world. Interpolation correctness is supported mathematically; perceived smoothness is unobserved.

Final provisional driving/gameplay score: **9.0 / 10**. Best achieved within the three authorized attempts: **9.0**, below the **9.3** gate. Stop this category's iteration cycle at the requested cap. Sustained human handling, readable challenge under real camera conditions, input-device feel and route/mastery variety remain the substantive reasons not to award 9.3 or AAA readiness.
