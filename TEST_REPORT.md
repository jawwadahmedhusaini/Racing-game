# APEX RUSH 2.5.0 — validation

## Current release gates

- **129 unit tests passed**, no failures or skipped tests.
- **17 Chromium browser workflows passed**, no failures, skips, retries or flaky outcomes; 13.5 minutes. Started 2026-10-26T09:28:10.064Z (UTC).
- TypeScript and both root/Pages production builds passed before the full browser run; runtime files were frozen and fingerprinted throughout final validation.
- Packaged Python launcher and `/Racing-game/` production smoke checks passed on 2.5.0; no unexpected page/console errors or failed HTTP responses; development test controls absent.
- Seven separate Python asset-intake tests passed. Dependency audit reports zero vulnerabilities.

## Sound waveform checks

The real Web Audio graph rendered seven eight-second OfflineAudioContext scenarios: V8 acceleration/shift/overrun, V12, engine-muted tire/brake/impact effects, master mute, pause, stereo rivals and a maximum-strength mix with repeated impacts/landings plus two opponents. The loudest measured sample was **0.916**, below the digital clipping threshold of 1.0. Muted output and settled paused driving output were zero; right-side rivals increased right-channel energy. Voice limits held at 15 steady-state engine sample layers and 12 transient nodes. A separate browser case aborts all sample requests and verifies the fallback engine/context stays usable.

Unit checks cover all four banks' adjacent-layer crossfades, finite pitch ratios, free revving/release, tire/brake input, airborne/rest silence and every distributed WAV hash/PCM header/loop seam. This is signal/behaviour validation, not subjective listening or proof of flagship sound. `artifacts/engine-demo.wav` is an actual render from the new graph.

## Driving/contact coverage

New tests exercise glancing versus perpendicular wall hits, steering away, lateral momentum transfer without energy gain, already-separating bodies, high closing speed over a long supplied frame, silent stationary overlaps, airborne braking, single landing events, airborne nitro thrust, recovery and invalidating the clean bonus after an in-flight impact. Two older tests now create actual angled wall impacts instead of teleporting a parallel-facing car outside the wall and expecting arbitrary speed loss.

All previous simulation regressions still pass: manual steering, boost release/exhaustion, head-on/reverse contact, finish interpolation, elimination survival order, ramp surfaces/reverse support, drifting, six AI finishers on both tracks/all difficulties and save/reward handling. Ten deterministic 90-second mixed-input runs cover all five cars on both circuits with braking, reverse, steering, drift, nitro and recovery.

## BMW and browser flows

Both BMW GLBs match their provenance hashes and have geometry within collision bounds, separate front/rear wheel pivots, fixed caliper attachments and triangle budgets. Geometry-only Node tests omit texture decoding; actual textured appearance, selection, purchase, garage audition, race audio, mobile layout and persisted selection are exercised in Chromium. Existing garage/career/rewards, touch/keyboard, pause/restart/resource reuse, second-tab protection, blocked storage/audio, asset failure/retry, actual context loss and load cancellation also pass.

Production checks use real W/Shift/S keys, render Ultra, exercise four layouts and load the additional BMW and sound files under the correct hosting base. Screenshot evidence is included in the source ZIP.

## Limits and historical evidence

Chromium on Linux uses ANGLE/SwiftShader software WebGL2. Real desktop/mobile GPU frame pacing, thermal behaviour, Safari/Firefox, listening quality and Windows/macOS launcher wrappers remain unverified. No new FPS/performance claim is made. `performance.json`, `startup-review.json`, `visual-review.json`, `solstice-browser.json` and `audit-review.json` retain their earlier release dates and are historical evidence.

The model is community art, engine banks are simulated-engine renders, and contact remains a planar arcade approximation. See [SOUND_AND_CONTACT.md](SOUND_AND_CONTACT.md). Existing saves and earlier times are retained; new handling records use v5. Archive CRC/SHA checks and public download verification are separate final delivery gates.

Current raw results: `unit-results.json`, `browser-results.json`, `audio-render.json`, `production-smoke.json`, `hosting-smoke.json`, `dependency-audit.json`, `sound-contact-review.json` in `artifacts/`.
