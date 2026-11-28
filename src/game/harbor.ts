import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {spatialMesh} from './batching';
import {RoadSpace} from './road-space';
import {HARBOR_UNDERPASS,Track} from './track';
import {random,signTexture,tiled} from './materials';

export const HARBOR_FIXTURE_SPACING=9;
export const isHarborFreightSection=(distance:number)=>distance>=590&&distance<=1120;
export const isHarborWaterfront=(distance:number)=>distance>=2500&&distance<=2820;

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

  const asphaltDeck = new THREE.MeshStandardMaterial({
    color:'#3e4a52', map:tiled('ground-color.png',3), normalMap:tiled('ground-normal.png',3),
    normalScale:new THREE.Vector2(.23,.23), roughness:.88,
  });
  const roofMaterial=asphaltDeck.clone();
  roofMaterial.color.set('#46515c');
  const safety = new THREE.MeshStandardMaterial({color:'#eff3e9',roughness:.72});
  const barrierRed = new THREE.MeshStandardMaterial({color:'#a04434',roughness:.74});
  const position=(distance:number)=>track.sample(distance);
  addHarborRaceMarkings(scene,track,space);
  // The launch has a visible service apron with setbacks for freight infrastructure.
  for(let d=-30;d<174;d+=17){
    const sample=position(d);
    const base=sample.position.clone().addScaledVector(sample.right,17);
    box(base.clone().add(new THREE.Vector3(0,-.67,0)),14,1.2,17.03,asphaltDeck,sample.yaw);
    if(d%3===0){
      const pierHeight=base.y+.7;
      box(new THREE.Vector3(base.x,-2+pierHeight/2,base.z),2.7,pierHeight,3.9,concrete,sample.yaw);
    }
    for(const x of [-5.9,5.9])box(local(base,sample.yaw,x,-.05,0),.14,.024,16.99,safety,sample.yaw);
    if(d%2===0)for(const x of [-3,3])box(local(base,sample.yaw,x,-.048,4),.12,.024,6,warm,sample.yaw);
  }

  const freightMap=signTexture('FREIGHT YARD','#ffce86','SLOW / DOUBLE BEND');
  const freightSign=new THREE.MeshStandardMaterial({map:freightMap,emissiveMap:freightMap,emissive:'#ffffff',emissiveIntensity:1.15,side:THREE.DoubleSide});
  for(let distance=735,index=0;distance<1100;distance+=24,index++){
    const sample=position(distance),side=index%3===1?1:-1;
    const base=sample.position.clone().addScaledVector(sample.right,side*20);
    if(!space.reserve('freight-chicane-stack',base.x,base.z,8))continue;
    const yaw=sample.yaw+.09*side;
    const deckHeight=base.y+1.93;
    box(new THREE.Vector3(base.x,-2+deckHeight/2,base.z),8,deckHeight,14,asphaltDeck,yaw);
    const levels=2+index%2;
    for(let level=0;level<levels;level++){
      const container=local(base,yaw,0,1.27+level*2.57,0);
      box(container,5.7,2.54,12.8,cargo[(index+level)%cargo.length],yaw);
      for(const x of [-2.88,2.88])for(let z=-5.8;z<=5.9;z+=.84)box(local(container,yaw,x,0,z),.08,2.34,.105,steel,yaw);
      for(const z of [-6.42,6.42])for(const x of [-2.87,2.87]){
        box(local(container,yaw,x,0,z),.19,2.6,.19,concrete,yaw);
        box(local(container,yaw,x*.37,0,z),.09,2.27,.15,steel,yaw);
      }
    }
    if(index%4===0){
      const panel=new THREE.PlaneGeometry(4.9,1.5);
      add(panel,freightSign,local(base,yaw,0,2.1,-6.51),yaw+Math.PI);
    }
  }

  // The open-sided floodgate underpass follows the track surface and keeps roof
  // clearance above the vehicle and chase camera envelopes through the section.
  const {start,end,clearance}=HARBOR_UNDERPASS;
  const half=track.width/2;
  add(underpassRoof(track),roofMaterial);
  for(let d=start;d<end;d+=HARBOR_FIXTURE_SPACING){
    const length=Math.min(HARBOR_FIXTURE_SPACING,end-d),sample=position(d+length/2);
    const supportWidth=half+3.42;
    for(const side of [-1,1]){
      const foot=sample.position.clone().addScaledVector(sample.right,side*supportWidth);
      if(space.reserve('underpass-pier',foot.x,foot.z,.85)){
        const pierHeight=foot.y+clearance+2.3;
        box(new THREE.Vector3(foot.x,-2+pierHeight/2,foot.z),1.21,pierHeight,1.10,asphaltDeck,sample.yaw);
        box(foot.clone().add(new THREE.Vector3(0,.25,0)),1.4,.5,1.4,barrierRed,sample.yaw);
        box(foot.clone().add(new THREE.Vector3(0,1.15,0)),1.26,.17,1.15,safety,sample.yaw);
      }
    }
    const lamp=sample.position.clone().add(new THREE.Vector3(0,clearance-.52,0));
    box(lamp,9.15,.24,.27,steel,sample.yaw);
    box(lamp.clone().add(new THREE.Vector3(0,-.13,0)),8.85,.025,.15,warm,sample.yaw);
    box(sample.position.clone().add(new THREE.Vector3(0,clearance-.24,0)),track.width+5,.45,.69,steel,sample.yaw);
  }
  const gateTex=signTexture('FLOODGATE 01','#ffcca3','NEON HARBOR  /  WESTBOUND');
  const gateFace=new THREE.MeshStandardMaterial({map:gateTex,emissiveMap:gateTex,emissive:'#fff3e5',emissiveIntensity:1.25,side:THREE.DoubleSide});
  const entry=position(start);
  add(new THREE.PlaneGeometry(13,2),gateFace,entry.position.clone().add(new THREE.Vector3(0,clearance-.4,0)),entry.yaw+Math.PI);
  for(const d of [start-.45,end+.45]){
    const sample=position(d);
    box(sample.position.clone().add(new THREE.Vector3(0,clearance+.25,0)),track.width+7,.55,1.18,steel,sample.yaw);
    box(sample.position.clone().add(new THREE.Vector3(0,clearance+.62,0)),track.width+7.1,.12,.15,warm,sample.yaw);
  }

  // Breakwater crossing. The outer attachment line stays clear of street
  // lights and the active barrier; the water-facing side stays open to the basin.
  for(const distance of [2585,2728]){
    const s=track.sample(distance),width=13.25;
    const feet=[-1,1].map(side=>s.position.clone().addScaledVector(s.right,side*width));
    if(!feet.every(foot=>space.clear(foot.x,foot.z,1.35)))continue;
    const tops:THREE.Vector3[]=[];
    for(let i=0;i<2;i++){
      const foot=feet[i],side=i===0?-1:1;
      space.reserve('breakwater-pier',foot.x,foot.z,1.35);
      const base=foot.clone();base.y=-11;
      const top=foot.clone().addScaledVector(s.right,-side*1.2).add(new THREE.Vector3(0,22,0));
      tops.push(top);beam(base,top,.85,concrete);
      beam(foot.clone().add(new THREE.Vector3(0,8,0)).addScaledVector(s.tangent,-.88),top.clone().addScaledVector(s.tangent,-.88),.12,cyan);
      for(const direction of [-1,1])for(const span of [18,33,47,59]){
        const sample=track.sample(distance+direction*span),anchor=sample.position.clone().addScaledVector(sample.right,side*12.35);
        if(!space.clear(anchor.x,anchor.z,.55))continue;
        space.reserve('breakwater-stay',anchor.x,anchor.z,.55);
        box(anchor.clone().add(new THREE.Vector3(0,-.15,0)),1,.65,.82,steel,sample.yaw);
        box(anchor.clone().add(new THREE.Vector3(0,.16,0)),.75,.14,.52,warm,sample.yaw);
        beam(anchor,top.clone().add(new THREE.Vector3(0,-7+span/14,0)),.08,steel);
      }
    }
    beam(tops[0],tops[1],.36,steel);
    beam(tops[0].clone().add(new THREE.Vector3(0,.39,0)),tops[1].clone().add(new THREE.Vector3(0,.39,0)),.08,cyan);
  }

  // Low-rise frontage brings readable scale, shop windows and signage close to the road.
  for(let distance=60,index=0;distance<track.length;distance+=86,index++)for(const side of [-1,1]){
    const s=track.sample(distance),base=s.position.clone().addScaledVector(s.right,side*25),yaw=s.yaw;
    if(base.x>190||base.z < -478||!space.reserve('harbor-frontage',base.x,base.z,11))continue;
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

  for(let d=4;d<track.length;d+=12){
    const s=track.sample(d);
    const light=isHarborWaterfront(d)?cyan:d>=start&&d<end?warm:palette[Math.floor(d/220)%3];
    for(const side of [-1,1])box(s.position.clone().addScaledVector(s.right,side*(half+.35)).add(new THREE.Vector3(0,.9,0)),.055,.045,5,light,s.yaw);
  }
  for(const [m,parts] of buckets){const merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());if(merged){const group=spatialMesh(merged,m,!(m instanceof THREE.MeshBasicMaterial),110);group.name=m===roofMaterial?'harbor-underpass-roof':'harbor-district';scene.add(group);}}
}

/** Distance panels and paint follow the existing spline and stay clear of the racing surface. */
function addHarborRaceMarkings(scene:THREE.Scene,track:Track,space:RoadSpace){
  const turnIn=784;
  const signs=[
    ...[150,100,50].map((meters,tile)=>({distance:turnIn-meters,tile,side:-1})),
    {distance:786,tile:3,side:-1},
    {distance:852,tile:4,side:1},
    {distance:1039,tile:3,side:-1},
  ];
  const atlas=document.createElement('canvas');
  atlas.width=1280;
  atlas.height=256;
  const draw=atlas.getContext('2d')!;
  for(let i=0;i<5;i++){
    draw.save();
    draw.translate(i*256,0);
    draw.fillStyle='#171b20';
    draw.fillRect(0,0,256,256);
    draw.fillStyle='#ffc46d';
    draw.fillRect(7,7,242,4);
    draw.fillRect(7,245,242,4);
    if(i<3){
      draw.fillStyle='#fff6e0';
      draw.font='bold 113px sans-serif';
      draw.textAlign='center';
      draw.fillText(String([150,100,50][i]),128,143,225);
      draw.fillStyle='#ffc46d';
      draw.font='bold 24px sans-serif';
      draw.fillText('BRAKE',128,207);
    }else{
      if(i===4){draw.translate(256,0);draw.scale(-1,1);}
      for(const x of [18,112]){
        draw.beginPath();
        draw.moveTo(x,54);draw.lineTo(x+45,54);draw.lineTo(x+107,128);draw.lineTo(x+45,202);draw.lineTo(x,202);
        draw.lineTo(x+63,128);draw.closePath();draw.fill();
      }
    }
    draw.restore();
  }
  const texture=new THREE.CanvasTexture(atlas);
  texture.colorSpace=THREE.SRGBColorSpace;
  const face=new THREE.MeshBasicMaterial({map:texture});
  const backing=new THREE.MeshStandardMaterial({color:'#394953',metalness:.48,roughness:.63});
  const positions:THREE.BufferGeometry[]=[];
  const posts:THREE.BufferGeometry[]=[];
  for(const {distance,tile,side} of signs){
    const sample=track.sample(distance),directional=tile>=3;
    const body=sample.position.clone().addScaledVector(sample.right,side*(track.width/2+(directional?4.9:4.0)));
    const width=directional?3.15:1.76,height=directional?1.5:1.76;
    const radius=Math.hypot(width/2,.43);
    if(!space.reserve(directional?'harbor-direction-board':'harbor-brake-board',body.x,body.z,radius))continue;
    const approach=track.sample(distance-28).position.sub(body),yaw=Math.atan2(approach.x,approach.z);
    const top=body.clone().add(new THREE.Vector3(0,directional?2.15:2.48,0));
    const surface=new THREE.PlaneGeometry(width,height),uv=surface.attributes.uv;
    for(let j=0;j<uv.count;j++)uv.setX(j,(.01+uv.getX(j)*.98+tile)/5);
    positions.push(surface.rotateY(yaw).translate(top.x,top.y,top.z));
    const rear=top.clone().addScaledVector(new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)),-.07);
    posts.push(new THREE.BoxGeometry(width+.07,height+.07,.11).rotateY(yaw).translate(rear.x,rear.y,rear.z));
    const supportLength=body.y+2+(directional?1.82:2.05);
    posts.push(new THREE.BoxGeometry(.13,supportLength,.15).rotateY(yaw).translate(rear.x,-2+supportLength/2,rear.z));
  }

  const warmPaint=new THREE.MeshStandardMaterial({color:'#b6513a',emissive:'#6f3022',emissiveIntensity:.35,roughness:.82});
  const lightPaint=new THREE.MeshStandardMaterial({color:'#dcd9cd',emissive:'#6d6c67',emissiveIntensity:.35,roughness:.82});
  const stripes:number[][]=[[],[]];
  for(const [from,to,side] of [[768,825,1],[844,893,-1],[1027,1073,1]]){
    const edges=[side*(track.width/2-1.58),side*(track.width/2-.82)].sort((a,b)=>a-b);
    for(let d=from,index=0;d<to;d+=2.55,index++){
      const first=track.sample(d),last=track.sample(Math.min(to,d+2.55));
      const [a,b,c,e]=[first,last].flatMap(s=>edges.map(x=>s.position.clone().addScaledVector(s.right,x)));
      for(const v of [a,b,c,c,b,e])stripes[index%2].push(v.x,v.y+.035,v.z);
    }
  }
  const groups:[THREE.Material,THREE.BufferGeometry[]][]=[[face,positions],[backing,posts]];
  const batch=(material:THREE.Material,geometry:THREE.BufferGeometry)=>{
    const group=spatialMesh(geometry,material,false,72);
    group.name='harbor-race-markings';
    scene.add(group);
  };
  for(const [material,parts] of groups){
    if(parts.length){
      const merged=mergeGeometries(parts);
      if(merged)batch(material,merged);
      parts.forEach(g=>g.dispose());
    }
  }
  for(const [i,material] of [warmPaint,lightPaint].entries()){
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(stripes[i],3));
    geometry.computeVertexNormals();
    batch(material,geometry);
  }
}

/** A continuous roof section shares the same samples as the road; curved
 * deck seams stay closed without extending a straight slab across the course. */
function underpassRoof(track:Track){
  const {start,end,clearance}=HARBOR_UNDERPASS,half=track.width/2+3.5,thickness=.76;
  const positions:number[]=[],uvs:number[]=[];
  const corners=[[-half,0],[half,0],[half,thickness],[-half,thickness]];
  for(let d=start;d<end;d+=3){
    const next=Math.min(d+3,end);
    const back=track.sample(d),front=track.sample(next);
    const put=(sample:ReturnType<Track['sample']>,distance:number,index:number,u:number)=>{
      const [side,height]=corners[index];
      const point=sample.position.clone().addScaledVector(sample.right,side);
      point.y+=clearance+height;
      positions.push(point.x,point.y,point.z);
      uvs.push(u,distance/24);
    };
    for(let j=0;j<4;j++){
      const k=(j+1)%4;
      put(back,d,j,0);put(front,next,k,1);put(back,d,k,1);
      put(back,d,j,0);put(front,next,j,0);put(front,next,k,1);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.computeVertexNormals();
  return geometry;
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
