import {it,expect} from 'vitest';
import {Scene,Vector3,Matrix4} from 'three';
import {Effects} from '../src/game/effects';
import {RaceSimulation} from '../src/game/simulation';
import {CARS} from '../src/game/content';
import {Track} from '../src/game/track';
function driver(){return new RaceSimulation({track:new Track('coast'),car:CARS[0],mode:'time',difficulty:'rookie',upgrade:0}).player;}
it('lays tire marks at 20 m/s and 60 Hz by accumulating distance between stamps',()=>{
  const fx=new Effects(new Scene()),d=driver();d.drift=.6;d.speed=20;
  for(let i=0;i<60;i++)fx.update(1/60,d,new Vector3(0,2,i/3),0);
  expect(fx.skidCursor).toBeGreaterThan(40);expect(fx.skidCursor).toBeLessThan(70);fx.dispose();
});
it('places paired marks on the pitched road and stops stamping while airborne',()=>{
  const fx=new Effects(new Scene()),d=driver();d.drift=.6;d.speed=20;const pitch=.2;
  fx.update(1/60,d,new Vector3(0,10,0),0,pitch);const matrix=new Matrix4();fx.skids.getMatrixAt(0,matrix);
  expect(matrix.elements[13]).toBeCloseTo(10+.06*Math.cos(pitch)+1.4*Math.sin(pitch),4);
  d.airborne=2;fx.update(1/60,d,new Vector3(0,12,10),0);expect(fx.skidCursor).toBe(2);fx.dispose();
});
it('keeps sideways drift stamps coplanar with a sloping road',()=>{
  const fx=new Effects(new Scene()),d=driver();d.drift=1;d.speed=25;const normal=new Vector3(0,1,-.2).normalize(),center=new Vector3(0,10,0);
  fx.update(1/60,d,center,Math.PI/2,0,normal);const matrix=new Matrix4();fx.skids.getMatrixAt(0,matrix);const stamp=new Vector3().setFromMatrixPosition(matrix),stampNormal=new Vector3(0,0,1).transformDirection(matrix);
  expect(stampNormal.dot(normal)).toBeCloseTo(1,5);expect(stamp.sub(center).dot(normal)).toBeCloseTo(.06,5);fx.dispose();
});
