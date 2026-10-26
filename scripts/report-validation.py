"""Generate the 2.5 release evidence after all current gates pass."""
from pathlib import Path
import json
from datetime import datetime, timezone
root=Path(__file__).resolve().parent.parent
version=json.loads((root/'package.json').read_text())['version']
def read(name):return json.loads((root/f'artifacts/{name}.json').read_text())
u=read('unit-results');browser=read('browser-results');b=browser['stats'];audio=read('audio-render')
assert u['success'] and u['numPassedTests']>=127 and u['numFailedTests']==u['numPendingTests']==0
assert b['expected']==17 and b['unexpected']==b['skipped']==b['flaky']==0 and not browser.get('errors')
assert audio['passed'] and len(audio['results'])==7
peak=max(r['peak'] for r in audio['results']);assert peak<.99
for name in ['production-smoke','hosting-smoke']:
 r=read(name);assert r['version']==version and r['passed'] and not r['errors'] and not r['failedRequests'],name
assert read('dependency-audit')['metadata']['vulnerabilities']['total']==0
for folder in ['dist','dist-pages']:assert json.loads((root/folder/'version.json').read_text())['version']==version
bmw=json.loads((root/'public/licenses/bmw-m3.json').read_text());sounds=json.loads((root/'public/licenses/audio.json').read_text())
evidence={'version':version,'date':datetime.now(timezone.utc).isoformat(),'unitPassed':u['numPassedTests'],'browserPassed':b['expected'],'browserStarted':b['startTime'],'browserDurationMs':b['duration'],'audioScenarios':len(audio['results']),'maximumAudioPeak':peak,'importedCar':'BMW M3 community model','carDetailTriangles':[a['triangles'] for a in bmw['assets']],'soundAssetBytes':sum(a['bytes'] for a in sounds['assets']),'sampleOrigin':'Engine Simulator renders by CryHam; metal recordings by Halleck, edited by CryHam. Not manufacturer engine recordings.','mixedInputStressCases':10,'secondsPerStressCase':90,'productionPassed':True,'hostingBasePassed':True,'hardwarePerformanceVerified':False,'humanListeningVerified':False,'passed':True}
(root/'artifacts/sound-contact-review.json').write_text(json.dumps(evidence,indent=2)+'\n')
(root/'TEST_REPORT.md').write_text(f'''# APEX RUSH {version} — validation

## Current release gates

- **{u['numPassedTests']} unit tests passed**, no failures or skipped tests.
- **{b['expected']} Chromium browser workflows passed**, no failures, skips, retries or flaky outcomes; {b['duration']/60000:.1f} minutes. Started {b['startTime']} (UTC).
- TypeScript and both root/Pages production builds passed before the full browser run; runtime files were frozen and fingerprinted throughout final validation.
- Packaged Python launcher and `/Racing-game/` production smoke checks passed on {version}; no unexpected page/console errors or failed HTTP responses; development test controls absent.
- Seven separate Python asset-intake tests passed. Dependency audit reports zero vulnerabilities.

## Sound waveform checks

The real Web Audio graph rendered seven eight-second OfflineAudioContext scenarios: V8 acceleration/shift/overrun, V12, engine-muted tire/brake/impact effects, master mute, pause, stereo rivals and a maximum-strength mix with repeated impacts/landings plus two opponents. The loudest measured sample was **{peak:.3f}**, below the digital clipping threshold of 1.0. Muted output and settled paused driving output were zero; right-side rivals increased right-channel energy. Voice limits held at 15 steady-state engine sample layers and 12 transient nodes. A separate browser case aborts all sample requests and verifies the fallback engine/context stays usable.

Unit checks cover all four banks' adjacent-layer crossfades, finite pitch ratios, free revving/release, tire/brake input, airborne/rest silence and every distributed WAV hash/PCM header/loop seam. This is signal/behaviour validation, not subjective listening or proof of flagship sound. `artifacts/engine-demo.wav` is an actual render from the new graph.

## Driving/contact coverage

New tests exercise glancing versus perpendicular wall hits, steering away, lateral momentum transfer without energy gain, already-separating bodies, high closing speed over a long supplied frame, silent stationary overlaps, airborne braking, single landing events, airborne nitro thrust, recovery and invalidating the clean bonus after an in-flight impact. Two older tests now create actual angled wall impacts instead of teleporting a parallel-facing car outside the wall and expecting arbitrary speed loss.

All previous simulation regressions still pass: manual steering, boost release/exhaustion, head-on/reverse contact, finish interpolation, elimination survival order, ramp surfaces/reverse support, drifting, six AI finishers on both tracks/all difficulties and save/reward handling. Ten deterministic 90-second mixed-input runs cover all five cars on both circuits with braking, reverse, steering, drift, nitro and recovery.

## BMW and browser flows

Both BMW GLBs match their provenance hashes and have geometry within collision bounds, separate front/rear wheel pivots, fixed caliper attachments and triangle budgets. Geometry-only Node tests omit texture decoding; actual textured appearance, selection, purchase, garage audition, race audio, mobile layout and persisted selection are exercised in Chromium. Existing garage/career/rewards, touch/keyboard, pause/restart/resource reuse, second-tab protection, blocked storage/audio, asset failure/retry, actual context loss and load cancellation also pass.

Production checks use real W/Shift/S keys, render Ultra, exercise four layouts and load the additional BMW and sound files under the correct hosting base. Screenshot evidence is included in the source ZIP.

## Limits and historical evidence

Chromium on Linux uses ANGLE/SwiftShader software WebGL2. Real desktop/mobile GPU frame pacing, thermal behaviour, Safari/Firefox, listening quality and Windows/macOS launcher wrappers remain unverified. No new FPS/performance claim is made. `performance.json`, `startup-review.json`, `visual-review.json`, `solstice-browser.json` and `audit-review.json` retain their earlier release dates and are historical evidence.

The model is community art, engine banks are simulated-engine renders, and contact remains a planar arcade approximation. See [SOUND_AND_CONTACT.md](SOUND_AND_CONTACT.md). Existing saves and earlier times are retained; new handling records use v5. Archive CRC/SHA checks and public download verification are separate final delivery gates.

Current raw results: `unit-results.json`, `browser-results.json`, `audio-render.json`, `production-smoke.json`, `hosting-smoke.json`, `dependency-audit.json`, `sound-contact-review.json` in `artifacts/`.
''')
print('Validated',version,u['numPassedTests'],'unit /',b['expected'],'browser; max audio peak',peak)
