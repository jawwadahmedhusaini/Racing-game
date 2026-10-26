# APEX RUSH 2.5.1 — ramp and contact fixes

The reported Costa Aurelia snag was reproduced with the car straddling the left edge of the ramp. Its body corners detected the raised wedge, but the support height used only the car's center. With the center just outside the ramp, the simulation repeatedly rolled back the entire movement and reduced speed. Even reversing could be cancelled by the same overlap.

The old full-approach regression failed for all five cars on both circuits. Both attempts to escape an already wedged position also failed. Earlier jump tests started near the lip, and the low-speed test forced speed each frame; those checks did not cover the reported approach.

## Changes

- Sample ramp support over the rotated car footprint, so an edge-straddling approach can climb instead of becoming trapped.
- Separate the car from raised ramp faces along a contact normal. Remove inward velocity while preserving travel along the face or away from it. The ramp's high back and sides remain solid.
- Reapply ramp constraints after car-to-car separation, preventing traffic from pushing a grounded car inside the wedge.
- Validate takeoff by crossing the lip in the forward track direction while supported. Partial-width approaches can launch; reversing down the slope cannot collect jump rewards.
- Measure landing strength relative to the rising/falling road beneath the car.
- Align the rendered chassis to the slope when facing forward, across or down it, instead of applying the same nose-up tilt in every direction.

## Verification

Tests cover the screenshot's approach with every car on both tracks, low-speed stopping/restarting, outside-lane boost approaches, raised-side glancing and perpendicular impacts, reverse escape, descending the ramp in reverse, landing on top, overhead clearance, traffic pressure and 30/60/120 Hz callers. Browser regressions drive the full approach, capture climbing and airborne views, land, and exercise forward/reverse escape using keyboard throttle/brake input. Setup and accelerated-time controls exist only in development builds.

See TEST_REPORT.md for completed release gates and artifacts/ramp-before.txt for the failing baseline. Tests use software WebGL and do not establish performance or handling quality on every physical device.

This remains a forgiving arcade support model: a partly supported car follows the ramp plane, with no independent wheel suspension or full rigid-body solver. The track's outer boundary remains constrained. Existing cars, sound assets, credits and v5 records are preserved.
