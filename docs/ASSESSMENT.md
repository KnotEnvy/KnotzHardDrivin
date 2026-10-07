# Pacific Run assessment — 2026-09-05

## Decision: retain the foundation; rebuild the experience

The original project was worth saving at the engine level. Its fixed-step loop, Rapier wrapper, raycast suspension and math/race tests provided a working base. The old playable experience was an unfinished flat oval with a basic car, limited scenery, a lap timer and no connected pause flow. All 22 original tests passed at the initial inspection.

Pacific Run replaces the experience around that foundation with a coastal road trip, three campaign chapters, traffic, free driving, a new car model, audio and complete entry/pause/results flows. A snapshot was written to `artifacts/pre-pacific-run.zip` before editing.

## Evidence

The independent systems judge added real-Rapier tests that drive all three stages using an analog pursuit controller. Without boost, recovery or traffic, chapter completion took approximately 47.72, 52.88 and 52.73 seconds. Maximum tested speed was 41.765 m/s; maximum centreline offset was 3.53 m. These runs demonstrate physical completion, not human handling acceptance.

An intentional oncoming traffic collision remained finite and allowed recovery onto four wheels. Ten input tests cover quick-tap buffering, held release, gamepad mapping/disconnect, deadzone, blur, form editing, Space on buttons and detach cleanup. The last independent complete suite passed 43 tests across seven files.

Parent browser inspection verified the original scene, revised menu and sky, compact 390×667 layout, free-drive entry, moving world and acceleration to approximately 110 km/h with cruise, and the on-screen pause flow. The original short keypress loss was found during browser use and corrected with buffered action inputs. An extended human gamepad/touch session, audio listening review and representative-device frame-time benchmark remain outstanding.

## Review iterations

Initial presentation judge: driving 6.8 provisional, presentation 5.8, completeness 7.1. Initial systems judge: driving 8.0, presentation 6.5 provisional, completeness 7.2.

Subsequent changes corrected sky clipping, road winding, coupe stance, reversed steering, excessive distant rendering, postprocessing resolution, settings resize behavior, missing boost/camera mappings, free-drive checkpoint clutter, phantom recovery collisions, input buffering and modal focus handling. The vehicle, palm foliage and contact shadows were revised; cruise control and an original synthesized radio arrangement were added.

Latest completed systems review: driving 8.5, presentation 6.5 provisional (not visually re-inspected), completeness 7.8. The fresh final presentation review completed after the interruption: driving 7.8, visual/audio 6.5, completeness 7.5. It directly inspected both graphics modes, entry flows, cruise, camera and pause/settings; audio was source-reviewed only. See JUDGE_PRESENTATION.md. These scores must not be promoted to a 9.3 pass.

## Remaining work toward the requested full-game/AAA ambition

The build has one vehicle and one mostly level six-kilometre highway, divided into three short chapters with the same checkpoint objective. It does not have a large cross-country campaign, branching roads, varied race disciplines, opponents competing for position, vehicle progression/tuning, a damage system, replay/ghost racing, photoreal production assets, weather, a day/night cycle or multiplayer.

The greatest gains now require deeper content and asset work: distinct roads and terrain, more credible environment materials/buildings, a professional vehicle/environment art pipeline, richer driving objectives, and longer player-driven handling and performance sessions. A polished menu and green tests do not establish AAA quality.

**Readiness: playable development build. The user-requested 9.3 threshold is still open.**
