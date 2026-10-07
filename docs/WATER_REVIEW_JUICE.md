# Pacific Run water pass: visual feedback and technical art review

Date: October 5, 2026. One independent review round of the frozen visual candidate.

**Overall visual quality: 7.7/10. Water quality: 8.0/10. The 9.3 graphics target is not met through this lens.**

The game has an appealing, readable coastal driving composition and a strong water material. Its most convincing views are the low water camera and the long road beside the sunlit sea. The remaining gaps are visible craft issues in environmental transitions, lighting and screen text, and procedural repetition. Those are larger than the minor finish gaps expected at 9.0 or above. These scores were assigned from the current evidence and the brief's rubric, without using a historical score as an anchor.

## Scope and evidence actually inspected

I directly inspected 37 fresh image files:

- Every PNG in `artifacts/water/after/`: High and Balanced versions of `coast-drive`, `forest-drive`, `headlands-drive`, `water-close`, `shoreline`, `ocean-wide`, `station-approach` and `headland-shore`, plus `phone-drive.png` (17 images).
- Every PNG in `artifacts/juice/water-review/`: `garage`, `coast`, `forest`, `lighthouse`, `hood`, `station`, `sunset`, `hero-front`, `hero-rear`, `lodge-detail`, `station-detail` and `mobile-garage` (12 images).
- `artifacts/water/motion-water.png`, `motion-shore.png` and `motion-drive.png`.
- `artifacts/water/film-frame-1.png`, `film-frame-5.png`, `film-frame-9.png`, `film-frame-14.png` and `film-frame-20.png`, extracted at those seconds from the actual showcase movie.

I also read `artifacts/water/CRITIC_BRIEF.md`, `motion.json`, `verification.json`, `after/evidence.json`, `artifacts/juice/water-review/metrics.json`, `src/world/Ocean.ts`, `src/world/OceanProfile.ts`, `src/world/WorldLife.ts`, and `docs/WATER_PASS.md`. The source and manifests explain the pixels; they are not substitutes for them. No game, asset, browser state or capture was changed.

This is a static and recorded-frame review. I did not continuously play the MP4/WebM, conduct human play, or capture another browser run. Frame pairs support the existence and visual integration of changing ripples and foam. They cannot establish uninterrupted smoothness, animation timing, camera comfort, reaction timing, input feel or long-session stability. Driving, audio, accessibility conformance and completeness are not regraded.

## Score rationale

**Water: 8.0.** In the High and Balanced close views, teal body color, bright sky reflection and distorted rock reflections combine into a credible calm water surface. The low camera gives the surface depth instead of reading as a flat painted blue plane. The shoreline views retain a useful near-to-far scale change and do not compete with the road. Comparing film seconds 1 and 5 shows the ripple highlights and reflection contour changing; seconds 9 and 14 show the bright shore edge changing. This fits the relaxing direction.

The beach interface still reads as a sharp boundary between two materials. In `high-shoreline`, `high-headland-shore` and film seconds 9/14, the dry-looking sand has almost no visible wet transition, while bright nearshore marks spread into a fairly uniform mottled field. I do not clearly read a small advancing wash, a retreating damp edge and water interacting with the sand. At the low camera, dark rock reflections are much stronger than the subtle contact foam, so the rocks can look mirror-mounted. The fine surface pattern is attractive but quite consistent over large areas; the broad swell is restrained enough that stills sometimes read as a reflective lake. A calm Pacific need not be rough, but more irregular contact behavior would make it feel less synthetic.

**Overall visuals: 7.7.** The road curve, lane marks, guardrails, traffic and large hero-car silhouette give the eye an immediate route to follow. Gold paint, teal details, cream type and warm sea light form a recognizable identity. The lighthouse, station and lodge provide distinct visual beats. Water is one of the most finished materials in this evidence.

The whole scene has uneven finish. Road/vehicle detail sits against broadly smooth, sparsely populated hills, thin repeated tree silhouettes and conspicuously stacked horizontal cloud bands. Station and lodge slabs meet the grass with abrupt straight edges and weak visual access from the road; tire and building contact shadows are not strong enough in the detail/hero views to sell weight consistently. The sun-facing part of many frames washes toward pale white while the forest on the opposite side becomes very dark, reducing the readable material range. Cream scene-status text disappears into that bright sky in the desktop coast/forest captures and especially `phone-drive.png`. These issues reduce coherence and visual-feedback quality despite the effective layout.

## Strongest current results

- **A calm, integrated sea.** Warm reflections, teal shallows and a finer ripple layer make the coast feel like the central attraction. Balanced retains the same basic surface character; its lower reflection detail does not collapse the water into a different-looking material at the inspected sizes.
- **Good route hierarchy.** The vehicle, lane boundaries and forward curve stay readable even with bright water beside them. The restrained ocean motion suits a relaxing drive and leaves the road as the primary action plane.
- **Visible life at useful scales.** Gulls provide clear small silhouettes above the coast; the cyclist in the forest view and the dog/host at the station make places feel occupied. The dog has an approachable readable shape and a recognizable face. The station vignette is more specific than generic scenery.
- **A consistent product identity.** The garage presentation, chapter cards, gold/teal palette and car selection read as a designed game. The phone garage's dark gradient helps its title and chapter list remain substantially more readable than the phone driving text.

Life behavior is only partly evidenced: these captures show actors in the world, and `WorldLife.ts` describes joint animation and player-aware moments. I did not directly observe a honk response or a complete actor animation cycle, so I give no independent verdict on their timing or responsiveness. The large kite tail crossing `ocean-wide.png` demonstrates life present close to the camera but also briefly dominates that scenic framing.

## Technical limits relevant to the visual verdict

`Ocean.ts` uses a mean-plane Reflector, four bounded waves, two moving normal samples and shoreline-derived color/foam. That explains the convincing reflection layer and also its limits: the inspected water is opaque, lacks visible underwater/refraction depth, and approximates shoreline depth from distance to the coast. Tiny groundcover and residents are omitted from reflection captures. I did not identify an obvious missing-resident reflection in these images, but that omission should be understood when placing future close-water encounters.

Surface animation updates each rendered frame; reflection refresh is bounded at 0.10 seconds High and 0.24 seconds Balanced with camera-change refreshes. This is a sensible cost control, but sampled PNGs cannot validate reflection judder or stale-camera artifacts during continuous motion.

`verification.json` records seven terrain/waterline samples with errors below 0.001 m, 130 rock foam instances, a frozen paused clock, disposal checks and stable texture counts across three preset cycles (62 Balanced, 75 High). Those are useful implementation checks, not evidence that the shoreline transition is artistically finished. The six short warmed 1280 x 800 headless D3D11 samples average 16.61-22.12 ms with p95 values of 22.5-50.4 ms. They show possible pacing spikes worth testing; they do not certify supported-device performance or establish a visual stutter observed by this reviewer. The whole-game metrics list several views above 1,200 draw calls and roughly 3.3 million triangles, which is a material budget consideration rather than a proven compatibility failure.

## Three highest-value remaining visual fixes

1. **Finish the water-to-land contact.** Give the actual waterline a narrow irregular wash and a visibly damp sand transition, with varied foam persistence and partial rock contact marks. Reduce the broad uniform bright mottling near the beach. Success would be a shore view where the eye can read water approaching and leaving the sand, while keeping the calm swell and current reflection character.

2. **Recover readable light and feedback.** Keep the warm sun direction, but preserve more color and shape in the sun-facing sky/landmarks and more midtone detail in shaded foliage. Give scene-status text a controlled contrast backing or stronger contrast treatment, particularly on the phone driving view. Strengthen short-range tire/building contact shading so the hero car and roadside places feel planted. Success would be readable status text and solid foreground forms across the bright coast and dark forest views without losing the coastal mood.

3. **Break environmental repetition and resolve site edges.** Replace the repeated ladder-like cloud bands with varied soft cloud structure; vary vegetation silhouettes and clusters at scenic focal points; blend station/lodge slabs into believable local ground and access. This needs selective composition more than a large increase in object count. Success would be distinct regional character and grounded landmarks while preserving the clear road corridor and current modest visual motion.

## Verdict

The reviewed graphics are attractive and substantially realized, with strong water and a clear relaxing-drive identity. They remain below the 9.3 graphics gate because shoreline contact, light/readability and environment integration still expose the procedural construction. This verdict applies only to the graphics and visual feedback evidenced above; it makes no claim about driving, audio, completeness or player-test readiness.
