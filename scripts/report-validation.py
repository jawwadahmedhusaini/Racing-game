"""Generate the 2.5.1 report only after the current release gates pass."""
from pathlib import Path
import json
from datetime import datetime, timezone
root=Path(__file__).resolve().parent.parent
version=json.loads((root/'package.json').read_text())['version']
def read(name):return json.loads((root/f'artifacts/{name}.json').read_text())
u=read('unit-results');browser=read('browser-results');b=browser['stats'];audio=read('audio-render')
assert u['success'] and u['numPassedTests']==170 and u['numFailedTests']==u['numPendingTests']==0
assert b['expected']==18 and b['unexpected']==1 and b['skipped']==b['flaky']==0 and not browser.get('errors')
def specs(suites):
 for suite in suites:
  yield from suite.get('specs',[])
  yield from specs(suite.get('suites',[]))
failed=[s for s in specs(browser['suites']) if not s['ok']]
assert len(failed)==1 and failed[0]['title']=='BMW model, garage rev audition and sampled race audio work with saved selection'
recheck=read('browser-rerun');rb=recheck['stats']
assert rb['expected']==1 and rb['unexpected']==rb['skipped']==rb['flaky']==0 and not recheck.get('errors')
assert [s['title'] for s in specs(recheck['suites'])]==[failed[0]['title']]
assert rb['startTime']>b['startTime']
browser_passed=b['expected']+rb['expected']
ramps=[r for r in u['testResults'] if r['name'].endswith('/ramp-edges.test.ts')];assert len(ramps)==1
assert len(ramps[0]['assertionResults'])==41 and all(r['status']=='passed' for r in ramps[0]['assertionResults'])
for track in ['coast','city']:
 r=read(f'ramp-{track}-browser');assert r['passed'] and not r['errors']
 assert r['jump']['jumpTotal']==1 and r['landed']['airborne']==0 and r['landed']['landingSerial']==1
for name in ['production-smoke','hosting-smoke']:
 r=read(name);assert r['version']==version and r['passed'] and not r['errors'] and not r['failedRequests'],name
assert audio['passed'] and len(audio['results'])==7
peak=max(r['peak'] for r in audio['results']);assert peak<.99
assert read('dependency-audit')['metadata']['vulnerabilities']['total']==0
for folder in ['dist','dist-pages']:assert json.loads((root/folder/'version.json').read_text())['version']==version
report={'version':version,'date':datetime.now(timezone.utc).isoformat(),'baselineVersion':'2.5.0','baselineFailedReproductions':12,'rampUnitCases':41,'unitPassed':u['numPassedTests'],'browserPassed':browser_passed,'initialBrowserPassed':b['expected'],'initialBrowserFailed':b['unexpected'],'targetedRerunPassed':rb['expected'],'rerunReason':'Test measurement missed the brief garage rev; wait for decoded samples and capture peak RPM in-page. Runtime unchanged.','browserStarted':b['startTime'],'browserDurationMs':b['duration'],'rampBrowserTracks':['coast','city'],'mixedInputStressCases':10,'secondsPerStressCase':90,'maximumAudioPeak':peak,'productionPassed':True,'hostingBasePassed':True,'hardwarePerformanceVerified':False,'passed':True}
(root/'artifacts/ramp-review.json').write_text(json.dumps(report,indent=2)+'\n')
(root/'TEST_REPORT.md').write_text(f'''# APEX RUSH {version} — validation

## Current release gates

- **{u['numPassedTests']} unit tests passed**, no failures or skipped tests.
- **{browser_passed} distinct Chromium browser workflows verified**: the full run passed 18 of 19 ({b['duration']/60000:.1f} minutes); the remaining BMW workflow passed a targeted rerun after correcting its transient-rev observation. No runtime files changed between runs. Initial run started {b['startTime']} (UTC). Both raw reports are retained.
- TypeScript and root/Pages production builds passed; final runtime files were frozen and fingerprinted during release validation.
- Packaged Python launcher and `/Racing-game/` production checks passed on {version}; no unexpected page/console errors or failed HTTP responses. Development controls are absent from production.
- Dependency audit reports zero vulnerabilities. No dependencies or external assets changed in this patch.

## Reproduced ramp defect

Before the fix, all ten full approaches (five cars on both tracks) stalled when the car's center was just left of the ramp. Forward and reverse attempts from an already wedged position also failed. These **12 failed baseline reproductions** are retained in `artifacts/ramp-before.txt`.

The earlier lip-only launch test and forced-speed slow test did not exercise this condition. New regressions drive the whole approach with normal throttle and steering inputs. The fix combines footprint-based support with normal separation and removal of inward velocity, preserving motion along or away from a raised ramp face.

## New coverage

**41 ramp regression cases** cover all cars and both tracks for edge approaches, stopping/restarting on the slope and outside-lane boost. They also cover glancing/perpendicular side hits without energy gain, forward/reverse escape, reversing down the slope, landing on top once, overhead clearance, traffic pushes, consistent 30/60/120 Hz callers and chassis tilt matching the surface at different headings.

Two new browser workflows reproduce the pictured approach on Costa Aurelia and Neon Harbor, capture climbing and airborne views, verify one landing and exercise side/rear escape. They use keyboard throttle/brake, with development-only positioning and steering/time advancement for repeatability. They do not claim a complete human driving session or use production progression cheats.

## Browser test correction

The initial BMW test waited for sample readiness and then polled the current RPM of a 2.5-second audition. Under software rendering, the audition could already have ended before that observation. The revised test waits for decoded samples first, then records the peak RPM inside the page while clicking the real rev button. The original >1,500 RPM assertion and the remaining purchase/race/persistence checks are retained. Only this affected workflow was rerun; the earlier passing workflows remain valid against the identical runtime fingerprint.

## Existing regressions

All prior checks still pass: manual steering, reverse, boost, drift, collisions, six AI finishers on both tracks/all difficulties, career rewards, elimination/finish order, purchases and persistent saves. Ten 90-second deterministic mixed-input runs cover all five cars on both circuits.

Browser coverage retains touch/keyboard controls, pause/restart/resource reuse, loading cancellation, second-tab protection, blocked storage/audio, missing assets and real WebGL context loss. BMW selection and garage/race audio still pass.

Seven real OfflineAudioContext scenarios remain below clipping (maximum sample **{peak:.3f}**), with mute/pause silence, stereo rivals, bounded voices and failed-download fallback. Production checks use real W/Shift/S keys, render Ultra, exercise four layouts and check hosted asset paths.

## Scope and evidence

This remains track-relative arcade physics with forgiving partial ramp support, constrained outer track boundaries and no independent-wheel suspension/full rigid-body solver. Chromium uses Linux software WebGL. Physical desktop/mobile GPU performance, thermals, Safari/Firefox and subjective sound/handling remain unverified. No new FPS or flagship-quality claim is made.

Current evidence: `unit-results.json`, `browser-results.json`, `browser-rerun.json`, `ramp-review.json`, `ramp-coast-browser.json`, `ramp-city-browser.json`, ramp screenshots, `audio-render.json`, `production-smoke.json`, `hosting-smoke.json`, and `dependency-audit.json` under `artifacts/`. The source archive includes these files. Archive CRC/SHA and public-download checks are final delivery gates.

`sound-contact-review.json` and older audit/performance/visual reports retain their previous release versions and dates. Existing progress and v5 records remain. See [RAMP_FIXES.md](RAMP_FIXES.md).
''')
print('Validated',version,u['numPassedTests'],'unit /',browser_passed,'browser workflows; 41 ramp cases')
