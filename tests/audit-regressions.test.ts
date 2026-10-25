import {it,expect} from 'vitest';
import {CARS} from '../src/game/content';
import {RaceSimulation,NO_INPUT} from '../src/game/simulation';
import {Track} from '../src/game/track';
const track=new Track('coast');
const race=()=>{const sim=new RaceSimulation({track,car:CARS[0],mode:'quick',difficulty:'pro',upgrade:0});sim.status='racing';return sim;};

for(const exhausted of [false,true])it(`boost ${exhausted?'exhaustion':'release'} sheds excess speed progressively`,()=>{
 const sim=race(),p=sim.player;p.distance=40;p.lateral=0;p.speed=110;p.nitro=exhausted?.01:50;p.boost=1;p.boostPrevious=true;
 sim.integrate(p,1/60,{...NO_INPUT,throttle:1,nitro:exhausted});
 expect(p.boost).toBe(0);expect(p.speed).toBeGreaterThan(109);expect(p.speed).toBeLessThan(110);
});

it('head-on cars lose closing speed instead of driving against each other at full power',()=>{
 const sim=race();sim.drivers=sim.drivers.slice(0,2);const [a,b]=sim.drivers;
 a.distance=50;b.distance=54.5;a.lateral=b.lateral=0;a.speed=b.speed=30;b.heading=Math.PI;
 sim.aiInput=()=>NO_INPUT;sim.step(1/60,NO_INPUT);
 expect(Math.abs(a.speed)).toBeLessThan(5);expect(Math.abs(b.speed)).toBeLessThan(5);
});

it('a reversing car stops against a stationary car behind it',()=>{
 const sim=race();sim.drivers=sim.drivers.slice(0,2);const [a,b]=sim.drivers;
 a.distance=50;b.distance=45.5;a.lateral=b.lateral=0;a.speed=-10;sim.aiInput=()=>NO_INPUT;
 sim.step(1/60,{...NO_INPUT,brake:1});expect(a.speed).toBeGreaterThan(-6);expect(b.speed).toBeGreaterThanOrEqual(0);
});

it('orders finishers by crossing time inside a fixed step, not driver array order',()=>{
 const sim=race(),end=track.length*sim.laps;sim.drivers=sim.drivers.slice(0,2);const [a,b]=sim.drivers;
 a.distance=end-.3;b.distance=end-.1;a.speed=30;b.speed=20;sim.aiInput=()=>NO_INPUT;
 sim.step(1/60,NO_INPUT);expect(sim.status).toBe('finished');expect(sim.resultPosition).toBe(2);
 expect(b.finishTime!).toBeLessThan(a.finishTime!);expect(a.finishTime!).toBeLessThan(1/60);
});

it('elimination standings preserve survival order even when a survivor reverses behind an eliminated car',()=>{
 const sim=race();sim.mode='elimination';sim.drivers=sim.drivers.slice(0,3);sim.aiInput=()=>NO_INPUT;
 sim.player.distance=100;sim.drivers[1].distance=50;sim.drivers[2].distance=10;sim.nextElimination=0;
 sim.step(1/60,NO_INPUT);expect(sim.drivers[2].eliminated).toBe(true);
 sim.drivers[1].distance=-10;sim.nextElimination=0;sim.step(1/60,NO_INPUT);
 expect(sim.ordered.map(d=>d.id)).toEqual([0,1,2]);expect(sim.resultPosition).toBe(1);
});

for(const id of ['coast','city'] as const)for(const car of CARS)it(`${car.id} on ${id} remains bounded under mixed braking, reverse, drift, boost and recovery`,()=>{
 const sim=new RaceSimulation({track:new Track(id),car,mode:'quick',difficulty:'expert',upgrade:3});
 let seed=913,input={...NO_INPUT};const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<90*60;i++){
  if(i%31===0)input={throttle:random()>.25?1:0,brake:random()>.75?1:0,steer:random()*2-1,drift:random()>.5,nitro:random()>.5};
  if(i%311===0)sim.recover();sim.step(1/60,input);
  for(const d of sim.drivers){
   expect([d.distance,d.speed,d.heading,d.lateral,d.nitro,d.airborne].every(Number.isFinite)).toBe(true);
   expect(Math.abs(d.lateral)).toBeLessThanOrEqual(sim.roadClearance(d)+1e-6);
   expect(d.nitro).toBeGreaterThanOrEqual(0);expect(d.nitro).toBeLessThanOrEqual(100);expect(d.airborne).toBeGreaterThanOrEqual(0);
  }
 }
});
