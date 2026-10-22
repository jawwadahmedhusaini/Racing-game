# Rendering and performance report

Measured 2026-10-22. Raw results: `artifacts/performance.json`.

## Measurement conditions

Chromium 154 with ANGLE/SwiftShader software rendering on the shared Linux cloud CPU; no hardware GPU. One browser at a time, 1280 × 800 CSS pixels, device scale factor 1. After five warm-up frames, the diagnostic sampled 24 real requestAnimationFrame intervals per scene/preset. The coast sample is a moving six-car race near the opening straight. These short samples include shared-host scheduling variability and are diagnostics, not a stable device benchmark.

| Preset / scene | Wall-clock FPS | Median frame | P95 frame | Last-frame draw calls | Last-frame triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| Low / garage | 1.02 | 733 ms | 4,083 ms | 95 | 113,131 |
| Low / coast | 0.95 | 933 ms | 2,867 ms | 76 | 169,204 |
| Medium / garage | 0.68 | 1,183 ms | 2,933 ms | 140 | 219,582 |
| Medium / coast | 0.67 | 1,383 ms | 2,683 ms | 127 | 247,790 |

This machine does **not** provide a usable gameplay frame rate in software rendering. The run verifies rendered output and resource counts; it does not demonstrate 30 or 60 FPS on a player device. No hardware desktop or physical phone has been benchmarked. Use a WebGL 2 browser with hardware acceleration. Real-device validation is the next performance gate.

Counts vary with camera, visible rivals and scenery. Renderer counters include enabled shadow/postprocessing passes. The FPS calculation uses actual wall time, independently of the simulation's stability cap. The simulation slows on insufficient hardware.

## Implemented cost controls

- Detailed garage car: 106,391 triangles, 6,462,376-byte GLB.
- Racing car LOD: 30,534 triangles, 2,578,168-byte GLB: about 71% fewer triangles than the garage model.
- Race LOD omits hidden interior geometry, uses reduced textures and opaque glass; only the player's car casts dynamic shadows. Rivals use lightweight contact shadows.
- Static car meshes batch by material while wheel pivots remain animated. World furniture uses instancing; geometry/textures are reused.
- Particle pools and skid buffers are bounded; per-race car/effect resources are disposed when leaving/restarting a race.
- Cached track worlds avoid rebuilding on every race.
- Local 1K HDR reflections and locally bundled fonts avoid runtime third-party requests.

## Presets

| Preset | Pixel ratio cap | Shadow map | Bloom |
| --- | ---: | ---: | --- |
| Low | 0.75 | Disabled | Off |
| Medium | 1.0 | 512 | Off |
| High | 1.5 | 1024 | On |
| Ultra | 2.0 | 2048 | On |

Ratio is also capped to the display's devicePixelRatio. Low/Medium are the starting choices for constrained hardware. High/Ultra need hardware testing before recommending them for a particular device. The package has no automatic benchmark or dynamic resolution system.

Reproduce the diagnostic by starting the development server, then running `node scripts/measure-performance.mjs`. Do not infer a gameplay FPS guarantee from the 60 Hz physics timestep.
