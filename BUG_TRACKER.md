# APEX RUSH — release notes and known limits

## Resolved during validation

| Issue | Resolution / evidence |
| --- | --- |
| New wing rendered its inner surface | Corrected triangle winding; ray tests verify the outer shell from above and below. |
| Nitro held before launch drained fuel without activating | Activation now waits for sufficient speed; regression covers launch and empty-meter release/recharge. |
| Rotated car nose could cross the barrier | Wall clearance projects both vehicle length and width; 45°/90° regression checks. |
| Rival contact pushed a car outside the road after integration | Reapply road constraints after car-to-car separation; regression covers contact at the boundary. |
| Braking fought auto-acceleration / held throttle and boost | Brake has priority over throttle and nitro in the input layer. |
| Two fingers on one touch action released together | Track each pointer independently and keep an action held until its final pointer releases. |
| Recovery / camera shortcuts changed a paused race | Accept these actions only during active racing. |
| Escape from settings resumed the race immediately | Escape returns nested race dialogs to pause before resuming; also works while a select has focus. |
| Touch players had no recovery action | Added a dedicated RECOVER button. |
| Driving backward had no clear warning | HUD now displays a wrong-way notice. |
| Night cars reflected a sunny environment | Capture a filtered cubemap from each scene and reuse it on return. |
| All city buildings shared one facade | Three facade families, stepped crowns and varied interior lighting. |
| Entire scenery batches rendered when a small portion was visible | Spatial geometry/instance cells, tree LODs, local grass visibility and near-field AO. |
| Paused camera crept into the car | Disable camera motion feed-forward and wheel spin while paused/finished; browser regression checks chase distance after 12 paused render frames. |
| Reversed steering | Corrected the road right-vector and wheel yaw. Tests measure camera-relative displacement from real WASD, arrow and touch input. |
| Forward automatically followed corners | Integrate world yaw explicitly and compensate for road-frame rotation; player steering has no automatic controller. Forward-only heading and full-lap regression checks pass. |
| Floating road and sparse scenery | Grounded textured terrain, supported bridges, detailed road furniture, spatially instanced 3D trees, villas and rebuilt city facades. |
| Excessive horizon bloom during the new art pass | Bounded sky radiance before bloom. Final visual captures verify the result. |
| Water shader compilation error during development | Corrected the fragment shader; high-quality and production console checks cover compilation. |
| Test runner collected browser specs as unit tests | Separate Vitest include pattern; 30 simulation/geometry/storage tests pass. |
| Camera lost the car after large diagnostic time advances | Reset the diagnostic camera and add motion feed-forward to normal chasing; browser race and camera checks pass. |
| Excessive racing model geometry and interior/shadow work | 30,534-triangle rival LOD, detailed player car, material batching, spatial tree culling and player-only dynamic car shadows. |
| Coast HDR photograph put nearby buildings in the sky | Use an atmospheric sky shader; retain HDR only for reflections. Final coast screenshot reviewed. |
| Portrait garage clipped the car | Increased portrait camera distance and placed customization controls above the vehicle; mobile screenshot reviewed. |
| Upgrade controls overlapped desktop performance stats | Adjusted intro placement and compact landscape title layout; production layout check covers representative viewports. |
| Browser automation was timing-sensitive under software graphics | Real input is observed explicitly; race completion uses the same fixed-step simulation; whole-workflow timeouts reflect software rendering cost. No gameplay assertion was disabled. |

## Known limits and follow-up

- Hardware performance is unmeasured. SwiftShader in this cloud machine runs much slower than a usable gaming frame rate. Use hardware acceleration and start at Low/Medium on slower devices; validate actual target devices before any FPS guarantee.
- Extremely slow rendering deliberately slows simulation rather than integrating large unstable physics steps.
- Chrome/Chromium desktop and emulated touch have been exercised. Real Android/iOS, Safari, Firefox, gamepads and assistive-technology gameplay need separate testing.
- The three garage choices are tuned/aero variants of one licensed concept chassis. There are two tracks and four career events.
- Steering controls world heading manually. Road boundaries still constrain the arcade simulation. There is no off-road free roaming, rigid-body vehicle damage, barrel-roll stunt system or multiplayer.
- Audio is synthesized. Automated tests verify the application path without exceptions, not subjective audio quality on speakers/headphones.
- Saves are local to the browser and origin. Clearing data removes progress; private browsing or blocked storage may prevent persistence. The game reports failed save writes.
- Graphics-context loss pauses and asks for a reload. Automatic renderer reconstruction is not implemented.
- Static hosting supports a configured subdirectory base; `npm run build:pages` targets `/Racing-game/`. GitHub Pages activation still requires the repository owner's settings change.
- The Python launcher was executed on Linux. Windows/macOS wrapper commands are included but have not been run on those operating systems.

No unresolved blocker was observed in the tested single-player workflows. These checks do not establish AAA visual parity, universal browser support or real-device performance.
