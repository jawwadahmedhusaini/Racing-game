# APEX RUSH 2.2 — adversarial usability and graphics pass

1. Audit interrupted keyboard/touch input, settings during a race, repeated navigation/restarts, denied storage/audio, failed assets, lost WebGL contexts and competing tabs. Reproduce failures with focused tests.
2. Fix skid distance accumulation and road pitch, transparent-effect shadows, lapped/rotated-car contacts, optional-audio setup failure and stale saves. Preserve the existing save schema.
3. Remodel the shared licensed chassis into more distinct long-nose and wide-body silhouettes. Retain authored surface normals, wheel circles, paint, glass, LODs and attribution.
4. Add original coastal lighthouse and city transit landmarks with merged materials and spatial culling.
5. Add adaptive resolution, pixel-budget caps and an optional performance display. Cache invariant minimap work. Measure software-renderer cost and document a repeatable real-device checklist.
6. Run simulation, geometry and browser checks, inspect real screenshots, exercise both production hosting paths, package and verify the download.

## Acceptance limits

This remains a single-player arcade game. The three vehicles derive from one licensed concept chassis; these are remodeled variants, not three independently sourced car models. The environment offers software WebGL only. Physical phones, desktop GPUs, Safari and Firefox need separate validation. No claim of Asphalt-level photorealism, universal frame rate or perfect reliability is justified by the cloud checks.
