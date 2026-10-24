import {it,expect} from 'vitest';
import {PlaneGeometry,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {HeightField} from '../src/game/heightfield';
it('scenery support heights match rendered triangles on both sides of every cell diagonal',()=>{
 const geo=new PlaneGeometry(30,24,5,4);geo.rotateX(-Math.PI/2);const p=geo.attributes.position,heights=new Float32Array(p.count);
 for(let i=0;i<p.count;i++){heights[i]=Math.sin(i*1.7)*7+i*.2;p.setY(i,heights[i]);}geo.computeVertexNormals();
 const field=new HeightField(-15,-12,30,24,5,4,heights),mesh=new Mesh(geo,new MeshBasicMaterial()),ray=new Raycaster();mesh.updateMatrixWorld();
 for(let x=-14.8;x<15;x+=1.3)for(let z=-11.8;z<12;z+=1.1){ray.set(new Vector3(x,100,z),new Vector3(0,-1,0));const hit=ray.intersectObject(mesh)[0];expect(hit).toBeDefined();expect(field.height(x,z)).toBeCloseTo(hit.point.y,5);}
 expect(field.height(-15,-12)).toBe(heights[0]);expect(field.height(15,12)).toBe(heights.at(-1));expect(field.height(16,0)).toBeUndefined();geo.dispose();mesh.material.dispose();
});
