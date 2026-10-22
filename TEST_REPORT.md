# APEX RUSH 2.0 — validation report

Release validation uses Chromium 154 / Playwright 1.64.1 on Linux, Node.js 24.19.0 and npm 11.9.0. Times in machine-readable reports are UTC. Chromium uses SwiftShader software WebGL 2; these checks do not establish hardware-GPU performance.

## Driving and progression

- `npm test`: **22 passed**, zero failed or skipped.
- `npm run test:e2e`: **5 passed**, zero failed, skipped or flaky, no retries; about 4.9 minutes.
- Dependency audit: zero reported vulnerabilities at this validation.

The new regression checks measure actual displacement against the chase camera's right vector, world heading and front-wheel orientation after real WASD, arrow and touch input. Forward-only input preserves world heading as the road bends and cannot automatically follow a lap. A pause regression verifies that camera distance stays between 6 and 12 meters after 12 render frames, preventing the camera from creeping into the stationary car. Both circuits' five rivals finish two laps using explicit steering/braking commands while the idle player remains stationary.

Other coverage includes countdown, acceleration/braking, drifting, nitro/shockwave, collisions, recovery, ramps/landings, full race completion, elimination, rewards credited once, career unlocks, purchases, upgrades and persistent paint/settings. Tests do not grant progression directly: long races use the same fixed-step simulation, with an explicitly supplied test driver. The production build removes the development observer/stepper.

## Graphics and production

The final high-quality visual review checks the garage, coastal opening, seaside bridge section and city. It exercises custom water and terrain shaders, detailed player and rival models, licensed tree LODs, local surface textures, contact shading, shadowing, antialiasing and bloom. The final roadside/barrier detail pass changes rendering only; the separate production smoke tests exercise that final code.

Production build, packaged launcher, subdirectory hosting, layout, asset-integrity and rendering results are recorded in the machine-readable artifacts listed below. The production tests use actual input without the development stepper, check for its absence, and fail on page/console errors or HTTP failures. Layouts cover 1280×800, 1600×900, 844×390 and 390×844. Ultra is rendered in the packaged-build check; High in the visual review; Low/Medium in the control/performance checks.

- `artifacts/browser-results.json`
- `artifacts/dependency-audit.json`
- `artifacts/visual-review.json`
- `artifacts/performance.json`
- `artifacts/production-smoke.json`
- `artifacts/hosting-smoke.json`

Both ZIPs are checked for CRC errors when packaged. All 10 licensed environment assets match the SHA-256 hashes in their provenance manifest. The root-hosted build and `/Racing-game/` build are tested separately.

## Limits

Physical phones, hardware GPU frame rates, Safari/Firefox and subjective audio quality remain unverified. Windows/macOS launcher wrappers have not been executed on those operating systems. The three cars are variations of one licensed chassis. This iteration does not establish Asphalt 9 visual parity.

GitHub branch upload and local subpath verification are distinct from verifying the public Pages deployment. The cloud network blocks the github.io domain, so deployment status must be observed through GitHub Pages or a user's browser. See HOSTING.md.

## Production results

The packaged launcher served all 38 web files with HTTP response hashes matching the built files. The packaged build passed layout checks at all four viewports, Ultra rendering, real keyboard acceleration, nitro, pause and resume. No page/console errors or failed HTTP requests were recorded. Both production bundles were scanned and contain no development observer/stepper.

The static build contains 38 files and is about 26.5 MB before compression. The playable ZIP is about 23.1 MB. `scripts/package-release.py` reproduces the playable and editable-source archives with CRC verification and SHA-256 checksums.

The `/Racing-game/` production smoke test also passed: both models, all nine surface textures, vegetation data, HDR, fonts, track previews and the license link load under the correct base path. Real keyboard acceleration and pause work; version 2.0.0 is confirmed, with zero browser errors or failed HTTP responses.
