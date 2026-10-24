# APEX RUSH 2.4 — audit-led vertical slice

## Implemented scope

1. Preserve and expose the original TypeScript repository, tests and asset-build scripts. Publish an editable source ZIP separately from the small-purpose play ZIP.
2. Author one genuinely separate vehicle: Solstice GT, with a long bonnet/rearward cabin, separate body, front/rear lighting, interior, split-spoke wheels and fixed brake calipers. Build garage and race LODs from a reproducible Blender script; verify bounds, wheel pivots, normal values and hashes. The collection remains four cars across two base designs.
3. Separate camera presentation from simulation. Add acceleration lag, drift framing, landing compression, restrained boost/contact shake and corridor clearance. Add a persisted reduced-motion option. Do not introduce player auto-steering.
4. Introduce continuous drift slip and grip recovery, prevent drift rewards while braking/airborne, and animate body pitch/compression. Tune distinct engine firing profiles and gear hysteresis; keep audio procedural.
5. Field six AI rivals. Plan passing corridors with adjacent and approaching traffic, hold the chosen lane while passing, brake when boxed in, and avoid the raised ramp edge. Test all difficulty/circuit combinations with an idle player.
6. Add braking reference boards and start banners, plus a coastal belvedere on a verified footprint. Keep additions static, spatially batched and outside the clear road corridor.
7. Run simulation, geometry, asset, camera and browser checks; inspect High/Ultra renders; measure software loading/rendering; test actual packaged and Pages-base builds; verify downloadable web/source archives after publication.

## Acceptance boundaries

This is a concrete improvement release, not Asphalt parity. The larger audit targets remain: 8–12 professional distinct vehicles, richer handcrafted environments, sampled/spatial audio, extended progression and measured real-device frame pacing. Current validation uses Chromium/SwiftShader, not physical phones or desktop GPUs. Corridor clamping protects the chase lens from roadside geometry, but is not a general dynamic occlusion solver. Figures in PERFORMANCE_REPORT.md are measurements of this cloud software renderer only.
