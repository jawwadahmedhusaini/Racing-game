import {it,expect} from 'vitest';
import {Track,angleDelta} from '../src/game/track';
import {RaceSimulation,NO_INPUT,type Controls} from '../src/game/simulation';
import {CARS} from '../src/game/content';
const track=new Track('coast');
function race(){const sim=new RaceSimulation({track,car:CARS[0],mode:'time',difficulty:'rookie',upgrade:0});sim.status='racing';sim.player.lateral=0;return sim;}
const run=(sim:RaceSimulation,seconds:number,c:Partial<Controls>={})=>{for(let i=0;i<seconds*60;i++)sim.step(1/60,{...NO_INPUT,...c});};
it('brakes to zero before a deliberate hold engages capped reverse',()=>{
 const sim=race();sim.player.speed=12;run(sim,.3,{brake:1});expect(sim.player.speed).toBe(0);run(sim,.2,{brake:1});expect(sim.player.speed).toBe(0);run(sim,1.5,{brake:1});expect(sim.player.speed).toBe(-10);expect(sim.player.distance).toBeLessThan(0);
});
it('releasing the brake cancels the reverse dwell and brings reversing travel to rest',()=>{
 const sim=race();run(sim,.25,{brake:1});run(sim,.1);run(sim,.25,{brake:1});expect(sim.player.speed).toBe(0);run(sim,1,{brake:1});expect(sim.player.speed).toBeLessThan(-4);run(sim,3);expect(sim.player.speed).toBe(0);
});
it('forward throttle brakes backward travel before driving forward; brake takes priority',()=>{
 const sim=race();sim.player.speed=-10;run(sim,.2,{throttle:1});expect(sim.player.speed).toBeLessThan(0);run(sim,.1,{throttle:1});expect(sim.player.speed).toBeGreaterThanOrEqual(0);run(sim,.5,{throttle:1});expect(sim.player.speed).toBeGreaterThan(5);run(sim,2,{throttle:1,brake:1,nitro:true});expect(sim.player.speed).toBeLessThan(0);expect(sim.player.boost).toBe(0);
});
for(const steer of [-1,1])it(`reverse steering ${steer} rotates the wheels and chassis like a reversing car`,()=>{
 const sim=race();sim.player.speed=-6;const yaw=track.sample(0).yaw;run(sim,.5,{brake:1,steer});const after=track.sample(sim.player.distance);expect(angleDelta(yaw,after.yaw+sim.player.heading)*steer).toBeGreaterThan(.1);expect(sim.player.lateral*steer).toBeGreaterThan(.1);
});
it('reverse cannot activate boost or earn drift or ramp rewards, or complete a lap across the seam',()=>{
 const sim=race();sim.player.nitro=40;run(sim,8,{brake:1,nitro:true,drift:true});expect(sim.status).toBe('racing');expect(sim.player.distance).toBeLessThan(0);expect(sim.player.lap).toBe(1);expect(sim.player.driftTotal).toBe(0);expect(sim.player.jumpTotal).toBe(0);expect(sim.player.boost).toBe(0);expect(sim.player.finishTime).toBeNull();
});
it('reverse wall contact slows backward motion and recovery returns a stopped usable car',()=>{
 const sim=race();sim.player.speed=-10;sim.player.lateral=20;sim.step(1/60,{...NO_INPUT,brake:1});expect(sim.player.speed).toBeGreaterThan(-5);expect(sim.player.speed).toBeLessThanOrEqual(0);expect(Math.abs(sim.player.lateral)).toBeLessThanOrEqual(sim.roadClearance(sim.player));sim.recover();expect(sim.player.speed).toBe(0);expect(sim.player.lateral).toBe(0);
});
it('AI braking never accidentally selects reverse',()=>{
 const sim=new RaceSimulation({track,car:CARS[0],mode:'quick',difficulty:'rookie',upgrade:0});for(let i=0;i<120;i++)sim.integrate(sim.drivers[1],1/60,{...NO_INPUT,brake:1});expect(sim.drivers[1].speed).toBe(0);
});
