# APEX RUSH 2.4.0 — measured performance

Measured at 2026-10-24T16:48:43.111Z UTC. Chromium 154.0.8037.57 on Linux, ANGLE/SwiftShader **software WebGL 2**, shared cloud CPU, no hardware GPU. These are diagnostic observations, not evidence of playable desktop or phone performance.

## Rendering sample

One browser at a time; 1280×800 CSS pixels, DPR 1, adaptive resolution disabled. Five warm-up frames then 24 real requestAnimationFrame intervals per scene/preset. The coast sample is a moving seven-car grid near the opening. Host scheduling and changed camera/scenery affect comparisons.

| Preset / scene | Wall-clock FPS | Median ms | P95 ms | Last-frame draw calls | Last-frame triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| low / garage | 1.9 | 483.4 | 1099.9 | 104 | 116,083 |
| low / coast | 0.79 | 1233.3 | 1583.3 | 279 | 247,352 |
| medium / garage | 1.32 | 750 | 1483.3 | 156 | 224,398 |
| medium / coast | 0.45 | 2199.9 | 2583.2 | 380 | 537,211 |

The software frame rates are below a playable target. No 30/60 FPS hardware target has been established. The game caps simulation catch-up rather than integrating unstable large physics steps when rendering falls far behind.

## Race preparation

1100×720, Low, same software renderer. The first metric measures synchronous click-handler time; the second includes staged construction, shader waiting, GPU uploads and first-frame warm-up.

| Start | Click handler ms | Complete preparation seconds |
| --- | ---: | ---: |
| coast (cold) | 8 | 6.79 |
| coast (cached) | 1.8 | 2.41 |
| city (cold) | 1.1 | 6.05 |

Preparation is visible and cancellable; countdown/physics begin after warm-up. Keys deliberately held during loading survive the transition. The older 2.2 synchronous handler occupied about 5,289 ms (`startup-baseline.json`). This does not claim that total cold loading is now instant or universally faster. `elapsedSinceYieldMs` includes asynchronous driver/shader waiting and is not a CPU-only profiler.

## Budgets and controls

- Solstice detailed mesh: 65,844 triangles / 2,419,544 bytes; race mesh: 24,436 / 859,752. Removing subpixel brake-drill geometry reduced the original detailed export from 130,356 triangles. Both retain independent wheel pivots and the same silhouette.
- Car Concept remains 106,391 detailed / 30,534 race triangles, before original aero/effects. Low uses a race mesh for the player; every rival uses a race mesh. Medium and above use the detailed player.
- Immutable vehicle geometry/maps are cached across at most eight catalog/detail combinations; instances own cloned materials. Restart and garage-browse tests check bounded geometry/texture counts.
- Added circuit detail is static and spatially batched, with no new dynamic lights. Existing grass/tree LOD and culling remain. A seventh car increases race work; this release does not claim a net frame-rate speedup.
- 128-pixel static reflection probes are captured once per scene; no per-frame cube capture or moving-object reflection.
- Adaptive resolution defaults on, with sustained-frame hysteresis, scale floor 0.55 and recovery toward the selected preset. It changes pixel cost, not CPU work or effect quality. The optional performance display reports wall-clock FPS and render dimensions.

| Preset | DPR cap | Shadow size | Contact AO / bloom |
| --- | ---: | ---: | --- |
| Low | 0.75 | Off | Off |
| Medium | 1.0 | 1024 | Off |
| High | 1.5 | 2048 | Half-resolution AO / bloom |
| Ultra | 2.0 | 4096 | Three-quarter-resolution AO / bloom |

Pixel allocations are additionally capped at 2560×1440 for High/lower and 3840×2160 for Ultra. Actual phones, integrated/discrete GPUs, Safari/Firefox, sustained thermal performance and subjective audio/handling remain unverified. See [DEVICE_TESTING.md](DEVICE_TESTING.md).

Reproduce: `npm run dev`, `node scripts/measure-startup.mjs`, then `node scripts/measure-performance.mjs` sequentially. Raw reports are in `artifacts/`.
