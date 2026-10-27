"""Generate the 2.6 report only after the current release gates pass."""
from pathlib import Path
import json
from datetime import datetime, timezone
root=Path(__file__).resolve().parent.parent
version=json.loads((root/'package.json').read_text())['version']
def read(name):return json.loads((root/f'artifacts/{name}.json').read_text())
u=read('unit-results');browser=read('browser-results');b=browser['stats'];audio=read('audio-render')
assert version=='2.6.0'
assert u['success'] and u['numPassedTests']==210 and u['numFailedTests']==u['numPendingTests']==0
assert b['expected']==23 and b['unexpected']==b['skipped']==b['flaky']==0 and not browser.get('errors')
for name,count in [('asset-cache',3),('track-layout',3),('wall-response',34),('ramp-edges',41)]:
    results=[r for r in u['testResults'] if r['name'].endswith('/'+name+'.test.ts')];assert len(results)==1
    assert len(results[0]['assertionResults'])==count and all(a['status']=='passed' for a in results[0]['assertionResults'])
for track in ['coast','city']:
    wall=read(f'wall-{track}-browser');ramp=read(f'ramp-{track}-browser')
    assert wall['passed'] and not wall['errors'] and wall['slide']['hud']==36
    assert len(wall['cases'])==2 and wall['reversed']['speed']<-4
    assert ramp['passed'] and not ramp['errors'] and ramp['jump']['jumpTotal']==1 and ramp['landed']['airborne']==0
for name in ['production-smoke','hosting-smoke']:
    r=read(name);assert r['version']==version and r['passed'] and not r['errors'] and not r['failedRequests'],name
garage=read('streaming-garage');race=read('streaming-race');neon=read('neon-review')
for r in [garage,race]:assert r['passed'] and not r['errors'] and r['date']>=b['startTime']
assert len(set(race['requests']))==len(race['requests'])==4
assert garage['reduction']>.58 and garage['lateSelectionIgnored'] and garage['savedSelectionReload']
assert neon['passed'] and not neon['errors'] and neon['version']==version and len(neon['scenes'])==5
assert not neon['audit']['violations'] and neon['audit']['samples']>4000
assert audio['passed'] and len(audio['results'])==7
peak=max(r['peak'] for r in audio['results']);assert peak<.99
assert read('dependency-audit')['metadata']['vulnerabilities']['total']==0
for folder in ['dist','dist-pages']:assert json.loads((root/folder/'version.json').read_text())['version']==version
report={'version':version,'date':datetime.now(timezone.utc).isoformat(),'unitPassed':u['numPassedTests'],'browserPassed':b['expected'],'browserStarted':b['startTime'],'browserDurationMs':b['duration'],'initialVehicleBytes':garage['initialBytes'],'previousVehicleBytes':garage['previousVehicleBytes'],'vehicleTransferReduction':garage['reduction'],'cityRoadSamples':neon['audit']['samples'],'citySceneryPlacements':neon['audit']['placements'],'minimumSceneryClearance':neon['audit']['minSceneryClearance'],'maximumAudioPeak':peak,'productionPassed':True,'hostingBasePassed':True,'hardwarePerformanceVerified':False,'passed':True}
(root/'artifacts/neon-streaming-review.json').write_text(json.dumps(report,indent=2)+'\n')
(root/'TEST_REPORT.md').write_text(f'''# APEX RUSH {version} — validation

## Current release gates

- **{u['numPassedTests']} unit tests passed**, no failures or skips.
- **{b['expected']} Chromium browser workflows passed**, no failures, skips, retries or flaky outcomes; {b['duration']/60000:.1f} minutes. Started {b['startTime']} (UTC).
- TypeScript and root/Pages production builds passed. Final source, public assets and runtime configuration were frozen and fingerprinted before the complete browser run.
- Packaged launcher and `/Racing-game/` production smoke checks passed on {version}, including actual keyboard acceleration, nitro, reverse, pause, four layouts, Ultra rendering and asset paths. Development controls are absent from production.
- No dependencies or external asset sources changed. The retained dependency audit reports zero vulnerabilities.

## Loading and cache

The default cold garage requested only `concept-car.glb`: **{garage['initialBytes']:,} bytes** instead of the former six files' **{garage['previousVehicleBytes']:,} bytes** ({garage['reduction']*100:.1f}% fewer vehicle bytes). This is model transfer volume, not total startup bytes, startup time or FPS. Surface/vegetation preload remains.

Browser checks deliberately fail an optional car download, retry it, hold a response while selecting another car, purchase/reload Solstice, cancel grid preparation during a held BMW LOD download, restart, and switch racing quality. The fresh seven-car grid requested exactly four unique GLBs: the selected detailed model and three LOD families. Unselected detailed BMW/Solstice models were not fetched. Cache tests cover request sharing, retry, idempotent release, in-flight protection, live leases and LRU disposal. Returning from a race leaves at most two idle owners alongside the active garage model.

## New city route and art

Neon Harbor is a 2.71 km route with portside straights, alternating bends and an elevated return. Both tracks pass non-adjacent corridor separation, grid straightness, finite curvature and closed-seam checks. Existing AI completion tests still finish all six opponents on both tracks and all difficulties; the new route exposed and led to a more conservative traffic-braking margin.

Five posed High-preset screenshots at 1280 × 800 were captured and inspected. The whole-city clearance audit sampled **{neon['audit']['samples']:,}** road points and checked **{neon['audit']['placements']}** registered scenery footprints with **zero violations**. Minimum registered scenery clearance beyond the road edge was **{neon['audit']['minSceneryClearance']:.2f} m**. The new port and frontage are original modular geometry. No additional third-party car or professional track pack is claimed.

## Retained regression coverage

The 34 wall and 41 ramp cases pass, including rotated impacts, steering/reverse escape, lateral-speed display, partial ramp approaches, jumps and landing. Ten 90-second mixed-input runs cover every car on both tracks. Browser checks retain career rewards, purchases, BMW audio/selection, mobile controls, pause/restart/resource reuse, loading cancellation, second-tab protection, storage/audio failure, missing assets and WebGL context loss. Existing records and garage progress survive v7 record migration.

Seven audio waveform scenarios remain below clipping (maximum sample **{peak:.3f}**), with mute/pause silence, stereo rivals and failed-download fallback.

## Limits and evidence

Chromium ran with Linux software WebGL. This is not a physical-GPU benchmark. Physical phones, thermals, hardware frame pacing, Safari/Firefox and subjective handling remain unverified. Reflections use static probes; GPU texture compression, full suspension/rollover dynamics, a larger professionally authored garage and extended career remain separate work. No Asphalt-parity or universal FPS claim is made.

Current evidence: `unit-results.json`, `browser-results.json`, `streaming-garage.json`, `streaming-race.json`, `neon-review.json`, `neon-streaming-review.json`, `neon-*.png`, wall/ramp browser JSON/screenshots, `audio-render.json`, `production-smoke.json` and `hosting-smoke.json` in `artifacts/`. Source archives include these records. CRC/SHA and public-download checks remain the final delivery gates.

The older collision/ramp/sound/performance reports retain their original release dates. See [NEON_HARBOR_UPGRADE.md](NEON_HARBOR_UPGRADE.md) for scope and [DEVICE_TESTING.md](DEVICE_TESTING.md) for hardware validation.
''')
print('Validated',version,u['numPassedTests'],'unit /',b['expected'],'browser')
