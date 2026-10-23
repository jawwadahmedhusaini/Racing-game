"""Generate release notes only after all machine-readable gates pass."""
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
version=json.loads((root/'package.json').read_text())['version']
reports={n:json.loads((root/f'artifacts/{n}.json').read_text()) for n in ['unit-results','browser-results','visual-review','performance','production-smoke','hosting-smoke','dependency-audit']}
u=reports['unit-results'];b=reports['browser-results']['stats']
assert u['success'] and u['numFailedTests']==u['numPendingTests']==0
assert b['expected']==10 and b['unexpected']==b['flaky']==b['skipped']==0
for name in ['visual-review','performance','production-smoke','hosting-smoke']:
 r=reports[name];assert r['version']==version and r['passed'] and not r['errors'] and not r.get('failedRequests'),name
assert reports['dependency-audit']['metadata']['vulnerabilities']['total']==0
perf=reports['performance'];assert len(perf['samples'])==4
rows=[]
for s in perf['samples']:
 rows.append(f"| {s['quality']} / {s['scene']} | {s['fps']} | {s['medianFrameMs']} | {s['p95FrameMs']} | {s['lastFrame']['drawCalls']} | {s['lastFrame']['triangles']:,} |")
(root/'PERFORMANCE_REPORT.md').write_text(f'''# APEX RUSH {version} — rendering and performance

Measured at {perf['date']} (UTC). Raw evidence: `artifacts/performance.json`.

## Conditions

Chromium {perf['browser']}, Linux, ANGLE/SwiftShader software WebGL 2 on a shared cloud CPU. No hardware GPU. One browser at a time, 1280×800 CSS pixels, DPR 1, adaptive resolution explicitly disabled. After five warm-up frames, 24 real requestAnimationFrame intervals are collected per scene/preset. The coast sample is a moving six-car race near the opening; this is a short diagnostic with host scheduling variability.

| Preset / scene | Wall-clock FPS | Median ms | P95 ms | Last-frame calls | Last-frame triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
{chr(10).join(rows)}

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
''')
files=[p for p in (root/'dist').rglob('*') if p.is_file()]
(root/'TEST_REPORT.md').write_text(f'''# APEX RUSH {version} — validation report

Chromium 154 / Playwright 1.64.1 on Linux, Node.js 24.19.0. Software WebGL 2; hardware GPU performance is unmeasured. Machine-readable timestamps are UTC.

## Results

- Unit/simulation checks: **{u['numPassedTests']} passed**, none failed or skipped.
- Browser workflows: **{b['expected']} passed**, none failed, skipped or flaky, no retries; {b['duration']/60000:.1f} minutes.
- TypeScript, root build and `/Racing-game/` build: passed.
- Packaged launcher and Pages-base production smokes: both passed, version {version}, no unexpected page/console errors or HTTP failures. The development test API is absent.
- Dependency audit: zero reported vulnerabilities.

## Adversarial coverage

Actual keyboard and emulated multi-touch inputs verify camera-relative left/right movement, front-wheel orientation, forward-only world heading, pause/recovery, brake priority, boost and nested menus. Deterministic driving advances the same fixed-step simulation for full races, rival finishes, career progression, purchases, upgrades, replay and rewards credited once.

New checks cover accumulated skid spacing at 20 m/s, sloped and sideways tire marks, rotated/lapped-car contact across the start line, failed audio initialization and zero-volume tones, old-save migration and stale writes, bounded adaptive resolution, cached minimaps, repeated car selection, four restarts with stable geometry/texture counts, blur clearing input, settings persistence, competing tabs, denied storage and audio, asset-download retry and actual WebGL context loss followed by reload.

The blocked-storage run exposed a warning that vanished during a garage redraw; it now remains outside the replaceable UI. The long stress workflow exceeded the standard 180-second software-renderer timeout at its final reload, so that workflow alone has a 300-second budget. Final assertions and all four restart cycles remain enabled. Intentional network/audio/context failures in fault-injection tests are expected; normal production tests require zero errors.

## Visual and release verification

High-quality screenshots inspect all three car silhouettes, the coast opening and lighthouse, and the city/transit scenery and revised wet asphalt. The bodies remain derivatives of the credited concept chassis; authored normals are transformed coherently and wheel assemblies remain rigid. Final model widths are checked against their collision footprints. Ultra is rendered in the production smoke.

Production layouts: 1280×800, 1600×900, 844×390 and 390×844. Build: {len(files)} files, {sum(p.stat().st_size for p in files)/1e6:.1f} MB uncompressed. The production smoke uses real throttle/boost/pause/resume input. The Pages smoke checks models, surfaces, vegetation, HDR, fonts, previews and attribution links under the subdirectory base.

Ten attributed surface/vegetation hashes are verified. Packaging checks ZIP CRCs and SHA-256; the published download is fetched again and compared to the tested archive. Evidence is in `artifacts/`: `unit-results.json`, `browser-results.json`, `visual-review.json`, `performance.json`, `production-smoke.json`, `hosting-smoke.json` and `dependency-audit.json`.

## Remaining limits

Real Android/iOS and desktop GPUs, Safari/Firefox, long thermal sessions, gamepads and subjective audio quality are unverified. Windows/macOS launcher wrappers have not been run on those operating systems. Static probes lack moving-object reflections; cars share a source chassis; scenery and physics remain an arcade approximation. No Asphalt 9 fidelity, universal frame rate or bug-free guarantee is established. See DEVICE_TESTING.md and BUG_TRACKER.md.
''')
print('Release reports generated:',version,u['numPassedTests'],'unit checks,',b['expected'],'browser workflows')
