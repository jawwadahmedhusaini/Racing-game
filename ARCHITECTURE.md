# Architecture

## Boundaries
- `src/main.ts`: lifecycle, scene selection, fixed-step scheduler, camera, UI actions, completion rewards and persistence. Only one simulation runs at a time.
- `src/game/simulation.ts`: deterministic 60 Hz race logic. Independent of browser rendering. Six drivers, contact handling, AI inputs, finish and elimination rules.
- `src/game/track.ts`: closed Catmull–Rom paths and arc-length lookup tables. The same path, width, direction, ramp and progress coordinates drive the rendered world and gameplay.
- `src/game/car.ts`: loaded licensed model, material customization, static geometry batching, steering/rolling wheel groups, brake illumination, aero and boost exhausts.
- `src/game/renderer.ts`: WebGL 2 renderer, local HDR environment, showroom, tone mapping, quality presets, MSAA, GTAO contact shading and bloom.
- `src/game/world.ts`: original road ribbons and instanced road furniture, terrain, city, ocean, start gantry and ramp.
- `src/game/materials.ts`: local photographic surfaces, asphalt microdetail and triplanar terrain material.
- `src/game/vegetation.ts`: compact tree LOD loading and spatially culled instanced groves.
- `src/game/effects.ts`: reusable particle pool and bounded skid-mark buffer.
- `src/game/input.ts`: keyboard and pointer controls, pointer capture and input reset on focus loss.
- `src/game/audio.ts`: gesture-activated Web Audio synthesis. No external audio sample dependencies.
- `src/game/storage.ts`: versioned save schema, defensive parsing and economy transactions.
- `src/ui/`: escaped-by-construction content, screen rendering, HUD, settings and dialogs. Saved strings are strictly validated before interpolation.

## Simulation

The simulation stores road distance, lateral offset, heading relative to the road and world yaw velocity. Steering changes world yaw; the road's yaw change is subtracted when integrating relative heading, so the road cannot steer the player. Projecting velocity into the road frame updates signed progress and lateral position. Positive right input turns clockwise from above and moves to camera-right. Rival AI explicitly computes steering and braking commands through the same physics. Recovery realigns to the road without awarding progress. The road frame is an arcade constraint, not off-road free roaming or rigid-body tire simulation.

Nitro is bounded to 0–100, drains while boosting and recharges while driving/drifting and on clean landings. Shockwave activates only when a boost begins with at least 95 nitro. The player and AI use the same integration and collision rules, with difficulty controlling AI pace. Elimination removes last place at 28 seconds and then every 22 seconds. A race completion is rewarded at most once.

The renderer interpolates camera motion separately from the fixed-step simulation. Motion feed-forward and wheel spin stop while paused or after finishing, so the camera cannot creep into a stationary vehicle. In unusually slow rendering, elapsed frame time is capped to protect stability; this means gameplay slows on insufficient hardware. FPS reporting uses real wall time, not the capped simulation delta.

## Assets and lifetime

The 106,391-triangle player/garage GLB and 30,534-triangle rival LOD are parsed once; each car clones materials and batches static geometry by material, preserving separate wheel pivots. Textures from the asset are shared. Per-race geometries, materials, particles and contact-shadow textures are disposed on restart/exit. Each world is built once and cached. The garage is kept separate from race scenes. Live processes are not assumed to survive cloud environment publication.

## Persistence

`apex-rush-save-v1` in localStorage holds credits, ownership, selected car, paint, upgrades, career progress, times and settings. Invalid fields revert to safe defaults. Purchases and upgrades check balance, ownership and caps before mutating. This is a local single-player save, not a tamper-resistant online economy.

## Testing

Vitest exercises the pure simulation and storage boundaries. Playwright uses real keyboard/touch events and the development-only `window.__apex` observer/stepper for deterministic full-race checks. The stepper advances the same simulation used for normal play; it does not mark races complete or assign rewards directly. Production bundles do not contain the test API.

## Version 2.1 rendering and control changes

`batching.ts` partitions static triangles without changing their UVs or vertex normals, and partitions instances while retaining transforms and colors. Equal-material road strips are consolidated before partitioning. Tree clusters use matching near/far geometry with hysteresis. Low quality selects the lighter player model; switching presets replaces its visual model without replacing simulation state.

`RenderSystem.captureEnvironment` captures a 128-pixel half-float cube and prefilters it once per cached scene. The garage excludes the car and includes reflection light cards; track captures occur before adding race cars. Render targets stay cached with their scenes. These probes are static approximations without parallax correction. AO excludes distant geometry, transparent effects and leaf cards.

Input tracks individual touch pointers. Brake suppresses throttle and boost, including auto-acceleration. Pause prevents recovery/camera callbacks, and nested-dialog Escape returns to pause. Barrier constraints use the rotated vehicle footprint and are reapplied after rival contact.

## Version 2.2 resilience and device controls

`vehicle-shape.ts` coherently remaps the licensed body/glass mesh and its authored normals, while repositioning complete wheel assemblies. `contact.ts` uses oriented footprints and wrapped track distance, so lapped and sideways cars collide. The physics remain an arcade approximation in road coordinates.

`performance.ts` samples uncapped wall time in two-second windows after a three-second settling period. Sustained averages over 24 ms reduce scale by 0.1 to a floor of 0.55. Four windows below 17 ms permit a 0.05 increase. Menu pauses/hidden tabs are excluded and manual preset changes reset it. Pixel budgets additionally cap High and lower at 2560×1440, Ultra at 3840×2160. This controls GPU fill cost, not CPU scene complexity.

`session.ts` holds a Web Lock until page exit. A second tab receives a reload screen before assets are downloaded. The persistence layer also compares the last read serialized save before writing, and stops a stale session if another source changes it. Without Web Locks the comparison catches sequential stale writes but is not an atomic cross-process transaction. A restored back/forward-cache page reloads before resuming.

Audio becomes available to the frame loop only after the whole graph succeeds; partial setup is closed. Temporary sound nodes disconnect when finished and a zero effects volume never creates tones. Fatal asset-download and graphics-context failures expose a keyboard-accessible reload action. Runtime resources are bounded and race restarts dispose car/effect geometry, materials and per-car textures. Minimap paths are cached by viewport size.
