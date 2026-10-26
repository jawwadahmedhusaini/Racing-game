import {describe,it,expect} from 'vitest';
import {PerspectiveCamera,Vector3} from 'three';
import {Track,angleDelta} from '../src/game/track';
import {CARS} from '../src/game/content';
import {RaceSimulation,NO_INPUT,type Controls} from '../src/game/simulation';
import {parseSave,freshSave,buyCar,upgradeCar} from '../src/game/storage';
const coast=new Track('coast');
const make=(mode:'quick'|'time'|'elimination'='quick')=>new RaceSimulation({track:coast,car:CARS[0],mode,difficulty:'rookie',upgrade:0});
const run=(sim:RaceSimulation,seconds:number,input:Partial<Controls>={},center=false)=>{for(let t=0;t<seconds;t+=1/60){const c={...NO_INPUT,...input};if(center)c.steer=sim.steeringFor(sim.player,0);sim.step(1/60,c);}};
const position=(sim:RaceSimulation)=>{const s=sim.track.sample(sim.player.distance);return s.position.addScaledVector(s.right,sim.player.lateral);};

describe('racing dynamics',()=>{
  it('keeps the grid stationary during the countdown',()=>{const sim=make();run(sim,2,{throttle:1,nitro:true});expect(sim.status).toBe('countdown');expect(sim.player.distance).toBeCloseTo(0);expect(sim.player.speed).toBe(0);});
  it('responds to acceleration, steering and braking',()=>{const sim=make('time');run(sim,8,{throttle:1},true);expect(sim.player.speed).toBeGreaterThan(35);sim.player.heading=0;sim.player.yawVelocity=0;const before=position(sim),right=sim.track.sample(sim.player.distance).right;run(sim,.4,{throttle:1,steer:1});expect(position(sim).sub(before).dot(right)).toBeGreaterThan(.2);const speed=sim.player.speed;run(sim,1,{brake:1});expect(sim.player.speed).toBeLessThan(speed-20);});
  for(const steer of [-1,1])it(`${steer<0?'left':'right'} steering moves toward the same side of a fixed chase camera`,()=>{
    const sim=make('time');run(sim,4);sim.player.distance=100;sim.player.lateral=0;sim.player.speed=30;
    const s=sim.track.sample(100),start=position(sim),camera=new PerspectiveCamera(60,16/9,.1,2000);
    camera.position.copy(start).addScaledVector(s.tangent,-14).add(new Vector3(0,5,0));camera.lookAt(start.clone().addScaledVector(s.tangent,20));camera.updateMatrixWorld();
    run(sim,.65,{throttle:1,steer});
    expect(position(sim).project(camera).x*steer).toBeGreaterThan(.01);
    const worldTurn=angleDelta(s.yaw,sim.track.sample(sim.player.distance).yaw+sim.player.heading);
    expect(worldTurn*steer).toBeLessThan(-.1);
  });
  it('forward input preserves world heading while the road bends',()=>{
    const sim=make('time');run(sim,4);sim.player.distance=170;sim.player.lateral=0;sim.player.speed=20;
    const before=sim.track.sample(sim.player.distance).yaw;
    run(sim,.7,{throttle:1});
    const after=sim.track.sample(sim.player.distance);
    expect(Math.abs(angleDelta(before,after.yaw))).toBeGreaterThan(.02);
    expect(Math.abs(angleDelta(before,after.yaw+sim.player.heading))).toBeLessThan(.0001);
    expect(Math.abs(sim.player.lateral)).toBeGreaterThan(.2);
  });
  it('throttle alone cannot auto-follow a lap through barriers',()=>{const sim=make('time');run(sim,90,{throttle:1});expect(sim.status).toBe('racing');expect(sim.player.distance).toBeLessThan(coast.length*.5);});
  it('rewards real drifting with nitro and records slip time',()=>{const sim=make('time');run(sim,7,{throttle:1},true);sim.player.nitro=30;run(sim,.4,{throttle:1,drift:true,steer:1});expect(sim.player.driftTotal).toBeGreaterThan(.35);expect(sim.player.nitro).toBeGreaterThan(35);expect(sim.player.drift).toBeGreaterThan(.5);});
  it('uses a full meter for shockwave and consumes it',()=>{const sim=make('time');run(sim,8,{throttle:1},true);sim.player.nitro=100;run(sim,.5,{throttle:1,nitro:true},true);expect(sim.player.boost).toBe(2);expect(sim.player.nitro).toBeLessThan(90);run(sim,.2,{throttle:1},true);expect(sim.player.boost).toBe(0);});
  it('activates held nitro after launching, without wasting fuel before speed is sufficient',()=>{
    const sim=make('time');run(sim,3.6);const fuel=sim.player.nitro;run(sim,.15,{throttle:1,nitro:true},true);expect(sim.player.speed).toBeLessThan(5);expect(sim.player.nitro).toBeGreaterThanOrEqual(fuel);
    run(sim,.5,{throttle:1,nitro:true},true);expect(sim.player.boost).toBe(1);expect(sim.player.nitro).toBeLessThan(fuel);
  });
  it('keeps an exhausted boost empty until released, then recharges normally',()=>{
    const sim=make('time');run(sim,7,{throttle:1},true);sim.player.nitro=.1;run(sim,.2,{throttle:1,nitro:true},true);expect(sim.player.nitro).toBe(0);expect(sim.player.boost).toBe(0);
    run(sim,1,{throttle:1,nitro:true},true);expect(sim.player.nitro).toBe(0);expect(sim.player.boost).toBe(0);run(sim,.5,{throttle:1},true);expect(sim.player.nitro).toBeGreaterThan(1);
  });
  it('barrier contact costs speed and recovery restores a usable line',()=>{const sim=make('time');run(sim,8,{throttle:1},true);const speed=sim.player.speed;sim.player.lateral=sim.roadClearance(sim.player);sim.player.heading=-Math.PI/3;sim.step(1/60,NO_INPUT);expect(sim.player.speed).toBeLessThan(speed*.8);expect(sim.player.lateral).toBeLessThan(coast.width/2);expect(sim.player.collision).toBeGreaterThan(0);sim.recover();expect(sim.player.lateral).toBe(0);expect(sim.player.heading).toBe(0);});
  it('separates cars on contact without NaN or leaving the road',()=>{const sim=make();run(sim,4);sim.drivers[0].distance=100;sim.drivers[1].distance=102;sim.drivers[0].lateral=sim.drivers[1].lateral=0;sim.step(1/60,NO_INPUT);expect(Math.abs(sim.drivers[0].lateral-sim.drivers[1].lateral)).toBeGreaterThan(1.8);expect(sim.drivers.every(d=>Number.isFinite(d.speed))).toBe(true);});
  for(const heading of [Math.PI/4,Math.PI/2,-Math.PI/2])it(`keeps the rotated body inside barriers at heading ${heading}`,()=>{
    const sim=make('time');run(sim,4);sim.player.lateral=8;sim.player.heading=heading;sim.step(1/60,NO_INPUT);
    const extent=Math.abs(Math.cos(sim.player.heading))*1.13+Math.abs(Math.sin(sim.player.heading))*2.3;
    expect(Math.abs(sim.player.lateral)+extent).toBeLessThanOrEqual(coast.width/2-.05);
  });
  it('keeps a car inside the barrier when another car pushes it outward',()=>{
    const sim=make();run(sim,4);sim.player.distance=100;sim.drivers[1].distance=100;sim.player.lateral=7.7;sim.drivers[1].lateral=7.6;
    sim.step(1/60,NO_INPUT);for(const d of sim.drivers)expect(Math.abs(d.lateral)).toBeLessThanOrEqual(sim.roadClearance(d)+1e-6);
  });
  it('launches from the marked ramp, lands, and awards nitro',()=>{const sim=make('time');run(sim,4);sim.player.distance=coast.length*.18+12.9;sim.player.rampLift=1.4;sim.player.lateral=5.5;sim.player.speed=40;sim.player.nitro=10;sim.step(1/60,{...NO_INPUT,throttle:1});expect(sim.player.airborne).toBeGreaterThan(0);expect(sim.player.jumpTotal).toBe(1);run(sim,3,{throttle:1},true);expect(sim.player.airborne).toBe(0);expect(sim.player.nitro).toBeGreaterThan(25);});
  it('runs a full two-lap race with physical AI opponents and valid results',()=>{const sim=make();run(sim,120,{throttle:1,nitro:true},true);expect(sim.status).toBe('finished');expect(sim.resultPosition).toBeGreaterThanOrEqual(1);expect(sim.resultPosition).toBeLessThanOrEqual(7);expect(sim.player.distance).toBeGreaterThanOrEqual(coast.length*2);expect(sim.player.finishTime).toBeGreaterThan(20);expect(sim.drivers.slice(1).every(d=>d.distance>coast.length*.5)).toBe(true);const time=sim.elapsed;run(sim,1,{throttle:1});expect(sim.elapsed).toBe(time);});
  for(const id of ['coast','city'] as const)it(`all rivals steer and finish both laps of ${id} while an idle player cannot make meaningful race progress`,()=>{
    const sim=new RaceSimulation({track:new Track(id),car:CARS[0],mode:'quick',difficulty:'pro',upgrade:0});
    run(sim,250);
    expect(sim.drivers.slice(1).every(d=>d.finishTime!==null&&d.distance>=sim.track.length*2)).toBe(true);
    expect(sim.player.distance).toBeLessThan(sim.track.length*.02); // Minor displacement from actual rival contact remains possible.
    expect(sim.player.speed).toBe(0);
  });
  it('completes a solo time attack on a different circuit',()=>{const sim=new RaceSimulation({track:new Track('city'),car:CARS[1],mode:'time',difficulty:'pro',upgrade:1});run(sim,90,{throttle:1,nitro:true},true);expect(sim.drivers).toHaveLength(1);expect(sim.laps).toBe(1);expect(sim.status).toBe('finished');expect(sim.resultPosition).toBe(1);});
  it('eliminates an idle last-place player on schedule',()=>{const sim=make('elimination');run(sim,33);expect(sim.player.eliminated).toBe(true);expect(sim.status).toBe('finished');expect(sim.resultPosition).toBe(7);});
  it('is repeatable with the same inputs and fixed timestep',()=>{const a=make(),b=make();run(a,12,{throttle:1},true);run(b,12,{throttle:1},true);expect(a.drivers).toEqual(b.drivers);});
});

describe('track geometry and progress',()=>{
  for(const id of ['coast','city'] as const)it(`${id} has a continuous closed road and finite curvature`,()=>{const track=new Track(id);expect(track.length).toBeGreaterThan(1500);const a=track.sample(0),b=track.sample(track.length-.01);expect(a.position.distanceTo(b.position)).toBeLessThan(.02);expect(Math.abs(angleDelta(a.yaw,b.yaw))).toBeLessThan(.01);expect(track.samples.every(s=>Number.isFinite(s.curvature)&&s.position.y>0)).toBe(true);expect(track.sample(-5).position.distanceTo(track.sample(track.length-5).position)).toBeLessThan(.001);});
});

describe('saved progress and economy',()=>{
  it('recovers corrupt or malformed saves without poisoning gameplay',()=>{expect(parseSave('{oops')).toEqual(freshSave());const data=parseSave(JSON.stringify({version:1,credits:-300,owned:['fake','spectre'],selected:'fake',career:999,paints:{vanta:'javascript:bad'},upgrades:{vanta:88},settings:{quality:'unknown',engine:99}}));expect(data.credits).toBe(2500);expect(data.owned).toEqual(['vanta','spectre']);expect(data.selected).toBe('vanta');expect(data.career).toBe(4);expect(data.paints).toEqual({});expect(data.upgrades).toEqual({});expect(data.settings.engine).toBe(1);});
  it('requires credits to unlock and never charges twice',()=>{const data=freshSave();expect(buyCar(data,'spectre')).toBe(false);data.credits=7000;expect(buyCar(data,'spectre')).toBe(true);expect(data.credits).toBe(1000);expect(data.selected).toBe('spectre');expect(buyCar(data,'spectre')).toBe(false);expect(data.credits).toBe(1000);});
  it('charges for each upgrade and caps it at stage three',()=>{const data=freshSave();data.credits=20000;expect(upgradeCar(data,'spectre')).toBe(false);expect(upgradeCar(data,'vanta')).toBe(true);expect(upgradeCar(data,'vanta')).toBe(true);expect(upgradeCar(data,'vanta')).toBe(true);expect(data.credits).toBe(9200);expect(upgradeCar(data,'vanta')).toBe(false);expect(data.upgrades.vanta).toBe(3);expect(parseSave(JSON.stringify(data))).toEqual(data);});
});
