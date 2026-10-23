# APEX RUSH 2.1 — graphics and usability pass

## Implementation

1. Capture a filtered reflection environment from the actual garage and each circuit, once per scene. Keep capture work out of the race loop. Use broad studio light cards, a blue night sky, and scene-appropriate car reflections.
2. Refine the licensed chassis: curved, tapered airfoils, shaped endplates, woven carbon, clearcoat paint, readable tinted glass and a less aggressive contact-shading pass.
3. Vary the city with three facade families, recessed lit rooms, material roughness, stepped towers, crowns and rooftop details. Refine terrain color variation and wet asphalt.
4. Split scenery into spatial cells, consolidate matching road strips, introduce matching near/far tree LODs, cull distant grass and restrict contact shading to nearby geometry. Low uses the lighter player-car mesh; changing quality preserves the current race.
5. Resolve reproduced control failures: nitro held before launch, empty-meter behavior, rotated barrier clearance, collision pushes through the boundary, brake/accelerator conflict, multiple touches on one action, paused shortcuts, nested-menu Escape handling and missing touch recovery. Warn when driving the wrong way.
6. Preserve existing saves, run simulation and browser regressions, inspect real screenshots, measure software-renderer cost, test both production hosting paths and package the verified build.

## Acceptance limits

The three cars remain variants of one licensed concept chassis. Reflection captures are static scene probes, not ray tracing or real-time moving-object reflections. The cloud environment provides SwiftShader, not a hardware GPU. This release must not claim flagship visual parity or a hardware frame-rate guarantee. Final evidence is recorded in TEST_REPORT.md and PERFORMANCE_REPORT.md.
