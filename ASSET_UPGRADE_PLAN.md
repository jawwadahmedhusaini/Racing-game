# Free asset upgrade — intake findings, 25 October 2026

## Decision

Keep all four existing garage choices, both circuits and saved progression. Add a new vehicle and environment only after they pass an actual asset review. A downloaded track scene is not automatically a race: importing it also requires a driveable surface, course definition, checkpoints, grid, barriers, AI and recovery validation.

First target: one artist-authored, realistic sports car on a small coastal test section. Compare it with the current game under identical lighting and camera conditions. Expand into an additional circuit only if the section improves the visual experience and fits the measured rendering budget. Do not replace existing content just to demonstrate an import. Retain Three.js and the current driving controller; changing physics engines does not solve asset quality.

## What was actually checked

The supplied third-party AI shortlist is a set of leads. Its triangle counts, licensing assertions and promotional images have not been independently verified here.

| Candidate | Observed result | Decision |
| --- | --- | --- |
| Sketchfab McLaren P1 GTR, Cheetah '84 and road candidates | Direct Sketchfab listing/API requests fail at this environment's network proxy with CONNECT 403; model archives were not acquired | Pending actual files and license/creator records. Do not claim they are imported or approved |
| Poly Haven clean asphalt and sunset | API, site and direct asphalt download requests are blocked here | Pending downloadable files and provenance; no new Poly Haven maps imported |
| Ferrari 458 sample in the official Three.js repository | Downloaded 1,681,572-byte Draco GLB. Declared active scene: 358,788 triangles, 51 primitives. Example credits vicent091036 and links to Sketchfab; downloaded model has no license metadata | Hold: source-license confirmation and substantial geometry optimization needed. Compressed transfer size disguises geometry cost |
| Khronos Toy Car | Official listing identifies a CC0 toy-car asset; inspected its actual reference image | Reject for this milestone: toy proportions do not meet the realistic hypercar target |
| Babylon.js underwater rock collection | Official CC BY 4.0 repository; downloaded 9,449,144-byte GLB, 365,750 declared scene triangles, five primitives. Thumbnail depicts marine rocks/shells | Reject direct import: marine subject matter and geometry cost need further artistic/technical work; not a ready-made coastal highway |
| Current Car Concept | Inspector matches the existing 106,391-triangle detailed mesh | Keep; current licensed base is stronger than adding unrelated low-quality models |

The Ferrari and underwater source files remain outside the project/public archives. An accessible file or a software repository's license does not by itself establish the individual third-party asset's redistribution rights. No paid asset was purchased. No proprietary racing-game assets were extracted.

## Repeatable intake

Place unapproved files in ignored `asset-inbox/`, outside `public/`. Keep their downloaded license text, creator name, listing URL and source archive together. The tool reads GLB metadata locally, records SHA-256, distinguishes unique mesh geometry from scene instances, lists material names and external dependencies, and flags compression/initial car budgets. It never follows external URLs or modifies a model.

```sh
python3 scripts/inspect-asset.py asset-inbox/candidate.glb --output asset-inbox/report.json
python3 -m unittest discover -s tests -p 'test_asset_intake.py'
```

FBX/Blend/glTF sources must first be inspected and exported as GLB using Blender. Do not enable embedded Python scripts in downloaded Blend files. Metadata counts are only a first filter: the tool does not decode compressed meshes, validate licenses, measure GPU time or prove wheel animation. `redistributionApproved: false` is intentional, including for known production files; this tool never grants approval.

## Integration gates

1. **Provenance:** record creator, exact source URL, original hash, license text/version and permitted redistribution. CC BY needs credit and modification notices. Check manufacturer branding separately; a fictional name does not erase third-party design rights. Preserve creator restrictions rather than guessing what a label permits.
2. **Visual review:** inspect the actual car from front, rear, side, above and inside. Check silhouette, normals, glass, panel gaps, wheel shape and body-material separation. Use the existing showroom for comparable captures; do not use an offline promotional render as the in-game result.
3. **Preparation:** normalize metres, Y up, +Z forward; place the ground contact at Y=0. Separate `WheelFrontL`, `WheelFrontR`, `WheelRearL`, `WheelRearR` pivots at axle centres; retain fixed brake calipers and independent spinning wheels. Map paint, glass, brake/reverse/headlight materials and exhaust locations per asset. Do not force a foreign model through Car Concept's body-deformation code.
4. **Initial budgets:** target at most 100,000 detailed-car triangles, 35,000 race-car triangles and 8 MiB detailed-car transfer size; prefer 1K–2K textures with correct colour spaces. These are screening targets, not guaranteed FPS. Inspect decoded texture memory and material/draw-call counts; retain the silhouette when generating LODs. Environment budgets must be measured for the whole visible scene, not compared to a car limit.
5. **Gameplay:** derive collision bounds from the full model including mirrors/splitters. Verify steering direction, signed wheel rotation, reverse/brake lamps, suspension, camera fit, all presets, six rivals, purchases and save compatibility. Run road-clearance checks before adding cliffs or tunnel walls. The driving surface and visual surface must agree.
6. **Delivery:** compare loading, render calls, triangle counts, frame-time percentiles and repeat-race memory with 2.4. Test on named hardware before claiming smooth performance. Publish asset credits and compatible files in both web/source packages; preserve the known-good game until the new slice passes.

## Current blocker

The intended vehicle and road archives are needed, with the license/creator information supplied by the download. They can be attached directly to this project; then geometry, wheel separation, materials and the actual licence can be evaluated. More permission or a paid purchase is not needed. A plain source-page link does not resolve this environment's blocked download access.

No new visual game release is claimed by this intake work. The published playable release remains 2.4.
