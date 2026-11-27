# APEX RUSH 3.0 preview verification

- 270 unit tests passed, including mixed driving inputs, isolated race and showroom models, wheel and lamp geometry, revised record keys, legacy saves, and six-rival finishes on both courses.
- Chromium completed the featured race from title to results with the Orion R and six rivals, using the development simulation driver for the full race. The workflow checked best-lap results, restart, Continue and separate Neon Harbor records.
- The circuit audit covered 5,320 road samples and 339 scene placements with zero violations. The underpass has at least 10 m of clearance in the scene audit.
- Four Chromium audio workflows passed, including underpass reflections, sound cues and the Orion engine mix. The production hosting smoke test checked keyboard acceleration, pause, and model delivery with no failed requests.
- The cold desktop title transferred 376,589 bytes of HTTP response bodies before WebGL. The title was captured on desktop, portrait phone and landscape phone viewports. Four garage layouts verified that the upgrade row ends above the performance panel.
- The offline ZIP passes CRC and contains 97 web files with bytes matching the production root build. Production checks used Chromium with software WebGL. Physical-device frame pacing, thermal testing and hands-on play sessions remain pending.

## Historical release evidence

# APEX RUSH 2.7.0 preview verification

The final unit run passed 250 tests. Both touch-driven wall workflows passed on the final physics build. They cover both sides of each circuit, deliberate countersteer, head-on contact, reversing away and lateral motion on the speedometer.

The first 25-workflow Chromium run passed 21 and exposed four failures. The follow-up runs verified career earnings and spending, LF purchase and reverse, cancellation and cache reuse, and the revised wall response. The stereo music test was added afterward and passed along with both existing audio workflows. These counts come from separate runs. The raw full-run browser report retains the original failures.

The production preview passed the hosted-path smoke test for garage navigation, city racing, keyboard acceleration, pause, asset credits, model streaming and track-specific downloads. An earlier production smoke test in this cycle covered four viewport sizes, Ultra garage rendering, nitro, reverse and resume. The final title test measured 630,449 bytes of HTTP response bodies including HTML, artwork, circuit images, fonts and code on the local static server. It ran at 1440×900, 390×844 and 844×390; no horizontal overflow or WebGL canvas on the title. The hero image is a studio render of the actual LF GT mesh.

The ZIP passed CRC and all 92 web files matched the standalone build byte for byte. Software WebGL and simulated touch were used. Sustained frame pacing, thermals on physical hardware, and subjective handling and audio quality still need player testing.

## Historical release evidence

# APEX RUSH 2.6.0 — validation

## Current release gates

- **210 unit tests passed**, no failures or skips.
- **23 Chromium browser workflows passed**, no failures, skips, retries or flaky outcomes; 22.3 minutes. Started 2026-10-27T13:26:39.798Z (UTC).
- TypeScript and root/Pages production builds passed. Final source, public assets and runtime configuration were frozen and fingerprinted before the complete browser run.
- Packaged launcher and `/Racing-game/` production smoke checks passed on 2.6.0, including actual keyboard acceleration, nitro, reverse, pause, four layouts, Ultra rendering and asset paths. Development controls are absent from production.
- No dependencies or external asset sources changed. The retained dependency audit reports zero vulnerabilities.

## Loading and cache

The default cold garage requested only `concept-car.glb`: **6,462,376 bytes** instead of the former six files' **15,578,284 bytes** (58.5% fewer vehicle bytes). This is model transfer volume, not total startup bytes, startup time or FPS. Surface/vegetation preload remains.

Browser checks deliberately fail an optional car download, retry it, hold a response while selecting another car, purchase/reload Solstice, cancel grid preparation during a held BMW LOD download, restart, and switch racing quality. The fresh seven-car grid requested exactly four unique GLBs: the selected detailed model and three LOD families. Unselected detailed BMW/Solstice models were not fetched. Cache tests cover request sharing, retry, idempotent release, in-flight protection, live leases and LRU disposal. Returning from a race leaves at most two idle owners alongside the active garage model.

## New city route and art

Neon Harbor is a 2.71 km route with portside straights, alternating bends and an elevated return. Both tracks pass non-adjacent corridor separation, grid straightness, finite curvature and closed-seam checks. Existing AI completion tests still finish all six opponents on both tracks and all difficulties; the new route exposed and led to a more conservative traffic-braking margin.

Five posed High-preset screenshots at 1280 × 800 were captured and inspected. The whole-city clearance audit sampled **4,520** road points and checked **277** registered scenery footprints with **zero violations**. Minimum registered scenery clearance beyond the road edge was **2.35 m**. The new port and frontage are original modular geometry. No additional third-party car or professional track pack is claimed.

## Retained regression coverage

The 34 wall and 41 ramp cases pass, including rotated impacts, steering/reverse escape, lateral-speed display, partial ramp approaches, jumps and landing. Ten 90-second mixed-input runs cover every car on both tracks. Browser checks retain career rewards, purchases, BMW audio/selection, mobile controls, pause/restart/resource reuse, loading cancellation, second-tab protection, storage/audio failure, missing assets and WebGL context loss. Existing records and garage progress survive v7 record migration.

Seven audio waveform scenarios remain below clipping (maximum sample **0.916**), with mute/pause silence, stereo rivals and failed-download fallback.

## Limits and evidence

Chromium ran with Linux software WebGL. This is not a physical-GPU benchmark. Physical phones, thermals, hardware frame pacing, Safari/Firefox and subjective handling remain unverified. Reflections use static probes; GPU texture compression, full suspension/rollover dynamics, a larger professionally authored garage and extended career remain separate work. No Asphalt-parity or universal FPS claim is made.

Current evidence: `unit-results.json`, `browser-results.json`, `streaming-garage.json`, `streaming-race.json`, `neon-review.json`, `neon-streaming-review.json`, `neon-*.png`, wall/ramp browser JSON/screenshots, `audio-render.json`, `production-smoke.json` and `hosting-smoke.json` in `artifacts/`. Source archives include these records. CRC/SHA and public-download checks remain the final delivery gates.

The older collision/ramp/sound/performance reports retain their original release dates. See [NEON_HARBOR_UPGRADE.md](NEON_HARBOR_UPGRADE.md) for scope and [DEVICE_TESTING.md](DEVICE_TESTING.md) for hardware validation.
