# APEX RUSH 2.6 — Neon Harbor and vehicle loading

The supplied 2.5.2 audit correctly identified eager car loading, similar circuit layouts and a city without a strong waterfront identity. Its visual scores are subjective assessments, and its hardware FPS targets remain unverified. This release addresses a focused part of that roadmap; it does not claim the proposed 3.0 art-production milestone is complete.

## Vehicle loading

The garage downloads the selected vehicle's detailed model instead of all six GLBs. The default Vanta needs 6,462,376 vehicle bytes instead of 15,578,284 (58.5% fewer). These are uncompressed GLB transfer sizes, not total startup bytes, startup time or GPU memory. Surface textures and vegetation still load at startup.

Race preparation requests the actual opponents' LOD families and both detail levels of the player car, so changing quality during a race remains immediate. Shared family requests are deduplicated. Failed optional models can be retried without destroying the current garage car. A late request cannot overwrite a newer selection or return the UI to the garage after navigation.

The cache tracks live car instances and retains at most two additional idle families/detail levels when trimmed. Live geometry and textures cannot be evicted. Eviction disposes the raw model and prepared geometry, materials and texture maps together. Cancellation stops the race preparation wait; a shared network request may finish into the cache for reuse. It does not pretend to cancel a download needed by another caller.

## A different city circuit

Neon Harbor now has a 2.71 km, 16-point route with a long portside straight, alternating downtown bends and an elevated return. Coast's route is unchanged. Road width remains 18 m; the simulation, barriers, ramps, map, grid and AI all sample the same route. New times use v7 keys; all previous records, purchases, paints, credits and settings remain in the save.

The old city ground plane covered the water. The revised land boundary exposes a harbor basin, with a quay, three gantry cranes, cargo stacks and a freighter silhouette. The city also gains illuminated shopfronts, two polygonal landmark towers, elevated portal frames and colored barrier markers. Skyline density is reduced around the reserved frontage. These are original modular meshes authored for this game, not imported professional environment assets. Existing external assets and credits are unchanged.

Static scenery is merged by material and spatial cell. Roadside solids reserve their footprint against every road segment. Portal beams have at least 22 m overhead clearance and their supports sit outside the barrier corridor. The water/ground and port objects are scenery outside the driveable corridor, not newly driveable off-road spaces.

Wet asphalt has broader variation in roughness, and the existing moving street lights use alternating cool, pink and warm colors. Billboard emission now follows the artwork instead of bleaching the entire sign. Reflections still use a static scene probe; screen-space, planar and ray-traced reflections are not added.

## Issues found during integration

The longer circuit exposed a lapping-rival collision that pushed a stationary Solstice over 200 m. The traffic braking envelope now uses a more conservative deceleration budget; the existing idle-player regression must pass on both tracks and all difficulties. This is a targeted correction to the existing opponent controller, not a physics-engine replacement.

The new browser workflows deliberately fail an unselected car download, hold a delayed selection, switch away, retry, reload a purchased car, cancel a grid while a model is downloading, restart and switch racing detail. Existing wall, ramp, race, persistence, audio and resource-reuse workflows remain release gates. See TEST_REPORT.md for completed results.

## Remaining work from the audit

The garage still has five selectable cars across three underlying designs. No additional manufacturer model, professional track pack, authentic vehicle recording, GPU texture compression, full suspension solver, stunt system, cloud save or extended career is claimed. Those need separate asset selection, integration and validation. This release does not establish Asphalt parity or physical-device FPS. DEVICE_TESTING.md describes the outstanding hardware checks.
