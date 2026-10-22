# APEX RUSH — driving and visual overhaul

## Acceptance gates

1. Manual steering: left/right are correct in world space and from the chase camera, with keyboard and touch. Holding throttle alone must not steer around the course. Rivals explicitly steer through the same dynamics. Regression checks must measure movement and orientation, not only input flags.
2. Vehicle presentation: use the detailed chassis for the player, physically based paint/glass, wheel steering with the correct sign, suspension response, and a lower, vehicle-following camera. Preserve licensed asset attribution.
3. Environment: replace the floating coastal ribbon with a grounded, textured coastal road; add realistic road surface variation, road construction, barriers, rock detail, vegetation and deliberately placed architecture. Improve the city road, building proportions, facades and lighting. Use appropriately licensed surface assets.
4. Lighting: coherent sun direction, atmosphere and reflections, useful moving shadow coverage, contact shading, restrained bloom and antialiasing. Provide lower-cost quality presets; measure cost and distinguish software-renderer timing from actual GPU performance.
5. Verification and delivery: simulate both circuits, check player and AI control, view actual gameplay screenshots, complete browser races, verify Pages asset paths and production build, then update the playable site and downloadable package. Preserve the previous release in Git history.

This is a substantial iteration of the independent game, not a claim of matching a large studio's car collection, art production or device optimization. Only implemented and verified improvements will be reported as delivered.

## Delivered and checked

Manual steering, corrected input direction, detailed player-car presentation, both rebuilt environments, quality presets, contact shading and antialiasing are implemented. The 22-unit-test and five-workflow browser suites pass, including actual keyboard/touch movement and paused-camera distance. High/Ultra render checks and both production hosting paths pass. Hardware-GPU performance and public Pages availability remain unverified from this cloud environment; see TEST_REPORT.md and PERFORMANCE_REPORT.md.
