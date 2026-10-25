# APEX RUSH 2.4.1 — validation

## Current release checks

- **105 unit checks passed**, no failures or skipped tests.
- **14 Chromium browser workflows passed**, no failures, skips, retries or flaky outcomes; 11.8 minutes. Run started 2026-10-24T22:25:36.252Z (UTC).
- TypeScript, root production build and `/Racing-game/` production build passed.
- Packaged Python launcher smoke and Pages-base smoke passed on 2.4.1, with zero unexpected page/console errors or HTTP failures; development test controls absent.
- Dependency audit: zero reported vulnerabilities.
- The separate Python asset-intake suite passed all seven checks; it does not validate driving physics.

## Defects reproduced and repaired

Six new regression cases failed before the fixes: nitro release/exhaustion speed discontinuities, head-on contact, reversing contact, same-step finish ranking and elimination survival order. They now pass. Eight additional stress cases cover every car on both tracks with deterministic mixed braking/reverse, steering, drift, boost and recovery for 90 simulated seconds per case. State stays finite, cars stay within road bounds, and altitude/nitro remain valid.

A real browser test failed to open Settings with Space before the input fix. It now verifies native button activation, accessible dialog names, Tab access to credit links, focus restoration, Space/Enter holds on touch pedals and release on blur. All earlier browser workflows also ran against the corrected physics/input files. After the suite, a deprecated shadow enum was replaced by PCFShadowMap, the exact fallback already used by Three.js. Both builds and the packaged/Pages smokes were rerun after this one-line renderer cleanup; the packaged Ultra check rejects the old deprecation warning.

Existing coverage includes manual camera-relative steering; reverse; drift, boost, ramp surfaces and landing rewards; six AI rivals finishing both circuits on all three difficulties; save parsing/conflicts; purchases and upgrades; single reward crediting; repeated starts/resource counts; loading cancellation and duplicate starts; focus loss; multitouch; blocked storage; audio failure; asset failure/retry; actual graphics-context loss; and Solstice selection, paint, quality changes and persisted settings.

## Production and visual checks

The packaged build uses real W/Shift/S keys to verify acceleration, nitro, pause/resume and reverse. It purchases Solstice, renders Ultra and checks four layouts (1280×800, 1600×900, 844×390, 390×844). The Pages-base build loads both vehicle families, both previews, HDR, surfaces, vegetation and licence files, then starts and drives the city race. Screenshots are included in the source ZIP.

The full browser suite checks coastal terrain/scenery clearance and city scenery clearance. Geometry, textures and track layouts are unchanged. The only renderer change selects the supported shadow enum directly, preserving Three.js's prior fallback behaviour. The older `startup-review.json`, `visual-review.json`, `solstice-browser.json` and `performance.json` retain their 2.4 timestamps/results; they are historical evidence, not newly measured 2.4.1 benchmarks. No new hardware FPS or graphics-quality improvement is claimed.

## Scope and limits

Chromium on Linux uses ANGLE/SwiftShader software WebGL 2. Real desktop/mobile GPU performance, Android/iOS thermals, Safari/Firefox, subjective handling/audio and Windows/macOS launcher wrappers remain unverified. The published 2.4 software FPS results are below playable targets and do not predict hardware FPS.

The physics remain a track-relative arcade model, not a swept rigid-body simulation. A complete game audit cannot prove the absence of defects. See [DEEP_AUDIT.md](DEEP_AUDIT.md) for findings and remaining weaknesses. Existing garage progress is retained, and prior race records remain stored separately from v4 handling records.

Raw current results: `unit-results.json`, `browser-results.json`, `production-smoke.json`, `hosting-smoke.json`, `dependency-audit.json`, `audit-review.json` under `artifacts/`. Release archive CRC/hash and post-publication download checks are performed separately.
