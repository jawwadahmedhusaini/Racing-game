# APEX RUSH 2.1 — rendering and performance

Measured at 2026-10-23T08:22:34.194Z (UTC). Raw data: `artifacts/performance.json`.

## Conditions and results

Chromium 154 on Linux, ANGLE/SwiftShader software WebGL 2 on the shared cloud CPU, no hardware GPU. One browser at a time, 1280×800 CSS pixels and device scale factor 1. After five warm-up frames, the script samples 24 actual requestAnimationFrame intervals per scene/preset. The coast sample is a moving six-car race near the opening. These short runs include shared-host scheduling variability; they are diagnostics, not a stable device benchmark.

| Preset / scene | Wall-clock FPS | Median frame | P95 frame | Last-frame draw calls | Last-frame triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| Low / garage | 1.83 | 466.6 ms | 1466.6 ms | 102 | 116,059 |
| Low / coast | 0.87 | 1133.3 ms | 1266.6 ms | 272 | 205,514 |
| Medium / garage | 1.33 | 749.9 ms | 1583.3 ms | 152 | 224,350 |
| Medium / coast | 0.45 | 2166.6 ms | 2399.9 ms | 376 | 484,974 |

The software renderer does not provide a usable gaming frame rate. These results do not demonstrate 30/60 FPS on a hardware-accelerated desktop or phone. The simulation slows on insufficient hardware rather than integrating unstable large time steps.

## Comparison with 2.0

The same script, viewport, presets and opening-track procedure were used. Because the race moves during sampling, final camera positions are similar but not identical; resource counts are indicative, not a controlled single-frame benchmark. CPU scheduling also varies between runs.

- Low coast: 712,290 → 205,514 rendered triangles (71.1% fewer); draw calls 194 → 272; software FPS 0.64 → 0.87.
- Medium coast: 1,127,887 → 484,974 rendered triangles (57.0% fewer); draw calls 267 → 376; software FPS 0.42 → 0.45.

Spatial subdivision trades additional draw calls for less off-screen geometry. Hardware performance still needs measurement before selecting final cell sizes for specific mobile/desktop GPUs.

## Cost controls

- Detailed garage/player chassis: 106,391 triangles before runtime aero/lights; rivals and the Low-quality player use the 30,534-triangle mesh.
- Only the player casts dynamic car shadows. Rival contact shadows, material batching and separate wheel groups remain.
- Terrain, buildings, road strips and instances use spatial cells. Matching near/far trees switch with hysteresis. Distant grass is hidden. AO excludes distant geometry, leaf cards and transparent effects.
- Scene reflection probes are captured once at 128 pixels per face and prefiltered, then cached. Captures happen on scene entry, not every frame. They are static, lack parallax correction and do not reflect moving opponents.
- Track worlds are cached; per-race car/effect resources are disposed. Geometry and material presets can change without resetting progress in the current race.
- Local assets and bounded particle/skid buffers; no third-party runtime requests.

## Presets

| Preset | Pixel-ratio cap | Shadow map | Contact AO | Bloom / antialiasing | Detailed trees within |
| --- | ---: | ---: | --- | --- | ---: |
| Low | 0.75 | Disabled | Off | Off; native canvas AA | Always lower LOD |
| Medium | 1.0 | 1024 | Off | Off; native canvas AA | 75 m |
| High | 1.5 | 2048 | Half resolution | Restrained bloom; 4× MSAA target | 115 m |
| Ultra | 2.0 | 4096 | Three-quarter resolution | Restrained bloom; 4× MSAA target | 170 m |

Tree distances refer to cluster centers and include hysteresis. Pixel ratio is also capped by devicePixelRatio; MSAA support follows WebGL capabilities. There is no automatic device benchmark or dynamic resolution. FPS measures wall time, not the 60 Hz physics step.

Reproduce with `npm run dev`, then `node scripts/measure-performance.mjs`. High-quality visual counters are in `artifacts/visual-review.json`; those camera positions differ from this benchmark.
