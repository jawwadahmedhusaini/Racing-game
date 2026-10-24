# APEX RUSH 2.3 — race-start and driving experience

1. Reproduce the blocked Start Race handler and inspect the starting grid. Measure synchronous click latency separately from total preparation and real-frame rendering time.
2. Use visible, cancellable preparation stages, split terrain and reflection work, cache immutable vehicle geometry, and warm the first frame before starting the countdown. Guard cancellation, double starts, focus loss and resource reuse.
3. Replace local-segment scenery offsets with whole-circuit footprint clearance. Check actual terrain triangles around the complete road, straighten the starting grid and widen the folded closing bend.
4. Add deliberate brake-to-reverse driving across keyboard, touch, auto acceleration, signed steering/braking, HUD, reverse lamps, audio and camera. Preserve forward manual steering and progression.
5. Make the visible ramp a physical surface with solid edges, low-speed support and a launch at the lip. Reject reverse entry into the raised back and avoid repeatable landing-reward exploits.
6. Validate simulation and geometry, full browser workflows, High/Ultra screenshots, startup measurements, performance, packaged production and subdirectory hosting. Publish the verified build and ZIP, then fetch the ZIP again to verify its hash.

## Acceptance limits

This is a single-player arcade game. Three modeled variants share a credited concept chassis. Cloud validation uses software WebGL; physical phones, desktop GPUs, Safari and Firefox remain separate work. Immediate loading feedback does not imply instant GPU preparation, and software frame timings cannot establish hardware FPS or Asphalt-level fidelity.
