# APEX RUSH 2.4.0 — validation

Machine-readable timestamps are UTC. Chromium/Playwright on Linux with software WebGL 2; hardware FPS and subjective flagship quality are not verified.

## Release gates

- **90 unit checks passed**, none failed/skipped.
- **13 browser workflows passed**, none failed/skipped/flaky, no retries; 11.5 minutes.
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

Production checks use real W/Shift/S input for acceleration, boost, pause/resume and reverse. Solstice is purchased in the packaged production smoke; Ultra is rendered. Layout checks cover 1280×800, 1600×900, 844×390 and 390×844. The Pages-base check loads both vehicle families, surfaces, vegetation, fonts, HDR, previews and license metadata. Build: 41 files, 29.8 MB uncompressed.

After the full browser suite, the two Solstice reverse-lamp meshes were moved outside the rear bodywork and the selected garage card was kept visible after viewport rotation. Both detail levels passed fresh rear-visibility ray tests; the focused browser workflow explicitly checks the complete selected-card bounds in portrait; the Solstice browser workflow and the packaged/Pages production smokes were rerun with those final assets. The driving simulation did not change after the full suite.

## Road geometry

Actual coast terrain triangles are raycast at five lateral positions every 3 m. Prop footprints are checked independently against the entire road. Landmark reservations keep later scenery out of the coastal belvedere. Overhead foliage can overhang; arbitrary branch collisions are not simulated.

| Track | Terrain samples | Footprints | Minimum terrain clearance m | Minimum scenery clearance m | Violations |
| --- | ---: | ---: | ---: | ---: | ---: |
| coast | 3460 | 562 | 0.633625655712347 | 2.350 | 0 |
| city | 0 | 284 | None | 2.358 | 0 |

A separate heightfield test checks rendered triangle diagonals; ramp mesh/physics use a shared surface. Grid curvature is checked through the final row of the seven-car grid.

## Evidence and limits

`artifacts/` contains unit/browser JSON, startup, visual, performance, packaged and hosted production reports plus dependency audit. High-quality captures cover all four garage choices, the two circuits, loading and reverse; Solstice rear and mobile views are also inspected. Web/source archives receive CRC and SHA-256 checks, and published downloads are fetched again against the tested files.

Physical Android/iOS devices, desktop GPUs, Safari/Firefox, long thermal sessions and Windows/macOS launcher wrappers remain untested. Camera corridor bounds are not a general dynamic occlusion solver. There are four cars across two underlying designs, synthesized audio, two procedural circuits and four career events. See [AUDIT_RESPONSE.md](AUDIT_RESPONSE.md) for the uncompleted flagship targets.
