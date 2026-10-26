import {it,expect} from 'vitest';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {Box3,Vector3,Mesh} from 'three';import {parseSave,freshSave,buyCar} from '../src/game/storage';
const metadata=JSON.parse(readFileSync('public/licenses/bmw-m3.json','utf8'));
for(const asset of metadata.assets)it(`${asset.file} has independent geometry, correct axes, wheel pivots and safe collision dimensions`,async()=>{
 const original=readFileSync('public/'+asset.file);expect(createHash('sha256').update(original).digest('hex')).toBe(asset.sha256);
 const length=original.readUInt32LE(12),json=JSON.parse(original.toString('utf8',20,20+length));expect(json.images.every((i:any)=>!i.uri)).toBe(true);
 // Geometry-only Node test. Texture decoding/material appearance is checked in Chromium.
 delete json.materials;delete json.images;delete json.textures;delete json.samplers;for(const m of json.meshes)for(const p of m.primitives)delete p.material;
 let text=JSON.stringify(json);while(text.length%4)text+=' ';const bytes=Buffer.concat([original.subarray(0,20),Buffer.from(text),original.subarray(20+length)]);bytes.writeUInt32LE(bytes.length,8);bytes.writeUInt32LE(text.length,12);
 const model=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');model.scene.updateMatrixWorld(true);const bounds=new Box3().setFromObject(model.scene),size=bounds.getSize(new Vector3());
 expect(size.x).toBeLessThan(2.2);expect(size.x).toBeGreaterThan(1.9);expect(size.z).toBeLessThan(4.96);expect(size.z).toBeGreaterThan(4.5);expect(bounds.min.y).toBeGreaterThan(0);expect(size.y).toBeGreaterThan(1.3);
 for(const axle of ['Front','Rear'])for(const side of ['L','R']){const wheel=model.scene.getObjectByName(`Wheel${axle}${side}`)!;expect(wheel).toBeDefined();const pos=wheel.getWorldPosition(new Vector3());expect(pos.y).toBeCloseTo(.389);expect(Math.abs(pos.x)).toBeCloseTo(.84);expect(pos.z*(axle==='Front'?1:-1)).toBeGreaterThan(1.2);expect(wheel.children.some(o=>o.name.includes('BrakePad'))).toBe(true);}
 let triangles=0;model.scene.traverse(o=>{if(o instanceof Mesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});expect(triangles).toBe(asset.triangles);expect(triangles).toBeLessThan(35000);
});
it('BMW unlock and paint survive save migration without losing existing cars or records',()=>{const s=freshSave();s.bestTimes={'coast-v4-time':85,'coast-v5-time':87};s.paints['bmw-m3']='#ff552b';expect(buyCar(s,'bmw-m3')).toBe(true);expect(s.credits).toBe(300);expect(parseSave(JSON.stringify(s))).toEqual(s);});
