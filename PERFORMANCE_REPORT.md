# APEX RUSH 2.0 — rendering and performance

Measured at 2026-10-22T22:38:03.468Z (UTC). Raw data: `artifacts/performance.json`.

## Conditions and results

Chromium 154 on Linux, ANGLE/SwiftShader software WebGL 2 on the shared cloud CPU, no hardware GPU. One browser at a time, 1280×800 CSS pixels and device scale factor 1. After five warm-up frames, the script samples 24 actual requestAnimationFrame intervals per scene/preset. The coast sample is a moving six-car race near the opening section. These short runs include shared-host scheduling variability; they are diagnostics, not a stable device benchmark.

| Preset / scene | Wall-clock FPS | Median frame | P95 frame | Last-frame draw calls | Last-frame triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| Low / garage | 2.15 | 450 ms | 1199.9 ms | 102 | 114,279 |
| Low / coast | 0.64 | 1533.3 ms | 1866.6 ms | 194 | 712,290 |
| Medium / garage | 1.27 | 733.2 ms | 2166.5 ms | 152 | 220,790 |
| Medium / coast | 0.42 | 2366.5 ms | 2700 ms | 267 | 1,127,887 |

This software renderer does not provide a usable gameplay frame rate. The results verify rendered output, resource counts and relative cost; they do not demonstrate 30/60 FPS on a hardware-accelerated desktop or phone. Real-device validation remains open. The simulation slows on insufficient hardware rather than integrating unstable large time steps.

## Cost controls

- Detailed player/garage chassis: 106,391 triangles before original runtime aero/light additions. Rival LOD: 30,534 triangles with reduced textures and hidden interior removal.
- Only the player's car casts dynamic car shadows; rivals use contact-shadow meshes. Static vehicle parts batch by material, with separate animated wheel groups.
- Trees use separate near/far LODs and 150-meter spatial batches for frustum/shadow culling. Road furniture, palms, rocks and grass are instanced.
- Bounded particle/skid buffers; per-race car/effect resources are disposed on exit/restart. Track worlds are cached.
- Local surfaces, HDR and fonts; no third-party runtime downloads.
- Transparent effects, sky, water, grass and leaf cards are excluded from the contact-AO geometry buffer so they cannot become solid dark silhouettes.

## Presets

| Preset | Pixel-ratio cap | Directional shadow map | Contact AO | Bloom / antialiasing |
| --- | ---: | ---: | --- | --- |
| Low | 0.75 | Disabled | Off | Bloom off; native canvas AA |
| Medium | 1.0 | 1024 | Off | Bloom off; native canvas AA |
| High | 1.5 | 2048 | Half-resolution GTAO | Restrained bloom; 4× MSAA render target |
| Ultra | 2.0 | 4096 | Three-quarter-resolution GTAO | Restrained bloom; 4× MSAA render target |

Pixel ratio is also capped to the display's devicePixelRatio. MSAA availability follows the WebGL implementation. High/Ultra improve image quality at additional GPU/memory cost; there is no automatic device benchmark or dynamic resolution system. Low/Medium are available for constrained hardware. FPS is based on wall time, not the fixed 60 Hz physics step.

Reproduce with `npm run dev`, then `node scripts/measure-performance.mjs`. High-quality visual checks and counters are in `artifacts/visual-review.json`; their camera positions differ from the performance loop and should not be compared as matched benchmarks.
