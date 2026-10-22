import * as THREE from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
import { Track } from './track';

export interface World {scene:THREE.Scene;sun:THREE.DirectionalLight;update:(time:number,position:THREE.Vector3)=>void;}
export function createWorld(track:Track):World {
  const night=track.id==='city',scene=new THREE.Scene();
  scene.background=new THREE.Color(night?'#10172c':'#caab97');
  scene.fog=new THREE.FogExp2(night?'#10172c':'#c3b9a4',night?.0016:.00092);scene.environmentIntensity=night?.35:.5;
  const hemi=new THREE.HemisphereLight(night?'#6286d3':'#d9eaff',night?'#201838':'#857b65',night?.8:.85);scene.add(hemi);
  const sun=new THREE.DirectionalLight(night?'#9db9f4':'#ffdcc0',night?1.2:2.0);sun.position.set(200,140,150);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-65;sun.shadow.camera.right=65;sun.shadow.camera.top=65;sun.shadow.camera.bottom=-65;sun.shadow.camera.near=10;sun.shadow.camera.far=600;sun.shadow.bias=-.00025;sun.shadow.normalBias=.06;scene.add(sun);scene.add(sun.target);
  const skyGeo=new THREE.SphereGeometry(2400,32,16);
  const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color(night?'#030916':'#497f9c')},horizon:{value:new THREE.Color(night?'#28304c':'#efccb1')},sunColor:{value:new THREE.Color(night?'#a9c8ff':'#fff1ce')},sunDir:{value:new THREE.Vector3(.6,.15,.7).normalize()},night:{value:night?1:0}},vertexShader:'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec3 vDir;uniform vec3 top;uniform vec3 horizon;uniform vec3 sunColor;uniform vec3 sunDir;uniform float night;void main(){vec3 d=normalize(vDir);float h=max(0.,d.y);vec3 col=mix(horizon,top,pow(h,.38));float glow=pow(max(0.,dot(d,sunDir)),28.);float disc=smoothstep(.9996,.99985,dot(d,sunDir));col+=sunColor*(glow*.35+disc*2.);gl_FragColor=vec4(col,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`});
  if(night)scene.add(new THREE.Mesh(skyGeo,skyMat));else{skyGeo.dispose();const sky=new Sky();sky.scale.setScalar(2400);sky.material.uniforms.turbidity.value=5;sky.material.uniforms.rayleigh.value=2.4;sky.material.uniforms.mieCoefficient.value=.004;sky.material.uniforms.mieDirectionalG.value=.8;sky.material.uniforms.sunPosition.value.set(400,65,200);scene.add(sky);}
  // Ocean shader: layered wave normals, a bright horizon and a moving sunset glint.
  const oceanMat=new THREE.ShaderMaterial({uniforms:{time:{value:0},night:{value:night?1:0}},vertexShader:'varying vec3 p;void main(){p=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}',fragmentShader:`varying vec3 p;uniform float time;uniform float night;void main(){float w=sin(p.x*.09+time*.6+sin(p.z*.06))*sin(p.z*.13-time*.3)+sin(p.x*.31+p.z*.2+time)*.25;vec3 base=mix(vec3(.035,.24,.29),vec3(.018,.043,.080),night);vec3 light=mix(vec3(.3,.56,.59),vec3(.07,.12,.2),night);float glint=pow(max(0.,sin(p.z*.07+time*.7+sin(p.x*.04))),14.);vec3 color=mix(base,light,.34+w*.14)+glint*.065;gl_FragColor=vec4(color,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`});
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(4800,4800),oceanMat);sea.rotation.x=-Math.PI/2;sea.position.y=-9;scene.add(sea);
  const asphalt=asphaltTexture(night);asphalt.wrapS=asphalt.wrapT=THREE.RepeatWrapping;asphalt.repeat.set(3,track.length/12);asphalt.anisotropy=8;
  const roadMat=new THREE.MeshStandardMaterial({map:asphalt,color:night?'#68727d':'#b1b0ad',roughness:night?.4:.89,metalness:night?.2:.03});
  const road=ribbon(track,-track.width/2,track.width/2,.01,roadMat);road.receiveShadow=true;scene.add(road);
  scene.add(ribbon(track,-12,-10.5,-.05,new THREE.MeshStandardMaterial({color:night?'#454c5b':'#b6ab92',roughness:.85})));
  scene.add(ribbon(track,10.5,12,-.05,new THREE.MeshStandardMaterial({color:night?'#454c5b':'#b6ab92',roughness:.85})));
  const white=new THREE.MeshStandardMaterial({color:'#e3ded0',roughness:.7});
  scene.add(ribbon(track,-9.8,-9.62,.035,white));scene.add(ribbon(track,9.62,9.8,.035,white));
  // Segmented lane lines, bridge supports and posts use GPU instancing.
  const lanes:THREE.Matrix4[]=[],posts:THREE.Matrix4[]=[],supports:THREE.Matrix4[]=[],curbs:THREE.Matrix4[]=[],curbColors:THREE.Color[]=[];
  for(let s=0;s<track.length;s+=12){const t=track.sample(s);for(const x of [-3.4,3.4])lanes.push(matrix(t.position.clone().addScaledVector(t.right,x).add(new THREE.Vector3(0,.028,0)),new THREE.Vector3(.10,.009,5),t.yaw));}
  for(let s=0;s<track.length;s+=6){const t=track.sample(s);for(const side of [-1,1]){posts.push(matrix(t.position.clone().addScaledVector(t.right,side*11.5).add(new THREE.Vector3(0,.48,0)),new THREE.Vector3(.12,.95,.13),t.yaw));curbs.push(matrix(t.position.clone().addScaledVector(t.right,side*10.25).add(new THREE.Vector3(0,.07,0)),new THREE.Vector3(.40,.13,5.92),t.yaw));curbColors.push(new THREE.Color(Math.floor(s/6)%2?'#d5cfbb':night?'#387b9a':'#b44732'));}}
  for(let s=0;s<track.length;s+=35){const t=track.sample(s);supports.push(matrix(new THREE.Vector3(t.position.x,t.position.y/2-5,t.position.z),new THREE.Vector3(1.5,t.position.y+10,2.2),t.yaw));}
  instanced(scene,new THREE.BoxGeometry(1,1,1),white,lanes);
  instanced(scene,new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#777d7b',metalness:.7,roughness:.5}),posts);
  instanced(scene,new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#bbb5a1',roughness:1}),supports);
  instanced(scene,new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({roughness:.85}),curbs,curbColors);
  const railmat=new THREE.MeshStandardMaterial({color:night?'#7c8fa8':'#bac3c2',metalness:.75,roughness:.35});
  for(const side of [-1,1])for(const h of [.48,.90])scene.add(ribbon(track,side*11.5-.06,side*11.5+.06,h,railmat));
  // Warm urban promenade lamps and cyan city strips.
  const poles:THREE.Matrix4[]=[],arms:THREE.Matrix4[]=[],lamps:THREE.Matrix4[]=[];
  for(let s=20;s<track.length;s+=48){const t=track.sample(s);for(const side of [-1,1]){const p=t.position.clone().addScaledVector(t.right,side*12.3);poles.push(matrix(p.clone().add(new THREE.Vector3(0,4.3,0)),new THREE.Vector3(.14,8.6,.14),t.yaw));arms.push(matrix(p.clone().addScaledVector(t.right,-side*1.5).add(new THREE.Vector3(0,8.5,0)),new THREE.Vector3(3.1,.1,.1),t.yaw));lamps.push(matrix(p.clone().addScaledVector(t.right,-side*2.8).add(new THREE.Vector3(0,8.45,0)),new THREE.Vector3(.7,.06,.4),t.yaw));}}
  const poleMat=new THREE.MeshStandardMaterial({color:'#273d46',metalness:.65,roughness:.5});instanced(scene,new THREE.BoxGeometry(),poleMat,[...poles,...arms]);instanced(scene,new THREE.BoxGeometry(),new THREE.MeshBasicMaterial({color:night?'#6cdbfa':'#fff0ce',toneMapped:false}),lamps);
  if(night)for(const side of [-1,1])scene.add(ribbon(track,side*11.35-.04,side*11.35+.04,.95,new THREE.MeshBasicMaterial({color:side===1?'#fc408a':'#35d9f2',toneMapped:false})));
  const rng=random(2026+(night?2:0));
  if(!night) {
    // Layered Mediterranean cliffs: unique ridged meshes, muted by distance fog.
    for(let i=0;i<15;i++) {
      const a=i/15*Math.PI*2,r=620+rng()*350,x=-95+Math.sin(a)*r,z=Math.cos(a)*r;
      const mountain=new THREE.Mesh(mountainGeometry(210+rng()*190,100+rng()*180,rng),new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));mountain.position.set(x,-17,z);scene.add(mountain);
    }
    // Low wooded island under the middle of the elevated coastal ring.
    const island=new THREE.Mesh(mountainGeometry(165,40,rng),new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));island.position.set(-100,-19,-35);scene.add(island);
    const palmTrunks:THREE.Matrix4[]=[],palmLeaves:THREE.Matrix4[]=[],planters:THREE.Matrix4[]=[];
    for(let s=35;s<track.length;s+=28){const t=track.sample(s);for(const side of [-1,1]){if(rng()>.8)continue;const p=t.position.clone().addScaledVector(t.right,side*(14+rng()*3));const h=6+rng()*5;planters.push(matrix(p.clone().add(new THREE.Vector3(0,-.15,0)),new THREE.Vector3(3.8,.5,3.8),0));palmTrunks.push(matrix(p.clone().add(new THREE.Vector3(0,h/2,0)),new THREE.Vector3(.20,h,.20),rng()));for(let k=0;k<7;k++)palmLeaves.push(matrix(p.clone().add(new THREE.Vector3(0,h,0)),new THREE.Vector3(1.1,1,1.2),k*Math.PI*2/7+rng()*.3));}}
    instanced(scene,new THREE.CylinderGeometry(.7,1,1,7),new THREE.MeshStandardMaterial({color:'#817461',roughness:1}),palmTrunks);
    instanced(scene,palmFrond(),new THREE.MeshStandardMaterial({color:'#456b4c',side:THREE.DoubleSide,roughness:.85}),palmLeaves);
    instanced(scene,new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({color:'#afa58e',roughness:1}),planters);
  }
  // Architecture sits clear of the road. Windows are a locally generated texture.
  const windows=windowTexture(night),buildings:THREE.Matrix4[]=[],buildingColors:THREE.Color[]=[];
  for(let x=-460;x<=360;x+=night?53:75)for(let z=-400;z<=390;z+=night?58:85){
    const px=x+rng()*15,pz=z+rng()*15;
    let min=Infinity;for(let i=0;i<track.samples.length;i+=10){const p=track.samples[i].position;min=Math.min(min,(p.x-px)**2+(p.z-pz)**2);}
    if(min<50**2||(!night&&(min>120**2||rng()>.6)))continue;
    const h=night?25+rng()*120:8+rng()*26,w=night?18+rng()*17:15+rng()*12;
    buildings.push(matrix(new THREE.Vector3(px,h/2-8,pz),new THREE.Vector3(w,h,w*.8),rng()*.15));buildingColors.push(new THREE.Color().setHSL(night?.60:.09,night?.2:.17,night?.18+rng()*.16:.55+rng()*.22));
  }
  instanced(scene,new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({map:windows,emissiveMap:night?windows:null,emissive:night?'#9fc1ff':'#000000',emissiveIntensity:night?.8:0,roughness:.7,metalness:.25}),buildings,buildingColors);
  // Start gantry: checkerboard stripe and a crisp race sign.
  const start=track.sample(0),gantry=new THREE.Group();gantry.position.copy(start.position);gantry.rotation.y=start.yaw;scene.add(gantry);
  const gantryMat=new THREE.MeshStandardMaterial({color:'#1b2e37',metalness:.65,roughness:.3});
  for(const x of [-11,11]){const p=new THREE.Mesh(new THREE.BoxGeometry(.65,8,.65),gantryMat);p.position.set(x,4,0);p.castShadow=true;gantry.add(p);}
  const signTex=signTexture('APEX / RUSH',night?'#5fdef0':'#ff693c');
  const sign=new THREE.Mesh(new THREE.BoxGeometry(22,2,.4),[gantryMat,gantryMat,gantryMat,gantryMat,new THREE.MeshBasicMaterial({map:signTex}),new THREE.MeshBasicMaterial({map:signTex})]);sign.position.y=7.6;gantry.add(sign);
  const check=checkerTexture();check.wrapS=check.wrapT=THREE.RepeatWrapping;check.repeat.set(14,2);const startLine=new THREE.Mesh(new THREE.PlaneGeometry(20,2.8),new THREE.MeshStandardMaterial({map:check,roughness:.85}));startLine.rotation.x=-Math.PI/2;startLine.position.set(0,.04,0);gantry.add(startLine);
  // A marked boost ramp rewards a deliberate line on the outside lane.
  const rs=track.sample(track.length*.18+7),ramp=new THREE.Mesh(new THREE.BoxGeometry(4.8,.25,14),new THREE.MeshStandardMaterial({color:night?'#4a8d9e':'#d18738',metalness:.4,roughness:.5}));ramp.position.copy(rs.position).addScaledVector(rs.right,5.5);ramp.position.y+=.7;ramp.rotation.set(-.10,rs.yaw,0,'YXZ');scene.add(ramp);
  const rampLines=new THREE.Group();ramp.add(rampLines);for(let i=-4;i<6;i+=3){const stripe=new THREE.Mesh(new THREE.BoxGeometry(4.7,.02,.5),new THREE.MeshBasicMaterial({color:'#e8deac'}));stripe.position.set(0,.14,i);rampLines.add(stripe);}
  // Direction markers and advertising boards along sweeping turns.
  const boards:THREE.Matrix4[]=[];
  for(let s=80;s<track.length;s+=115){const t=track.sample(s);const side=t.curvature>0?-1:1;boards.push(matrix(t.position.clone().addScaledVector(t.right,side*14).add(new THREE.Vector3(0,2.7,0)),new THREE.Vector3(5.6,1.3,.15),t.yaw));}
  instanced(scene,new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({map:signTexture('>>>   APEX',night?'#63dbea':'#ff673c'),emissive:night?'#7399ad':'#000000',emissiveIntensity:.6}),boards);
  return {scene,sun,update(time,position){oceanMat.uniforms.time.value=time;skyMat.uniforms.sunDir.value.set(.6,.15,.7).normalize();sun.position.copy(position).add(new THREE.Vector3(90,120,70));sun.target.position.copy(position);}};
}

function ribbon(track:Track,left:number,right:number,height:number,material:THREE.Material){
  const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
  for(let i=0;i<=track.count;i++){const s=track.samples[i%track.count];for(const x of [left,right]){const p=s.position.clone().addScaledVector(s.right,x);positions.push(p.x,p.y+height,p.z);uvs.push(x===left?0:1,i/track.count);}if(i<track.count){const a=i*2;indices.push(a,a+2,a+1,a+2,a+3,a+1);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();const mesh=new THREE.Mesh(g,material);mesh.receiveShadow=true;return mesh;
}
function matrix(position:THREE.Vector3,scale:THREE.Vector3,yaw:number){return new THREE.Matrix4().compose(position,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw),scale);}
function instanced(scene:THREE.Scene,geo:THREE.BufferGeometry,mat:THREE.Material,transforms:THREE.Matrix4[],colors?:THREE.Color[]){if(!transforms.length)return;const mesh=new THREE.InstancedMesh(geo,mat,transforms.length);transforms.forEach((m,i)=>{mesh.setMatrixAt(i,m);if(colors)mesh.setColorAt(i,colors[i]);});mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;}
function random(seed:number){return()=>{seed=(Math.imul(1664525,seed)+1013904223)|0;return(seed>>>0)/4294967296;};}
function asphaltTexture(night:boolean){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const c=canvas.getContext('2d')!,rng=random(22),img=c.createImageData(256,256);for(let i=0;i<img.data.length;i+=4){const v=48+rng()*40;img.data[i]=v;img.data[i+1]=v;img.data[i+2]=v+(night?6:0);img.data[i+3]=255;}c.putImageData(img,0,0);c.strokeStyle='rgba(5,8,12,.15)';c.lineWidth=2;for(let i=0;i<8;i++){c.beginPath();c.moveTo(rng()*256,0);c.lineTo(rng()*256,256);c.stroke();}const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return tex;}
function windowTexture(night:boolean){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;const c=canvas.getContext('2d')!,rng=random(12);c.fillStyle=night?'#303647':'#bcb6a7';c.fillRect(0,0,128,256);for(let x=4;x<128;x+=16)for(let y=4;y<256;y+=13){c.fillStyle=night?(rng()>.4?(rng()>.4?'#b4ccdf':'#e6c69a'):'#1b2535'):'#3b5260';c.fillRect(x,y,8,7);}const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;}
function signTexture(text:string,color:string){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const c=canvas.getContext('2d')!;c.fillStyle='#101a22';c.fillRect(0,0,1024,128);c.fillStyle=color;c.fillRect(0,0,12,128);c.fillRect(1012,0,12,128);c.font='italic 700 72px Rajdhani, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#e8eeef';c.fillText(text,512,70);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;}
function checkerTexture(){const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const c=canvas.getContext('2d')!;c.fillStyle='#e8e7dc';c.fillRect(0,0,32,32);c.fillStyle='#182229';c.fillRect(0,0,16,16);c.fillRect(16,16,16,16);return new THREE.CanvasTexture(canvas);}
function mountainGeometry(radius:number,height:number,rng:()=>number){
  const g=new THREE.PlaneGeometry(radius*2,radius*2,64,64),a=g.attributes.position,colors:number[]=[],phase=rng()*6.28;
  for(let i=0;i<a.count;i++){
    const x=a.getX(i),z=a.getY(i),nx=x/radius,nz=z/radius,d=Math.sqrt(nx*nx+nz*nz);
    const envelope=Math.pow(Math.max(0,1-d),.72);
    const ridge=.7+.24*Math.sin(nx*7+Math.sin(nz*4)+phase)+.13*Math.sin(nz*14+nx*6)+.035*Math.sin(nx*43-nz*28);
    const y=envelope*height*ridge; a.setXYZ(i,x,y,z);
    const vegetation=(Math.sin(nx*20+nz*15)+Math.sin(nz*29+nx*10))*.5;
    const color=new THREE.Color(y>height*.6?'#77736b':vegetation>.2?'#43584a':'#696d56');
    color.multiplyScalar(.75+ridge*.25);colors.push(color.r,color.g,color.b);
  }
  // PlaneGrid winding faces +Z; after the heightfield mapping it must face +Y.
  const index=g.index!;for(let i=0;i<index.count;i+=3){const b=index.getX(i+1);index.setX(i+1,index.getX(i+2));index.setX(i+2,b);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
function palmFrond(){const p:number[]=[],ix:number[]=[];for(let i=0;i<=10;i++){const t=i/10,width=Math.sin(t*Math.PI)*.55,y=Math.sin(t*Math.PI)*.75-t*t*1.7,z=t*4;for(const s of [-1,1])p.push(s*width,y,z);if(i<10){const a=i*2;ix.push(a,a+2,a+1,a+2,a+3,a+1);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return g;}
