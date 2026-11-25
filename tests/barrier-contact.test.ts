import { expect, it } from 'vitest';
import { CARS } from '../src/game/content';
import { groundSpeed, inertia, resolveStaticContactSpeed, velocity } from '../src/game/contact';
import { NO_INPUT, RaceSimulation } from '../src/game/simulation';
import { Track } from '../src/game/track';

const tracks = [new Track('coast'), new Track('city')];
function race(track: Track) {
  const sim = new RaceSimulation({track, car: CARS[0], mode: 'time', difficulty: 'rookie', upgrade: 0});
  sim.status = 'racing';
  sim.player.distance = 120;
  return sim;
}

it('friction at a sliding front corner changes both the tangential speed and the yaw impulse', () => {
  const dry = race(tracks[0]).player;
  Object.assign(dry, {heading: -.55, speed: 3});
  const smooth = {...dry};
  resolveStaticContactSpeed(smooth, {x: -1, z: 0}, 0);
  resolveStaticContactSpeed(dry, {x: -1, z: 0}, .35);
  expect(velocity(dry).z).toBeLessThan(velocity(smooth).z);
  expect(dry.impactYaw).toBeLessThan(smooth.impactYaw);
});

for (const track of tracks) for (const side of [-1, 1]) {
  it(`${track.id} wall ${side} allows a car above the upper rail to fly past and recovers it once`, () => {
    const sim = race(track), d = sim.player;
    Object.assign(d, {heading: -side * .6, speed: 32, airborne: 4, jumpRewardPending: true, jumpClean: true});
    d.lateral = side * sim.roadClearance(d);
    sim.step(1/30, {...NO_INPUT, nitro: true});
    expect(side * d.lateral).toBeGreaterThan(sim.roadClearance(d) + .3);
    expect(d.impactSerial).toBe(0);
    expect(d.boost).toBeGreaterThan(0);
    for (let i = 0; i < 240 && d.airborne > 0; i++) sim.step(1/120, NO_INPUT);
    expect(d.lateral).toBe(0);
    expect(d.airborne).toBe(0);
    expect(groundSpeed(d)).toBe(0);
    expect(d.impactSerial).toBe(0);
    expect(d.jumpRewardPending).toBe(false);
    expect(sim.lastEvent).toContain('BACK ON TRACK');
    const distance = d.distance;
    for (let i = 0; i < 120; i++) sim.step(1/120, {...NO_INPUT, throttle: 1});
    expect(d.distance).toBeGreaterThan(distance + 5);
  });

  it(`${track.id} wall ${side} catches low airborne overlap without treating a straddling car as off-course`, () => {
    const sim = race(track), d = sim.player;
    Object.assign(d, {heading: -side * .5, speed: 30, airborne: 1.59, jumpRewardPending: true, jumpClean: true});
    d.lateral = side * (sim.roadClearance(d) + .03);
    sim.constrainToRoad(d, 1/120);
    expect(side * d.lateral).toBeCloseTo(sim.roadClearance(d));
    expect(d.impactSerial).toBe(1);
    expect(d.jumpClean).toBe(false);
  });

  it(`${track.id} wall ${side} retains more rail speed as the impact becomes shallower`, () => {
    let previousSpeed = 0;
    for (const angle of [1.3, 1.1, .8, .55, .3, .08]) {
      const sim = race(track), d = sim.player;
      d.speed = 40;
      d.heading = -side * angle;
      d.lateral = side * (sim.roadClearance(d) + .01);
      sim.constrainToRoad(d, 1/120);
      expect(velocity(d).z).toBeGreaterThan(previousSpeed);
      expect(groundSpeed(d)**2 + inertia(d)*d.impactYaw**2).toBeLessThanOrEqual(1600);
      previousSpeed = velocity(d).z;
    }
  });
}

it('ground grip keeps moderate corner strikes below the spin limiter and settles without a second impulse', () => {
  for (const side of [-1, 1]) for (const angle of [.3, .55]) {
    const sim = race(tracks[0]), d = sim.player;
    Object.assign(d, {heading: -side * angle, speed: 40});
    d.lateral = side * (sim.roadClearance(d) + .01);
    sim.constrainToRoad(d, 1/120);
    const after = {...d};
    expect(Math.abs(after.impactYaw)).toBeLessThan(3);
    expect(resolveStaticContactSpeed(d, {x: -side, z: 0}, .36)).toBeCloseTo(0, 6);
    expect(d.impactYaw).toBeCloseTo(after.impactYaw, 6);
  }
});

for (const track of tracks) it(`${track.id} recovers a missed finish behind its departure and clear of traffic`, () => {
  const sim = race(track), d = sim.player;
  const departure = track.length - .1;
  Object.assign(d, {distance: departure, heading: -.4, speed: 60, airborne: 6});
  d.lateral = sim.roadClearance(d);
  const rival = {...d, id: 1, distance: .2, lateral: 0, speed: 0, airborne: 0, heading: 0};
  sim.drivers.push(rival);
  sim.aiInput = () => NO_INPUT;
  for (let i = 0; i < 240 && d.airborne > 0; i++) sim.step(1/120, NO_INPUT);
  expect(sim.status).toBe('racing');
  expect(d.distance).toBeLessThanOrEqual(departure - 5);
  expect(d.lap).toBe(1);
  expect(d.lateral).toBe(0);
  expect(d.impactSerial).toBe(0);
});

it('a rapid descent beyond the rail recovers without a landing event or jump reward', () => {
  const sim = race(tracks[1]), d = sim.player;
  Object.assign(d, {speed: 25, airborne: 2, verticalSpeed: -300, lateral: 12, jumpClean: true, jumpRewardPending: true, nitro: 20});
  sim.step(1/120, NO_INPUT);
  expect(sim.lastEvent).toContain('BACK ON TRACK');
  expect(d.landingSerial).toBe(0);
  expect(d.nitro).toBeLessThan(21);
  expect(d.lateral).toBe(0);
});

it('scraping both rails stays passive across vehicles, reverse, sideslip and existing spin', () => {
  for (const spec of CARS) for (const side of [-1, 1]) {
    const sim = race(tracks[0]), d = sim.player;
    d.spec = spec;
    const energy = () => groundSpeed(d)**2 + inertia(d)*d.impactYaw**2;
    for (const degrees of [5, 15, 30, 45, 60, 75, 85, 90]) for (const speed of [-10, 0, 40, 100]) {
      for (const spin of [-3, 0, 2]) for (const slide of [-8, 0, 6]) {
        Object.assign(d, {speed, heading: -side * degrees*Math.PI/180, sideSpeed: slide, impactYaw: spin});
        const before = energy();
        const normal = {x: -side, z: 0};
        resolveStaticContactSpeed(d, normal, .36);
        expect(energy()).toBeLessThanOrEqual(before + 1e-8);
        expect(resolveStaticContactSpeed(d, normal, .36)).toBeCloseTo(0, 6);
      }
    }
  }
});

it('an airborne departure cannot advance the lap counter before re-entry', () => {
  const sim = race(tracks[0]), d = sim.player;
  sim.laps = 2;
  Object.assign(d, {distance: sim.track.length - .1, heading: -.5, speed: 45, airborne: 4, verticalSpeed: 2});
  d.lateral = sim.roadClearance(d);
  sim.step(1/60, NO_INPUT);
  expect(d.lap).toBe(1);
  expect(sim.lastEvent).not.toContain('FINAL LAP');
});

it('clipping the rail from above registers one edge strike and cancels a clean landing', () => {
  const sim = race(tracks[0]), d = sim.player;
  Object.assign(d, {heading: 0, speed: 0, airborne: 1.62, verticalSpeed: -6, jumpClean: true, jumpRewardPending: true});
  d.lateral = sim.roadClearance(d) + .1;
  sim.step(1/120, NO_INPUT);
  expect(d.impactSerial).toBe(1);
  expect(d.jumpClean).toBe(false);
  expect(d.lateral).toBeCloseTo(sim.roadClearance(d), 6);
  for (let frame = 0; frame < 60; frame++) sim.step(1/120, NO_INPUT);
  expect(d.impactSerial).toBe(1);
  expect(d.landingSerial).toBe(1);
  expect(sim.lastEvent).toContain('ROUGH LANDING');
});
