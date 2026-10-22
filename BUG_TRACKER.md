# APEX RUSH — release notes and known limits

## Resolved during validation

| Issue | Resolution / evidence |
| --- | --- |
| Paused camera crept into the car | Disable camera motion feed-forward and wheel spin while paused/finished; browser regression checks chase distance after 12 paused render frames. |
| Reversed steering | Corrected the road right-vector and wheel yaw. Tests measure camera-relative displacement from real WASD, arrow and touch input. |
| Forward automatically followed corners | Integrate world yaw explicitly and compensate for road-frame rotation; player steering has no automatic controller. Forward-only heading and full-lap regression checks pass. |
| Floating road and sparse scenery | Grounded textured terrain, supported bridges, detailed road furniture, spatially instanced 3D trees, villas and rebuilt city facades. |
| Excessive horizon bloom during the new art pass | Bounded sky radiance before bloom. Final visual captures verify the result. |
| Water shader compilation error during development | Corrected the fragment shader; high-quality and production console checks cover compilation. |
| Test runner collected browser specs as unit tests | Separate Vitest include pattern; 22 simulation/storage tests pass. |
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
