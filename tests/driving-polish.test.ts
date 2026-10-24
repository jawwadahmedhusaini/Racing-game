import {describe,it,expect} from 'vitest';
import {CARS} from '../src/game/content';
import {RaceSimulation,NO_INPUT} from '../src/game/simulation';
import {Track} from '../src/game/track';
import {planOpponent,raceGap} from '../src/game/opponents';
import {footprint} from '../src/game/contact';
import {EngineVoice} from '../src/game/engine-voice';
const track=new Track('coast');
const race=()=>new RaceSimulation({track,car:CARS[3],mode:'quick',difficulty:'pro',upgrade:0});
it('fields six opponents using both independently authored chassis',()=>{const s=race();expect(s.drivers).toHaveLength(7);expect(s.drivers.slice(1).some(d=>d.spec.id==='solstice')).toBe(true);expect(footprint(s.player)).toEqual({width:1.24,length:2.48});});
it('will not cut into an occupied passing lane, and brakes if both corridors are occupied',()=>{
 const s=race(),d=s.drivers[1];for(const other of s.drivers){other.distance=500;other.lateral=0;}d.distance=100;d.lateral=0;d.speed=35;d.targetLane=0;
 s.player.distance=116;s.player.lateral=0;s.player.speed=10;
 s.drivers[2].distance=102;s.drivers[2].lateral=-5;s.drivers[2].speed=35;
 expect(planOpponent(d,s.drivers,track).lane).toBe(5);
 s.drivers[3].distance=100;s.drivers[3].lateral=5;s.drivers[3].speed=35;
 const blocked=planOpponent(d,s.drivers,track);expect(blocked.lane).toBe(0);expect(blocked.speedLimit).toBeLessThan(25);
});
it('holds a passing lane until the overtaken car is behind, including across the finish seam',()=>{
 const s=race(),d=s.drivers[1];for(const o of s.drivers)o.distance=500;d.distance=track.length-2;d.lateral=5;d.targetLane=5;s.player.distance=1;s.player.lateral=0;
 expect(raceGap(s.player.distance,d.distance,track.length)).toBeCloseTo(3);expect(planOpponent(d,s.drivers,track).lane).toBe(5);
 d.distance=track.length+20;expect(planOpponent(d,s.drivers,track).lane).toBeLessThan(4);
});
it('recovers tire grip smoothly and cannot farm drift while airborne or braking',()=>{
 const s=race();s.status='racing';const d=s.player;d.distance=60;d.lateral=0;d.speed=28;
 for(let i=0;i<24;i++)s.integrate(d,1/60,{...NO_INPUT,throttle:1,steer:1,drift:true});
 const slip=d.slipAngle;expect(slip).toBeGreaterThan(.04);s.integrate(d,1/60,NO_INPUT);expect(d.slipAngle).toBeLessThan(slip);expect(d.slipAngle).toBeGreaterThan(0);
 for(let i=0;i<80;i++)s.integrate(d,1/60,NO_INPUT);expect(Math.abs(d.slipAngle)).toBeLessThan(.0001);
 d.airborne=5;d.speed=30;d.nitro=20;const total=d.driftTotal;s.integrate(d,1/60,{...NO_INPUT,steer:1,drift:true});expect(d.driftTotal).toBe(total);
 d.airborne=0;s.integrate(d,1/60,{...NO_INPUT,brake:1,steer:1,drift:true});expect(d.driftTotal).toBe(total);
});
for(const id of ['coast','city'] as const)for(const difficulty of ['rookie','pro','expert'] as const)it(`six ${difficulty} rivals finish ${id} around an idle car without ramp deadlock`,()=>{
 const s=new RaceSimulation({track:new Track(id),car:CARS[3],mode:'quick',difficulty,upgrade:0});
 for(let i=0;i<180*60;i++)s.step(1/60,NO_INPUT);
 expect(s.drivers.slice(1).every(d=>d.finishTime!==null)).toBe(true);expect(s.player.distance).toBeLessThan(s.track.length*.02);expect(s.drivers.every(d=>Number.isFinite(d.heading)&&Number.isFinite(d.speed))).toBe(true);
});
describe('responsive engine voice',()=>{
 it('does not hunt gears at a threshold and handles reverse/rapid speed changes',()=>{
  const voice=new EngineVoice();voice.update('solstice',18,1,1/60);voice.update('solstice',20,1,1/60);const gear=voice.gear;
  for(let i=0;i<120;i++)voice.update('solstice',i%2?16.9:17.1,1,1/60);expect(voice.gear).toBe(gear);
  expect(voice.update('solstice',-10,0,.1).gear).toBe(1);expect(voice.update('solstice',110,1,.1).frequency).toBeGreaterThan(0);
 });
 it('assigns different firing profiles and keeps silent/idling values finite',()=>{
  const a=new EngineVoice(),b=new EngineVoice();const va=a.update('vanta',30,1,.1),vb=b.update('spectre',30,1,.1);expect(vb.frequency).toBeGreaterThan(va.frequency);
  for(let i=0;i<100;i++)expect(Number.isFinite(a.update('vanta',0,0,1/60).rpm)).toBe(true);
 });
});

it('a higher nitro rating delivers stronger boost and consumes less of the same tank',()=>{
 const a=race(),b=race();a.status=b.status='racing';a.player.spec={...CARS[0],nitro:80};b.player.spec={...CARS[0],nitro:100};
 for(const sim of [a,b]){sim.player.speed=35;sim.player.nitro=70;sim.player.distance=50;sim.player.lateral=0;}
 for(let i=0;i<15;i++)for(const sim of [a,b])sim.integrate(sim.player,1/60,{...NO_INPUT,throttle:1,nitro:true});
 expect(b.player.speed).toBeGreaterThan(a.player.speed);expect(b.player.nitro).toBeGreaterThan(a.player.nitro);
});
it('drivetrain gear remains stable around shift thresholds for the HUD and audio',()=>{
 const sim=race(),d=sim.player;d.speed=20;sim.integrate(d,1/60,NO_INPUT);expect(d.gear).toBe(2);
 for(let i=0;i<100;i++){d.speed=i%2?16.9:17.1;sim.integrate(d,1/60,NO_INPUT);expect(d.gear).toBe(2);}
 d.speed=10;sim.integrate(d,1/60,NO_INPUT);expect(d.gear).toBe(1);
});
