# Changelog

## 2.6.0 — Neon Harbor and demand-loaded cars (2026-10-27)

- Redesigned the city into a 2.71 km port, downtown and elevated-road circuit; preserved Coast.
- Exposed harbor water and added original port structures, illuminated frontage, landmark towers and portal frames, batched in spatial cells.
- Added deduplicated on-demand vehicle loading, retryable optional failures, stale-selection protection and reference-counted cache eviction.
- Improved wet-road roughness and sign emission; corrected rival braking on the longer circuit.
- Preserved garage progress and old records; new times use v7. See NEON_HARBOR_UPGRADE.md and TEST_REPORT.md.

## 2.5.2 — wall and vehicle contact (2026-10-27)

- Added contact-point yaw impulses, damped impact spin, near-flush contact stability and wall friction based on the full normal impulse.
- Fixed zero speed displayed during lateral sliding and cleared residual motion at race completion/recovery.
- Blocked boost into contacting walls and expanded rivals' traffic lookahead/braking envelope at racing speeds.
- Preserved prior saves and records; new handling uses v6 times. Added wall/traffic regressions and mobile touch workflows. See COLLISION_FIXES.md and TEST_REPORT.md.

## 2.5.1 — ramp edge and escape fixes (2026-10-26)

- Fixed cars getting permanently stuck when straddling a ramp edge. Partial-width approaches now climb and launch.
- Replaced whole-movement rollback with directional contact response, allowing forward/reverse escape and glancing slides along raised faces.
- Constrained ramp contact after rival pushes; corrected direction-sensitive takeoff, landing impact and chassis slope orientation.
- Added full approach, stop/restart, boost, reverse, traffic and browser regressions. See RAMP_FIXES.md and TEST_REPORT.md.

## 2.5.0 — sound, contact and BMW import (2026-10-26)

- Added four licensed engine sample banks with RPM blending, load/shift response, garage rev previews, braking/tire feedback, metal impacts and stereo nearby opponents.
- Imported a CC0 BMW M3 community model with an independent body/interior, animated wheel rig, lights and two geometry detail levels. Existing cars and circuits remain available.
- Added lateral collision momentum, 120 Hz contact substeps and angle-sensitive barrier response. Resting overlaps no longer trigger repeated loud impacts.
- Preserved airborne momentum, reduced air steering, separated nitro thrust from tire traction and corrected clean-landing rewards after collisions.
- Added waveform, imported-asset and physics regressions; bundled immutable source manifests and reproducible audio/model preparation scripts. See TEST_REPORT.md for current validation and SOUND_AND_CONTACT.md for limits.

## 1.0.0 — initial playable release

- Created a maintainable TypeScript/Three.js/Vite project in the previously empty repository.
- Implemented the complete garage → track/mode selection → race → results → rewards → garage loop.
- Added two circuits, six-driver races, a four-event career, time attack and elimination.
- Added three tuned vehicle variants, six paint finishes, unlocks, upgrades and persistent progress.
- Integrated and optimized a licensed, detailed concept-car asset; included attribution and licenses.
- Added drift, nitro, shockwave, ramps, contact response, camera options, touch input and synthesized audio.
- Added quality settings, asset-local production delivery, simulation tests and browser workflow tests.
