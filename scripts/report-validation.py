"""Generate the 2.5.2 report after the current release gates pass."""
from pathlib import Path
import json
from datetime import datetime, timezone
root=Path(__file__).resolve().parent.parent
version=json.loads((root/'package.json').read_text())['version']
def read(name):return json.loads((root/f'artifacts/{name}.json').read_text())
u=read('unit-results');browser=read('browser-results');b=browser['stats'];audio=read('audio-render')
assert u['success'] and u['numPassedTests']==204 and u['numFailedTests']==u['numPendingTests']==0
assert b['expected']==21 and b['unexpected']==b['skipped']==b['flaky']==0 and not browser.get('errors')
for name,count in [('wall-response',34),('ramp-edges',41)]:
 results=[r for r in u['testResults'] if r['name'].endswith('/'+name+'.test.ts')];assert len(results)==1
 assert len(results[0]['assertionResults'])==count and all(a['status']=='passed' for a in results[0]['assertionResults'])
for track in ['coast','city']:
 wall=read(f'wall-{track}-browser');ramp=read(f'ramp-{track}-browser')
 assert wall['passed'] and not wall['errors'] and wall['slide']['hud']==36
 assert len(wall['cases'])==2 and wall['reversed']['speed']<-4
 assert ramp['passed'] and not ramp['errors'] and ramp['jump']['jumpTotal']==1 and ramp['landed']['airborne']==0
for name in ['production-smoke','hosting-smoke']:
 r=read(name);assert r['version']==version and r['passed'] and not r['errors'] and not r['failedRequests'],name
assert audio['passed'] and len(audio['results'])==7
peak=max(r['peak'] for r in audio['results']);assert peak<.99
assert read('dependency-audit')['metadata']['vulnerabilities']['total']==0
for folder in ['dist','dist-pages']:assert json.loads((root/folder/'version.json').read_text())['version']==version
report={'version':version,'date':datetime.now(timezone.utc).isoformat(),'baselineVersion':'2.5.1','baselineFailedReproductions':22,'newUnitCases':34,'retainedRampCases':41,'unitPassed':u['numPassedTests'],'browserPassed':b['expected'],'browserStarted':b['startTime'],'browserDurationMs':b['duration'],'touchWallTracks':['coast','city'],'mixedInputStressCases':10,'secondsPerStressCase':90,'maximumAudioPeak':peak,'productionPassed':True,'hostingBasePassed':True,'hardwarePerformanceVerified':False,'passed':True}
(root/'artifacts/collision-review.json').write_text(json.dumps(report,indent=2)+'\n')
(root/'TEST_REPORT.md').write_text(f'''# APEX RUSH {version} — validation

## Current release gates

- **{u['numPassedTests']} unit tests passed**, no failures or skipped tests.
- **{b['expected']} Chromium browser workflows passed**, no failures, skips, retries or flaky outcomes; {b['duration']/60000:.1f} minutes. Started {b['startTime']} (UTC).
- TypeScript and root/Pages production builds passed. Final runtime files were frozen and fingerprinted for release validation.
- Packaged launcher and `/Racing-game/` production checks passed on {version}, including real keyboard acceleration, nitro, reverse, pause, Ultra rendering, four layouts and asset paths. Development controls are absent from production.
- Dependency audit reports zero vulnerabilities. No dependencies or external assets changed.

## Reproduced defects and added coverage

The baseline had **22 failures**: corner impacts for five cars on both walls of both tracks did not generate chassis rotation, nitro spent fuel against a wall, and finishing left residual lateral motion. The original output is retained in `artifacts/wall-before.txt`.

**34 new unit cases** cover those defects plus combined linear/angular energy, symmetric head-on stops, steering/reverse escape, off-center vehicle impacts, momentum-preserving body rotation, near-zero rounding, ground-speed reporting, recovery, rival stopping distance/projected width and 30/60/120 Hz consistency. Total collision energy is checked across 90 combinations of wall side, angle, speed and existing spin. The previous **41 ramp regressions** still pass.

Two new browser workflows use a mobile landscape layout and real multi-touch events to reproduce both wall sides, steer away, reverse after a head-on stop, and confirm the speedometer reads 36 km/h for a 10 m/s lateral slide with zero forward speed. They use development-only scenario positioning/time advancement for repeatability; steering comes from touch controls. They do not constitute physical-phone testing.

The old throttle-only test required less than half a lap because the former wall solver froze the chassis heading. With real contact-induced turning, that distance limit was not a valid physical requirement. Its replacement requires an unfinished throttle-only race at 90 seconds, while a normally steered racing line finishes much sooner. The separate test that forward input preserves world heading away from obstacles remains unchanged.

## Retained regression coverage

Manual steering, reverse, boost/drift, six AI finishers on both tracks/all difficulties, finish/elimination order, career rewards, purchases and save migration all pass. Ten 90-second mixed-input runs cover every car on both tracks. V6 record migration retains earlier times and garage progress.

Browser coverage includes the ramp approaches/escape tests, touch/keyboard controls, pause/restart/resource reuse, loading cancellation, second-tab protection, storage/audio failure, missing assets, WebGL context loss and BMW selection/audio persistence.

Seven OfflineAudioContext waveform scenarios remain below clipping (maximum sample **{peak:.3f}**), with mute/pause silence, stereo rivals, bounded voices and failed-download fallback.

## Limits and evidence

The contact solver has planar yaw inertia and bounded/damped spin. It remains a track-relative arcade approximation, without rollover, crash deformation, independent-wheel suspension or unconstrained off-road dynamics. Chromium uses Linux software WebGL; physical phone/desktop GPU performance, thermals, Safari/Firefox and subjective handling remain unverified. No universal bug-free or flagship-quality claim is made.

Current evidence includes `unit-results.json`, `browser-results.json`, `collision-review.json`, `wall-coast-browser.json`, `wall-city-browser.json`, wall/ramp screenshots, `audio-render.json`, `production-smoke.json`, `hosting-smoke.json` and `dependency-audit.json` in `artifacts/`. Source archives include these files. Archive CRC/SHA checks and public-download verification are final delivery gates.

The previous `ramp-review.json`, `browser-rerun.json`, `sound-contact-review.json` and older audit/performance/visual reports retain their original release dates/versions. See [COLLISION_FIXES.md](COLLISION_FIXES.md).
''')
print('Validated',version,u['numPassedTests'],'unit /',b['expected'],'browser; 34 new collision cases')
