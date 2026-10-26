# Changelog

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
