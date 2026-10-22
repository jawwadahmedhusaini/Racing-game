# Validation report

Date: 2026-10-22. Project: APEX RUSH 1.0.0.

## Environment

- Linux cloud workspace; Node.js 24.19.0, npm 11.9.0, Python 3.12.
- Chromium 154.0.8037.57, Playwright 1.64.1; SwiftShader software WebGL 2.
- Desktop browser checks at 1280 × 800; emulated touch device at 390 × 844.
- No game backend, account, API key or external runtime asset service.

## Automated checks

| Check | Result |
| --- | --- |
| `npm test` | 16 passed; 0 failed, skipped or disabled. |
| `npm run test:e2e` | 4 passed; 0 failed, skipped or flaky; no retries. |
| Dependency audit | 0 reported vulnerabilities at validation time. |
| Clean `npm ci` with pinned lockfile | Passed; 54 packages installed, followed by successful build. |
| `npm run build` | Type checking and Vite production compilation passed. |
| Packaged Python HTTP launcher | Started on Linux; HTML, both GLBs, HDR and CC BY license returned HTTP 200; asset response hashes match source files. |
| `node scripts/verify-release.mjs` | Passed against the packaged production build: real keyboard acceleration, active nitro effect, pause/resume, no page/console errors or HTTP failures. |
| Production test-hook removal | `window.__apex` absent; no `__apex` occurrence in built JavaScript. |
| Release archives | Both archives pass ZIP CRC verification. |

Unit coverage: stationary countdown; throttle, steering and braking; drift recharge; shockwave consumption; barriers and recovery; car contact; ramp launch, landing and recharge; a full two-lap race with AI; solo city time attack; scheduled elimination; deterministic repeatability; continuity of both circuits; malformed save recovery; purchase accounting; upgrade charges/caps.

Browser workflows:

1. Real keyboard throttle/steer, pause, boost, recovery, full race completion, rewards credited once, replay, persisted paint and credits.
2. Career unlock, earning and spending credits, exact purchased car used in racing, upgrades, persisted difficulty and auto-acceleration.
3. City elimination, all three chase-camera modes and final standings.
4. Portrait layout without horizontal overflow, real Chromium touch events on acceleration, and touch pause.

The browser suite takes about 3.8 minutes in software graphics. Full-race automation advances the actual fixed-step simulation through a development-only hook. It neither forces a result nor grants credits directly. Separate real input events exercise the input integration. This is not equivalent to a human completing every race in real time.

Machine-readable results: `artifacts/browser-results.json`, `artifacts/dependency-audit.json`.

The final production check also verifies no horizontal overflow or customization/stats overlap at 1280 × 800, 1600 × 900, 844 × 390 and 390 × 844. It runs without the development stepper. Results are in `artifacts/production-smoke.json`; screenshot in `artifacts/production-race.png`. The final unit suite was rerun after the clean install and passed all 16 tests. The four-workflow browser run preceded the final CSS placement adjustment; the production layout/control check validates that final adjustment.

## Delivery and environment setup

The static build contains 25 files totaling 11,725,119 bytes before archive compression. `artifacts/apex-rush-web.zip` includes the web build and a Python standard-library launcher. `artifacts/apex-rush-source.zip` contains editable source, assets, tests and documentation. `scripts/package-release.py` reproduces both from a current production build.

The tested cloud installation script and startup instructions were saved to the environment configuration draft. Saving does not publish the environment or prove restoration in a new task. The current workspace was verified; no source push or public deployment was performed.

## Visual review

Reviewed rendered screenshots of the detailed garage model, coastal and city circuits, and portrait mobile garage. Updated track preview images are real screenshots from the game. The checks found and corrected the coast sky/background and clipped portrait vehicle, plus a desktop customization/stats overlap.

Screenshots: `artifacts/garage-final.png`, `artifacts/coast-final.png`, `artifacts/city-final.png`, `artifacts/mobile-garage.png`, `artifacts/mobile-race.png`, `artifacts/results.png`.

## Limits

Hardware-GPU FPS, physical phones, Safari/Firefox, operating-system-specific launchers and subjective audio quality are not validated by the automated runs. See PERFORMANCE_REPORT.md and BUG_TRACKER.md. No public deployment or new-cloud-task restoration has been tested.

## GitHub Pages preparation — 2026-10-22

`npm run build:pages` passed with the `/Racing-game/` hosting base, and all 16 unit tests passed after the asset URL changes. The production site was mounted under that exact subpath on a local HTTP server and exercised by `scripts/verify-hosting.mjs`. Both car models, HDR, fonts, both track previews and the license text loaded successfully. Actual keyboard acceleration and pause worked. No page/console errors or failed HTTP responses were observed; the production development hook remained absent. Evidence is in `artifacts/hosting-smoke.json`.

This verifies the prepared static site. Enabling Pages and observing the actual public deployment are separate from uploading the `gh-pages` branch; see HOSTING.md.
