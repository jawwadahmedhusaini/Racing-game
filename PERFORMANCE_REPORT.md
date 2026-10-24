# APEX RUSH 2.3.0 — rendering and performance

Measured at 2026-10-24T00:52:22.386Z (UTC). Raw evidence: `artifacts/performance.json`.

## Conditions

Chromium 154.0.8037.57, Linux, ANGLE/SwiftShader software WebGL 2 on a shared cloud CPU. No hardware GPU. One browser at a time, 1280×800 CSS pixels, DPR 1, adaptive resolution explicitly disabled. After five warm-up frames, 24 real requestAnimationFrame intervals are collected per scene/preset. The coast sample is a moving six-car race near the opening; this is a short diagnostic with host scheduling variability.

| Preset / scene | Wall-clock FPS | Median ms | P95 ms | Last-frame calls | Last-frame triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| low / garage | 2.11 | 466.8 | 533.3 | 104 | 116,083 |
| low / coast | 0.87 | 1166.6 | 1283.4 | 360 | 278,018 |
| medium / garage | 1.36 | 766.6 | 833.3 | 156 | 224,398 |
| medium / coast | 0.47 | 2166.5 | 2333.2 | 458 | 566,160 |

These software results do not establish a playable hardware frame rate. There is no claim of a 30/60 FPS target being met on phones or desktop GPUs. Very slow rendering deliberately slows simulation instead of integrating unstable large timesteps.

## Race preparation

Raw evidence: `artifacts/startup-review.json`; recorded v2.2 baseline: `artifacts/startup-baseline.json`. At 1100×720 / Low, the earlier synchronous Start Race handler occupied about 5,289 ms before returning. The new runs returned in 12.1 ms, 1 ms, 0.9 ms. Complete preparation took 6.96 s, 2.33 s, 5.89 s for cold coast, cached coast and cold city respectively. The progress screen is visible during that work; countdown and physics remain frozen. These are short software-renderer observations, not guaranteed timings.

Car templates and rear-surface fits are reused. Terrain construction and scenery tasks yield to the browser, reflection capture yields between faces, and shader waiting can be cancelled. GPU uploads/render calls and individual geometry batches can still occupy the main thread. `elapsedSinceYieldMs` includes asynchronous shader waiting and driver work; it is not a CPU-only profiler. Preparation intentionally warms the first race frame before exposing the countdown. The new track layout/camera also changes visible geometry, so frame-rate results are not a controlled before/after speedup claim.

## Implemented controls

- Adaptive resolution samples uncapped frame time. After settling, sustained averages above 24 ms reduce render scale by 0.1, down to 0.55; four windows below 17 ms allow a gradual 0.05 increase. Pause/hidden frames are excluded. Changing the preset or disabling adaptive resolution restores full preset resolution.
- Pixel budgets cap High and lower at 2560×1440 and Ultra at 3840×2160, in addition to the preset/DPR caps. This limits pixel allocation on dense and very large displays.
- Low uses the 30,534-triangle player mesh and no dynamic shadows/AO/bloom. Medium and above use the 106,391-triangle detailed player; all rivals retain the lighter mesh. Modeled silhouette changes add no triangles.
- Static geometry is spatially divided; equal-material road strips and landmark meshes are merged. Near/far trees and grass distances control scenery detail. Transparent effects and distant geometry are excluded from contact AO.
- Reflection probes are 128-pixel cube faces, captured once per scene and cached; race preparation yields between faces. No per-frame cube capture or moving-object reflections.
- The minimap path and bounds are cached. Instance materials and effect resources are disposed between races; immutable vehicle meshes/maps are cached across six bounded templates; the browser stress flow checks geometry/texture counts after four restarts. Particle and skid buffers are bounded.

| Preset | DPR cap | Shadow map | Contact AO | Bloom | Near trees |
| --- | ---: | ---: | --- | --- | ---: |
| Low | 0.75 | Off | Off | Off | Lower LOD only |
| Medium | 1.0 | 1024 | Off | Off | 75 m |
| High | 1.5 | 2048 | Half resolution | On | 115 m |
| Ultra | 2.0 | 4096 | Three-quarter resolution | On | 170 m |

Adaptive resolution affects GPU pixel cost. It does not fix CPU/driver bottlenecks or guarantee a frame rate. The optional display reports rolling wall-clock FPS, approximate frame time, actual render dimensions and the chosen preset. It is not a GPU profiler.

Reproduce with `npm run dev` and `node scripts/measure-performance.mjs`. Physical-device procedure and pending device matrix: [DEVICE_TESTING.md](DEVICE_TESTING.md).
