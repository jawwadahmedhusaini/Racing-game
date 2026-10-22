# Architecture

## Boundaries
- `src/main.ts`: lifecycle, scene selection, fixed-step scheduler, camera, UI actions, completion rewards and persistence. Only one simulation runs at a time.
- `src/game/simulation.ts`: deterministic 60 Hz race logic. Independent of browser rendering. Six drivers, contact handling, AI inputs, finish and elimination rules.
- `src/game/track.ts`: closed Catmull–Rom paths and arc-length lookup tables. The same path, width, direction, ramp and progress coordinates drive the rendered world and gameplay.
- `src/game/car.ts`: loaded licensed model, material customization, static geometry batching, steering/rolling wheel groups, brake illumination, aero and boost exhausts.
- `src/game/renderer.ts`: WebGL 2 renderer, local HDR environment, showroom, tone mapping, quality presets and bloom.
- `src/game/world.ts`: original road ribbons and instanced road furniture, terrain, city, ocean, start gantry and ramp.
- `src/game/effects.ts`: reusable particle pool and bounded skid-mark buffer.
- `src/game/input.ts`: keyboard and pointer controls, pointer capture and input reset on focus loss.
- `src/game/audio.ts`: gesture-activated Web Audio synthesis. No external audio sample dependencies.
- `src/game/storage.ts`: versioned save schema, defensive parsing and economy transactions.
- `src/ui/`: escaped-by-construction content, screen rendering, HUD, settings and dialogs. Saved strings are strictly validated before interpolation.

## Simulation

Vehicle distance follows the road's centerline; lateral offset and heading respond to speed-sensitive steering, drift, curvature and contact. Road-following assistance keeps the baseline accessible while leaving racing-line choice, braking, boost and passing to the player. Vehicle progress only increases from forward speed; recovery never awards distance. Lap counting uses traveled arc length, so cutting across the circuit is not a shortcut.

Nitro is bounded to 0–100, drains while boosting and recharges while driving/drifting and on clean landings. Shockwave activates only when a boost begins with at least 95 nitro. The player and AI use the same integration and collision rules, with difficulty controlling AI pace. Elimination removes last place at 28 seconds and then every 22 seconds. A race completion is rewarded at most once.

The renderer interpolates camera motion separately from the fixed-step simulation. In unusually slow rendering, elapsed frame time is capped to protect stability; this means gameplay slows on insufficient hardware. FPS reporting uses real wall time, not the capped simulation delta.

## Assets and lifetime

The detailed garage GLB and 30,534-triangle racing LOD are parsed once; each car clones materials and batches static geometry by material, preserving separate wheel pivots. Textures from the asset are shared. Per-race geometries, materials, particles and contact-shadow textures are disposed on restart/exit. Each world is built once and cached. The garage is kept separate from race scenes. Live processes are not assumed to survive cloud environment publication.

## Persistence

`apex-rush-save-v1` in localStorage holds credits, ownership, selected car, paint, upgrades, career progress, times and settings. Invalid fields revert to safe defaults. Purchases and upgrades check balance, ownership and caps before mutating. This is a local single-player save, not a tamper-resistant online economy.

## Testing

Vitest exercises the pure simulation and storage boundaries. Playwright uses real keyboard/touch events and the development-only `window.__apex` observer/stepper for deterministic full-race checks. The stepper advances the same simulation used for normal play; it does not mark races complete or assign rewards directly. Production bundles do not contain the test API.
