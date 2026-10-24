import {it,expect} from 'vitest';
import {Mesh,MeshBasicMaterial,Raycaster,Vector3,DoubleSide} from 'three';
import {Track} from '../src/game/track';
import {RaceSimulation,NO_INPUT} from '../src/game/simulation';
import {RAMP,rampHeight,rampGeometry} from '../src/game/ramp';
import {CARS} from '../src/game/content';
for(const id of ['coast','city'] as const)it(`${id} ramp mesh matches the physical surface along its full length`,()=>{
 const track=new Track(id),mesh=new Mesh(rampGeometry(track),new MeshBasicMaterial({side:DoubleSide})),ray=new Raycaster();mesh.updateMatrixWorld();
 for(let offset=.5;offset<13;offset+=.5){const distance=track.length*.18+offset,s=track.sample(distance);for(const lateral of [3.2,5.5,7.8]){const p=s.position.clone().addScaledVector(s.right,lateral);ray.set(new Vector3(p.x,p.y+5,p.z),new Vector3(0,-1,0));const hit=ray.intersectObject(mesh)[0];expect(hit).toBeDefined();expect(Math.abs(hit.point.y-p.y-rampHeight(track,distance,lateral))).toBeLessThan(.015);}}
 mesh.geometry.dispose();(mesh.material as MeshBasicMaterial).dispose();
});
function race(){const sim=new RaceSimulation({track:new Track('coast'),car:CARS[0],mode:'time',difficulty:'rookie',upgrade:0});sim.status='racing';sim.player.lateral=5.5;sim.player.distance=sim.track.length*RAMP.fraction-1;return sim;}
it('a slow car drives up the ramp instead of passing through it, then drops without a jump reward',()=>{
 const sim=race();let highest=0;for(let i=0;i<240;i++){sim.player.speed=5;sim.step(1/60,{...NO_INPUT,steer:sim.steeringFor(sim.player,5.5)});highest=Math.max(highest,sim.player.rampLift);}
 expect(highest).toBeGreaterThan(1.3);expect(sim.player.distance).toBeGreaterThan(sim.track.length*.18+13);expect(sim.player.jumpTotal).toBe(0);expect(sim.player.jumpRewardPending).toBe(false);expect(sim.player.airborne).toBe(0);
});
it('the raised back of the ramp stops a reversing car',()=>{
 const sim=race(),lip=sim.track.length*.18+13;sim.player.distance=lip+2.4;sim.player.speed=-10;sim.step(1/60,{...NO_INPUT,brake:1});expect(sim.player.distance).toBeGreaterThan(lip+2.3);expect(sim.player.rampLift).toBe(0);expect(sim.player.collision).toBeGreaterThan(0);expect(Math.abs(sim.player.speed)).toBeLessThan(4);
});
it('a fast car launches at the lip and recovery cancels an unearned landing bonus',()=>{
 const sim=race();sim.player.distance=sim.track.length*.18+12.9;sim.player.rampLift=1.43;sim.player.speed=40;sim.step(1/60,{...NO_INPUT,throttle:1});expect(sim.player.airborne).toBeGreaterThan(1.4);expect(sim.player.verticalSpeed).toBeGreaterThan(8);expect(sim.player.jumpTotal).toBe(1);sim.recover();expect(sim.player.jumpRewardPending).toBe(false);expect(sim.player.rampLift).toBe(0);expect(sim.player.airborne).toBe(0);
});
