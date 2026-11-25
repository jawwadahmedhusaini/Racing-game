# APEX RUSH 2.7 — imported-art milestone

This release keeps both circuits, every existing car and saved progression. It adds one independent car and four artist-authored building designs. The Y7/Veneno source remains an unshipped candidate.

## LF GT

MasterLife's LF community model is selectable for 4,500 earned credits. Its body, glass, cockpit and wheels use independent geometry, rather than another Car Concept variant. The source is credited as CC BY without a version number; that designation is preserved. No manufacturer badge, endorsement, performance specification or authentic engine recording is claimed. The existing licensed V12 bank supplies its sound.

The preparation script normalizes axes/ground height, preserves the texture atlas, builds four wheel pivots, maps head/brake lamps to existing faces and exports detailed/race meshes. The garage now offers six choices across four underlying designs.

| Runtime file | Bytes | Triangles |
| --- | ---: | ---: |
| LF detailed | 4,306,412 | 93,152 |
| LF race LOD | 2,979,152 | 33,532 |
| Four building designs | 4,713,320 | 47,938 |

These are file/geometry counts, not runtime memory or FPS. LF collision extents enclose the full model, including its aero and wheels. Vehicle-specific exhaust placement avoids reusing another car's tail position.

## Neon Harbor

Four raytrace designs — Harbor Arcade, Crown Tower, Terrace House and Spire Tower — add modeled recesses, distinct rooflines and stepped architecture. Thirty-eight placements replace space previously occupied by generated frontage/skyline. Existing port structures and road geometry remain.

Calinou's diffuse/normal surfaces are adapted to 1024px. Separate glazing uses compact room-light masks; masonry does not glow. Geometry is merged by material into 100 m spatial cells. Every placement reserves a footprint against the entire circuit, preventing a building on one road section from intersecting a nearby bend.

The 4.71 MB architecture pack is loaded only for Neon Harbor. A shared source prevents duplicate transfers, failed requests can retry, and cancellation stops waiting immediately without adding late scenery to an abandoned world. Coast and cold garage startup do not fetch the city pack. Runtime worlds own their merged geometry/materials; the one source pack and its maps are reused across city preparation.

## Evidence and remaining work

See TEST_REPORT.md and the imported-art browser/review JSON files for completed gates. Captures are actual game renders on software WebGL, including a deliberately posed car for consistent inspection. Render submissions are recorded; hardware FPS, phone thermals and input feel on real devices remain unverified.

This is a content integration milestone. It does not establish flagship visual quality, add an entire professionally authored race track, implement dynamic reflections, or provide a large manufacturer collection. The LF source has stylized proportions and some coarse surfaces; importing it does not make it a studio-quality vehicle. Future vehicle choices should be judged on final in-game appearance as well as licenses and triangle counts.

Reproduction: `python scripts/fetch-imported-art.py`, then `blender -b --disable-autoexec --python scripts/prepare-imported-art.py`. Sources are pinned, scripts are disabled when opening Blend files, and unrelated images are excluded. Original credit text and output hashes are in `public/licenses/imported-art.json`; asset terms are in ASSET_LICENSES.md.
