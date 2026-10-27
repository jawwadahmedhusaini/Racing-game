import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {spatialMesh} from './batching';
import {RoadSpace} from './road-space';
import {Track} from './track';
import {random} from './materials';

/** Original modular harbor set. Static meshes are merged by material and cell.
 * All roadside solids reserve a whole-circuit footprint before skyline placement.
 */
export function addHarbor(scene:THREE.Scene,track:Track,space:RoadSpace){
  const buckets=new Map<THREE.Material,THREE.BufferGeometry[]>(),rng=random(6244);
  const steel=new THREE.MeshStandardMaterial({color:'#253d4d',metalness:.65,roughness:.38});
  const concrete=new THREE.MeshStandardMaterial({color:'#66717c',roughness:.8});
  const orange=new THREE.MeshStandardMaterial({color:'#cb6c39',metalness:.35,roughness:.48});
  const glass=new THREE.MeshPhysicalMaterial({color:'#173f55',metalness:.55,roughness:.2,clearcoat:.8});
  const cyan=new THREE.MeshBasicMaterial({color:new THREE.Color(.12,2.7,3.4)});
  const pink=new THREE.MeshBasicMaterial({color:new THREE.Color(3.4,.15,1.2)});
  const warm=new THREE.MeshBasicMaterial({color:new THREE.Color(3,1.6,.5)});
  const palette=[cyan,pink,warm],cargo=['#247c88','#ba603d','#46648a','#a68d5c'].map(color=>new THREE.MeshStandardMaterial({color,metalness:.25,roughness:.65}));
  const add=(g:THREE.BufferGeometry,m:THREE.Material,p=new THREE.Vector3(),yaw=0)=>{
    g.rotateY(yaw);g.translate(p.x,p.y,p.z);const list=buckets.get(m)??[];list.push(g.index?g.toNonIndexed():g);if(g.index)g.dispose();buckets.set(m,list);
  };
  const box=(p:THREE.Vector3,w:number,h:number,d:number,m:THREE.Material,yaw=0)=>add(new THREE.BoxGeometry(w,h,d),m,p,yaw);
  const beam=(a:THREE.Vector3,b:THREE.Vector3,r:number,m:THREE.Material)=>{
    const delta=b.clone().sub(a),g=new THREE.CylinderGeometry(r,r,delta.length(),6);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));add(g,m,a.clone().add(b).multiplyScalar(.5));
  };
  const local=(base:THREE.Vector3,yaw:number,x:number,y:number,z:number)=>new THREE.Vector3(x,y,z).applyAxisAngle(new THREE.Vector3(0,1,0),yaw).add(base);
  const atlas=signAtlas(),signMaterial=new THREE.MeshStandardMaterial({map:atlas,emissiveMap:atlas,emissive:'#ffffff',emissiveIntensity:1.7,roughness:.38,side:THREE.DoubleSide});
  const sign=(p:THREE.Vector3,yaw:number,w:number,h:number,index:number)=>{
    const g=new THREE.PlaneGeometry(w,h),uv=g.attributes.uv,column=index%2,row=Math.floor(index/2);
    for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)+column)/2,(uv.getY(i)+3-row)/4);
    add(g,signMaterial,p,yaw);
  };

  // The waterfront is open water beyond x=220, with a visible quay and working port.
  box(new THREE.Vector3(260,-6,0),80,8,1100,concrete);
  for(const z of [-180,30,240]){
    const base=new THREE.Vector3(270,-2,z);if(!space.reserve('harbor-crane',base.x,base.z,34))continue;
    for(const x of [-13,13])for(const dz of [-15,15]){
      const a=local(base,0,x,0,dz),b=local(base,0,x*.6,42,dz*.65);beam(a,b,.65,orange);
      box(local(base,0,x,1,dz),4,2,4,steel);
    }
    for(const dz of [-10,10]){
      beam(local(base,0,-8,42,dz),local(base,0,68,42,dz),.7,orange);
      beam(local(base,0,-8,48,dz),local(base,0,68,48,dz),.45,orange);
      for(let x=-8;x<67;x+=9){beam(local(base,0,x,42,dz),local(base,0,x+9,48,dz),.22,orange);beam(local(base,0,x,48,dz),local(base,0,x+9,42,dz),.22,orange);}
      beam(local(base,0,45,42,dz),local(base,0,45,8,dz),.06,steel);
      box(local(base,0,23,48.3,dz),76,.12,.12,cyan);
    }
    box(local(base,0,45,8,0),3,1,22,orange);box(local(base,0,-2,39,0),8,5,10,glass);
  }
  for(let z=-430;z<460;z+=32)for(let row=0;row<2;row++){
    const x=245+row*21;if(!space.place('cargo-stack',x,z,10))continue;
    const levels=1+Math.floor(rng()*3);
    for(let level=0;level<levels;level++){
      const p=new THREE.Vector3(x,level*2.8-.6,z),m=cargo[Math.floor(rng()*cargo.length)];box(p,6,2.7,13,m);
      for(let rib=-6;rib<=6;rib+=1.2)for(const side of [-1,1])box(p.clone().add(new THREE.Vector3(side*3.03,0,rib)),.06,2.5,.10,steel);
    }
  }
  // A freighter silhouette anchors the skyline across the basin.
  const ship=new THREE.Vector3(390,-8.1,115);
  box(ship,30,7,138,steel);box(ship.clone().add(new THREE.Vector3(0,4,0)),29,1,137,concrete);
  for(let z=-44;z<36;z+=15)for(let x=-9;x<=9;x+=9)for(let y=0;y<2;y++)box(ship.clone().add(new THREE.Vector3(x,6+y*3,z)),8,2.8,13,cargo[(Math.abs(x+z)+y)%4]);
  box(ship.clone().add(new THREE.Vector3(0,13,51)),23,18,21,concrete);box(ship.clone().add(new THREE.Vector3(0,20,52)),25,3,22,glass);
  box(ship.clone().add(new THREE.Vector3(0,21.6,52)),25,.15,22,warm);

  // Low-rise frontage brings readable scale, shop windows and signage close to the road.
  for(let distance=60,index=0;distance<track.length;distance+=86,index++)for(const side of [-1,1]){
    const s=track.sample(distance),base=s.position.clone().addScaledVector(s.right,side*25),yaw=s.yaw;
    if(base.x>190||!space.reserve('harbor-frontage',base.x,base.z,11))continue;
    const light=palette[index%3],h=10+index%4*3;
    base.y=-2;box(local(base,yaw,0,h/2,0),12,h,17,steel,yaw);
    box(local(base,yaw,0,h+.3,0),12.8,.6,17.8,concrete,yaw);
    // Road-facing side, with vertical mullions and a recessed entrance canopy.
    const face=side*6.07;
    box(local(base,yaw,face,3,0),.12,4,15,glass,yaw);
    for(const z of [-7,-3.5,0,3.5,7])box(local(base,yaw,face+side*.08,3,z),.14,4.3,.13,concrete,yaw);
    box(local(base,yaw,face+side*.9,5.4,0),2,.25,17,steel,yaw);
    box(local(base,yaw,face+side*1.9,5.3,0),.09,.09,17,light,yaw);
    for(let y=8;y<h;y+=3)box(local(base,yaw,face,y,0),.15,1.5,14,glass,yaw);
    sign(local(base,yaw,face+side*.2,h-1.8,0),yaw+side*Math.PI/2,13,2.8,index%8);
    box(local(base,yaw,-face,h/2,7.9),.15,h,.15,light,yaw);
  }

  // Two original landmark towers, with curved silhouettes instead of rectangular clones.
  for(const [x,z,h] of [[-65,140,145],[-285,-230,105]]){
    if(!space.reserve('harbor-tower',x,z,29))continue;
    const p=new THREE.Vector3(x,h/2-2,z);add(new THREE.CylinderGeometry(16,24,h,12),glass,p,Math.PI/12);
    for(let y=6;y<h;y+=6){const radius=24-(y/h)*8;const ring=new THREE.TorusGeometry(radius,.15,4,12);ring.rotateX(Math.PI/2);add(ring,y%18===6?cyan:steel,new THREE.Vector3(x,y-2,z),Math.PI/12);}
    for(let i=0;i<12;i++){const a=i*Math.PI/6;beam(new THREE.Vector3(x+Math.cos(a)*24,-2,z+Math.sin(a)*24),new THREE.Vector3(x+Math.cos(a)*16,h-2,z+Math.sin(a)*16),.18,steel);}
    add(new THREE.CylinderGeometry(16.5,16.5,1.2,12),pink,new THREE.Vector3(x,h-1,z),Math.PI/12);
    beam(new THREE.Vector3(x,h,z),new THREE.Vector3(x,h+26,z),.2,steel);
  }

  // High portal frames mark the elevated return. Minimum overhead clearance is 22 m.
  for(const f of [.50,.515,.53,.545]){
    const s=track.sample(track.length*f),left=s.position.clone().addScaledVector(s.right,-13),right=s.position.clone().addScaledVector(s.right,13);
    if(!space.clear(left.x,left.z,.6)||!space.clear(right.x,right.z,.6))continue;
    space.reserve('skyway-pier',left.x,left.z,.6);space.reserve('skyway-pier',right.x,right.z,.6);
    for(const p of [left,right]){box(p.clone().add(new THREE.Vector3(0,11,0)),.9,22,.9,steel,s.yaw);box(p.clone().add(new THREE.Vector3(0,11,-.48)),.09,21,.10,cyan,s.yaw);}
    box(s.position.clone().add(new THREE.Vector3(0,22.5,0)),27,1,.9,steel,s.yaw);box(s.position.clone().add(new THREE.Vector3(0,21.95,0)),25,.09,.12,cyan,s.yaw);
  }
  for(let d=4;d<track.length;d+=12){const s=track.sample(d);for(const side of [-1,1])box(s.position.clone().addScaledVector(s.right,side*9.35).add(new THREE.Vector3(0,.9,0)),.055,.045,5,palette[Math.floor(d/220)%3],s.yaw);}
  for(const [m,parts] of buckets){const merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());if(merged){const group=spatialMesh(merged,m,!(m instanceof THREE.MeshBasicMaterial),110);group.name='harbor-district';scene.add(group);}}
}

function signAtlas(){
  const c=document.createElement('canvas');c.width=1024;c.height=1024;const ctx=c.getContext('2d')!;
  const names=['NIGHT MARKET','HARBOR / 08','LUMEN','AFTER HOURS','SKYLINE CLUB','PORT AUTHORITY','VOLT / ENERGY','NIGHT LINE'];
  for(let i=0;i<names.length;i++){
    const x=i%2*512,y=Math.floor(i/2)*256,color=['#64f4ff','#ff63b5','#ffcd81'][i%3];
    ctx.fillStyle='#081621';ctx.fillRect(x,y,512,256);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(x+10,y+10,492,236);
    ctx.fillStyle=color;ctx.font='700 45px Rajdhani, sans-serif';ctx.textAlign='center';ctx.fillText(names[i],x+256,y+122,466);
    ctx.fillStyle='#dae9eb';ctx.font='500 16px Inter, sans-serif';ctx.fillText(['OPEN LATE · NEON HARBOR','WATERFRONT DISTRICT','A CITY THAT NEVER STOPS'][i%3],x+256,y+165,470);
    ctx.fillStyle=color;for(let j=0;j<9;j++)ctx.fillRect(x+160+j*23,y+202,14,3);
  }
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
}
