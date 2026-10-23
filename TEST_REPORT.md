# APEX RUSH 2.1 — validation report

Chromium 154 / Playwright 1.64.1 on Linux, Node.js 24.19.0 and npm 11.9.0. Machine-readable timestamps are UTC. Chromium uses SwiftShader software WebGL 2; hardware GPU performance is unmeasured.

## Results

- `npm test`: **30 passed** across simulation, geometry and storage; no failed or skipped checks.
- `npm run test:e2e`: **6 passed**, no failures, skipped or flaky cases, no retries; 5.9 minutes.
- `npm run build` and `npm run build:pages`: TypeScript and production builds passed.
- Packaged production launcher and `/Racing-game/` subdirectory build: **both passed**, version 2.1.0, no console/page errors or failed HTTP requests.
- Dependency audit: zero reported vulnerabilities.

## Regressions and user flows

The existing suite verifies actual WASD/arrow/touch displacement against the chase camera, front-wheel yaw, forward-only world heading, paused camera distance, full races on both circuits, every rival finishing while an idle player remains stationary, elimination, career unlocks, purchases, upgrades, persistent settings/paint, replay and rewards credited once.

New checks cover nitro held before launch, empty-meter release/recharge, rotated body clearance at 45°/90°, rivals pushing at a barrier, brake priority over auto-acceleration and boost, independent fingers on a shared touch action, touch recovery, paused recovery/camera lock, Escape from focused settings controls and Low↔Medium quality changes without resetting race state. Geometry ray tests detect an inverted wing shell from above and below.

Long race tests advance the same fixed-step simulation using an explicit test-driver input. They do not grant progression directly. Production checks use real input and assert that the development observer/stepper is absent.

## Visual and release checks

Final High-quality captures cover the garage, coast opening, coastal bridge and city. The new wing winding was corrected after the six-flow browser run, then checked by geometry tests, final captures and both final production smoke tests. The review exercises studio/track cubemaps, tinted glass, carbon aero, city facades, terrain/water shaders, tree LODs, shadows, near-field contact shading, bloom and antialiasing. Ultra is rendered in the packaged-build check; Low/Medium in input/performance validation.

Production layout checks cover 1280×800, 1600×900, 844×390 and 390×844. The static build contains 38 files and 26.5 MB before compression. The packaged HTTP files are compared against the build by SHA-256. Both ZIPs receive CRC and SHA-256 checks.

The Pages-base smoke verifies both car models, all nine surfaces, vegetation, HDR, fonts, preview images and the license link under `/Racing-game/`. Actual acceleration and pause work. Both bundles are scanned for the absent development API.

Evidence: `artifacts/browser-results.json`, `dependency-audit.json`, `visual-review.json`, `performance.json`, `production-smoke.json` and `hosting-smoke.json`. Final images are in `artifacts/` and the editable-source package.

## Limits

Physical phones, hardware GPU frame rates, Safari/Firefox, gamepads and subjective speaker/headphone audio remain unverified. Windows/macOS launcher wrappers are included but have not been executed on those operating systems. The cars are three tuned variants of one licensed chassis. Reflections use static scene probes, not real-time moving-object reflection or ray tracing. This release does not establish Asphalt 9 visual parity or universal bug-free behavior.

Uploading the gh-pages branch and testing a local subpath do not verify public Pages availability. The cloud network blocks github.io; see HOSTING.md for activation and the public URL.
