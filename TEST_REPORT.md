# APEX RUSH 2.2.0 — validation report

Chromium 154 / Playwright 1.64.1 on Linux, Node.js 24.19.0. Software WebGL 2; hardware GPU performance is unmeasured. Machine-readable timestamps are UTC.

## Results

- Unit/simulation checks: **44 passed**, none failed or skipped.
- Browser workflows: **10 passed**, none failed, skipped or flaky, no retries; 11.0 minutes.
- TypeScript, root build and `/Racing-game/` build: passed.
- Packaged launcher and Pages-base production smokes: both passed, version 2.2.0, no unexpected page/console errors or HTTP failures. The development test API is absent.
- Dependency audit: zero reported vulnerabilities.

## Adversarial coverage

Actual keyboard and emulated multi-touch inputs verify camera-relative left/right movement, front-wheel orientation, forward-only world heading, pause/recovery, brake priority, boost and nested menus. Deterministic driving advances the same fixed-step simulation for full races, rival finishes, career progression, purchases, upgrades, replay and rewards credited once.

New checks cover accumulated skid spacing at 20 m/s, sloped and sideways tire marks, rotated/lapped-car contact across the start line, failed audio initialization and zero-volume tones, old-save migration and stale writes, bounded adaptive resolution, cached minimaps, repeated car selection, four restarts with stable geometry/texture counts, blur clearing input, settings persistence, competing tabs, denied storage and audio, asset-download retry and actual WebGL context loss followed by reload.

The blocked-storage run exposed a warning that vanished during a garage redraw; it now remains outside the replaceable UI. The long stress workflow exceeded the standard 180-second software-renderer timeout at its final reload, so that workflow alone has a 300-second budget. Final assertions and all four restart cycles remain enabled. Intentional network/audio/context failures in fault-injection tests are expected; normal production tests require zero errors.

## Visual and release verification

High-quality screenshots inspect all three car silhouettes, the coast opening and lighthouse, and the city/transit scenery and revised wet asphalt. The bodies remain derivatives of the credited concept chassis; authored normals are transformed coherently and wheel assemblies remain rigid. Final model widths are checked against their collision footprints. Ultra is rendered in the production smoke.

Production layouts: 1280×800, 1600×900, 844×390 and 390×844. Build: 38 files, 26.5 MB uncompressed. The production smoke uses real throttle/boost/pause/resume input. The Pages smoke checks models, surfaces, vegetation, HDR, fonts, previews and attribution links under the subdirectory base.

Ten attributed surface/vegetation hashes are verified. Packaging checks ZIP CRCs and SHA-256; the published download is fetched again and compared to the tested archive. Evidence is in `artifacts/`: `unit-results.json`, `browser-results.json`, `visual-review.json`, `performance.json`, `production-smoke.json`, `hosting-smoke.json` and `dependency-audit.json`.

## Remaining limits

Real Android/iOS and desktop GPUs, Safari/Firefox, long thermal sessions, gamepads and subjective audio quality are unverified. Windows/macOS launcher wrappers have not been run on those operating systems. Static probes lack moving-object reflections; cars share a source chassis; scenery and physics remain an arcade approximation. No Asphalt 9 fidelity, universal frame rate or bug-free guarantee is established. See DEVICE_TESTING.md and BUG_TRACKER.md.
