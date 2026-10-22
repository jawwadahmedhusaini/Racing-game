import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {CarSpec} from './content';
import {publicUrl} from './urls';
export interface CarModel {group:THREE.Group;body:THREE.Group;wheels:THREE.Group[];paint:THREE.MeshPhysicalMaterial;brake:THREE.MeshStandardMaterial;headlamps:THREE.MeshStandardMaterial;flames:THREE.Mesh[];update:(speed:number,steer:number,drift:number,boost:number,braking:boolean,time:number)=>void;dispose:()=>void;}
let garageTemplate:THREE.Group|undefined,raceTemplate:THREE.Group|undefined;
export async function loadVehicleAsset(){const loader=new GLTFLoader();const [garage,race]=await Promise.all([loader.loadAsync(publicUrl('assets/concept-car.glb')),loader.loadAsync(publicUrl('assets/concept-car-lod.glb'))]);garageTemplate=garage.scene;raceTemplate=race.scene;garageTemplate.updateMatrixWorld(true);raceTemplate.updateMatrixWorld(true);}

// Car Concept by Eric Chadwick / DGG (CC BY 4.0), adapted for this game.
// Model preparation and license details are in scripts/prepare-car.py and ASSET_LICENSES.md.
export function createCar(spec:CarSpec,color=spec.color,racing=false):CarModel {
  const template=racing?raceTemplate:garageTemplate;if(!template)throw new Error('Vehicle assets must load before creating cars.');
  const group=new THREE.Group(),body=new THREE.Group();group.name=spec.name;group.add(body);
  const materials=new Map<THREE.Material,THREE.Material>();
  let paint!:THREE.MeshPhysicalMaterial,brake!:THREE.MeshStandardMaterial,headlamps!:THREE.MeshStandardMaterial;
  const wheelNames=['WheelRearL','WheelRearR','WheelFrontL','WheelFrontR'];
  const wheels=wheelNames.map(name=>{const source=template!.getObjectByName(name)!;const g=new THREE.Group();g.name=name;source.getWorldPosition(g.position);const spin=new THREE.Group();g.add(spin);group.add(g);return g;});
  const buckets=new Map<string,{mat:THREE.Material;geos:THREE.BufferGeometry[];parent:THREE.Object3D}>();
  template.traverse(o=>{
    if(!(o instanceof THREE.Mesh))return;
    let wheelParent:THREE.Object3D|null=o;while(wheelParent&&!wheelNames.includes(wheelParent.name))wheelParent=wheelParent.parent;
    const wheelIndex=wheelParent?wheelNames.indexOf(wheelParent.name):-1;
    const sourceMaterials=Array.isArray(o.material)?o.material:[o.material];
    // glTF material primitives are separate meshes in this loader.
    const source=sourceMaterials[0];let mat=materials.get(source) as THREE.MeshPhysicalMaterial|undefined;
    if(!mat){mat=source.clone() as THREE.MeshPhysicalMaterial;materials.set(source,mat);mat.envMapIntensity=.9;
      if(source.name.startsWith('Paint 1')){mat.color.set(color);mat.metalness=.68;mat.roughness=.3;mat.clearcoat=1;mat.clearcoatRoughness=.13;mat.normalScale?.setScalar(.10);paint=mat;}
      if(source.name.startsWith('Paint 2')){mat.color.set('#222a30');mat.metalness=.45;mat.roughness=.32;}
      if(source.name==='Glass'){mat.color.set('#23353d');mat.metalness=.4;mat.roughness=.09;mat.transmission=0;mat.transparent=!racing;mat.opacity=racing?1:.90;mat.depthWrite=racing;mat.envMapIntensity=1.1;}
      if(source.name.startsWith('Interior 3'))mat.color.set(color).multiplyScalar(.55);
      if(source.name==='Brakelight'){mat.emissive.set('#ff1733');mat.emissiveIntensity=2.8;brake=mat;}
      if(source.name==='Headlight'){mat.emissive.set('#cbebff');mat.emissiveIntensity=3.5;headlamps=mat;}
      if(source.name==='Rim2'){mat.color.set(spec.shape==='track'?'#b9a273':'#98a8b7');mat.roughness=.24;}
    }
    const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);
    if(wheelIndex>=0){const center=wheels[wheelIndex].position;geo.translate(-center.x,-center.y,-center.z);}
    // Normalize attributes for batching while retaining the baked AO UV channel.
    for(const name of Object.keys(geo.attributes))if(!['position','normal','uv','uv1'].includes(name))geo.deleteAttribute(name);
    const count=geo.attributes.position.count;if(!geo.attributes.uv)geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(count*2),2));if(!geo.attributes.uv1)geo.setAttribute('uv1',geo.attributes.uv.clone());if(!geo.attributes.normal)geo.computeVertexNormals();
    const parent=wheelIndex<0?body:o.name.includes('BrakePad')?wheels[wheelIndex]:wheels[wheelIndex].children[0];
    const key=`${mat.uuid}:${parent.uuid}`,bucket=buckets.get(key)??{mat,geos:[],parent};bucket.geos.push(geo.index?geo.toNonIndexed():geo);if(geo.index)geo.dispose();buckets.set(key,bucket);
  });
  for(const {mat,geos,parent} of buckets.values()){const geo=mergeGeometries(geos);if(geo){const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);}geos.forEach(g=>g.dispose());}
  paint??=new THREE.MeshPhysicalMaterial({color,metalness:.75,roughness:.26});brake??=new THREE.MeshStandardMaterial({emissive:'#ff1733'});headlamps??=new THREE.MeshStandardMaterial({emissive:'#ffffff'});
  const carbon=new THREE.MeshStandardMaterial({color:'#111923',metalness:.4,roughness:.37});
  const detail=(size:number[],pos:number[],material:THREE.Material=carbon)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size as [number,number,number]),material);m.position.set(...pos as [number,number,number]);m.castShadow=true;body.add(m);return m;};
  // Distinct touring, long-tail and track aero packages on the licensed concept chassis.
  if(spec.shape!=='flow'){
    const width=spec.shape==='track'?2.32:2.08,height=spec.shape==='track'?1.19:.99;
    for(const side of [-1,1])detail([.045,.32,.15],[side*.68,height-.16,-1.72]);
    detail([width,.055,.31],[0,height,-1.82],spec.shape==='track'?carbon:paint).rotation.x=-.06;
    for(const side of [-1,1])detail([.035,.14,.35],[side*width/2,height+.025,-1.82],paint);
  }
  if(spec.shape==='track'){detail([2.02,.04,.30],[0,.13,2.18]);for(const side of [-1,1])detail([.13,.06,1.7],[side*1.075,.13,-.1]);}
  // Fit the rear lighting and vent trim to the actual body surface, including its curved shoulders.
  body.updateMatrixWorld(true);
  const rearMeshes=body.children.filter((o):o is THREE.Mesh=>o instanceof THREE.Mesh),ray=new THREE.Raycaster();
  const rearPoint=(x:number,y:number,offset=.025)=>{
    ray.set(new THREE.Vector3(x,y,-3),new THREE.Vector3(0,0,1));
    const hit=ray.intersectObjects(rearMeshes,false)[0];return new THREE.Vector3(x,y,(hit?.point.z??-1.88)-offset);
  };
  const trimPoints:number[]=[],trimUvs:number[]=[],trimIndices:number[]=[];
  for(let i=0;i<=32;i++)for(let j=0;j<=8;j++){
    trimPoints.push(...rearPoint(-.98+i/32*1.96,.48+j/8*.24,.032).toArray());trimUvs.push(i/32,j/8);
    if(i<32&&j<8){const a=i*9+j;trimIndices.push(a,a+9,a+1,a+1,a+9,a+10);}
  }
  const trimGeo=new THREE.BufferGeometry();trimGeo.setAttribute('position',new THREE.Float32BufferAttribute(trimPoints,3));trimGeo.setAttribute('uv',new THREE.Float32BufferAttribute(trimUvs,2));trimGeo.setIndex(trimIndices);trimGeo.computeVertexNormals();
  const ventCanvas=document.createElement('canvas');ventCanvas.width=256;ventCanvas.height=64;const vc=ventCanvas.getContext('2d')!;vc.fillStyle='#23292c';vc.fillRect(0,0,256,64);vc.strokeStyle='#090d10';vc.lineWidth=2;
  for(let y=0;y<70;y+=8)for(let x=-4;x<260;x+=9){const cx=x+(y%16?4.5:0);vc.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;vc.lineTo(cx+Math.cos(a)*4,y+Math.sin(a)*4);}vc.closePath();vc.stroke();}
  const ventMap=new THREE.CanvasTexture(ventCanvas);ventMap.colorSpace=THREE.SRGBColorSpace;ventMap.anisotropy=8;
  const trim=new THREE.Mesh(trimGeo,new THREE.MeshStandardMaterial({map:ventMap,metalness:.3,roughness:.55,side:THREE.DoubleSide}));body.add(trim);
  const ledPieces:THREE.BufferGeometry[]=[];
  for(const side of [-1,1]){
    const points=Array.from({length:13},(_,i)=>rearPoint(side*(.16+i/12*.78),.675+Math.pow(i/12,3)*.018,.048));
    ledPieces.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.013,6,false));
  }
  const ledGeometry=mergeGeometries(ledPieces)!;ledPieces.forEach(g=>g.dispose());body.add(new THREE.Mesh(ledGeometry,brake));
  for(const x of [-.7,-.35,0,.35,.7])detail([.018,.12,.23],[x,.14,-1.85]);
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#111c23';ctx.fillRect(0,0,256,64);ctx.fillStyle='#d8e4e7';ctx.font='500 29px Rajdhani, sans-serif';ctx.textAlign='center';ctx.fillText('APEX / RUSH',128,43);const plateMap=new THREE.CanvasTexture(canvas);plateMap.colorSpace=THREE.SRGBColorSpace;
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(.42,.11),new THREE.MeshStandardMaterial({map:plateMap,roughness:.65}));plate.position.set(0,.31,-1.90);plate.rotation.y=Math.PI;body.add(plate);
  const flames:THREE.Mesh[]=[];for(const side of [-1,1])for(let i=0;i<2;i++){
    const m=new THREE.Mesh(new THREE.ConeGeometry(i?.045:.09,i?.85:1.35,8),new THREE.MeshBasicMaterial({color:i?'#ffffff':'#53c5ff',transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false}));m.position.set(side*.63,.26,i?-2.34:-2.55);m.rotation.x=-Math.PI/2;m.visible=false;body.add(m);flames.push(m);
  }
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const context=shadowCanvas.getContext('2d')!,gradient=context.createRadialGradient(32,32,8,32,32,32);gradient.addColorStop(0,'rgba(0,0,0,.7)');gradient.addColorStop(1,'transparent');context.fillStyle=gradient;context.fillRect(0,0,64,64);const shadowTexture=new THREE.CanvasTexture(shadowCanvas);const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.3,5.6),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.025;group.add(shadow);
  group.scale.set(spec.shape==='track'?1.035:spec.shape==='flow'?1:.99,spec.shape==='flow'?1:.95,spec.shape==='flow'?1.06:1);
  let wheelAngle=0,previousTime=0;
  return {group,body,wheels,paint,brake,headlamps,flames,update(speed,steer,drift,boost,braking,time){
    const delta=previousTime?Math.min(.1,time-previousTime):1/60;previousTime=time;wheelAngle+=speed*delta/.38;wheels.forEach((w,i)=>{w.children[0].rotation.x=wheelAngle;if(i>=2)w.rotation.y=-steer*.26;});
    body.rotation.z=THREE.MathUtils.lerp(body.rotation.z,-steer*Math.min(speed/600,.045)-drift*.02,.12);body.position.y=Math.sin(time*18)*Math.min(speed/6000,.012);brake.emissiveIntensity=braking?6:2.4;
    flames.forEach((f,i)=>{f.visible=boost>0;f.scale.y=(.75+Math.sin(time*70+i)*.15)*(boost===2?1.65:1);(f.material as THREE.MeshBasicMaterial).color.set(i%2?'#ffffff':boost===2?'#b56bff':'#53c5ff');});
  },dispose(){const geometries=new Set<THREE.BufferGeometry>(),mats=new Set<THREE.Material>();group.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());plateMap.dispose();shadowTexture.dispose();ventMap.dispose();}};
}
