# APEX RUSH 2.3.0 — validation report

Chromium 154 / Playwright 1.64.1 on Linux, Node.js 24.19.0. Software WebGL 2; hardware GPU performance is unmeasured. Machine-readable timestamps are UTC.

## Results

- Unit/simulation checks: **66 passed**, none failed or skipped.
- Browser workflows: **12 passed**, none failed, skipped or flaky, no retries; 10.0 minutes.
- TypeScript, root build and `/Racing-game/` build: passed.
- Packaged launcher and Pages-base production smokes: both passed, version 2.3.0, no unexpected page/console errors or HTTP failures. The development test API is absent.
- Dependency audit: zero reported vulnerabilities.

## Adversarial coverage

Actual keyboard and emulated multi-touch inputs verify camera-relative left/right movement, front-wheel orientation, forward-only world heading, pause/recovery, brake priority, boost and nested menus. Deterministic driving advances the same fixed-step simulation for full races, rival finishes, career progression, purchases, upgrades, replay and rewards credited once.

New checks cover forward braking into reverse, stationary dwell cancellation, reverse steering/coasting/wall contact, brake priority over auto acceleration and nitro, positive speed/R gear on real keyboard and touch inputs, and forward recovery. Terrain raycasts sample five lateral positions every 3 m around the complete coast. A separate heightfield test raycasts rendered triangles across cell diagonals to verify scenery support heights. Independent footprint distances cover accepted rocks, villas, tree trunk zones, buildings and landmarks. Overhead foliage can overhang; arbitrary branch collisions are not simulated. Curvature checks prevent folded inner road edges and verify grid alignment.

Ramp tests raycast the actual wedge against its shared height function, drive a slow car over it, stop a reversing car at the raised rear edge using its full footprint, and verify launch/landing/recovery rewards. Old and revised track records survive parsing independently. Idle-player displacement allows less than 2% of the circuit from physical rival impacts; an idle player cannot complete a race.

Browser coverage also retains pause/recovery, garage customization, full races, purchases, upgrades, repeated restarts, resource counts, storage/audio failures, competing tabs, failed downloads and actual context loss. Preparation is cancelled during terrain construction and between car instances, then restarted; duplicate starts cannot create a second race. Countdown and elapsed race time remain unchanged during preparation. The final startup pass also verifies that throttle deliberately held during loading survives the transition into the countdown. Intentional network/audio/context failures are expected in fault-injection flows; normal production checks require zero errors.

## Visual and release verification

High-quality screenshots inspect all three car silhouettes, the coast opening and lighthouse, and the city/transit scenery and revised wet asphalt; additional captures show the loading card, clear starting grids and reverse HUD. The bodies remain derivatives of the credited concept chassis; authored normals are transformed coherently and wheel assemblies remain rigid. Final model widths are checked against their collision footprints. Ultra is rendered in the production smoke.

Production layouts: 1280×800, 1600×900, 844×390 and 390×844. Build: 38 files, 26.5 MB uncompressed. The production smoke uses real throttle/boost/pause/resume and reverse input. The Pages smoke checks models, surfaces, vegetation, HDR, fonts, previews and attribution links under the subdirectory base.

Ten attributed surface/vegetation hashes are verified. Packaging checks ZIP CRCs and SHA-256; the published download is fetched again and compared to the tested archive. Evidence is in `artifacts/`: `startup-review.json`, `startup-baseline.json`, `unit-results.json`, `browser-results.json`, `visual-review.json`, `performance.json`, `production-smoke.json`, `hosting-smoke.json` and `dependency-audit.json`.

## Remaining limits

Real Android/iOS and desktop GPUs, Safari/Firefox, long thermal sessions, gamepads and subjective audio quality are unverified. Windows/macOS launcher wrappers have not been run on those operating systems. Static probes lack moving-object reflections; cars share a source chassis; scenery and physics remain an arcade approximation. No Asphalt 9 fidelity, universal frame rate or bug-free guarantee is established. See DEVICE_TESTING.md and BUG_TRACKER.md.
