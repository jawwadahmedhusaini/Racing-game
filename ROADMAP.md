# APEX RUSH — implementation plan

Build an original browser arcade racer inspired by the pace and presentation of premium racing games. This is an independent single-player game, not an Asphalt port or an assertion of AAA parity.

## Architecture and delivery plan
1. Foundation: Vite + TypeScript + Three.js, local assets, repeatable builds, automated simulation and browser checks.
2. Vehicle gate: integrate a licensed detailed concept-car chassis with glass, wheels, brakes, lights, intakes and cockpit; add original aero and tuning, prepare a racing LOD, and verify the car in a real Chromium render.
3. Driving: fixed 60 Hz arcade simulation, speed-sensitive steering, braking, drift, boost, barriers, ramps and recovery. Separate simulation from rendering and UI.
4. World: one carefully dressed coastal circuit, then a separate neon city circuit. Smooth road ribbons, banks and elevation, bridge sections, palms, cliffs, architecture, sky, lighting and local HDR reflections.
5. Racing: visible AI rivals, countdown, progress and laps, positions, finish, results, replay, pause and resume. Quick race, career, time trial and elimination modes.
6. Garage: three tuned concept-car variants, vehicle stats, paint, credits, unlocks and upgrades. Persist and validate progress in localStorage.
7. Polish: reactive synthesized engine/audio, drift smoke, nitro and shockwave VFX, minimap, cinematic chase camera, responsive touch controls, quality presets and audio settings.
8. Verification: build, meaningful deterministic simulation tests, browser interactions and full race completion, screenshots, console checks and measured performance. Document remaining limitations honestly.

## Art direction
Warm Mediterranean coastal sunset and cool architectural showroom; black, ivory and vermilion editorial racing UI. The detailed chassis is used in the garage and Medium/High/Ultra gameplay; Low uses the lighter race mesh. The vehicles use an attributed CC BY concept-car chassis with original aero, proportions and tuning. Road and architecture geometry is original, with attributed BabylonJS tree/surface assets, a CC0 HDR reflection map, atmospheric sky and locally bundled open-license typefaces. No copied Asphalt assets or licensed manufacturer identities.

## Constraints
Single-player first. No backend, purchases or public deployment required. Free-driving feel uses track-relative arcade dynamics rather than full rigid-body crash simulation. Major-studio asset fidelity, multiplayer, extensive cinematic content and device-wide performance guarantees are outside the first independently verified release.

## Current status
All eight implementation stages are delivered for the scoped single-player release, including both circuits, progression, keyboard/touch controls and local packaging. See TEST_REPORT.md, PERFORMANCE_REPORT.md and BUG_TRACKER.md for the exact verified outcomes and limits. The built site is published to the gh-pages branch; GitHub Pages must be enabled by the owner. Real-device performance validation remains open. The 2.2 graphics/usability upgrade is specified in UPGRADE_PLAN.md.

## Potential next releases

1. Measure on actual integrated/discrete GPUs and Android/iOS devices, then tune geometry, shadows and resolution against device budgets.
2. Add individually authored vehicle bodies and richer roadside scenery, with explicit asset licenses and download budgets.
3. Extend the career with additional tracks, ghost replays and more stunt mechanics.
4. Consider network racing only after defining hosting, authoritative simulation, matchmaking and abuse prevention requirements.
