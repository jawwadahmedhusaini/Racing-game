import {it,expect} from 'vitest';
import {CARS} from '../src/game/content';
import {Track,angleDelta} from '../src/game/track';
import {RaceSimulation,NO_INPUT} from '../src/game/simulation';
import {velocity,setVelocity,groundSpeed,inertia,resolveContactSpeed,resolveStaticContactSpeed,footprint} from '../src/game/contact';
import {planOpponent} from '../src/game/opponents';
const tracks=[new Track('coast'),new Track('city')];
function race(track=tracks[0],car=CARS[0]){const s=new RaceSimulation({track,car,mode:'time',difficulty:'rookie',upgrade:0});s.status='racing';s.player.distance=120;return s;}

for(const track of tracks)for(const car of CARS)for(const side of [-1,1])it(`${car.id} on ${track.id}: ${side<0?'left':'right'} corner impact turns the body away from the wall`,()=>{
 const s=race(track,car),d=s.player;d.heading=-side*.55;d.speed=40;d.lateral=side*(s.roadClearance(d)+.02);
 const worldYaw=track.sample(d.distance).yaw+d.heading;s.constrainToRoad(d,1/120);
 expect(d.impactYaw*side).toBeGreaterThan(.2);
 for(let i=0;i<60;i++)s.step(1/60,{...NO_INPUT,throttle:1});
 const turn=angleDelta(worldYaw,track.sample(d.distance).yaw+d.heading);
 expect(turn*side).toBeGreaterThan(.15);expect(d.speed).toBeGreaterThan(8);
 expect(Math.abs(d.lateral)).toBeLessThanOrEqual(s.roadClearance(d)+1e-6);
});
it('holding nitro while pointing into a wall does not spend fuel on wall riding',()=>{
 const s=race(),d=s.player;d.heading=-.65;d.speed=12;d.lateral=s.roadClearance(d);d.nitro=70;
 s.step(1/120,{...NO_INPUT,throttle:1,nitro:true});
 expect(d.boost).toBe(0);expect(d.nitro).toBeGreaterThanOrEqual(70);
});
it('finishing the race clears lateral movement and residual collision spin',()=>{
 const s=race(),d=s.player;d.distance=s.track.length-.05;d.lateral=0;d.speed=20;d.sideSpeed=8;d.impactYaw=.8;
 s.step(1/60,NO_INPUT);expect(s.status).toBe('finished');expect(velocity(d)).toEqual({x:0,z:0});expect(d.impactYaw).toBe(0);
});
const energy=(d:RaceSimulation['player'])=>d.speed*d.speed+d.sideSpeed*d.sideSpeed+inertia(d)*d.impactYaw*d.impactYaw;
it('wall impulses dissipate total linear and angular energy across impact angles and speeds',()=>{
 for(const side of [-1,1])for(const angle of [.03,.3,.8,Math.PI/2,2.4])for(const speed of [3,30,100])for(const spin of [-2,0,2]){
  const s=race(),d=s.player;d.heading=-side*angle;d.speed=speed;d.impactYaw=spin;const before=energy(d);
  resolveStaticContactSpeed(d,{x:-side,z:0});expect(energy(d)).toBeLessThanOrEqual(before+1e-8);expect(Math.abs(d.impactYaw)).toBeLessThanOrEqual(3);
 }
});
it('a centered head-on wall impact stops without inventing a spin; reverse frees the car',()=>{
 const s=race(),d=s.player;d.heading=-Math.PI/2;d.speed=45;d.lateral=s.roadClearance(d)+.01;s.constrainToRoad(d,1/120);
 expect(groundSpeed(d)).toBeLessThan(.01);expect(Math.abs(d.impactYaw)).toBeLessThan(.001);const before=d.lateral;
 for(let i=0;i<100;i++)s.step(1/60,{...NO_INPUT,brake:1});
 expect(d.lateral).toBeLessThan(before-4);expect(d.speed).toBeLessThan(-5);
});
for(const side of [-1,1])it(`steering away from wall ${side} stays responsive after impact`,()=>{
 const s=race(),d=s.player;d.heading=-side*.5;d.speed=35;d.lateral=side*s.roadClearance(d);const before=Math.abs(d.lateral);
 for(let i=0;i<55;i++)s.step(1/60,{...NO_INPUT,throttle:1,steer:-side*.6});
 expect(Math.abs(d.lateral)).toBeLessThan(before-1);expect(groundSpeed(d)).toBeGreaterThan(10);
});
it('an off-center car strike rotates the bodies and cannot create collision energy',()=>{
 const s=race(),a=s.player,b={...a,id:1,speed:15,distance:124,lateral:1};a.speed=45;a.lateral=0;
 const before=energy(a)+energy(b);resolveContactSpeed(a,b,{x:0,z:-1,dz:-4});
 expect(Math.abs(a.impactYaw)+Math.abs(b.impactYaw)).toBeGreaterThan(.1);
 expect(energy(a)+energy(b)).toBeLessThanOrEqual(before+1e-8);
});
it('impact rotation preserves momentum direction before tire grip acts',()=>{
 const s=race(),d=s.player;d.lateral=0;d.speed=0;d.sideSpeed=15;d.heading=.6;
 const before=velocity(d);d.heading+=.7;setVelocity(d,before);
 expect(velocity(d).x).toBeCloseTo(before.x,10);expect(velocity(d).z).toBeCloseTo(before.z,10);expect(groundSpeed(d)).toBeCloseTo(15,10);
});
it('reprojection at rest cannot accidentally select reverse through rounding noise',()=>{
 const s=race(),d=s.player;d.heading=.713;d.slipAngle=.07;setVelocity(d,{x:1e-18,z:-1e-18});
 expect(d.speed).toBe(0);expect(d.sideSpeed).toBe(0);s.step(.1,{...NO_INPUT,brake:1});expect(d.speed).toBe(0);
});
it('ground speed includes sideways slide and recovery cancels collision spin',()=>{
 const s=race(),d=s.player;d.speed=0;d.sideSpeed=12;d.impactYaw=2;
 expect(groundSpeed(d)).toBe(12);s.recover();expect(d.impactYaw).toBe(0);expect(groundSpeed(d)).toBe(0);
});
it('rivals see a stopped car beyond the old lookahead and brake within their stopping envelope',()=>{
 const s=race(),d={...s.player,id:1,distance:100,lateral:0,speed:70,targetLane:0},stopped={...s.player,distance:150,lateral:0,speed:0};
 const plan=planOpponent(d,[d,stopped],s.track);expect(plan.lane).not.toBe(0);expect(plan.speedLimit).toBeLessThan(60);
 s.drivers=[stopped,d];const input=s.aiInput(d);expect(input.brake).toBeGreaterThan(0);
});
it('rotated stopped cars occupy their whole lateral footprint in opponent planning',()=>{
 const s=race(),d={...s.player,id:1,distance:100,lateral:0,speed:40,targetLane:0},stopped={...s.player,distance:115,lateral:3.3,heading:Math.PI/2,speed:0};
 expect(footprint(stopped).length).toBeGreaterThan(2);expect(planOpponent(d,[d,stopped],s.track).speedLimit).toBeLessThan(30);
});
it('wall response remains consistent at 30, 60 and 120 Hz',()=>{
 const results=[30,60,120].map(hz=>{const s=race(),d=s.player;d.heading=-.5;d.speed=40;d.lateral=s.roadClearance(d);for(let i=0;i<hz;i++)s.step(1/hz,{...NO_INPUT,throttle:1});return [d.distance,d.lateral,d.heading,d.speed,d.sideSpeed,d.impactYaw];});
 for(const result of results.slice(1))result.forEach((value,i)=>expect(value).toBeCloseTo(results[0][i],7));
});
it('an angled car already stopped against a wall can move under throttle without remaining frozen',()=>{
 for(const side of [-1,1]){
  const s=race(),d=s.player;d.heading=-side*.55;d.speed=0;d.lateral=side*s.roadClearance(d);
  const yaw=s.track.sample(d.distance).yaw+d.heading;
  for(let i=0;i<90;i++)s.step(1/60,{...NO_INPUT,throttle:1});
  expect(angleDelta(yaw,s.track.sample(d.distance).yaw+d.heading)*side).toBeGreaterThan(.12);
  expect(groundSpeed(d)).toBeGreaterThan(3);expect(Math.abs(d.lateral)).toBeLessThanOrEqual(s.roadClearance(d)+1e-6);
 }
});
