import { expect, it } from 'vitest';
import { CARS } from '../src/game/content';
import { planOpponent, rivalProfile } from '../src/game/opponents';
import { NO_INPUT, RaceSimulation } from '../src/game/simulation';
import { Track } from '../src/game/track';

it('records only completed laps and counts each forward crossing once', () => {
  const track = new Track('coast');
  const sim = new RaceSimulation({ car:CARS[0], track, mode:'time', difficulty:'rookie', upgrade:0, laps:2 });
  sim.status = 'racing';
  sim.elapsed = 62;
  sim.player.distance = track.length-0.15;
  sim.player.lateral = 0;
  sim.player.speed = 40;
  expect(sim.bestLap).toBeNull();
  sim.step(1/60,NO_INPUT);
  const first = sim.bestLap!;
  expect(first).toBeGreaterThan(62);
  expect(first).toBeLessThan(62+1/60);

  // Recrossing a line after reversing must not award a faster lap.
  sim.elapsed = 63;
  sim.player.distance = track.length-0.15;
  sim.step(1/60,NO_INPUT);
  expect(sim.bestLap).toBe(first);

  sim.elapsed = 120;
  sim.player.distance = track.length*2-0.15;
  sim.step(1/60,NO_INPUT);
  expect(sim.status).toBe('finished');
  expect(sim.bestLap!).toBeCloseTo(sim.player.finishTime!-first,8);
});

it('gives the six rivals each an individual line, corner margin and boost policy', () => {
  const profiles = Array.from({length:6},(_,index)=>rivalProfile(index+1));
  expect(new Set(profiles.map(profile=>profile.offset)).size).toBe(6);
  expect(new Set(profiles.map(profile=>profile.corner)).size).toBe(6);
  expect(new Set(profiles.map(profile=>profile.reserve)).size).toBe(6);
});

it('brakes for a slow car in the path of a committed lateral slide', () => {
  const track = new Track('coast');
  const sim = new RaceSimulation({ car:CARS[0], track, mode:'quick', difficulty:'pro', upgrade:0 });
  const rival = sim.drivers[1];
  Object.assign(rival,{distance:100,lateral:0,speed:54,heading:.34,targetLane:0});
  Object.assign(sim.player,{distance:137,lateral:-6,speed:0,heading:0});
  const traffic=[sim.player,rival];
  expect(planOpponent(rival,traffic,track).speedLimit).toBeLessThan(rival.speed);
  sim.player.airborne=5;
  expect(planOpponent(rival,traffic,track).speedLimit).toBe(Infinity);
});
