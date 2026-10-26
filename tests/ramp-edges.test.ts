import {it,expect} from 'vitest';
import {CARS} from '../src/game/content';
import {Track} from '../src/game/track';
import {RaceSimulation,NO_INPUT} from '../src/game/simulation';
import {RAMP,rampSupport,rampContact,surfaceTilt} from '../src/game/ramp';
import {footprint,velocity} from '../src/game/contact';
import {Euler,Vector3} from 'three';

const tracks=[new Track('coast'),new Track('city')];
function race(track=tracks[0],car=CARS[0]){
 const sim=new RaceSimulation({track,car,mode:'time',difficulty:'rookie',upgrade:0});
 sim.status='racing';return sim;
}
for(const track of tracks)for(const car of CARS)it(`${car.id} on ${track.id} can climb and jump with its center beside the ramp's left edge`,()=>{
 const sim=race(track,car),d=sim.player,start=track.length*RAMP.fraction,lane=RAMP.left-.2;
 Object.assign(d,{distance:start-7,lateral:lane,speed:30});let highest=0;
 for(let i=0;i<120;i++){
  sim.step(1/60,{...NO_INPUT,throttle:1,steer:sim.steeringFor(d,lane)});
  highest=Math.max(highest,d.airborne+d.rampLift);
 }
 expect(d.distance).toBeGreaterThan(start+RAMP.length+10);
 expect(d.jumpTotal).toBe(1);expect(highest).toBeGreaterThan(2);expect(d.impactSerial).toBe(0);
});
for(const reverse of [false,true])it(`a car already wedged beside the raised ramp can ${reverse?'reverse out':'drive along the side'} without recovery`,()=>{
 const sim=race(),d=sim.player,start=sim.track.length*RAMP.fraction;
 Object.assign(d,{distance:start+7,lateral:RAMP.left-.2,speed:0});
 for(let i=0;i<120;i++)sim.step(1/60,{...NO_INPUT,throttle:reverse?0:1,brake:reverse?1:0});
 expect((d.distance-(start+7))*(reverse?-1:1)).toBeGreaterThan(5);
});
for(const track of tracks)for(const car of CARS)it(`${car.id} on ${track.id} can stop on the slope, restart and drive through at low speed`,()=>{
 const sim=race(track,car),d=sim.player,start=track.length*RAMP.fraction,lane=5.5;
 Object.assign(d,{distance:start-5,lateral:lane,speed:0});
 let stopped=false,restarted=false,highest=0;
 for(let i=0;i<600;i++){
  const braking=!stopped&&d.distance>start+4;
  sim.step(1/60,{...NO_INPUT,brake:braking?1:0,throttle:braking?0:d.speed<7?1:0,steer:sim.steeringFor(d,lane)});
  if(braking&&d.speed===0){stopped=true;expect(d.rampLift).toBeGreaterThan(.4);}
  if(stopped&&d.speed>4)restarted=true;
  highest=Math.max(highest,d.rampLift);
 }
 expect(stopped&&restarted).toBe(true);expect(highest).toBeGreaterThan(1.3);
 expect(d.distance).toBeGreaterThan(start+RAMP.length+5);expect(d.jumpTotal).toBe(0);
 expect(d.airborne).toBe(0);expect(d.impactSerial).toBe(0);
});
for(const track of tracks)for(const car of CARS)it(`${car.id} on ${track.id} crosses the outside ramp lane at boost speed`,()=>{
 const sim=race(track,car),d=sim.player,start=track.length*RAMP.fraction,lane=7.35;
 Object.assign(d,{distance:start-8,lateral:lane,speed:100,nitro:100});
 for(let i=0;i<30;i++)sim.step(1/60,{...NO_INPUT,throttle:1,nitro:true,steer:sim.steeringFor(d,lane)});
 expect(d.distance).toBeGreaterThan(start+RAMP.length+15);expect(d.speed).toBeGreaterThan(90);
 expect(d.airborne).toBeGreaterThan(1);expect(d.jumpTotal).toBe(1);expect(d.impactSerial).toBe(0);
});
it('a high side strike removes inward speed, permits a glancing slide, and cannot add energy',()=>{
 const sim=race(),d=sim.player,start=sim.track.length*RAMP.fraction;
 Object.assign(d,{distance:start+9,lateral:RAMP.left-footprint(d).width+.15,speed:50,heading:-.2});
 const energy=d.speed**2;sim.constrainRamp(d);
 expect(velocity(d).x).toBeCloseTo(0,6);expect(velocity(d).z).toBeGreaterThan(45);
 expect(d.speed**2+d.sideSpeed**2).toBeLessThanOrEqual(energy);
 expect(d.impactSerial).toBe(1);expect(d.distance).toBeCloseTo(start+9);
 expect(rampContact(sim.track,d,footprint(d),0)).toBeNull();
});
it('a perpendicular side strike stops the car but reverse immediately provides an escape',()=>{
 const sim=race(),d=sim.player,start=sim.track.length*RAMP.fraction;
 Object.assign(d,{distance:start+8,lateral:RAMP.left-footprint(d).length-.2,speed:15,heading:-Math.PI/2});
 for(let i=0;i<15;i++)sim.step(1/60,{...NO_INPUT,throttle:1});
 expect(Math.abs(d.speed)).toBeLessThan(.5);const before=d.lateral;
 for(let i=0;i<90;i++)sim.step(1/60,{...NO_INPUT,brake:1});
 expect(d.lateral).toBeLessThan(before-3);expect(d.speed).toBeLessThan(-5);
});
it('reversing into the high back stops once and forward throttle moves away without recovery',()=>{
 const sim=race(),d=sim.player,lip=sim.track.length*RAMP.fraction+RAMP.length;
 Object.assign(d,{distance:lip+footprint(d).length+.2,lateral:5.5,speed:-10});
 for(let i=0;i<60;i++)sim.step(1/60,{...NO_INPUT,brake:1});
 expect(d.distance).toBeGreaterThan(lip+footprint(d).length-.03);
 expect(Math.abs(d.speed)).toBeLessThan(.1);expect(d.impactSerial).toBe(1);
 const before=d.distance;
 for(let i=0;i<90;i++)sim.step(1/60,{...NO_INPUT,throttle:1,steer:sim.steeringFor(d,5.5)});
 expect(d.distance).toBeGreaterThan(before+10);expect(d.speed).toBeGreaterThan(20);
});
it('reversing down the slope remains supported and cannot earn a jump or landing bonus',()=>{
 const sim=race(),d=sim.player,start=sim.track.length*RAMP.fraction;
 Object.assign(d,{distance:start+10,lateral:5.5,speed:-6});d.rampLift=rampSupport(sim.track,d,footprint(d));
 for(let i=0;i<150;i++)sim.step(1/60,{...NO_INPUT,brake:1});
 expect(d.distance).toBeLessThan(start-5);expect(d.jumpTotal).toBe(0);expect(d.jumpRewardPending).toBe(false);
 expect(d.rampLift).toBe(0);expect(d.airborne).toBe(0);expect(d.impactSerial).toBe(0);
});
it('landing on the ramp settles onto its slope once instead of colliding with its side',()=>{
 const sim=race(),d=sim.player,start=sim.track.length*RAMP.fraction;
 Object.assign(d,{distance:start+7,lateral:5.5,speed:0,airborne:3,verticalSpeed:-4});
 for(let i=0;i<90;i++)sim.step(1/60,NO_INPUT);
 expect(d.rampLift).toBeCloseTo(rampSupport(sim.track,d,footprint(d)),6);
 expect(d.rampLift).toBeGreaterThan(.7);expect(d.airborne).toBe(0);expect(d.landingSerial).toBe(1);
 expect(d.impactSerial).toBe(0);expect(d.distance).toBeCloseTo(start+7);
});
it('a car well above the wedge can cross its side without an invisible wall',()=>{
 const sim=race(),d=sim.player,start=sim.track.length*RAMP.fraction;
 Object.assign(d,{distance:start+8,lateral:RAMP.left-footprint(d).length-.2,speed:25,heading:-Math.PI/2,airborne:4,verticalSpeed:0});
 // Stop before reaching the separate outer track barrier.
 for(let i=0;i<12;i++)sim.step(1/60,NO_INPUT);
 expect(d.lateral).toBeGreaterThan(4);expect(d.impactSerial).toBe(0);expect(d.speed).toBeGreaterThan(24);
});
it('traffic cannot shove a grounded car through the raised side of the ramp',()=>{
 const sim=race(),d=sim.player,start=sim.track.length*RAMP.fraction;
 const other={...d,id:1,name:'RIVAL',distance:start+9,lateral:-.2,speed:15,heading:-Math.PI/2};
 Object.assign(d,{distance:start+9,lateral:1.9,speed:0});sim.drivers.push(other);sim.aiInput=()=>NO_INPUT;
 for(let i=0;i<60;i++)sim.step(1/60,NO_INPUT);
 expect(rampContact(sim.track,d,footprint(d),d.airborne+d.rampLift)).toBeNull();
 expect(d.lateral).toBeLessThan(RAMP.left);expect(Number.isFinite(d.speed)).toBe(true);
 const before=d.distance;
 for(let i=0;i<90;i++)sim.step(1/60,{...NO_INPUT,throttle:1});
 expect(d.distance).toBeGreaterThan(before+8);
});
it('ramp motion is consistent across 30, 60 and 120 Hz callers',()=>{
 const results=[30,60,120].map(hz=>{
  const sim=race(),d=sim.player;Object.assign(d,{distance:sim.track.length*RAMP.fraction-5,lateral:5.5,speed:35});
  for(let i=0;i<hz;i++)sim.step(1/hz,{...NO_INPUT,throttle:1});
  return [d.distance,d.lateral,d.speed,d.airborne,d.verticalSpeed,d.jumpTotal];
 });
 for(const result of results.slice(1))result.forEach((value,i)=>expect(value).toBeCloseTo(results[0][i],6));
});
it('the rendered chassis follows the surface normal when facing forward, sideways or backward',()=>{
 for(const heading of [0,.6,Math.PI/2,Math.PI,-Math.PI/2])for(const onRamp of [false,true]){
  const tangentY=.06,tilt=surfaceTilt(tangentY,heading,onRamp);
  const normal=new Vector3(0,1,0).applyEuler(new Euler(tilt.pitch,heading,tilt.roll,'YXZ'));
  const grade=Math.tan(Math.asin(tangentY))+(onRamp?RAMP.rise/RAMP.length:0);
  expect(normal.dot(new Vector3(0,1,-grade).normalize())).toBeCloseTo(1,8);
 }
});
