import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {spatialMesh} from './batching';
import {signTexture} from './materials';
import type {Track} from './track';
import type {RoadSpace} from './road-space';

/** Static circuit dressing, batched by material; no extra lights or frame work. */
export function addCircuitDetail(scene:THREE.Scene,track:Track,space:RoadSpace,height:(x:number,z:number)=>number){
  const batches=new Map<THREE.Material,THREE.BufferGeometry[]>(),up=new THREE.Vector3(0,1,0);
  const steel=new THREE.MeshStandardMaterial({color:'#455057',metalness:.6,roughness:.4});
  const cream=new THREE.MeshStandardMaterial({color:'#e3dac3',roughness:.83});
  const wood=new THREE.MeshStandardMaterial({color:'#886249',roughness:.85});
  const amber=new THREE.MeshStandardMaterial({color:'#d67d49',roughness:.65});
  const navy=new THREE.MeshStandardMaterial({color:'#29424d',roughness:.83});
  const skin=new THREE.MeshStandardMaterial({color:'#b48c70',roughness:.95});
  const add=(geometry:THREE.BufferGeometry,material:THREE.Material,position:THREE.Vector3,yaw=0)=>{
    geometry.rotateY(yaw).translate(position.x,position.y,position.z);const list=batches.get(material)??[];list.push(geometry.index?geometry.toNonIndexed():geometry);if(geometry.index)geometry.dispose();batches.set(material,list);
  };
  const block=(base:THREE.Vector3,yaw:number,x:number,y:number,z:number,w:number,h:number,d:number,mat:THREE.Material)=>add(new THREE.BoxGeometry(w,h,d),mat,new THREE.Vector3(x,y,z).applyAxisAngle(up,yaw).add(base),yaw);
  // Brake-distance references teach the route instead of relying on a wall hit.
  const used:number[]=[];
  for(let d=90;d<track.length-100;d+=18){
    if(Math.abs(track.sample(d).curvature)<.012||used.some(v=>Math.abs(d-v)<180))continue;used.push(d);
    for(const before of [100,50]){
      const s=track.sample(d-before),p=s.position.clone().addScaledVector(s.right,12);
      if(!space.place('braking-board',p.x,p.z,.65))continue;
      const mat=new THREE.MeshStandardMaterial({map:signTexture(String(before),track.id==='coast'?'#f0cf96':'#a5dce8','BRAKE'),roughness:.7,emissive:'#ffffff',emissiveIntensity:track.id==='city'?.3:0});
      block(p,s.yaw,0,1.3,0,.065,2.6,.065,steel);block(p,s.yaw,0,2.4,0,1.15,.8,.06,mat);
    }
  }
  // Tall fabric banners leave the road and all starting-grid sightlines clear.
  for(const distance of [-26,-10,10,26])for(const side of [-1,1]){
    const s=track.sample(distance),p=s.position.clone().addScaledVector(s.right,side*12.8);
    if(!space.place('event-banner',p.x,p.z,1))continue;
    block(p,s.yaw,0,3.2,0,.065,6.4,.065,steel);
    const flag=new THREE.PlaneGeometry(.75,3.6,4,12),positions=flag.attributes.position;
    for(let i=0;i<positions.count;i++)positions.setZ(i,Math.sin(positions.getY(i)*2.6)*.075);flag.computeVertexNormals();
    const fabric=new THREE.MeshStandardMaterial({map:signTexture('A / R',side>0?'#ffae7e':'#b5e1e3','GRAND TOUR'),roughness:.85,side:THREE.DoubleSide});
    add(flag,fabric,p.clone().add(new THREE.Vector3(0,4.3,0)),s.yaw);
  }
  if(track.id==='coast'){
    // One original belvedere near the opening, on a checked, clear footprint.
    for(const distance of [50,70,110,150,200]){
      const s=track.sample(distance),base=s.position.clone().addScaledVector(s.right,-27),yaw=s.yaw,radius=13.5;
      if(!space.clear(base.x,base.z,radius)||space.placements.some(p=>Math.hypot(p.x-base.x,p.z-base.z)<p.radius+radius))continue;
      const ground=[[-5,-11],[5,-11],[-5,11],[5,11]].map(([x,z])=>new THREE.Vector3(x,0,z).applyAxisAngle(up,yaw).add(base)).map(p=>height(p.x,p.z));
      if(Math.max(...ground)-Math.min(...ground)>4)continue;
      base.y=Math.max(...ground)+.15;space.reserve('belvedere',base.x,base.z,radius);
      const foundation=Math.max(.4,base.y-Math.min(...ground));
      block(base,yaw,0,-foundation/2,0,10,foundation,24,cream);
      for(const z of [-10,-5,0,5,10])for(const x of [-4.5,4.5])block(base,yaw,x,2.2,z,.15,4.4,.15,wood);
      for(const x of [-4.5,4.5])block(base,yaw,x,4.4,0,.2,.22,23,wood);
      for(let z=-11;z<=11;z+=1.2)block(base,yaw,0,4.5,z,9.6,.10,.14,wood);
      block(base,yaw,0,4.6,-5,9.3,.04,9,cream);
      for(const z of [-9,-3,3,9]){
        block(base,yaw,-2,.65,z,1.5,.16,2.8,wood);for(const dz of [-.9,.9])block(base,yaw,-2,.3,z+dz,1.2,.6,.12,steel);
        for(const x of [-3.8,3.8])block(base,yaw,x,.35,z,1,.7,1,cream);
      }
      for(let i=0;i<12;i++){
        const local=new THREE.Vector3(3.2+(i%2)*.5,0,-9+i*1.6).applyAxisAngle(up,yaw).add(base);
        add(new THREE.CapsuleGeometry(.17,.48,2,6),i%3===0?amber:navy,local.clone().add(new THREE.Vector3(0,1.12,0)));
        add(new THREE.SphereGeometry(.13,8,5),skin,local.clone().add(new THREE.Vector3(0,1.65,0)));
        for(const x of [-.10,.10])block(local,yaw,x,.40,0,.12,.80,.14,navy);
      }
      break;
    }
  }
  for(const [material,geometries] of batches){const merged=mergeGeometries(geometries)!;geometries.forEach(g=>g.dispose());const group=spatialMesh(merged,material,true,80);group.name='circuit-detail';scene.add(group);}
}
