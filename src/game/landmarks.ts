import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {Track} from './track';
import {signTexture,tiled} from './materials';
import {spatialMesh} from './batching';

// Original, circuit-specific architecture. Merge by material and spatial cell;
// these landmarks add no dynamic lights or per-frame animation work.
export function addLandmarks(scene:THREE.Scene,track:Track,height:(x:number,z:number)=>number){
  const groups=new Map<THREE.Material,THREE.BufferGeometry[]>();
  const stone=new THREE.MeshStandardMaterial({color:'#b5b09d',map:tiled('ground-color.png',2),roughness:.87});
  const white=new THREE.MeshStandardMaterial({color:'#e7e0cb',roughness:.62});
  const metal=new THREE.MeshStandardMaterial({color:'#34424a',metalness:.65,roughness:.32});
  const red=new THREE.MeshStandardMaterial({color:'#a64b39',roughness:.48});
  const glass=new THREE.MeshStandardMaterial({color:'#214958',metalness:.65,roughness:.16,emissive:'#8dc6d3',emissiveIntensity:track.id==='city'?.22:.05});
  const amber=new THREE.MeshStandardMaterial({color:'#ffe5a6',emissive:'#ffc97c',emissiveIntensity:2});
  const add=(geo:THREE.BufferGeometry,material:THREE.Material,position:THREE.Vector3,yaw=0)=>{geo.rotateY(yaw);geo.translate(position.x,position.y,position.z);const list=groups.get(material)??[];list.push(geo.index?geo.toNonIndexed():geo);if(geo.index)geo.dispose();groups.set(material,list);};
  const block=(center:THREE.Vector3,x:number,y:number,z:number,w:number,h:number,d:number,mat:THREE.Material,yaw=0)=>add(new THREE.BoxGeometry(w,h,d),mat,new THREE.Vector3(x,y,z).applyAxisAngle(new THREE.Vector3(0,1,0),yaw).add(center),yaw);
  if(track.id==='coast'){
    const s=track.sample(track.length*.87),base=s.position.clone().addScaledVector(s.right,-38);base.y=height(base.x,base.z);
    // A raised stone outcrop also supports the tower where the coast meets water.
    base.y=Math.max(-1,base.y);
    add(new THREE.CylinderGeometry(9,14,base.y+12,12),stone,new THREE.Vector3(base.x,(base.y-12)/2,base.z));
    add(new THREE.CylinderGeometry(3.3,3.9,.7,32),stone,base.clone().add(new THREE.Vector3(0,.35,0)));
    add(new THREE.CylinderGeometry(1.8,2.5,21,32),white,base.clone().add(new THREE.Vector3(0,11,0)));
    for(const y of [6,13])add(new THREE.CylinderGeometry(2.5-y*.7/21,2.5-(y-1.2)*.7/21,1.2,32),red,base.clone().add(new THREE.Vector3(0,y,0)));
    for(const y of [5,10,15,19])block(base,0,y,2.5-y*.7/21,.5,1,.04,glass);
    add(new THREE.CylinderGeometry(2.65,2.65,.35,32),white,base.clone().add(new THREE.Vector3(0,21.6,0)));
    add(new THREE.CylinderGeometry(1.9,1.9,3,12),glass,base.clone().add(new THREE.Vector3(0,23.3,0)));
    add(new THREE.CylinderGeometry(1.91,1.91,.18,12),amber,base.clone().add(new THREE.Vector3(0,23.2,0)));
    add(new THREE.ConeGeometry(2.6,1.9,12),red,base.clone().add(new THREE.Vector3(0,25.7,0)));
    for(let i=0;i<16;i++){const a=i*Math.PI/8;add(new THREE.CylinderGeometry(.035,.035,1,6),metal,base.clone().add(new THREE.Vector3(Math.cos(a)*2.5,22.25,Math.sin(a)*2.5)));}
    const rail=new THREE.TorusGeometry(2.5,.045,6,48);rail.rotateX(Math.PI/2);add(rail,metal,base.clone().add(new THREE.Vector3(0,22.75,0)));
    const house=base.clone().add(new THREE.Vector3(7,0,-1));block(house,0,2,0,6,4,5,white);block(house,0,2,2.51,1.2,2.3,.06,metal);
    add(new THREE.ConeGeometry(4.7,2,4),red,house.clone().add(new THREE.Vector3(0,4.9,0)),Math.PI/4);
  }else{
    // Recognizable station canopies and lit street furniture beside the elevated circuit.
    for(const distance of [95,track.length*.42,track.length*.72]){
      const s=track.sample(distance),base=s.position.clone().addScaledVector(s.right,-17),yaw=s.yaw;
      block(base,0,-.3,0,10,.6,26,stone,yaw);
      for(const z of [-10,-5,0,5,10])for(const x of [-3.8,3.8])block(base,x,2.6,z,.12,5.2,.12,metal,yaw);
      block(base,0,5.3,0,9,.18,25,glass,yaw);block(base,0,5.5,0,9.3,.18,25.2,metal,yaw);
      for(const x of [-3.5,3.5])block(base,x,5.15,0,.08,.07,24,amber,yaw);
      for(const z of [-6,0,6]){block(base,-2,.8,z,1.1,.16,3.6,white,yaw);for(const dz of [-1.2,1.2])block(base,-2,.4,z+dz,.6,.8,.16,metal,yaw);block(base,-2.5,1.25,z,.12,.8,3.6,white,yaw);}
      const sign=new THREE.MeshStandardMaterial({map:signTexture('HARBOR / TRANSIT','#8cd6db','NIGHT LINE · PLATFORM 02'),emissive:'#ffffff',emissiveIntensity:.5,roughness:.6});
      block(base,0,4.2,-10,7,1,.15,sign,yaw);
    }
  }
  for(const [material,geos] of groups){const merged=mergeGeometries(geos)!;geos.forEach(g=>g.dispose());scene.add(spatialMesh(merged,material,true,80));}
}
