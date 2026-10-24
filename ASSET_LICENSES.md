# Assets and licenses

## Car Concept — adapted model and textures

- Author: **Eric Chadwick**, © 2024 **Darmstadt Graphics Group GmbH**.
- License: **Creative Commons Attribution 4.0 International (CC BY 4.0)**. Full license bundled in `public/licenses/CC-BY-4.0.txt`.
- Source and description: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept
- Source model: https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/glTF-Binary/CarConcept.glb
- Original concept: Unity Fan, public-domain/CC0 source, linked in the upstream README.
- Metadata retained: `public/licenses/car-concept-metadata.json`.
- Source GLB SHA-256: `c272098089d78c5cd9fd9f24ff50ee8acf8d932c55f2d55fc10adb6c8998966b`.
- Adapted GLB: `public/assets/concept-car.glb`.
- Adapted GLB SHA-256: `bcf160d534b872d576b252b8406406095f9cc579b43af42ddd00da83ea21d22a`.

Changes: reduced dense mesh geometry and texture resolution in Blender; neutralized the source showcase steering; removed the third-party license plate and steering emblem; changed glass rendering for performance; added game-specific paint, license plate, aero, fitted rear vents and LED light strips, wheel animation, lighting and boost effects. The variants have fictional names, tuned stats and different aero/proportions. Version 2.2 adds original, coherent body/glass deformation for longer-nose and wider/lower silhouettes, with inverse-transpose normal correction and rigid wheel assemblies. These remain derivatives of the credited model, not separately sourced vehicle assets. The lighthouse and transit-platform geometry is original. No author or organization endorsement is implied.

The original sample contains Khronos and 3D Commerce marks. The plate and emblem objects were removed rather than using those marks as game branding. Upstream metadata remains unmodified for provenance. In-game attribution is available through Settings → Asset Credits & Licenses.

To reproduce the preparation, download the source GLB to `/tmp/CarConcept.glb`, verify its checksum, then run `blender --background --factory-startup --python scripts/prepare-car.py` from the repository. Blender 4.3.2 was used. Blender is not needed to install or play the game.

The detailed model is used for the garage and player car in races. A rival-car LOD is bundled as `public/assets/concept-car-lod.glb` (30,534 triangles, 2,578,168 bytes). It shares the same chassis, with hidden interior geometry removed and additional mesh/texture optimization for racing. SHA-256: `f66c5c0e1b58fbde1bf46285b060bbdc404a45bfd84475ad4c7a21286e23a064`. Reproduce with the same Blender command followed by `-- --race-lod`.

## Solstice GT — original vehicle

Original long-bonnet grand-tourer geometry created for the APEX RUSH project, with no imported vehicle mesh, textures or manufacturer branding. Dedicated to the public domain under **CC0 1.0**: https://creativecommons.org/publicdomain/zero/1.0/. The reproducible authoring source is `scripts/build-solstice.py`; the manifest is `public/licenses/solstice.json`. Run `blender --background --factory-startup --python scripts/build-solstice.py` from the repository (Blender 4.3.2 used).

Body panels, cabin glazing, seats, wheel rig, tire/rim/caliper assemblies, lights and aero are separately authored. The two exports share the design; race geometry removes small details and reduces tessellation. Runtime paint, wheel steering/spin, brake/reverse lamps, body pitch/compression and boost effects are animated by the game. The model is original project art, not a claim of professional scanned-car quality.

- `assets/solstice-gt.glb`: 65,844 triangles, 2,419,544 bytes; SHA-256 `af20f5d4d20a523b6adde5be04abe39ad556ecd6cb8475f4b1f252489c29e619`.
- `assets/solstice-gt-lod.glb`: 24,436 triangles, 859,752 bytes; SHA-256 `c696efd875c24e6718a07882faeccc51e5ce45e3d4c97c86c801dfb72a959e7a`.

## Venice Sunset HDR

- Source: Poly Haven, https://polyhaven.com/a/venice_sunset
- License: **CC0 / public domain**, https://polyhaven.com/license
- Downloaded from the Three.js example mirror: https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/equirectangular/venice_sunset_1k.hdr
- Local file: `public/assets/venice_sunset_1k.hdr`.
- SHA-256: `0e72ed46b5316cb5fb67fc81ff85b024a09146fd89ef3811a8d2299647ada118`.

## Environment surfaces and broadleaf trees

- Credit: **Babylon.js contributors / BabylonJS Assets**.
- Source repository: https://github.com/BabylonJS/Assets
- Repository license: **CC BY 4.0**, as stated in https://github.com/BabylonJS/Assets/blob/master/README.md; license text is bundled in `public/licenses/CC-BY-4.0.txt`.
- Original source URLs, downloaded SHA-256 checksums and processing notes: `public/licenses/surface-assets.json`.
- Rocky-ground albedo, normal and roughness; grass albedo; water normal; broadleaf color/normal atlas and bark color/normal textures live in `public/assets/surfaces/`.
- Tree mesh source: https://raw.githubusercontent.com/BabylonJS/Assets/master/meshes/Trees/rawtrees.babylon
- Source tree SHA-256: `ca542e1e4815b8b3e6144a611892f46dbfb6fddb13bbdfc3198873683d0c0e23`.
- Changes: select LOD1 (4,420 triangles) and LOD2 (879 triangles), convert from left-handed to right-handed coordinates, reverse triangle winding, group bark/leaves, round float precision, add spatial instancing and game-specific material tints. Textures retain their original pixels.
- Reproduce: download the source tree to `/tmp/rawtrees.babylon`, then run `python3 scripts/prepare-vegetation.py`. Python's standard library suffices.
- No endorsement by the asset authors or Babylon.js is implied. In-game credits link to this source and license.

## Typefaces

Rajdhani and Inter are bundled locally through the pinned `@fontsource/rajdhani` and `@fontsource/inter` packages. Both use the **SIL Open Font License 1.1**. Their license files are copied into `public/licenses/`.

## Original project content

The game code, UI, fictional names, track layouts, road/scenery meshes, shader effects, procedural textures, aero additions, mini-car illustrations, icons and synthesized audio were created for this project. Track preview images are screenshots captured from the running game. No Asphalt, Need for Speed, real manufacturer logos, ripped vehicle models or proprietary game assets are included.

## Software

Three.js, Vite, TypeScript, Vitest and Playwright retain their respective upstream licenses. Dependency versions are fixed in `package-lock.json`. See installed package license files for details.
