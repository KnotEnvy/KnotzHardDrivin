# Pacific Run water-pass review: models and materials

Date: 2026-10-05. One independent regrade from direct pixels, following `artifacts/water/CRITIC_BRIEF.md`.

| Reviewed graphics | Score |
| --- | ---: |
| Overall visual quality, models/materials lens | **7.5 / 10** |
| Water visual quality | **7.8 / 10** |

These scores place the current work above a basic functional scene and between the rubric's solid prototype and strong bands. The coastal setting, vehicle identities and landmark silhouettes are clear, and several surfaces have useful material separation. Close views still reveal broad simplified shapes, uneven material craft and abrupt asset-to-ground/water joins. Those are substantial finish gaps rather than the minor gaps expected at 9.0 or above. The scores were judged independently; previous verdicts and the 9.3 target did not set them.

## Evidence actually inspected

Forty supplied images were opened and visually inspected. Fresh world renders take precedence over the unchanged model references.

- `artifacts/juice/water-review/`: `hero-front.png`, `hero-rear.png`, `garage.png`, `mobile-garage.png`, `station-detail.png`, `lodge-detail.png`, `coast.png`, `forest.png`, `lighthouse.png`, `sunset.png`, `hood.png`, `station.png`.
- `artifacts/water/after/`: `high-water-close.png`, `balanced-water-close.png`, `high-shoreline.png`, `balanced-shoreline.png`, `high-headland-shore.png`, `balanced-headland-shore.png`, `high-ocean-wide.png`, `phone-drive.png`.
- `artifacts/water/`: `film-frame-1.png`, `film-frame-9.png`, `film-frame-14.png`, `motion-water.png`, `motion-shore.png`.
- Unchanged vehicle references in `artifacts/juice/vehicles-v2/`: `collection.png`, `vela-gt-side.png`, `traffic-wagon-front.png`, `traffic-camper-side.png`, `traffic-sedan-rear.png`.
- Unchanged resident/prop references in `artifacts/world-life/`: `model-dog.png`, `model-visitor.png`, `model-deer.png`, `model-cyclist.png`, `model-gull.png`, `model-kite.png`, `model-picnic.png`.
- Unchanged landscape references in `artifacts/road-land/after/`: `model-outcrop.png`, `model-fern.png`, `model-scrub.png`.

## Score rationale

**Overall, 7.5:** The six vehicle classes have legible proportions and useful identity cues: the compact's round lamps, camper's tall two-tone body, wagon's long roof, pickup bed and hero coupe's vents/spoiler all read. Wheels, lamps, mirrors and trim provide worthwhile secondary detail. The Vela's metallic gold catches the coastal light attractively in the garage and rear hero view. However, its front fascia remains a broad rectangular face, the windscreen/interior reads as a sparse dark box, thin panel marks do not create convincing panel depth, and conspicuous wavy highlights cross otherwise simple body sides. The detailed rims sit beside visibly mechanical tire ridges. This unevenness is visible in both the fresh hero renders and the supplementary side view.

The station and lodge are identifiable places, with pumps, balcony rails, trim and parked traffic giving them purpose. The fresh detail views also reveal large plain wall faces, repeated openings, conspicuous wood-grain patterns and hard rectangular foundations sitting over broadly textured terrain. Some parked vehicles, rocks and residents lack sufficiently strong local contact shading, making the scene feel assembled. The friendly residents are readable and charming at drive distance, but their separate primitive joints and mostly uniform surfaces are still apparent close up. Palms and fern leaves add silhouette variety, while their thin repeated shapes and dark foliage remain less refined than the hero's reflective finish.

**Water, 7.8:** The low water view has an appealing blue foreground, pale horizon reflection and readable fine ripples. Rock reflections are present, broken horizontally, and help tie the rock models to the surface. High and Balanced retain the essential water read. The result supports a calm drive without visually overpowering the road. Its main limitation is contact craft: shoreline views show bright patterned water meeting dry-looking sand at a clean sharp boundary, with little convincing shallow-water or wet-sand transition. Large near-camera ripples are soft and similarly sized, while broad views become a fairly uniform field of small highlights. Rock contact detail is thin compared with the large dark reflected masses. This is attractive game water with noticeable remaining integration gaps, not an exceptionally finished coastal surface.

## Strongest work

- Vehicle silhouettes and their distinguishing details hold up at driving distance; the hero car is immediately readable within the subdued coastal palette.
- Reflective water now gives offshore rocks visual weight and connects them to the environment. The blue-to-silver range and restrained ripple contrast fit the relaxing coastal mood.
- Landmark trim, resident silhouettes and varied small props give the route recognizable stops and signs of life. The station and lodge have a useful hierarchy of large forms and smaller details.

## Three highest-value remaining craft fixes

1. **Finish the hero vehicle's major surfaces before adding accessories.** Refine the front fascia and body-to-wheel transitions, give panel joins credible depth, clean up the rippling body highlights, and improve glazing/interior depth. Balance tire tread against the finer rim detail. Fresh `hero-front.png` and `hero-rear.png`, plus `vela-gt-side.png`, are the clearest evidence. This asset fills the screen repeatedly, so its finish has the greatest recurring impact.
2. **Bring landmarks and natural props to one consistent material and grounding standard.** Strengthen contact shading around wheels, foundation edges, rocks and feet; vary broad wall/wood surfaces at a believable scale; improve rock surface structure and foliage lighting without simply increasing object count. The station/lodge detail shots and shoreline foreground expose these gaps most clearly. Keep the approachable resident style, but polish joint transitions and avoid its separate primitive parts feeling accidental.
3. **Finish the water's contact with sand and rocks.** Add a narrow, irregular shallow/wet-sand transition, more locally shaped foam at actual contact points, and restrained ripple-scale variation across near and far water. The close view should preserve its calm character while the shoreline gains a readable sense of depth and contact. `high-shoreline.png`, `balanced-headland-shore.png` and `motion-shore.png` show the present sharp boundary; `high-water-close.png` shows the soft, repetitive near-field surface scale.

## Review and gate limits

The **9.3 graphics gate is not met** from this models/materials review; both scores are below it. This verdict applies only to the graphics inspected here. It does not regrade driving, audio, accessibility, completeness or supported-device performance.

This was a static/frame-based review of supplied captures, including a few extracted in-engine frames. No browser capture or new play session was launched, and the full showcase video was not played. Frame differences cannot establish continuous water motion quality, reflection refresh smoothness, animation quality or sustained frame pacing. The phone images establish composition at that capture size, not certification of a physical phone. The unchanged model references supplement the current fresh renders; they do not establish any new model changes. No source or asset edits, revisions, or second scoring round were performed.
