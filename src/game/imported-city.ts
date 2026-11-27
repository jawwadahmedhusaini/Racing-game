import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {publicUrl} from './urls';
import {abortable} from './preparation';
import {spatialMesh} from './batching';
import type {Track} from './track';
import type {RoadSpace} from './road-space';

// One shared source pack, requested only when preparing Neon Harbor. World instances own
// their merged geometry/materials; the source textures remain cached across races.
let source:Promise<THREE.Group>|undefined;
export async function addImportedCity(scene:THREE.Scene,track:Track,space:RoadSpace,signal?:AbortSignal){
  source??=new GLTFLoader().loadAsync(publicUrl('assets/harbor-architecture.glb')).then(g=>{g.scene.updateMatrixWorld(true);return g.scene;}).catch(error=>{source=undefined;throw error;});
  const template=await (signal?abortable(source,signal):source),names=['Harbor_Arcade','Crown_Tower','Terrace_House','Spire_Tower'];
  const buckets=new Map<THREE.Material,{material:THREE.Material;parts:THREE.BufferGeometry[]}>();let placed=0;
  for(let distance=20,index=0;distance<track.length;distance+=125,index++)for(const side of [-1,1]){
    const building=template.getObjectByName(names[index%names.length])!;
    const box=new THREE.Box3().setFromObject(building),size=box.getSize(new THREE.Vector3()),radius=Math.hypot(size.x,size.z)/2;
    const s=track.sample(distance),p=s.position.clone().addScaledVector(s.right,side*(radius+19));p.y=-2;
    if(p.x>185||p.z < -478||!space.reserve('imported-building',p.x,p.z,radius+1))continue;
    const transform=new THREE.Matrix4().compose(p,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),s.yaw),new THREE.Vector3(1,1,1));
    building.traverse(o=>{if(!(o instanceof THREE.Mesh))return;
      const original=o.material as THREE.Material,bucket=buckets.get(original)??{material:original.clone(),parts:[]};
      const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld).applyMatrix4(transform);
      bucket.parts.push(geometry.index?geometry.toNonIndexed():geometry);if(geometry.index)geometry.dispose();buckets.set(original,bucket);
    });placed++;
  }
  for(const {material,parts} of buckets.values()){
    const geometry=mergeGeometries(parts);parts.forEach(p=>p.dispose());
    if(geometry){const group=spatialMesh(geometry,material,true,100);group.name='imported-architecture';scene.add(group);}else material.dispose();
  }
  scene.userData.importedBuildings=placed;
}
