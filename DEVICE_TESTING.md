# Device verification still required

Cloud verification uses Chromium and software WebGL. The following runs require physical hardware; they have not been performed.

| Device class | Browser | Starting preset | Status |
| --- | --- | --- | --- |
| Desktop/laptop with integrated graphics | Current Chrome or Edge | Medium | Pending |
| Desktop with dedicated GPU | Current Chrome/Firefox | High | Pending |
| Recent Android phone | Current Chrome | Medium | Pending |
| Older Android phone | Current Chrome | Low | Pending |
| iPhone/iPad | Current Safari | Low, then Medium | Pending |

1. Open the hosted build and confirm **2.4** in Settings. Enable **Performance Display**. Record the device, OS/browser versions, viewport/orientation, chosen quality and whether adaptive resolution is enabled.
2. On each circuit, time Start Race to the visible preparation card and then to the countdown, once cold and again on restart. Cancel loading once and retry. Hold accelerate during loading and confirm the held key works when the countdown ends.
3. Race both circuits for five minutes, including a full grid, boost, drifting, the ramp at walking speed and at launch speed, reverse, a camera switch and repeated restarts. Record FPS, displayed render resolution and any stutters after the opening shaders have warmed. Repeat after ten minutes to expose heat-related slowdown.
4. Disable adaptive resolution for a controlled comparison; use identical quality and orientation. If image resolution drops without meaningful frame-rate improvement, lower the quality preset to reduce scene/effect cost.
5. On touch devices, hold throttle and steering with separate fingers, add boost, drag outside a control, lift one finger, rotate the phone and switch apps. Returning to a paused race must not retain a pressed control. Check that all controls remain reachable in portrait and landscape.
6. Reload after a completed race and after changing paint, purchasing and upgrading a car. Verify progress. Open a second tab and confirm that it waits for the first to close. Test sound with real speakers/headphones and check that all three zero-volume settings are silent.

Record sustained FPS as a range, resolution changes, thermal state, visible artifacts and reproduction steps. The current in-game readout is a rolling wall-clock estimate, not a GPU profiler. It does not justify a universal 30/60 FPS claim. Dynamic resolution affects pixel work; CPU-bound geometry, driver overhead and browser memory limits require device-specific profiling.

For 2.4, include a purchased Solstice GT, all camera modes and Reduced Camera Motion. Check the fourth garage card at narrow widths, rotate the long car in portrait, compare gear/audio shifts, and run a seven-car race around the raised ramp. Record real hardware data before signing off any 30/60 FPS target.
