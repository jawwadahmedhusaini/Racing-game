# APEX RUSH 2.2.0 — rendering and performance

Measured at 2026-10-23T13:49:41.779Z (UTC). Raw evidence: `artifacts/performance.json`.

## Conditions

Chromium 154.0.8037.57, Linux, ANGLE/SwiftShader software WebGL 2 on a shared cloud CPU. No hardware GPU. One browser at a time, 1280×800 CSS pixels, DPR 1, adaptive resolution explicitly disabled. After five warm-up frames, 24 real requestAnimationFrame intervals are collected per scene/preset. The coast sample is a moving six-car race near the opening; this is a short diagnostic with host scheduling variability.

| Preset / scene | Wall-clock FPS | Median ms | P95 ms | Last-frame calls | Last-frame triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| low / garage | 1.99 | 483.4 | 949.9 | 102 | 116,059 |
| low / coast | 0.87 | 1133.2 | 1299.9 | 250 | 182,342 |
| medium / garage | 1.22 | 783.3 | 1583.2 | 152 | 224,350 |
| medium / coast | 0.45 | 2233.1 | 2599.9 | 348 | 458,034 |

These software results do not establish a playable hardware frame rate. There is no claim of a 30/60 FPS target being met on phones or desktop GPUs. Very slow rendering deliberately slows simulation instead of integrating unstable large timesteps.

## Implemented controls

- Adaptive resolution samples uncapped frame time. After settling, sustained averages above 24 ms reduce render scale by 0.1, down to 0.55; four windows below 17 ms allow a gradual 0.05 increase. Pause/hidden frames are excluded. Changing the preset or disabling adaptive resolution restores full preset resolution.
- Pixel budgets cap High and lower at 2560×1440 and Ultra at 3840×2160, in addition to the preset/DPR caps. This limits pixel allocation on dense and very large displays.
- Low uses the 30,534-triangle player mesh and no dynamic shadows/AO/bloom. Medium and above use the 106,391-triangle detailed player; all rivals retain the lighter mesh. Modeled silhouette changes add no triangles.
- Static geometry is spatially divided; equal-material road strips and landmark meshes are merged. Near/far trees and grass distances control scenery detail. Transparent effects and distant geometry are excluded from contact AO.
- Reflection probes are 128-pixel cube faces, captured once per scene and cached. No per-frame cube capture or moving-object reflections.
- The minimap path and bounds are cached. Car/effect resources are disposed between races; the browser stress flow checks geometry/texture counts after four restarts. Particle and skid buffers are bounded.

| Preset | DPR cap | Shadow map | Contact AO | Bloom | Near trees |
| --- | ---: | ---: | --- | --- | ---: |
| Low | 0.75 | Off | Off | Off | Lower LOD only |
| Medium | 1.0 | 1024 | Off | Off | 75 m |
| High | 1.5 | 2048 | Half resolution | On | 115 m |
| Ultra | 2.0 | 4096 | Three-quarter resolution | On | 170 m |

Adaptive resolution affects GPU pixel cost. It does not fix CPU/driver bottlenecks or guarantee a frame rate. The optional display reports rolling wall-clock FPS, approximate frame time, actual render dimensions and the chosen preset. It is not a GPU profiler.

Reproduce with `npm run dev` and `node scripts/measure-performance.mjs`. Physical-device procedure and pending device matrix: [DEVICE_TESTING.md](DEVICE_TESTING.md).
