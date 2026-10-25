# APEX RUSH — release notes and known limits

## Resolved during validation

| Issue | Resolution / evidence |
| Releasing or exhausting boost instantly removed excess speed | Preserve momentum and let engine drag/coasting reduce speed. Regression checks both release and exhaustion. |
| Head-on and reversing cars retained inappropriate closing speed | Project a normal contact impulse onto signed travel directions; preserve world yaw after separation. |
| Same-step finish ties preferred driver array order | Interpolate finish crossing time within the fixed step and sort by finish time. |
| Eliminated cars were ranked by distance rather than survival order | Store the position at elimination and use it in standings. |
| Space could not activate menu buttons; credit links were trapped outside keyboard navigation | Preserve native activation, support hold controls with Space/Enter, include links in focus trapping, label dialogs and restore their opener focus. |
| --- | --- |
| Opponents queued indefinitely behind a stopped car | Evaluate clear lateral escape paths and avoid creeping into a zero target speed. Six-rival full-race regressions cover both circuits and all difficulty levels. |
| A rival hit the raised ramp side and stalled | Plan a clear line before the ramp; preserve physical ramp collision. Full-race idle-player regression catches permanent stalls. |
| Immediate lane return cut back toward the overtaken vehicle | Hold the committed passing lane until the other car is behind, including across the lap seam. |
| Camera lacked landing feedback and could cross roadside barriers | Separate camera director with bounded acceleration/landing response, safe-corridor projection and reduced motion. Full-circuit lens bounds and pause regressions. |
| Solstice reverse lamps were hidden behind rear bodywork | Move both lenses outside the body and ray-test their visibility from behind in both GLB detail levels. |
| New car splitter exceeded its initial collision bounds | Measure loaded GLB extents and enlarge the Solstice footprint to contain the entire model. |
| High-detail drilled brake discs spent tens of thousands of triangles on subpixel holes | Eight-sided drill marks reduce Solstice from 130,356 to 65,844 triangles without changing the body or wheel rig; race LOD is 24,436. |
| Long-car rotation cropped the nose in portrait; the selected fourth card was off-screen | Fit the garage camera to the vehicle bounds and horizontal field of view, and center the selected card within the horizontal list on selection and viewport resize. |
| Nitro ratings were presentation-only; engine/HUD could disagree on gear | Apply the rating to boost force and consumption; use a shared drivetrain gear with hysteresis for HUD and audio. |
| Garage count assumed three cars | Derive totals from the catalog and make the collection scroll within narrow layouts. |
| Drift could recharge while braking or airborne | Gate drift initiation/rewards to grounded, forward, non-braking travel and recover grip continuously. |
| Start Race blocked the UI while constructing the entire scene | Yield between terrain/scenery/car tasks; render a progress card immediately, support cancellation, warm graphics before the countdown. Cached immutable car meshes avoid rebuilding and rear-surface raycasts on replay. |
| Slope scenery floated above coarse terrain triangles | Use the actual triangle heightfield for props, bury palm bases slightly and extend villa foundations to the lowest corner. Raycast regression checks the interpolation independently. |
| Costa rocks and buildings intruded into the driving surface | Whole-circuit footprint checks include nearby road sections and each object's size. Terrain is flattened beyond the full road width plus the terrain-grid cell footprint. |
| Grid sat on a sharp bend; inside road edges folded over themselves | Move the grid 90 m onto the straight, broaden the closing section and smooth the spline. Curvature tests prevent an inverted inner road edge. |
| No reverse driving | Hold brake at a standstill for 0.35 seconds; signed steering/drag/wall responses, 36 km/h reverse cap, R gear, positive speed display, reverse lamps and wider camera. |
| Slow cars drove through the ramp, which only triggered an instant jump | Shared ramp height and mesh generation; tires climb the wedge, raised sides/back stop the full vehicle footprint, and fast cars launch at the lip. Drops and recovery cannot farm landing rewards. |
| Revised circuits would compare times against the old layout | Keep old records, v2 circuit records and separate v3 handling/grid records; credits, ownership, paints and upgrades remain intact. |
| Wet road formed repeating glossy tiles | Use broad world-space wetness independently of fine aggregate texture scale. Final night capture reviewed. |
| Skid marks vanished below about 39 m/s at 60 FPS | Accumulate distance from the last emitted stamp; paired marks now follow road pitch. Regression at 20 m/s. |
| Transparent flames/contact planes cast solid shadows | Preserve authored player shadow flags; disable rival shadows without enabling effects. |
| Rotated or lapped cars passed through one another | Oriented-body separation and wrapped circuit distance, with rival avoidance across the lap boundary. |
| Optional audio setup failure could stop every render frame | Publish the AudioContext only after complete setup; close partial graphs and skip unavailable audio. |
| Zero sound-effects volume still scheduled a tone | Return before allocating sound nodes; disconnect completed temporary voices. |
| Competing tabs overwrote newer progression | One active HTTPS/localhost play session via Web Locks; serialized-save comparison and external-storage interruption. |
| Save-failure toast disappeared when garage controls redrew | Persistent status lives outside the replaceable UI root. Denied-storage browser flow remains drivable. |
| Lost graphics context left no visible recovery action | Persistent reload screen, input clearing and muted audio. Asset downloads have a separate failure message. |
| Minimap bounds/path rebuilt throughout every race | Cache immutable map data; calculate only current marker positions. |
| Full-resolution effects exceeded smaller devices' fill budget | Adaptive render resolution with hysteresis, viewport pixel caps, explicit override and live FPS/resolution readout. |
| Paused collisions continued shaking the camera | Gate collision shake and skid/particle updates on active racing. |
| New wing rendered its inner surface | Corrected triangle winding; ray tests verify the outer shell from above and below. |
| Nitro held before launch drained fuel without activating | Activation now waits for sufficient speed; regression covers launch and empty-meter release/recharge. |
| Rotated car nose could cross the barrier | Wall clearance projects both vehicle length and width; 45°/90° regression checks. |
| Rival contact pushed a car outside the road after integration | Reapply road constraints after car-to-car separation; regression covers contact at the boundary. |
| Braking fought auto-acceleration / held throttle and boost | Brake has priority over throttle and nitro in the input layer. |
| Two fingers on one touch action released together | Track each pointer independently and keep an action held until its final pointer releases. |
| Recovery / camera shortcuts changed a paused race | Accept these actions only during active racing. |
| Escape from settings resumed the race immediately | Escape returns nested race dialogs to pause before resuming; also works while a select has focus. |
| Touch players had no recovery action | Added a dedicated RECOVER button. |
| Facing against race direction had no clear warning | Wrong-way notice remains; deliberate reverse now shows R and a forward-driving hint. |
| Night cars reflected a sunny environment | Capture a filtered cubemap from each scene and reuse it on return. |
| All city buildings shared one facade | Three facade families, stepped crowns and varied interior lighting. |
| Entire scenery batches rendered when a small portion was visible | Spatial geometry/instance cells, tree LODs, local grass visibility and near-field AO. |
| Paused camera crept into the car | Disable camera motion feed-forward and wheel spin while paused/finished; browser regression checks chase distance after 12 paused render frames. |
| Reversed steering | Corrected the road right-vector and wheel yaw. Tests measure camera-relative displacement from real WASD, arrow and touch input. |
| Forward automatically followed corners | Integrate world yaw explicitly and compensate for road-frame rotation; player steering has no automatic controller. Forward-only heading and full-lap regression checks pass. |
| Floating road and sparse scenery | Grounded textured terrain, supported bridges, detailed road furniture, spatially instanced 3D trees, villas and rebuilt city facades. |
| Excessive horizon bloom during the new art pass | Bounded sky radiance before bloom. Final visual captures verify the result. |
| Water shader compilation error during development | Corrected the fragment shader; high-quality and production console checks cover compilation. |
| Test runner collected browser specs as unit tests | Separate Vitest include pattern; Unit and browser checks run separately; current counts are in TEST_REPORT.md. |
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
- Four garage choices use two underlying designs: three Car Concept variants and original Solstice GT. There are two tracks and four career events. A professional 8–12-car collection remains outstanding.
- Steering controls world heading manually. Road boundaries still constrain the arcade simulation. There is no off-road free roaming, rigid-body vehicle damage, barrel-roll stunt system or multiplayer.
- Audio is synthesized. Automated tests verify the application path without exceptions, not subjective audio quality on speakers/headphones.
- Saves are local to the browser and origin. Clearing data removes progress; private browsing or blocked storage may prevent persistence. The game reports failed save writes.
- Graphics-context loss pauses and asks for a reload. Automatic renderer reconstruction is not implemented.
- Static hosting supports a configured subdirectory base; `npm run build:pages` targets `/Racing-game/`. GitHub Pages activation still requires the repository owner's settings change.
- The Python launcher was executed on Linux. Windows/macOS wrapper commands are included but have not been run on those operating systems.

The release checks and remaining verification gaps are recorded in TEST_REPORT.md. These checks do not establish AAA visual parity, universal browser support or real-device performance.
