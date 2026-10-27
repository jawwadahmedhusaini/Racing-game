# APEX RUSH 2.5 — sound, contact and BMW import

Historical 2.5 notes: version 2.5.2 adds planar yaw inertia/contact response; see COLLISION_FIXES.md for the current collision model.

## Delivered

The previous two-oscillator engine has been replaced by four credited, locally bundled engine sample banks, each with five RPM layers. RPM follows gear ratios and clutch response; unloaded wheels rev freely. Throttle/load changes filter tone and gain, shifting dips power, lifting off produces a short overrun burst. Tires react to braking, slip and speed and stay silent in flight. Impacts use metal recordings scaled to closing velocity; scrapes and landings have separate response. Two nearby competitors use stereo direction, distance attenuation and bounded Doppler. Mix buses and a compressor preserve headroom. The garage has a short **Hear the engine** audition, including on mobile.

The sound assets add about 1.6 MiB, decode asynchronously after a user gesture, and need no external service at play time. Failed audio downloads leave a basic fallback; they cannot block loading a race. Audio test reports measure real OfflineAudioContext output, including muted/paused sections, worst-case overlapping effects and stereo opponents. They do not substitute for subjective listening on headphones and phones.

BMW M3 GTR is a fifth garage choice (2,200 credits), made from Neubi's independently authored CC0 community model as adapted by CryHam. It has a separate body, cockpit and wheel mesh, neutral steering pivots, fixed calipers, PBR paint, fitted lamps and lighter race geometry. The preparation corrected original coordinate conventions and rebuilt the wheel rig; it does not deform the existing concept car. See the manifest for exact final counts and provenance. Existing cars and both circuits are preserved.

## Contact and jumps

- Run contact solves at 120 Hz, with bounded long-frame subdivision and repeated separation passes.
- Transfer longitudinal and lateral collision momentum; tire grip settles sideways recoil.
- Preserve forward momentum during a grazing barrier scrape; hard perpendicular hits stop the inward motion. Steering away is not penalized as a new hit.
- Give impact sounds an intensity and event ID; resting overlaps no longer produce loud repeated crashes.
- Keep horizontal momentum in flight. Tires cannot brake a car to a stop in the air, steering authority is reduced, and pitch follows flight velocity. Nitro adds separate arcade thrust; releasing it retains momentum. A regression verifies that fuel consumed during a jump produces acceleration.
- Produce one landing event and suspension compression per touchdown. Barrier contact in flight invalidates the clean-landing bonus; recovery clears recoil and pending jump rewards.
- Slow AI creep behind stopped traffic to reduce repeated shoving while retaining enough movement to steer around it.

Existing v1–v4 times remain stored; the changed handling uses separate v5 records. Credits, owned cars, paint, settings and career progress are retained.

## Honest boundaries

The engine banks were generated in Engine Simulator and edited by CryHam. They sound materially different from the old simple oscillators, but they are **not recordings of actual BMW, Ferrari, McLaren or Porsche engines**. Tire sound, overrun and wind details are synthesized. No flagship audio parity or human listening certification is claimed.

The BMW is an older community model with limited mesh and texture detail. It adds a recognisable, independently sourced vehicle; it is not a photogrammetric or manufacturer-approved model. No other requested manufacturer has been silently substituted with a renamed concept car. The inaccessible/uncleared McLaren, Ferrari, Porsche, Mercedes and Aston Martin assets remain unimported.

Contacts are equal-mass planar impulses in track coordinates. There is no angular inertia, rollover, deformable damage, destructible scenery or free off-road driving. Short substeps reduce tunnelling at game speeds but are not a general swept-volume rigid-body solver. Hardware GPU/mobile thermals, Safari/Firefox and subjective audio/handling still require device testing. Rendering in this environment uses software WebGL.

See TEST_REPORT.md for measured release checks and ASSET_LICENSES.md for credits and licensing evidence.

