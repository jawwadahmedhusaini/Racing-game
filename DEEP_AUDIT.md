# APEX RUSH 2.4.1 — deep review, 25 October 2026

This is the historical 2.4.1 audit. The current sound/contact/BMW changes and updated limitations are in [SOUND_AND_CONTACT.md](SOUND_AND_CONTACT.md).

The review covered simulation, vehicle contact, ramp support, opponent planning, standings/rewards, keyboard/touch input, persistence and session conflicts, camera/material/rendering code, loading/cancellation and resource lifetime. The release fixes reproduced defects in the existing game. It adds no vehicle or circuit assets and does not establish flagship visual quality.

## Confirmed defects and changes

| Finding | Severity | Reproduction and resolution |
| --- | --- | --- |
| Nitro release removed momentum instantly | High | At 110 m/s, release or exhaust nitro: the former integrator clamps to the normal top speed in one 1/60-second step. Preserve current speed above the new ceiling and decelerate through the existing force model. Both failures were reproduced before the fix. |
| Contact response ignored opposing headings and reverse travel | High | Two cars approaching head-on at 30 m/s retain nearly all speed; a reversing player barely slows against a stopped car. Use relative velocity along the separating normal, projected onto each signed drive direction. Preserve world yaw when contact changes road distance. |
| Close finishes can award the wrong winner | High | Two cars cross within one step; the later-crossing player wins the tie by array order. Interpolate each crossing time and rank finishers explicitly. |
| Elimination order changes when a survivor reverses | Medium | Eliminate one car, then eliminate a survivor behind its frozen distance. The old results put the earlier elimination above the later survivor. Store each eliminated driver's finishing position. |
| Keyboard Space cannot activate menu buttons | Medium | Focus Settings and press Space: the drift handler cancels the native button action. Reproduced in Chromium before repair; now menus activate normally. |
| Dialog links inaccessible to Tab, missing dialog names and lost return focus | Medium | Credits has one button and several links, but its focus trap only includes buttons/inputs. Include links, name dialogs from their heading and restore opener focus through nested dialogs. |
| Touch pedals lacked keyboard hold activation | Medium | Space on a focused GO button previously requested drift. Add Space/Enter hold semantics; keyup, blur and pause release the action. |

Six simulation regressions failed against the prior code and passed after repair. The keyboard browser workflow also failed before repair and passed after repair. Eight additional deterministic stress cases exercise every car on both tracks with mixed acceleration, steering, braking/reverse, drift, nitro and recovery for 90 simulated seconds each. They assert finite state, road bounds, nonnegative altitude and bounded nitro. Full release outcomes are generated in [TEST_REPORT.md](TEST_REPORT.md).

The browser run also exposed a removed shadow enum. The installed Three.js implementation explicitly replaces it with PCFShadowMap. Selecting that supported enum directly removes the warning without changing the effective shadow method; the final packaged Ultra check covers this cleanup.

## Areas reviewed without a new confirmed defect

Existing regressions cover ramp mesh/support agreement, slow ramp ascent and raised rear contact, airborne landing rewards, manual steering, drift eligibility, six AI finishers on both tracks/all difficulties, pause/recovery, one-time rewards, purchases, malformed/denied storage, competing tabs, loading cancellation, failed assets, actual WebGL context loss, responsive layouts and bounded resources over restarts. They remain part of the release gate. This is evidence of those cases, not proof that all player behaviour is covered.

The previously published 2.4 performance measurements are retained in PERFORMANCE_REPORT.md with their original version/date. No fresh hardware FPS or frame-rate improvement is claimed for this physics/input patch. A deprecated shadow enum was replaced with its existing supported fallback after the full browser suite; geometry and textures are unchanged; production smoke checks still render Ultra and both circuits and check for unexpected browser/asset errors.

## Remaining weaknesses

- Real Android/iOS, Safari/Firefox, integrated/discrete GPU frame pacing and sustained thermal behaviour have not been validated here. The cloud machine uses SwiftShader software rendering, below playable frame rates.
- Collision handling remains an arcade, track-relative model. It is not a full swept rigid-body solver with independent lateral momentum, deformable bodywork, wheel contacts or free off-road driving. Camera road bounds are not general dynamic obstacle avoidance.
- Four car choices share two base designs. A professional vehicle collection and the proposed imported environment still need accessible, verified asset files.
- Two procedural circuits, four career events and synthesized audio remain the principal content/presentation limitations. More triangles alone would not fix them.
- Saves remain browser-local. The tests cover save denial/conflicts; they do not provide cloud backup.
- Automation cannot establish whether steering, drift or sound feels excellent to a human player. Hands-on target-device evaluation remains necessary.

All existing cars, circuits, credits, ownership and upgrades are retained. Older best times are preserved separately from v4 records because corrected momentum and contacts can change race times.
