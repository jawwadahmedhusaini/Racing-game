import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Box3,Vector3,Mesh} from 'three';
import {CARS} from '../src/game/content';
import {parseSave,freshSave,buyCar} from '../src/game/storage';
import {vehicleAssetKey} from '../src/game/car';
import {engineBank} from '../src/game/engine-voice';
const manifest=JSON.parse(readFileSync('public/licenses/imported-art.json','utf8'));
for(const asset of manifest.assets)it(`${asset.file} has verified content and usable geometry`,async()=>{
 const original=readFileSync('public/'+asset.file);expect(createHash('sha256').update(original).digest('hex')).toBe(asset.sha256);
 const n=original.readUInt32LE(12),json=JSON.parse(original.toString('utf8',20,20+n));expect(json.images.every((i:any)=>!i.uri)).toBe(true);
 const names=json.materials.map((m:any)=>m.name);if(asset.file.includes('lf-'))for(const name of ['Headlight','Brakelight','Glass','Paint 1 LF'])expect(names).toContain(name);
 delete json.materials;delete json.images;delete json.textures;delete json.samplers;for(const m of json.meshes)for(const p of m.primitives)delete p.material;
 let text=JSON.stringify(json);while(text.length%4)text+=' ';const data=Buffer.concat([original.subarray(0,20),Buffer.from(text),original.subarray(20+n)]);data.writeUInt32LE(data.length,8);data.writeUInt32LE(text.length,12);
 const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.length),'');gltf.scene.updateMatrixWorld(true);
 let triangles=0;gltf.scene.traverse(o=>{if(o instanceof Mesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});expect(triangles).toBe(asset.triangles);
 if(asset.file.includes('lf-')){
  const spec=CARS.find(c=>c.id==='lf-gt')!,box=new Box3().setFromObject(gltf.scene);
  expect(Math.max(Math.abs(box.min.x),Math.abs(box.max.x))).toBeLessThanOrEqual(spec.collision!.halfWidth);expect(Math.max(Math.abs(box.min.z),Math.abs(box.max.z))).toBeLessThanOrEqual(spec.collision!.halfLength);expect(box.min.y).toBeGreaterThan(-.002);
  expect(box.max.y).toBeGreaterThan(1.2);expect(triangles).toBeLessThan(asset.file.includes('lod')?35000:95000);
  for(const axle of ['Front','Rear'])for(const side of ['L','R']){const wheel=gltf.scene.getObjectByName('Wheel'+axle+side)!;expect(wheel).toBeDefined();const p=wheel.getWorldPosition(new Vector3());expect(p.y).toBeCloseTo(.36);expect(p.z).toBeCloseTo(axle==='Front'?1.58:-1.30,2);expect(p.z*(axle==='Front'?1:-1)).toBeGreaterThan(1);expect(p.x*(side==='L'?-1:1)).toBeGreaterThan(.9);}
 }else{
  for(const name of ['Harbor_Arcade','Crown_Tower','Terrace_House','Spire_Tower']){const building=gltf.scene.getObjectByName(name)!;expect(building).toBeDefined();const box=new Box3().setFromObject(building);expect(Math.abs(box.min.y)).toBeLessThan(.01);expect(box.max.y).toBeGreaterThan(25);}
  expect(triangles).toBeLessThan(50000);
 }
});
it('LF purchase preserves previous cars and records, selects its own LOD and V12 bank',()=>{
 const save=freshSave();save.credits=5000;save.bestTimes={'city-v7-time':90};expect(buyCar(save,'lf-gt')).toBe(true);expect(save.owned).toEqual(['orion-r','lf-gt']);expect(save.credits).toBe(500);expect(parseSave(JSON.stringify(save))).toEqual(save);
 const spec=CARS.find(c=>c.id==='lf-gt')!;expect(vehicleAssetKey(spec,true)).toBe('lf-gt-lod.glb');expect(vehicleAssetKey(spec)).toBe('lf-gt.glb');expect(engineBank(spec.id)).toBe('v12d');
});
