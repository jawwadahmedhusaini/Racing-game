# APEX RUSH 2.5.2 — wall and vehicle contact

The reported behavior was reproduced in 2.5.1. A barrier removed inward velocity but never applied a yaw impulse, so a car could slide along it with its nose still pointing into the wall. The speedometer showed only forward/reverse speed and could read zero during lateral movement.

## Changes

- Apply inelastic contact impulses at the vehicle's contact patch, including a finite planar yaw inertia. Corner hits turn the chassis; nearly flush faces use a blended contact midpoint so a tiny angle does not invent a large spin.
- Apply the same off-center response to car-to-car contacts. Limit and damp impact spin separately from driver steering. Turning the body under an impact preserves its existing momentum before tire grip acts.
- Use the full normal impulse for wall friction, retaining speed on light scrapes while penalizing repeated wall contact. No course-following controller is added to player driving.
- Prevent nitro activation/fuel consumption while the car points into a contacting wall. Steering away and reverse remain available.
- Show horizontal ground speed, including lateral slide, in the HUD and camera speed response. Finishing/elimination clears all remaining linear and impact-spin motion; recovery also clears spin.
- Use speed-dependent rival lookahead and braking limits. The former 34 m scan was too short at racing speed. Rotated cars occupy their projected width when planning traffic avoidance.
- Suppress sub-nanometre velocity rounding noise that could otherwise select reverse at rest.

New times use v6 records. Existing credits, cars, settings and v1–v5 records are retained.

## Evidence

`artifacts/wall-before.txt` retains 22 failing baseline reproductions. The new unit cases cover both walls, both tracks and all five cars, total collision energy (including spin), head-on stops, steering/reverse escape, car strikes, lateral-speed reporting, stopping at the finish, rival braking and timestep consistency. Mobile-layout browser checks use actual multi-touch controls and capture impact/escape states on both circuits. The previous ramp regressions remain part of the release gates.

The older throttle-only test assumed a collision could not turn the car and required less than half a lap of progress. Contact-induced turning now allows some legitimate progress. Its replacement still requires that throttle-only wall grinding cannot finish within 90 seconds, while a steered racing line finishes substantially sooner. The separate test proving that forward input preserves world heading away from obstacles remains unchanged.

See TEST_REPORT.md for actual completed counts, production checks and limitations. This is a planar arcade contact model, not a full 3D rigid-body vehicle simulation. Rollover, deformation and independent-wheel suspension are not implemented. Mobile touch is emulated in Chromium; physical phone frame pacing and subjective handling still need device testing.
