# Response to the 24 October 2026 audit

The assessment of APEX RUSH as an advanced prototype / early indie racer is fair. An operational play loop and licensed 3D assets do not establish flagship production quality. The audit's provisional scores are opinions from a static package inspection, not measured performance. This release does not adopt those scores as benchmark results.

## Findings reconciled against the repository

| Audit observation | Source evidence and response |
| --- | --- |
| Only minified JavaScript / no original project | The play ZIP is a runtime distribution. The repository already contained TypeScript modules, package-lock.json, build scripts, tests and asset-preparation scripts. 2.4 publishes an explicit source ZIP and links it from PLAY-ME and README. |
| No verified automated suite in the play ZIP | 2.3 had 66 unit checks and 12 browser workflows, reported separately. The new release carries fresh machine-readable evidence and the actual tests in the source archive. Runtime ZIPs do not ship npm development dependencies. |
| One underlying vehicle | Correct for 2.3. 2.4 adds original Solstice GT geometry, built without importing Car Concept. The other three cars remain derivatives of Car Concept. This is two base designs / four garage choices; the 8–12 distinct vehicle target is still open. |
| Opponent racing uncertain from minification | AI uses the same fixed-step vehicle integration, steering, braking, boost, ramp/barrier and car-contact systems as the player. 2.4 has six rivals, checked through two laps of both circuits on all three difficulties, with blocked-lane and lap-seam cases. |
| Arcade driving architecture recommended | Fixed 60 Hz simulation and speed-sensitive manual steering already existed. 2.4 adds continuous drift slip/recovery, landing/body feedback and a separate camera director; existing reverse, ramp and no-auto-steering regressions remain. |
| Camera lacks premium response | 2.4 adds acceleration lag, drift framing, landing compression, restrained shake and safe-road camera bounds, plus reduced motion. Human feel remains subjective and should be evaluated on a real GPU. |
| No dedicated sound samples | Correct. Audio remains synthesized; 2.4 adds different firing spectra, throttle/load response, shift hysteresis/ducking and landing cues. This is not a professional recorded engine library. |
| Initial loading / mobile FPS unknown | Preparation and software rendering are measured in PERFORMANCE_REPORT.md. Hardware targets are unverified. No 60 FPS or mobile thermal claim is made. |
| Licensing needs provenance | Car Concept retains CC BY 4.0 credit, exact hashes and upstream metadata. Solstice has a CC0 declaration, generator and hash manifest. Existing surface/HDR/font credits remain. No unverified Ferrari or ripped game asset was added. |

## Remaining acceptance targets

| Area | Next acceptance gate | Current limitation |
| --- | --- | --- |
| Vehicle collection | 8–12 independently authored, licensed designs with consistent LOD/material/animation budgets | Four choices; only two base vehicle designs |
| Desktop performance | 60 FPS at 1080p, recorded frame-time percentiles on an agreed midrange GPU | Cloud software rasterizer only |
| Mobile performance | Sustained race sessions on named Android/iOS devices, including temperature/memory and touch usability | Emulated touch only; no thermal measurements |
| Driving feel | Repeated hands-on laps with useful corner entry, drift exit, boost and landing feedback | Deterministic tests establish mechanics, not premium subjective feel |
| Track art | One handcrafted circuit with authored hero assets, coherent lighting and measured budgets | Procedural circuits with static architectural detail |
| Audio | Licensed or original recorded engine layers, tire/impact/environment audio, headphone review | Synthesized voices and effects |
| Reliability | Repeated full races, input/focus/storage/context-loss checks, real-device sessions | Automated Chromium coverage is broad; cross-browser/device matrix remains open |

The engine remains Three.js. There is no evidence that an engine migration would fix the current content and production-quality gaps.
