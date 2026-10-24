import {it,expect} from 'vitest';
import {PerspectiveCamera,Vector3} from 'three';
import {RaceCamera} from '../src/game/camera';
import {RaceSimulation} from '../src/game/simulation';
import {Track} from '../src/game/track';
import {CARS} from '../src/game/content';
const track=new Track('coast');
function setup(){return {director:new RaceCamera(),camera:new PerspectiveCamera(55,16/9,.1,3500),driver:new RaceSimulation({track,car:CARS[0],mode:'time',difficulty:'rookie',upgrade:0}).player};}
const position=(distance:number,lateral=0)=>{const s=track.sample(distance);return s.position.addScaledVector(s.right,lateral);};
it('camera changes never modify physics, and moving displacement does not accumulate when paused',()=>{
 const {director,camera,driver}=setup();driver.distance=150;driver.speed=70;const before=JSON.stringify(driver),p=position(150);for(let i=0;i<600;i++)director.update(camera,track,driver,p,1/60,i/60,0,false);const after=camera.position.clone();for(let i=0;i<300;i++)director.update(camera,track,driver,p,1/60,i/60,0,false);
 expect(camera.position.distanceTo(after)).toBeLessThan(.001);expect(JSON.stringify(driver)).toBe(before);expect(camera.position.distanceTo(p)).toBeLessThan(13);
});
it('reduced motion removes nitro field-of-view surges, roll and camera shake',()=>{
 const a=setup(),b=setup();a.driver.boost=2;a.driver.collision=.5;a.driver.drift=.8;a.driver.speed=60;Object.assign(b.driver,a.driver);
 for(let i=0;i<180;i++){a.director.update(a.camera,track,a.driver,position(0),1/60,i/60,0,true,true);b.director.update(b.camera,track,b.driver,position(0),1/60,i/60,0,true,false);}
 expect(a.camera.fov).toBeCloseTo(58,2);expect(a.director.roll).toBe(0);expect(b.camera.fov).toBeGreaterThan(68);expect(Math.abs(b.director.roll)).toBeGreaterThan(.005);
});
it('keeps the lens above the road and inside the safe corridor through every bend and reverse view',()=>{
 const {director,camera,driver}=setup();for(const reverse of [false,true])for(let d=0;d<track.length;d+=7){driver.distance=d;driver.speed=reverse?-10:50;driver.lateral=7;driver.heading=.6;
 director.update(camera,track,driver,position(d,7),1/60,d,0,true);
 const distance=(reverse?11:7.4)+Math.abs(driver.speed)*.009,behind=track.sample(d-distance*Math.cos(driver.heading));
 expect(camera.position.y).toBeGreaterThanOrEqual(behind.position.y+1.09);expect(Math.abs(camera.position.clone().sub(behind.position).dot(behind.right))).toBeLessThanOrEqual(track.width/2-.89);
 }
});
it('compresses after landing then settles, and recovers cleanly after a distant reset',()=>{
 const {director,camera,driver}=setup();driver.landingImpact=1;director.update(camera,track,driver,position(0),.1,0,0,true);expect(director.compression).toBeGreaterThan(.5);
 driver.landingImpact=0;for(let i=0;i<120;i++)director.update(camera,track,driver,position(0),1/60,i/60,0,true);expect(director.compression).toBeLessThan(.001);
 driver.distance=1000;director.reset();director.update(camera,track,driver,position(1000),1/60,3,0,true);expect(camera.position.distanceTo(position(1000))).toBeLessThan(13);expect(new Vector3().copy(camera.position).length()).toBeGreaterThan(0);
});
