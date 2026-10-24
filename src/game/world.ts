import * as THREE from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {Track} from './track';
import {asphaltMaterial,terrainMaterial,tiled,surface,random,signTexture} from './materials';
import {addTrees} from './vegetation';
import {spatialInstances,spatialMesh} from './batching';
import {addLandmarks} from './landmarks';
import {RoadSpace} from './road-space';
import {HeightField} from './heightfield';
import {addCircuitDetail} from './circuit-detail';
import {RAMP,rampHeight,rampGeometry} from './ramp';

export interface World {roadSpace:RoadSpace;scene:THREE.Scene;sun:THREE.DirectionalLight;update:(time:number,position:THREE.Vector3,forward?:THREE.Vector3)=>void;}
const UP=new THREE.Vector3(0,1,0);
const smooth=(a:number,b:number,x:number)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export async function createWorld(track:Track,checkpoint:(label:string)=>Promise<void>=async()=>{}):Promise<World> {
  const night=track.id==='city',scene=new THREE.Scene(),rng=random(night?312:809),half=track.width/2,roadSpace=new RoadSpace(track);
  try {
  await checkpoint('Sculpting the landscape…');
  const fog=night?'#172436':'#a7b7bd';scene.background=new THREE.Color(fog);scene.fog=new THREE.FogExp2(fog,night?.0030:.00105);scene.environmentIntensity=night?1.1:.9;
  scene.add(new THREE.HemisphereLight(night?'#a1bfed':'#b8d3ee',night?'#1e2029':'#6c644e',night?.45:.65));
  const sunDirection=new THREE.Vector3(-.65,.48,-.5).normalize();
  const sun=new THREE.DirectionalLight(night?'#9bbbed':'#ffe4bd',night?.8:3.3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-48,right:48,top:48,bottom:-48,near:5,far:450});sun.shadow.bias=-.00009;sun.shadow.normalBias=.025;sun.shadow.radius=2;scene.add(sun,sun.target);
  const sky=new Sky();sky.scale.setScalar(3000);sky.material.uniforms.turbidity.value=night?6:3.1;sky.material.uniforms.rayleigh.value=night?.35:2;sky.material.uniforms.mieCoefficient.value=.003;sky.material.uniforms.mieDirectionalG.value=.82;sky.material.uniforms.sunPosition.value.copy(night?new THREE.Vector3(-.7,-.12,-.5):sunDirection);scene.add(sky);
  // Bound atmospheric radiance before bloom; a bright horizon must not wash out the whole frame.
  sky.material.fragmentShader=sky.material.fragmentShader.replace('gl_FragColor = vec4( texColor, 1.0 );','texColor *= 1.35 / max(1.35, max(texColor.r, max(texColor.g, texColor.b))); gl_FragColor = vec4(texColor, 1.0);');
  if(night){
    sky.material.fragmentShader=sky.material.fragmentShader.replace('gl_FragColor = vec4(texColor, 1.0);', 'float elevation = max(normalize(vWorldPosition).y, 0.0); vec3 dusk = mix(vec3(0.045,0.078,0.12),vec3(0.006,0.014,0.035),pow(elevation,0.45)); gl_FragColor = vec4(dusk,1.0);');
  }
  const water=createWater(night,sunDirection);scene.add(water);
  const nearest=(x:number,z:number)=>nearestRoad(track,x,z);
  const rawHeight=(x:number,z:number)=>{
    if(night)return -2;
    const dx=(x+250)/450,dz=(z+50)/590;
    let h=-25+Math.max(0,1-dx*dx-dz*dz)*105;
    h+=Math.exp(-((x+680)**2/95000+(z-30)**2/260000))*180;
    h+=(Math.sin(x*.018+Math.sin(z*.013)*2)*Math.sin(z*.021)+Math.sin(x*.041-z*.029)*.35)*13;
    h+=Math.sin(x*.133+z*.09)*Math.sin(z*.111)*2.3;
    const n=nearest(x,z),isBridge=n.sample.position.x>145;
    const blend=1-smooth(24,68,n.distance),floor=n.sample.position.y-.65;h=THREE.MathUtils.lerp(h,isBridge?Math.min(h,floor):floor,blend);
    return h;
  };
  let groundHeight=rawHeight;
  if(!night){
    const grid=new THREE.PlaneGeometry(1900,1700,240,220);grid.rotateX(-Math.PI/2);const a=grid.attributes.position;
    for(let i=0;i<a.count;i++){const x=a.getX(i)-130,z=a.getZ(i);a.setXYZ(i,x,groundHeight(x,z),z);grid.attributes.uv.setXY(i,x*.095,z*.095);if(i%4000===0)await checkpoint('Sculpting the landscape…');}grid.computeVertexNormals();
    const heights=new Float32Array(a.count);for(let i=0;i<a.count;i++)heights[i]=a.getY(i);
    const field=new HeightField(-1080,-850,1900,1700,240,220,heights);groundHeight=(x,z)=>field.height(x,z)??rawHeight(x,z);
    const terrain=spatialMesh(grid,terrainMaterial());terrain.name='terrain';scene.add(terrain);
  }else{
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(1400,1400),new THREE.MeshStandardMaterial({color:'#283438',map:tiled('ground-color.png',70),normalMap:tiled('ground-normal.png',70),roughness:.8}));ground.rotation.x=-Math.PI/2;ground.position.set(-120,-2,0);ground.receiveShadow=true;scene.add(ground);
  }
  await checkpoint('Laying the road and barriers…');
  const concrete=new THREE.MeshStandardMaterial({color:night?'#79828a':'#d0cabd',map:tiled('ground-color.png',1),normalMap:tiled('ground-normal.png',1),normalScale:new THREE.Vector2(.12,.12),roughness:.92});
  const metal=new THREE.MeshStandardMaterial({color:'#949c9e',metalness:.75,roughness:.38});
  const darkMetal=new THREE.MeshStandardMaterial({color:'#283036',metalness:.65,roughness:.4});
  const white=new THREE.MeshStandardMaterial({color:'#e7e3d6',roughness:.86});
  const road=ribbon(track,-half,half,.015,asphaltMaterial(track.length,track.width,night));scene.add(road);
  for(const side of [-1,1]){
    scene.add(ribbon(track,side<0?-half-1:-half*-1,side<0?-half:half+1,-.04,concrete));
    scene.add(wallRibbon(track,side*(half+1),-.15,-2.3,concrete));
    scene.add(ribbon(track,side*(half-.42)-.075,side*(half-.42)+.075,.036,white));
  }
  const laneMarks:THREE.Matrix4[]=[],jerseys:THREE.Matrix4[]=[],posts:THREE.Matrix4[]=[],piers:THREE.Matrix4[]=[],caps:THREE.Matrix4[]=[],reflectors:THREE.Matrix4[]=[],joints:THREE.Matrix4[]=[];
  for(let d=0;d<track.length;d+=11){const s=track.sample(d);for(const x of [-4.25,0,4.25])laneMarks.push(at(s,x,.04,new THREE.Vector3(.13,.012,4.4)));}
  for(let d=0;d<track.length;d+=4.1){const s=track.sample(d);for(const side of [-1,1]){
    // Outer lanes travel farther through a bend; scale panels to keep the barrier continuous.
    jerseys.push(at(s,side*(half+.45),.54,new THREE.Vector3(.55,1.06,4.16*Math.max(.6,1+s.curvature*side*(half+.45)))));
    if(Math.floor(d/4.1)%3===0){posts.push(at(s,side*(half+.45),1.26,new THREE.Vector3(.055,.72,.065)));reflectors.push(at(s,side*(half+.12),.77,new THREE.Vector3(.07,.08,.2)));}
  }}
  for(let d=0;d<track.length;d+=32){const s=track.sample(d);if(night||s.position.x>135){const base=night?-2:-11,height=s.position.y-2.2-base;for(const side of [-1,1])piers.push(matrix(new THREE.Vector3(s.position.x+s.right.x*side*5.7,base+height/2,s.position.z+s.right.z*side*5.7),new THREE.Vector3(1.8,height,2.7),s.yaw));caps.push(at(s,0,-2.5,new THREE.Vector3(track.width+1,.8,3.8)));joints.push(at(s,0,.032,new THREE.Vector3(track.width,.012,.07)));}}
  instanced(scene,new THREE.BoxGeometry(),white,laneMarks,false);
  instanced(scene,jerseyGeometry(),concrete,jerseys,true);
  instanced(scene,new THREE.BoxGeometry(),metal,posts,true);
  instanced(scene,new THREE.BoxGeometry(),concrete,[...piers,...caps],true);
  instanced(scene,new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({color:'#15191b',roughness:.9}),joints,false);
  instanced(scene,new THREE.BoxGeometry(),new THREE.MeshBasicMaterial({color:'#f4d5a2'}),reflectors,false);
  for(const side of [-1,1])scene.add(ribbon(track,side*(half+.45)-.045,side*(half+.45)+.045,1.6,metal));
  // Tire wear, patch seams and road drains give the tarmac scale without a noisy overlay.
  const skidMat=new THREE.MeshBasicMaterial({color:'#0b1014',transparent:true,opacity:night?.06:.09,depthWrite:false});
  for(const x of [-6.1,-5.0,-1.0,.1,4.1,5.2])scene.add(ribbon(track,x,x+.17,.037,skidMat));
  const drainMat=new THREE.MeshStandardMaterial({color:'#30383b',metalness:.65,roughness:.65}),drains:THREE.Matrix4[]=[];
  for(let d=30;d<track.length;d+=43){const s=track.sample(d);for(const side of [-1,1])for(let j=0;j<7;j++)drains.push(at(s,side*(half-.18),.04,new THREE.Vector3(.25,.015,.035),j*.10));}instanced(scene,new THREE.BoxGeometry(),drainMat,drains,false);

  await checkpoint('Installing circuit lighting…');
  const poleTransforms:THREE.Matrix4[]=[],armTransforms:THREE.Matrix4[]=[],bulbs:THREE.Matrix4[]=[];
  for(let d=18;d<track.length;d+=night?38:64){const s=track.sample(d);for(const side of night?[-1,1]:[1]){
    poleTransforms.push(at(s,side*(half+1.5),4.3,new THREE.Vector3(.12,8.6,.12)));
    armTransforms.push(at(s,side*(half+.35),8.4,new THREE.Vector3(2.5,.10,.12)));
    bulbs.push(at(s,side*(half-.8),8.32,new THREE.Vector3(.85,.07,.34)));
  }}
  instanced(scene,new THREE.CylinderGeometry(.7,1,1,10),darkMetal,poleTransforms,true);instanced(scene,new THREE.BoxGeometry(),darkMetal,armTransforms,true);
  instanced(scene,new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({color:'#fff2d9',emissive:night?'#ffcf8c':'#ffffff',emissiveIntensity:night?4:.3,roughness:.2}),bulbs,false);

  addCircuitDetail(scene,track,roadSpace,groundHeight);
  await checkpoint('Building the surroundings…');
  if(night)addCity(scene,track,rng,roadSpace);else{
    addVillas(scene,track,groundHeight,rng,roadSpace);
    await checkpoint('Planting roadside scenery…');
    addPalms(scene,track,rng,roadSpace,groundHeight);
    addRoadsideDetail(scene,track,groundHeight,rng,roadSpace);
    await checkpoint('Growing the coastal forest…');
    const near:THREE.Matrix4[]=[],far:THREE.Matrix4[]=[];
    for(let d=25;d<track.length;d+=27){const s=track.sample(d);if(s.position.x>130)continue;for(const side of [-1,1]){
      const p=s.position.clone().addScaledVector(s.right,side*(20+rng()*16));p.y=groundHeight(p.x,p.z);if(p.y<0||p.y>s.position.y+22||!roadSpace.place('tree',p.x,p.z,7))continue;
      near.push(matrix(p,new THREE.Vector3(1,1.05+rng()*.5,1).multiplyScalar(.75+rng()*.45),rng()*Math.PI*2));
    }}
    for(let i=0;i<260;i++){const x=-680+rng()*830,z=-620+rng()*1200,n=nearest(x,z),y=groundHeight(x,z);if(y<8||y>180||n.distance<35||!roadSpace.place('distant-tree',x,z,9))continue;far.push(matrix(new THREE.Vector3(x,y,z),new THREE.Vector3(1,1.1,1).multiplyScalar(.75+rng()*.65),rng()*6.28));}
    addTrees(scene,near,far);
    addMarina(scene);
  }
  await checkpoint('Finishing the starting grid…');
  addLandmarks(scene,track,groundHeight,roadSpace);
  addGantry(scene,track,night);
  const ramp=new THREE.Mesh(rampGeometry(track),new THREE.MeshStandardMaterial({color:night?'#37596a':'#7b6751',roughness:.65,metalness:.3}));ramp.receiveShadow=true;ramp.castShadow=true;ramp.name='jump-ramp';scene.add(ramp);
  for(const offset of [1,4,7,10,12]){const distance=track.length*RAMP.fraction+offset,s=track.sample(distance),bar=new THREE.Mesh(new THREE.BoxGeometry(4.5,.02,.25),new THREE.MeshStandardMaterial({color:'#e1ac55',roughness:.75}));bar.position.copy(s.position).addScaledVector(s.right,5.5);bar.position.y+=rampHeight(track,distance,5.5)+.025;bar.rotation.set(-Math.asin(s.tangent.y)-Math.atan(RAMP.rise/RAMP.length),s.yaw,0,'YXZ');scene.add(bar);}
  // Clearly visible braking references before the tighter bends.
  const boardPosts:THREE.Matrix4[]=[];
  for(let d=65;d<track.length;d+=95){const s=track.sample(d);if(Math.abs(s.curvature)<.004)continue;const side=s.curvature>0?1:-1;
    const board=new THREE.Mesh(new THREE.PlaneGeometry(4.4,1.45),new THREE.MeshStandardMaterial({map:signTexture(s.curvature>0?'‹ ‹ ‹':'› › ›','#e8bd63','BRAKE · TURN IN'),side:THREE.DoubleSide,roughness:.85,emissive:'#ffffff',emissiveIntensity:night?.2:0}));board.position.copy(s.position).addScaledVector(s.right,side*(half+1.2));board.position.y+=2.25;board.rotation.y=s.yaw+Math.PI;scene.add(board);boardPosts.push(at(s,side*(half+1.2),1.05,new THREE.Vector3(.10,2.1,.10)));
  }instanced(scene,new THREE.BoxGeometry(),darkMetal,boardPosts,true);
  const streetLights:THREE.SpotLight[]=[],headlights:THREE.SpotLight[]=[];
  if(night){
    for(let i=0;i<3;i++){const light=new THREE.SpotLight('#ffd29d',550,40,.85,.8,2);scene.add(light,light.target);streetLights.push(light);}
    for(let i=0;i<2;i++){const light=new THREE.SpotLight('#dcecff',55,65,.28,.6,1.5);scene.add(light,light.target);headlights.push(light);}
  }
  // Combine equal-material road strips before cell culling, avoiding a draw per tire stripe.
  await checkpoint('Optimizing the circuit…');
  const ribbons=new Map<THREE.Material,THREE.BufferGeometry[]>();
  for(const group of [...scene.children])if(group.userData.roadRibbon){
    group.traverse(o=>{if(o instanceof THREE.Mesh){const material=o.material as THREE.Material,parts=ribbons.get(material)??[];parts.push(o.geometry);ribbons.set(material,parts);}});scene.remove(group);
  }
  for(const [material,parts] of ribbons){const merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());if(merged)scene.add(spatialMesh(merged,material,false,130));}
  const details:THREE.InstancedMesh[]=[];scene.traverse(o=>{if(o instanceof THREE.InstancedMesh&&o.userData.detailDistance)details.push(o);});
  return {scene,sun,roadSpace,update(time,position,forward=new THREE.Vector3(0,0,1)){
    water.material.uniforms.time.value=time;
    for(const mesh of details){const radius=mesh.boundingSphere?.radius??0,center=mesh.boundingSphere?.center;if(center)mesh.visible=center.distanceTo(position)<(scene.userData.quality==='low'?65:scene.userData.quality==='medium'?95:130)+radius;}
    sun.position.copy(position).addScaledVector(sunDirection,180);sun.target.position.copy(position);
    if(night){const n=nearest(position.x,position.z);streetLights.forEach((light,i)=>{const d=Math.floor(n.progress/38)*38+18+(i-1)*38,s=track.sample(d);light.position.copy(s.position).addScaledVector(s.right,half-.8);light.position.y+=8.2;light.target.position.copy(s.position);});headlights.forEach((light,i)=>{const right=new THREE.Vector3().crossVectors(forward,UP);light.position.copy(position).addScaledVector(right,(i-.5)*1.6).addScaledVector(forward,1.7);light.position.y+=.55;light.target.position.copy(position).addScaledVector(forward,28);light.target.position.y-=.25;});}
  }};
  }catch(error){disposeWorldScene(scene);throw error;}
}

function disposeWorldScene(scene:THREE.Scene){
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
  scene.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());scene.clear();
}

function nearestRoad(track:Track,x:number,z:number){
  let best=Infinity,progress=0;
  for(let i=0;i<track.count;i+=12){const a=track.samples[i].position,b=track.samples[(i+12)%track.count].position,dx=b.x-a.x,dz=b.z-a.z,t=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),d=(x-a.x-dx*t)**2+(z-a.z-dz*t)**2;if(d<best){best=d;progress=(i+12*t)/track.count*track.length;}}
  return {distance:Math.sqrt(best),progress,sample:track.sample(progress)};
}
function matrix(position:THREE.Vector3,scale:THREE.Vector3,yaw=0){return new THREE.Matrix4().compose(position,new THREE.Quaternion().setFromAxisAngle(UP,yaw),scale);}
function at(s:ReturnType<Track['sample']>,lateral:number,height:number,scale:THREE.Vector3,forward=0){
  const position=s.position.clone().addScaledVector(s.right,lateral).addScaledVector(s.tangent,forward).add(new THREE.Vector3(0,height,0));
  return new THREE.Matrix4().compose(position,new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.asin(s.tangent.y),s.yaw,0,'YXZ')),scale);
}
function instanced(scene:THREE.Scene,geo:THREE.BufferGeometry,material:THREE.Material,transforms:THREE.Matrix4[],cast=false,colors?:THREE.Color[]){
  if(!transforms.length){geo.dispose();return;}
  const group=spatialInstances(geo,material,transforms,cast,colors);scene.add(group);return group;
}
function ribbon(track:Track,left:number,right:number,height:number,material:THREE.Material){
  const p:number[]=[],uv:number[]=[],ix:number[]=[];
  for(let i=0;i<=track.count;i++){const s=track.samples[i%track.count];for(const x of [left,right]){const v=s.position.clone().addScaledVector(s.right,x);p.push(v.x,v.y+height,v.z);uv.push(x===left?0:1,i/track.count);}if(i<track.count){const a=i*2;ix.push(a,a+1,a+2,a+2,a+1,a+3);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();const group=spatialMesh(g,material,false,100);group.userData.roadRibbon=true;return group;
}
function wallRibbon(track:Track,side:number,top:number,bottom:number,material:THREE.Material){
  const p:number[]=[],uv:number[]=[],ix:number[]=[];for(let i=0;i<=track.count;i++){const s=track.samples[i%track.count],v=s.position.clone().addScaledVector(s.right,side);for(const h of [top,bottom]){p.push(v.x,v.y+h,v.z);uv.push(i/track.count*track.length/5,h===top?0:1);}if(i<track.count){const a=i*2;ix.push(a,a+1,a+2,a+2,a+1,a+3);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();const mat=material.clone();mat.side=THREE.DoubleSide;return spatialMesh(g,mat,false,100);
}
function jerseyGeometry(){const shape=new THREE.Shape();shape.moveTo(-.5,-.5);shape.lineTo(.5,-.5);shape.lineTo(.3,-.22);shape.lineTo(.18,.5);shape.lineTo(-.18,.5);shape.lineTo(-.3,-.22);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false});g.translate(0,0,-.5);return g;}
function createWater(night:boolean,sun:THREE.Vector3){
  const material=new THREE.ShaderMaterial({uniforms:{time:{value:0},normalMap:{value:surface('water-normal.png')},sunDir:{value:sun},night:{value:night?1:0}},vertexShader:'varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}',fragmentShader:`
    varying vec3 vWorld;uniform sampler2D normalMap;uniform float time;uniform vec3 sunDir;uniform float night;
    void main(){vec2 uv=vWorld.xz*.026;vec3 a=texture2D(normalMap,uv+vec2(time*.007,0.)).xyz*2.-1.;vec3 b=texture2D(normalMap,uv*1.73-vec2(0.,time*.011)).xyz*2.-1.;vec3 N=normalize(vec3((a.x+b.x)*.2,1.,(a.y+b.y)*.2));vec3 V=normalize(cameraPosition-vWorld);float f=.025+.975*pow(1.-max(dot(N,V),0.),5.);vec3 R=reflect(-V,N);vec3 sky=mix(mix(vec3(.58,.68,.75),vec3(.06,.10,.17),night),mix(vec3(.19,.36,.51),vec3(.014,.027,.058),night),pow(max(R.y,0.),.45));vec3 deep=mix(vec3(.025,.19,.20),vec3(.006,.022,.034),night);vec3 color=mix(deep,sky,f*.85);float spec=pow(max(dot(N,normalize(V+sunDir)),0.),240.);color+=mix(vec3(3.,2.55,1.8),vec3(.15,.21,.3),night)*spec;float fog=1.-exp(-pow(length(cameraPosition-vWorld)*.00085,2.));color=mix(color,mix(vec3(.48,.6,.65),vec3(.07,.11,.17),night),fog);gl_FragColor=vec4(color,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }
  `});
  const water=new THREE.Mesh(new THREE.PlaneGeometry(7000,7000),material);water.rotation.x=-Math.PI/2;water.position.y=-10;water.userData.skipAO=true;return water;
}
function addGantry(scene:THREE.Scene,track:Track,night:boolean){
  const s=track.sample(0),group=new THREE.Group();group.position.copy(s.position);group.rotation.y=s.yaw;scene.add(group);
  const metal=new THREE.MeshStandardMaterial({color:'#20282d',metalness:.7,roughness:.35});for(const x of [-10.2,10.2]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.18,.26,7.4,12),metal);pole.position.set(x,3.7,0);pole.castShadow=true;group.add(pole);}
  const sign=new THREE.Mesh(new THREE.BoxGeometry(21,1.9,.36),[metal,metal,metal,metal,new THREE.MeshStandardMaterial({map:signTexture('APEX / RUSH',night?'#7cdaee':'#ff7649',night?'NEON HARBOR · STREET CIRCUIT':'COSTA AURELIA · GRAND TOUR'),emissive:'#ffffff',emissiveIntensity:night?.35:0}),new THREE.MeshStandardMaterial({map:signTexture('APEX / RUSH')})]);sign.position.y=6.8;sign.castShadow=true;group.add(sign);
  const boxes:THREE.Matrix4[]=[],colors:THREE.Color[]=[];for(let x=-8.5;x<9;x++)for(let z=-1;z<1;z++){boxes.push(at(s,x,.043,new THREE.Vector3(1,.012,1),z));colors.push(new THREE.Color((Math.round(x+.5)+z)%2?'#dddace':'#25282b'));}instanced(scene,new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({roughness:.9}),boxes,false,colors);
}
function addPalms(scene:THREE.Scene,track:Track,rng:()=>number,roadSpace:RoadSpace,height:(x:number,z:number)=>number){
  const trunks:THREE.Matrix4[]=[],fronds:THREE.Matrix4[]=[];
  for(let d=30;d<track.length;d+=58){const s=track.sample(d);if(s.position.x>130)continue;for(const side of [-1,1]){if(rng()>.7)continue;const p=s.position.clone().addScaledVector(s.right,side*12.6);p.y=height(p.x,p.z)-.05;if(!roadSpace.place('palm',p.x,p.z,.4))continue;const h=8+rng()*4;trunks.push(matrix(p.clone().add(new THREE.Vector3(0,h/2,0)),new THREE.Vector3(.34,h,.34),rng()*6));for(let i=0;i<9;i++)fronds.push(matrix(p.clone().add(new THREE.Vector3(0,h,0)),new THREE.Vector3(1,1,1).multiplyScalar(.85+rng()*.25),i*Math.PI*2/9));}}
  instanced(scene,new THREE.CylinderGeometry(.55,1,1,10,8),new THREE.MeshStandardMaterial({map:tiled('bark-color.jpg',1,4),color:'#c2b397',roughness:.96}),trunks,true);
  const p:number[]=[],ix:number[]=[];
  const tri=(a:number[],b:number[],c:number[])=>{const i=p.length/3;p.push(...a,...b,...c);ix.push(i,i+1,i+2);};
  for(let i=1;i<24;i++){const t=i/24,z=t*4.7,y=Math.sin(t*Math.PI)*.5-t*t*1.8,len=Math.sin(t*Math.PI)*1.05;for(const side of [-1,1]){const a=[0,y,z-.07],b=[side*len,y-.17,z+.55],c=[0,y+.02,z+.12];tri(a,b,c);}}
  const leaf=new THREE.BufferGeometry();leaf.setAttribute('position',new THREE.Float32BufferAttribute(p,3));leaf.setIndex(ix);leaf.computeVertexNormals();instanced(scene,leaf,new THREE.MeshStandardMaterial({color:'#536a36',side:THREE.DoubleSide,roughness:.82}),fronds,true);
}
function addRoadsideDetail(scene:THREE.Scene,track:Track,height:(x:number,z:number)=>number,rng:()=>number,roadSpace:RoadSpace){
  const rocks:THREE.Matrix4[]=[],rockColors:THREE.Color[]=[],tufts:THREE.Matrix4[]=[],grassColors:THREE.Color[]=[];
  for(let d=18;d<track.length;d+=12){const s=track.sample(d);if(s.position.x>130)continue;
    for(const side of [-1,1]){
      if(rng()<.7){const p=s.position.clone().addScaledVector(s.right,side*(20+rng()*10));p.y=height(p.x,p.z);if(p.y>0){const size=1.3+rng()*3.4,scale=new THREE.Vector3(size*(1+rng()),size*.75,size*(.8+rng())),yaw=rng()*6.28,color=new THREE.Color().setHSL(.09,.12,.52+rng()*.22),radius=Math.max(scale.x,scale.z);if(roadSpace.place('rock',p.x,p.z,radius)){p.y=Math.min(p.y,height(p.x-radius*.6,p.z),height(p.x+radius*.6,p.z),height(p.x,p.z-radius*.6),height(p.x,p.z+radius*.6))+size*.32;rocks.push(matrix(p,scale,yaw));rockColors.push(color);}}}
      for(let i=0;i<24;i++){const p=s.position.clone().addScaledVector(s.right,side*(11.5+rng()*15)).addScaledVector(s.tangent,(rng()-.5)*12);p.y=height(p.x,p.z)-.08;if(p.y<0||!roadSpace.clear(p.x,p.z,1))continue;tufts.push(matrix(p,new THREE.Vector3(.55+rng()*.6,.35+rng()*.6,.55+rng()*.6),rng()*6.28));grassColors.push(new THREE.Color().setHSL(.12+rng()*.08,.22+rng()*.18,.22+rng()*.18));}
    }
  }
  const rock=mergeVertices(new THREE.IcosahedronGeometry(1,4)),positions=rock.attributes.position;
  for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),f=.9+.1*Math.sin(x*7+y*3)*Math.sin(z*6-y*5);positions.setXYZ(i,x*f,y*f,z*f);}rock.computeVertexNormals();
  instanced(scene,rock,new THREE.MeshStandardMaterial({map:tiled('ground-color.png',2),normalMap:tiled('ground-normal.png',2),normalScale:new THREE.Vector2(.7,.7),roughnessMap:tiled('ground-rough.png',2),roughness:1}),rocks,true,rockColors);
  const p:number[]=[],ix:number[]=[];
  for(let i=0;i<5;i++){const a=i*2.399,bend=.2+i*.03,base=p.length/3;for(const [w,y,b] of [[-.07,0,0],[.07,0,0],[-.035,.5,bend],[.035,.5,bend],[0,1,bend*1.5]])p.push(Math.cos(a)*w+Math.sin(a)*b,y,Math.sin(a)*w+Math.cos(a)*b);ix.push(base,base+2,base+1,base+1,base+2,base+3,base+2,base+4,base+3);}
  const grass=new THREE.BufferGeometry();grass.setAttribute('position',new THREE.Float32BufferAttribute(p,3));grass.setIndex(ix);grass.computeVertexNormals();
  const plants=instanced(scene,grass,new THREE.MeshStandardMaterial({side:THREE.DoubleSide,roughness:1}),tufts,false,grassColors);plants?.traverse(o=>{o.userData.skipAO=true;o.userData.detailDistance=130;});
}
function addVillas(scene:THREE.Scene,track:Track,height:(x:number,z:number)=>number,rng:()=>number,roadSpace:RoadSpace){
  const walls:THREE.Matrix4[]=[],roof:THREE.Matrix4[]=[],windows:THREE.Matrix4[]=[],frames:THREE.Matrix4[]=[],colors:THREE.Color[]=[];
  for(let d=45;d<track.length;d+=70){const s=track.sample(d);if(s.position.x>75)continue;const side=rng()>.5?1:-1,p=s.position.clone().addScaledVector(s.right,side*(37+rng()*26));p.y=height(p.x,p.z);if(p.y<0||p.y>s.position.y+35)continue;const w=8+rng()*7,h=6+rng()*6,depth=7+rng()*5;if(!roadSpace.place('villa',p.x,p.z,Math.hypot(w+1,depth+1)/2))continue;
    let lowest=p.y;for(const x of [-w/2,w/2])for(const z of [-depth/2,depth/2]){const corner=new THREE.Vector3(x,0,z).applyAxisAngle(UP,s.yaw).add(p);lowest=Math.min(lowest,height(corner.x,corner.z));}const foundation=p.y-lowest+.15;
    walls.push(matrix(p.clone().add(new THREE.Vector3(0,(h-foundation)/2,0)),new THREE.Vector3(w,h+foundation,depth),s.yaw));colors.push(new THREE.Color().setHSL(.08+rng()*.04,.18+rng()*.15,.63+rng()*.18));roof.push(matrix(p.clone().add(new THREE.Vector3(0,h+.8,0)),new THREE.Vector3(w+1,2.1,depth+1),s.yaw));
    for(const face of [-1,1])for(let x=-w/2+1.8;x<w/2;x+=2.5)for(let y=2;y<h-.5;y+=3){const point=new THREE.Vector3(x,y,face*(depth/2+.03)).applyAxisAngle(UP,s.yaw).add(p);windows.push(matrix(point,new THREE.Vector3(1.15,1.65,.07),s.yaw));frames.push(matrix(point.clone().add(new THREE.Vector3(0,-.9,0)),new THREE.Vector3(1.45,.14,.3),s.yaw));}
  }
  instanced(scene,new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({map:tiled('ground-color.png',2),normalMap:tiled('ground-normal.png',2),normalScale:new THREE.Vector2(.08,.08),roughness:.95}),walls,true,colors);
  const shape=new THREE.Shape();shape.moveTo(-.5,0);shape.lineTo(0,.5);shape.lineTo(.5,0);shape.closePath();const rg=new THREE.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false});rg.translate(0,0,-.5);
  instanced(scene,rg,new THREE.MeshStandardMaterial({color:'#a45e3d',map:tiled('bark-color.jpg',2),roughness:.88}),roof,true);
  instanced(scene,new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({color:'#244246',metalness:.5,roughness:.25}),windows,false);instanced(scene,new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({color:'#dfd2b3',roughness:.9}),frames,true);
}
function addCity(scene:THREE.Scene,track:Track,rng:()=>number,roadSpace:RoadSpace){
  const styles:THREE.BufferGeometry[][]=[[],[],[]],ledges:THREE.Matrix4[]=[],rooftops:THREE.Matrix4[]=[],baseBlocks:THREE.Matrix4[]=[],crowns:THREE.Matrix4[]=[],crownColors:THREE.Color[]=[];
  const block=(px:number,pz:number,y:number,w:number,h:number,d:number,style:number,color:THREE.Color)=>{
    const geo=new THREE.BoxGeometry(w,h,d);geo.translate(px,y+h/2,pz);const uv=geo.attributes.uv;
    for(let i=0;i<uv.count;i++){const face=Math.floor(i/4),horizontal=face<2?d:w;uv.setXY(i,uv.getX(i)*horizontal/12,uv.getY(i)*h/24);}
    const cs=[];for(let i=0;i<geo.attributes.position.count;i++)cs.push(color.r,color.g,color.b);geo.setAttribute('color',new THREE.Float32BufferAttribute(cs,3));styles[style].push(geo);
  };
  for(let x=-480;x<410;x+=48)for(let z=-430;z<410;z+=51){
    const px=x+rng()*12,pz=z+rng()*10,n=nearestRoad(track,px,pz);if(n.distance<30)continue;
    const style=Math.floor(rng()*3),w=18+rng()*15,d=18+rng()*15,h=24+Math.pow(rng(),1.6)*135;if(!roadSpace.place('building',px,pz,Math.hypot(w+2,d+2)/2))continue;
    const color=new THREE.Color().setHSL(style===1?.095:.57,.10+rng()*.12,.64+rng()*.22);
    // Stepped crowns, recessed upper floors and three facade families break up the skyline.
    if(h>80&&style!==1){
      block(px,pz,-2,w,h*.66,d,style,color);block(px,pz,h*.66-2,w*.82,h*.24,d*.82,style,color);block(px,pz,h*.9-2,w*.61,h*.1,d*.61,style,color);
      for(const [y,scale] of [[h*.66,1.02],[h*.9,.84],[h,.63]])ledges.push(matrix(new THREE.Vector3(px,y-1.9,pz),new THREE.Vector3(w*scale,.6,d*scale)));
      for(const side of [-1,1]){crowns.push(matrix(new THREE.Vector3(px+side*w*.32,h-1.35,pz),new THREE.Vector3(.1,.18,d*.64)));crownColors.push(new THREE.Color(style===0?'#8cd5dc':'#e9ba88'));}
    }else{
      block(px,pz,-2,w,h,d,style,color);ledges.push(matrix(new THREE.Vector3(px,h-1.85,pz),new THREE.Vector3(w+.8,.55,d+.8)));
      if(style===1)for(let y=10;y<h;y+=9)ledges.push(matrix(new THREE.Vector3(px,y-2,pz),new THREE.Vector3(w+.3,.2,d+.3)));
    }
    rooftops.push(matrix(new THREE.Vector3(px,h+.5,pz),new THREE.Vector3(w*.25,3,d*.25)));
    baseBlocks.push(matrix(new THREE.Vector3(px,.5,pz),new THREE.Vector3(w+2,5,d+2)));
    if(style===2&&h>95){const antenna=new THREE.Mesh(new THREE.CylinderGeometry(.08,.18,14,6),new THREE.MeshStandardMaterial({color:'#8a959c',metalness:.7,roughness:.4}));antenna.position.set(px,h+6,pz);scene.add(antenna);const beacon=new THREE.Mesh(new THREE.SphereGeometry(.22,6,4),new THREE.MeshBasicMaterial({color:new THREE.Color(3,.06,.015)}));beacon.position.set(px,h+13,pz);scene.add(beacon);}
  }
  styles.forEach((geometries,style)=>{
    const maps=facadeTextures(style),material=new THREE.MeshPhysicalMaterial({map:maps.color,emissiveMap:maps.light,roughnessMap:maps.roughness,emissive:'#ffffff',emissiveIntensity:1.45,vertexColors:true,roughness:1,metalness:style===1?.12:.45,clearcoat:style===1?0:.25});
    const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(geometry)scene.add(spatialMesh(geometry,material,true));
  });
  instanced(scene,new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({color:'#687780',metalness:.35,roughness:.55}),ledges,true);
  instanced(scene,new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({color:'#353f49',roughness:.7}),rooftops,true);
  instanced(scene,new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({color:'#5e6466',roughness:.8}),baseBlocks,true);
  instanced(scene,new THREE.BoxGeometry(),new THREE.MeshBasicMaterial({color:new THREE.Color(2,2,2)}),crowns,false,crownColors);
  for(let i=0;i<8;i++){const s=track.sample(i/8*track.length+35),p=s.position.clone().addScaledVector(s.right,i%2?33:-33);const board=new THREE.Mesh(new THREE.PlaneGeometry(13,5),new THREE.MeshStandardMaterial({map:signTexture(['NOVA / MOTORS','AFTER / HOURS','APEX / RUSH','PURE / VELOCITY'][i%4],i%2?'#e6b67c':'#6ed7e6','NEON HARBOR'),emissive:'#ffffff',emissiveIntensity:1,side:THREE.DoubleSide}));board.position.copy(p);board.position.y+=12;board.rotation.y=s.yaw+Math.PI;scene.add(board);}
}
function facadeTextures(style:number){
  const c=document.createElement('canvas');c.width=384;c.height=768;
  const ctx=c.getContext('2d')!,e=c.cloneNode() as HTMLCanvasElement,ec=e.getContext('2d')!,r=c.cloneNode() as HTMLCanvasElement,rc=r.getContext('2d')!,rng=random(917+style*133);
  ctx.fillStyle=['#334957','#777467','#233f50'][style];ctx.fillRect(0,0,c.width,c.height);ec.fillStyle='#000';ec.fillRect(0,0,e.width,e.height);rc.fillStyle='#b8b8b8';rc.fillRect(0,0,r.width,r.height);
  for(let y=0;y<768;y+=96)for(let x=0;x<384;x+=96){
    const lit=rng()>(style===1?.42:.60),inset=style===1?18:6,width=96-inset*2,height=style===1?65:79;
    ctx.fillStyle=lit?'#969b96':['#264555','#344148','#1b354c'][style];ctx.fillRect(x+inset,y+8,width,height);
    rc.fillStyle=style===1?'#777777':'#474747';rc.fillRect(x+inset,y+8,width,height);
    if(lit){
      const gradient=ec.createLinearGradient(0,y,0,y+90);gradient.addColorStop(0,rng()>.35?'#a69b84':'#8ca7af');gradient.addColorStop(1,'#4b473d');ec.fillStyle=gradient;ec.fillRect(x+inset,y+8,width,height);
      // Recessed ceilings, individual blinds and furniture give lit rooms depth.
      ec.fillStyle='#262c30';ec.fillRect(x+inset,y+8,width,8+rng()*9);
      if(rng()>.6){ec.fillStyle='#6c6d62';ec.fillRect(x+inset,y+21,width,18+rng()*15);}
      ec.fillStyle='#292e30';for(let k=0;k<3;k++)if(rng()>.4)ec.fillRect(x+inset+5+k*width/3,y+height-10,7,15+rng()*7);
    }
    for(const target of [ctx,ec]){target.fillStyle=target===ctx?'#1a2933':'#10171c';target.fillRect(x+47,y+8,2,height);}
    ctx.fillStyle=style===1?'#9c9887':'#6c7d86';ctx.fillRect(x,y+91,96,style===1?5:2);ctx.fillStyle='#172b38';ctx.fillRect(x,0,2,768);
  }
  const color=new THREE.CanvasTexture(c),light=new THREE.CanvasTexture(e),roughness=new THREE.CanvasTexture(r);
  for(const t of [color,light,roughness]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;}color.colorSpace=light.colorSpace=THREE.SRGBColorSpace;return {color,light,roughness};
}
function addMarina(scene:THREE.Scene){
  const hullMaterial=new THREE.MeshStandardMaterial({color:'#dddcd2',roughness:.35,metalness:.15}),glass=new THREE.MeshStandardMaterial({color:'#233e49',metalness:.55,roughness:.15});
  for(let i=0;i<7;i++){const group=new THREE.Group();group.position.set(280+i*17,-9.65,-125+(i%2)*22);group.rotation.y=.25;scene.add(group);const hull=new THREE.Mesh(new THREE.CapsuleGeometry(1,6,3,8),hullMaterial);hull.rotation.x=Math.PI/2;hull.scale.set(1,.95,.55);group.add(hull);const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.5,.95,2.8),glass);cabin.position.set(0,.8,-.4);group.add(cabin);const deck=new THREE.Mesh(new THREE.BoxGeometry(1.85,.12,3.2),hullMaterial);deck.position.set(0,1.35,-.5);group.add(deck);}
}

/** Development audit: actual terrain triangles and independently measured scenery footprints. */
export function auditRoad(world:World,track:Track){
  world.scene.updateMatrixWorld(true);
  const terrain=world.scene.getObjectByName('terrain'),ray=new THREE.Raycaster(),violations:{kind:string;distance:number;lateral?:number;clearance:number}[]=[];
  let samples=0,minTerrainClearance=Infinity,minSceneryClearance=Infinity;
  if(terrain)for(let d=0;d<track.length;d+=3)for(const lateral of [-9,-4.5,0,4.5,9]){
    const sample=track.sample(d),p=sample.position.clone().addScaledVector(sample.right,lateral);ray.set(new THREE.Vector3(p.x,1000,p.z),new THREE.Vector3(0,-1,0));
    const hit=ray.intersectObject(terrain,true)[0];if(hit){const clearance=p.y-hit.point.y;minTerrainClearance=Math.min(minTerrainClearance,clearance);if(clearance<.05)violations.push({kind:'terrain',distance:d,lateral,clearance});}samples++;
  }
  for(const item of world.roadSpace.placements){
    let distance=Infinity;for(const s of track.samples)distance=Math.min(distance,Math.hypot(item.x-s.position.x,item.z-s.position.z));
    const clearance=distance-track.width/2-item.radius;minSceneryClearance=Math.min(minSceneryClearance,clearance);if(clearance<1.9)violations.push({kind:item.kind,distance,clearance});
  }
  const kinds:Record<string,number>={};for(const p of world.roadSpace.placements)kinds[p.kind]=(kinds[p.kind]??0)+1;
  return {track:track.id,samples,kinds,placements:world.roadSpace.placements.length,minTerrainClearance:Number.isFinite(minTerrainClearance)?minTerrainClearance:null,minSceneryClearance,violations};
}
