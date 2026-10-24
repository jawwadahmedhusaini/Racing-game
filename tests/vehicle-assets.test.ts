import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Box3,Vector3,Mesh,Raycaster} from 'three';
const metadata=JSON.parse(readFileSync('public/licenses/solstice.json','utf8'));
for(const asset of metadata.assets)it(`${asset.file} loads with the documented hash, working wheel pivots and collision-safe bounds`,async()=>{
 const bytes=readFileSync(`public/${asset.file}`);expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);
 const model=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');model.scene.updateMatrixWorld(true);
 const bounds=new Box3().setFromObject(model.scene),dimensions=bounds.getSize(new Vector3());
 expect(dimensions.x).toBeLessThanOrEqual(2.48);expect(dimensions.z).toBeLessThanOrEqual(4.96);expect(bounds.min.y).toBeGreaterThan(-.01);expect(dimensions.y).toBeGreaterThan(1.2);
 for(const axle of ['Front','Rear'])for(const side of ['L','R']){const wheel=model.scene.getObjectByName(`Wheel${axle}${side}`);expect(wheel).toBeDefined();const p=wheel!.getWorldPosition(new Vector3());expect(p.y).toBeCloseTo(.395);expect(Math.abs(p.x)).toBeCloseTo(.952);expect(p.z*(axle==='Front'?1:-1)).toBeGreaterThan(1.2);}
 let triangles=0;model.scene.traverse(o=>{if(o instanceof Mesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;for(const value of o.geometry.attributes.normal.array)expect(Number.isFinite(value)).toBe(true);}});
 expect(triangles).toBe(asset.triangles);expect(triangles).toBeLessThan(asset.file.includes('lod')?26000:75000);
});

for(const asset of metadata.assets)it(`${asset.file} exposes both reverse lamps outside the rear bodywork`,async()=>{
 const data=readFileSync(`public/${asset.file}`);const model=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');model.scene.updateMatrixWorld(true);
 for(const side of [-1,1]){const ray=new Raycaster(new Vector3(side*.28,.49,-6),new Vector3(0,0,1));const hit=ray.intersectObject(model.scene,true)[0];expect((hit.object as Mesh).material).toHaveProperty('name','Reverse');}
});
