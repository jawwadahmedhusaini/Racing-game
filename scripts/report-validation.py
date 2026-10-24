"""Generate release evidence after current-version validation gates succeed."""
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
version=json.loads((root/'package.json').read_text())['version']
names=['startup-review','unit-results','browser-results','visual-review','performance','production-smoke','hosting-smoke','dependency-audit','solstice-browser']
r={n:json.loads((root/f'artifacts/{n}.json').read_text()) for n in names}
u=r['unit-results'];b=r['browser-results']['stats'];startup=r['startup-review'];perf=r['performance']
assert u['success'] and u['numFailedTests']==u['numPendingTests']==0
asset_check=r['solstice-browser']['stats'];assert asset_check['expected']==1 and asset_check['unexpected']==asset_check['flaky']==asset_check['skipped']==0
assert b['expected']==13 and b['unexpected']==b['flaky']==b['skipped']==0
for name in ['startup-review','visual-review','performance','production-smoke','hosting-smoke']:
 report=r[name];assert report['version']==version and report['passed'] and not report['errors'] and not report.get('failedRequests'),name
assert r['dependency-audit']['metadata']['vulnerabilities']['total']==0
assert len(startup['runs'])==3 and startup['heldThrottleDuringLoading']
assert all(not run['audit']['violations'] for run in startup['runs'])
assert startup['runs'][0]['audit']['kinds']['belvedere']==1
assert len(perf['samples'])==4
assets=json.loads((root/'public/licenses/solstice.json').read_text())['assets']
rows=['| '+ ' | '.join(map(str,[s['quality']+' / '+s['scene'],s['fps'],s['medianFrameMs'],s['p95FrameMs'],s['lastFrame']['drawCalls'],f"{s['lastFrame']['triangles']:,}"]))+' |' for s in perf['samples']]
loads=['| '+ ' | '.join(map(str,[run['track']+(' (cached)' if run['cached'] else ' (cold)'),round(run['clickMs'],1),round(run['preparation']['totalMs']/1000,2)]))+' |' for run in startup['runs']]
(root/'PERFORMANCE_REPORT.md').write_text(f'''# APEX RUSH {version} — measured performance

Measured at {perf['date']} UTC. Chromium {perf['browser']} on Linux, ANGLE/SwiftShader **software WebGL 2**, shared cloud CPU, no hardware GPU. These are diagnostic observations, not evidence of playable desktop or phone performance.

## Rendering sample

One browser at a time; 1280×800 CSS pixels, DPR 1, adaptive resolution disabled. Five warm-up frames then 24 real requestAnimationFrame intervals per scene/preset. The coast sample is a moving seven-car grid near the opening. Host scheduling and changed camera/scenery affect comparisons.

| Preset / scene | Wall-clock FPS | Median ms | P95 ms | Last-frame draw calls | Last-frame triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
{chr(10).join(rows)}

The software frame rates are below a playable target. No 30/60 FPS hardware target has been established. The game caps simulation catch-up rather than integrating unstable large physics steps when rendering falls far behind.

## Race preparation

1100×720, Low, same software renderer. The first metric measures synchronous click-handler time; the second includes staged construction, shader waiting, GPU uploads and first-frame warm-up.

| Start | Click handler ms | Complete preparation seconds |
| --- | ---: | ---: |
{chr(10).join(loads)}

Preparation is visible and cancellable; countdown/physics begin after warm-up. Keys deliberately held during loading survive the transition. The older 2.2 synchronous handler occupied about 5,289 ms (`startup-baseline.json`). This does not claim that total cold loading is now instant or universally faster. `elapsedSinceYieldMs` includes asynchronous driver/shader waiting and is not a CPU-only profiler.

## Budgets and controls

- Solstice detailed mesh: {assets[0]['triangles']:,} triangles / {assets[0]['bytes']:,} bytes; race mesh: {assets[1]['triangles']:,} / {assets[1]['bytes']:,}. Removing subpixel brake-drill geometry reduced the original detailed export from 130,356 triangles. Both retain independent wheel pivots and the same silhouette.
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
''')
files=[p for p in (root/'dist').rglob('*') if p.is_file()]
auditRows=[]
for run in [startup['runs'][0],startup['runs'][2]]:
 a=run['audit'];auditRows.append(f"| {a['track']} | {a['samples']} | {a['placements']} | {a['minTerrainClearance']} | {a['minSceneryClearance']:.3f} | {len(a['violations'])} |")
(root/'TEST_REPORT.md').write_text(f'''# APEX RUSH {version} — validation

Machine-readable timestamps are UTC. Chromium/Playwright on Linux with software WebGL 2; hardware FPS and subjective flagship quality are not verified.

## Release gates

- **{u['numPassedTests']} unit checks passed**, none failed/skipped.
- **{b['expected']} browser workflows passed**, none failed/skipped/flaky, no retries; {b['duration']/60000:.1f} minutes.
- TypeScript, root build and `/Racing-game/` build passed.
- Actual packaged launcher and Pages-base production smokes passed, current version, zero unexpected page/console errors or HTTP failures; development controls absent.
- Dependency audit: zero reported vulnerabilities.

## New regression coverage

- Solstice's loaded high/low GLBs: exact attribution hashes, finite normals, independent front/rear wheel pivots, measured full bounds contained by the collision footprint, and triangle limits. Full bounds include the splitter/mirrors, not only painted bodywork.
- Six rivals finish both laps of both circuits on Rookie/Pro/Expert while the player remains idle. Separate planner tests cover occupied passing lanes, blocked traffic, a held overtaking lane and lap-seam gaps. This caught grid queues and ramp-edge stalls during development.
- Drift slip decays smoothly after release; airborne/braking input cannot earn drift time. Existing manual-steering, reverse, boost, barrier, oriented-body contact, ramp support/edge/launch and reward regressions remain.
- Camera follows actual displacement without changing physics, stays above the road and within its safe corridor across the full circuit, settles on pause/landing and resets after recovery. Reduced motion removes camera shake/roll and forward nitro FOV surges.
- Engine gear hysteresis handles threshold jitter, reverse and large speed changes; different car profiles have different firing rates. Partial audio failure and zero-effects allocation tests remain. No subjective speaker/headphone quality is claimed.
- Existing saves retain Solstice ownership, reduced motion and prior/v2/v3 records. Browser workflow buys Solstice, paints it, changes race detail, finishes a race and reloads the persisted settings.

## Browser and release coverage

Real keyboard and CDP multi-touch events verify camera-relative steering, wheel yaw, reverse, pause/recovery, brake priority, boost and menus. A development-only fixed-step advance hook drives complete races, progression, purchases, replays and single reward crediting. The hook is absent from production.

Other workflows cover repeated starts/garage browsing/resource counts, focus loss, nested settings, competing tabs, denied storage, failed assets/retry, unsupported audio and actual graphics-context loss. Loading can be cancelled during terrain and car construction; duplicate starts are rejected and countdown time stays frozen. Startup checks preserve throttle held during loading.

Production checks use real W/Shift/S input for acceleration, boost, pause/resume and reverse. Solstice is purchased in the packaged production smoke; Ultra is rendered. Layout checks cover 1280×800, 1600×900, 844×390 and 390×844. The Pages-base check loads both vehicle families, surfaces, vegetation, fonts, HDR, previews and license metadata. Build: {len(files)} files, {sum(p.stat().st_size for p in files)/1e6:.1f} MB uncompressed.

After the full browser suite, the two Solstice reverse-lamp meshes were moved outside the rear bodywork and the selected garage card was kept visible after viewport rotation. Both detail levels passed fresh rear-visibility ray tests; the focused browser workflow explicitly checks the complete selected-card bounds in portrait; the Solstice browser workflow and the packaged/Pages production smokes were rerun with those final assets. The driving simulation did not change after the full suite.

## Road geometry

Actual coast terrain triangles are raycast at five lateral positions every 3 m. Prop footprints are checked independently against the entire road. Landmark reservations keep later scenery out of the coastal belvedere. Overhead foliage can overhang; arbitrary branch collisions are not simulated.

| Track | Terrain samples | Footprints | Minimum terrain clearance m | Minimum scenery clearance m | Violations |
| --- | ---: | ---: | ---: | ---: | ---: |
{chr(10).join(auditRows)}

A separate heightfield test checks rendered triangle diagonals; ramp mesh/physics use a shared surface. Grid curvature is checked through the final row of the seven-car grid.

## Evidence and limits

`artifacts/` contains unit/browser JSON, startup, visual, performance, packaged and hosted production reports plus dependency audit. High-quality captures cover all four garage choices, the two circuits, loading and reverse; Solstice rear and mobile views are also inspected. Web/source archives receive CRC and SHA-256 checks, and published downloads are fetched again against the tested files.

Physical Android/iOS devices, desktop GPUs, Safari/Firefox, long thermal sessions and Windows/macOS launcher wrappers remain untested. Camera corridor bounds are not a general dynamic occlusion solver. There are four cars across two underlying designs, synthesized audio, two procedural circuits and four career events. See [AUDIT_RESPONSE.md](AUDIT_RESPONSE.md) for the uncompleted flagship targets.
''')
print('Generated',version,u['numPassedTests'],'unit /',b['expected'],'browser validation reports')
