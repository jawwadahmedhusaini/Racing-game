# Architecture

## Boundaries
- `src/main.ts`: lifecycle, scene selection, fixed-step scheduler, camera, UI actions, completion rewards and persistence. Only one simulation runs at a time.
- `src/game/simulation.ts`: deterministic race logic with contact substeps at up to 1/120 second. Independent of browser rendering. Seven drivers, contact handling, AI inputs, finish and elimination rules.
- `src/game/track.ts`: closed Catmull–Rom paths and arc-length lookup tables. The same path, width, direction, ramp and progress coordinates drive the rendered world and gameplay.
- `src/game/car.ts`: loaded licensed model, material customization, static geometry batching, steering/rolling wheel groups, brake illumination, aero and boost exhausts.
- `src/game/renderer.ts`: WebGL 2 renderer, local HDR environment, showroom, tone mapping, quality presets, MSAA, GTAO contact shading and bloom.
- `src/game/world.ts`: original road ribbons and instanced road furniture, terrain, city, ocean, start gantry and ramp.
- `src/game/materials.ts`: local photographic surfaces, asphalt microdetail and triplanar terrain material.
- `src/game/vegetation.ts`: compact tree LOD loading and spatially culled instanced groves.
- `src/game/effects.ts`: reusable particle pool and bounded skid-mark buffer.
- `src/game/input.ts`: keyboard and pointer controls, pointer capture and input reset on focus loss.
- `src/game/audio.ts`: gesture-activated Web Audio sample mixer with locally bundled files, synthesis fallback and bounded one-shot nodes.
- `src/game/storage.ts`: versioned save schema, defensive parsing and economy transactions.
- `src/ui/`: escaped-by-construction content, screen rendering, HUD, settings and dialogs. Saved strings are strictly validated before interpolation.

## Simulation

The simulation stores road distance, lateral offset, heading relative to the road and world yaw velocity. Steering changes world yaw; the road's yaw change is subtracted when integrating relative heading, so the road cannot steer the player. Projecting velocity into the road frame updates signed progress and lateral position. Positive right input turns clockwise from above and moves to camera-right. Rival AI explicitly computes steering and braking commands through the same physics. Recovery realigns to the road without awarding progress. The road frame is an arcade constraint, not off-road free roaming or rigid-body tire simulation.

Nitro is bounded to 0–100, drains while boosting and recharges while driving/drifting and on clean landings. Shockwave activates only when a boost begins with at least 95 nitro. The player and AI use the same integration and collision rules, with difficulty controlling AI pace. Elimination removes last place at 28 seconds and then every 22 seconds. A race completion is rewarded at most once.

The renderer interpolates camera motion separately from the fixed-step simulation. Motion feed-forward and wheel spin stop while paused or after finishing, so the camera cannot creep into a stationary vehicle. In unusually slow rendering, elapsed frame time is capped to protect stability; this means gameplay slows on insufficient hardware. FPS reporting uses real wall time, not the capped simulation delta.

## Assets and lifetime

Car Concept uses 106,391-triangle detailed / 30,534-triangle race GLBs. Original Solstice uses 65,844 / 24,436 triangles. BMW M3 uses independent detailed/race meshes; the six source GLBs are parsed once; each prepared template batches static geometry by material, preserving separate wheel pivots. Textures from the asset are shared. Ten immutable prepared templates (five catalog cars × two detail levels) retain geometry and texture maps for the page lifetime; each instance clones its materials. Instance materials and race effects are disposed on restart/exit. Rear-surface fitting samples are cached by detail level. Each world is built once and cached. The garage is kept separate from race scenes. Live processes are not assumed to survive cloud environment publication.

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

Audio becomes available to the frame loop only after the whole graph succeeds; partial setup is closed. Temporary sound nodes disconnect when finished and a zero effects volume never creates tones. Fatal asset-download and graphics-context failures expose a keyboard-accessible reload action. Runtime resources are bounded and race restarts dispose instance materials and effect resources while bounded prepared vehicle geometry stays cached. Minimap paths are cached by viewport size.

## Version 2.3 preparation, road safety and reverse

Only one AbortController may own race preparation. The UI enters `preparing` before expensive work. Checkpoints yield a paint and event-processing opportunity; normal WebGL frames and simulation steps are suspended until preparation ends. Terrain vertices are processed in chunks, scenery in stages, cars individually, and reflection faces separately. The first rendered race frame and shader preparation precede the HUD/countdown. Cancellation disposes partial scenery and car instances, preserves valid cached worlds/templates, and returns to track selection. Blur during preparation pauses the completed race. Context loss aborts pending shader waits and retains the reload screen.

`road-space.ts` indexes all road segments into spatial cells. Rocks and buildings are accepted only when their full conservative horizontal radius clears every road section by the road half-width plus a 2 m buffer. Tree and palm exclusion zones protect trunks and low branches; overhead foliage may overhang the track. The development audit independently measures accepted placements and raycasts actual terrain triangles at five lateral positions every 3 m around Costa. The broader terrain flattening margin covers the interpolation footprint of terrain cells. `heightfield.ts` samples the rendered triangle surface for vegetation, rocks and foundations, avoiding height differences between procedural terrain formulas and the visible mesh. Roadside scenery is inaccessible behind the continuous collidable road barriers; it is not a separate off-road rigid-body world.

Reverse uses signed velocity with a 0.35-second stationary brake dwell. AI braking cannot select reverse. Throttle first arrests backward motion; releasing the pedals coasts toward zero. Steering reverses yaw rate with signed motion, while wheel direction retains the driver's steering input. Camera distance/height widen during reverse and rendering/audio use absolute speed where appropriate. The HUD shows a positive speed and R gear. Reverse cannot activate nitro or ramp launch rewards.

`ramp.ts` supplies the rendered wedge and the physical support height. `rampLift` supports a grounded car; `airborne` describes height during flight. Raised ramp edges check the rotated car footprint. Slow departures fall under gravity, while a fast forward crossing of the lip launches. Only a recorded launch can grant a landing bonus, once per lap; recovery cancels that pending bonus. Revised paths use v2 record keys without deleting historical saves.

## 2.4 audit improvements

- `camera.ts`: presentation-only camera director. Reads the vehicle state, uses actual position deltas, clamps the lens to the clear road corridor, and supports reduced motion. It cannot write to the simulation.
- `opponents.ts`: pure passing/lane planner using wrapped physical gaps, neighboring traffic and ramp clearance. `simulation.ts` owns steering, acceleration and contacts for all seven drivers.
- `engine-voice.ts`: deterministic gear hysteresis and RPM/load/firing profiles. `audio.ts` renders the procedural voices after user interaction.
- `circuit-detail.ts`: static signs, fabric banners and coastal overlook geometry, merged by material and spatial cell; no added dynamic lights.
- `scripts/build-solstice.py`: original parametric Blender authoring, two GLB LODs and hash metadata. Car Concept adaptations remain separate in `scripts/prepare-car.py`.
- Vehicle templates are bounded by four catalog cars × two detail levels. Materials are per-instance; immutable geometry/maps are retained until page exit.
- 2.4 race records use `track-v3-mode`; old and v2 record keys remain readable. Existing garage/economy data are preserved.

## 2.4.1 audit corrections

Boost changes the available speed ceiling without clamping existing momentum on release. Car contact uses signed travel vectors and an inelastic normal impulse projected onto each drive direction; the simulation still has no independent lateral velocity or rigid-body suspension. Separation compensates heading for the change in road frame. Finish times interpolate the crossing within a fixed step, and eliminated drivers retain their finishing position.

Race records now use `track-v4-mode`. Unversioned and v2/v3 records remain readable; garage progress is preserved. Menu Space activation is independent of driving shortcuts, and focused touch pedals accept Space/Enter hold and release. Dialogs preserve opener focus through nested settings/credits and include links in the Tab cycle.

## 2.5 audio and contact

`EngineVoice` derives RPM from shared gear state and ratios, with clutch slip near rest and free revs during jumps/audition. `engineLayers` uses constant-power adjacent-layer crossfades; playback-rate changes are smoothed. Twenty PCM engine loops and three metal effects share a decoded buffer cache. The graph has engine/effects/music buses, master fade and a compressor. There are at most three active sample voices (player plus two nearest opponents), five loops each, and twelve transient nodes. Replaced-bank loops fade/stop after 60 ms. All sample requests use the configured hosting base and a timeout; failure leaves a procedural fallback without blocking race preparation. No sound starts before a gesture. OfflineAudioContext tests measure the actual mixed waveform, stereo energy, clipping headroom and pause/mute tails.

Each driver now has signed longitudinal and lateral velocity. Equal-mass planar contact impulses remove closing normal velocity; grip dissipates lateral recoil. Three separation passes and road constraints run after each bounded contact substep. Barriers remove inward normal velocity while mostly retaining tangential motion, with friction and impact severity. Impacts carry monotonically increasing event IDs so audio is event-driven rather than replayed on a timer. Small stationary overlaps remain silent. Airborne movement retains horizontal inertia and uses reduced steering; road height changes affect the relative flight height. Landings damp movement, trigger one sound/compression event and reward only clean, aligned jumps. This remains a road-coordinate arcade approximation, not a rigid-body/rollover solver.

Airborne nitro applies separate arcade thrust while tire throttle/braking remain ineffective in flight; releasing boost retains momentum. A regression verifies that fuel consumed during a jump produces acceleration.
