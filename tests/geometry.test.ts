import {it,expect} from 'vitest';
import {Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {wingGeometry} from '../src/game/aero';

for(const side of [1,-1])it(`the wing presents its outer surface to a camera ${side>0?'above':'below'} it`,()=>{
  const geometry=wingGeometry(2.08,.38),material=new MeshBasicMaterial(),mesh=new Mesh(geometry,material);mesh.updateMatrixWorld(true);
  const hits=new Raycaster(new Vector3(0,side,0),new Vector3(0,-side,0)).intersectObject(mesh);
  expect(hits.length).toBeGreaterThan(0);
  // A reversed shell lets the ray pass through the near side and hit the opposite inner wall.
  expect(hits[0].point.y*side).toBeGreaterThan(0);expect(hits[0].face!.normal.y*side).toBeGreaterThan(.9);
  geometry.dispose();material.dispose();
});
