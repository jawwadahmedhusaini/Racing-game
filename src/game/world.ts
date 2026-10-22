import * as THREE from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {Track} from './track';
import {asphaltMaterial,terrainMaterial,tiled,surface,random,signTexture} from './materials';
import {addTrees} from './vegetation';

export interface World {scene:THREE.Scene;sun:THREE.DirectionalLight;update:(time:number,position:THREE.Vector3,forward?:THREE.Vector3)=>void;}
const UP=new THREE.Vector3(0,1,0);
const smooth=(a:number,b:number,x:number)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export function createWorld(track:Track):World {
  const night=track.id==='city',scene=new THREE.Scene(),rng=random(night?312:809),half=track.width/2;
  const fog=night?'#172436':'#a7b7bd';scene.background=new THREE.Color(fog);scene.fog=new THREE.FogExp2(fog,night?.0024:.00105);scene.environmentIntensity=night?.45:.8;
  scene.add(new THREE.HemisphereLight(night?'#a1bfed':'#b8d3ee',night?'#1e2029':'#6c644e',night?.45:.65));
  const sunDirection=new THREE.Vector3(-.65,.48,-.5).normalize();
  const sun=new THREE.DirectionalLight(night?'#9bbbed':'#ffe4bd',night?.8:3.3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-48,right:48,top:48,bottom:-48,near:5,far:450});sun.shadow.bias=-.00009;sun.shadow.normalBias=.025;sun.shadow.radius=2;scene.add(sun,sun.target);
  const sky=new Sky();sky.scale.setScalar(3000);sky.material.uniforms.turbidity.value=night?6:3.1;sky.material.uniforms.rayleigh.value=night?.35:2;sky.material.uniforms.mieCoefficient.value=.003;sky.material.uniforms.mieDirectionalG.value=.82;sky.material.uniforms.sunPosition.value.copy(night?new THREE.Vector3(-.7,-.12,-.5):sunDirection);scene.add(sky);
  // Bound atmospheric radiance before bloom; a bright horizon must not wash out the whole frame.
  sky.material.fragmentShader=sky.material.fragmentShader.replace('gl_FragColor = vec4( texColor, 1.0 );','texColor *= 1.35 / max(1.35, max(texColor.r, max(texColor.g, texColor.b))); gl_FragColor = vec4(texColor, 1.0);');
  const water=createWater(night,sunDirection);scene.add(water);
  const nearest=(x:number,z:number)=>nearestRoad(track,x,z);
  const groundHeight=(x:number,z:number)=>{
    if(night)return -2;
    const dx=(x+250)/450,dz=(z+50)/590;
    let h=-25+Math.max(0,1-dx*dx-dz*dz)*105;
    h+=Math.exp(-((x+680)**2/95000+(z-30)**2/260000))*180;
    h+=(Math.sin(x*.018+Math.sin(z*.013)*2)*Math.sin(z*.021)+Math.sin(x*.041-z*.029)*.35)*13;
    h+=Math.sin(x*.133+z*.09)*Math.sin(z*.111)*2.3;
    const n=nearest(x,z),isBridge=n.sample.position.x>145;
    if(!isBridge){const blend=1-smooth(13,58,n.distance);h=THREE.MathUtils.lerp(h,n.sample.position.y-.38,blend);}
    return h;
  };
  if(!night){
    const grid=new THREE.PlaneGeometry(1900,1700,240,220);grid.rotateX(-Math.PI/2);const a=grid.attributes.position;
    for(let i=0;i<a.count;i++){const x=a.getX(i)-130,z=a.getZ(i);a.setXYZ(i,x,groundHeight(x,z),z);grid.attributes.uv.setXY(i,x*.095,z*.095);}grid.computeVertexNormals();
    const terrain=new THREE.Mesh(grid,terrainMaterial());terrain.receiveShadow=true;scene.add(terrain);
  }else{
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(1400,1400),new THREE.MeshStandardMaterial({color:'#283438',map:tiled('ground-color.png',70),normalMap:tiled('ground-normal.png',70),roughness:.8}));ground.rotation.x=-Math.PI/2;ground.position.set(-120,-2,0);ground.receiveShadow=true;scene.add(ground);
  }
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

  const poleTransforms:THREE.Matrix4[]=[],armTransforms:THREE.Matrix4[]=[],bulbs:THREE.Matrix4[]=[];
  for(let d=18;d<track.length;d+=night?38:64){const s=track.sample(d);for(const side of night?[-1,1]:[1]){
    poleTransforms.push(at(s,side*(half+1.5),4.3,new THREE.Vector3(.12,8.6,.12)));
    armTransforms.push(at(s,side*(half+.35),8.4,new THREE.Vector3(2.5,.10,.12)));
    bulbs.push(at(s,side*(half-.8),8.32,new THREE.Vector3(.85,.07,.34)));
  }}
  instanced(scene,new THREE.CylinderGeometry(.7,1,1,10),darkMetal,poleTransforms,true);instanced(scene,new THREE.BoxGeometry(),darkMetal,armTransforms,true);
  instanced(scene,new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({color:'#fff2d9',emissive:night?'#ffcf8c':'#ffffff',emissiveIntensity:night?4:.3,roughness:.2}),bulbs,false);

  if(night)addCity(scene,track,rng);else{
    addVillas(scene,track,groundHeight,rng);
    addPalms(scene,track,rng);
    addRoadsideDetail(scene,track,groundHeight,rng);
    const near:THREE.Matrix4[]=[],far:THREE.Matrix4[]=[];
    for(let d=25;d<track.length;d+=27){const s=track.sample(d);if(s.position.x>130)continue;for(const side of [-1,1]){
      const p=s.position.clone().addScaledVector(s.right,side*(20+rng()*16));p.y=groundHeight(p.x,p.z);if(p.y<0||p.y>s.position.y+22)continue;
      near.push(matrix(p,new THREE.Vector3(1,1.05+rng()*.5,1).multiplyScalar(.75+rng()*.45),rng()*Math.PI*2));
    }}
    for(let i=0;i<260;i++){const x=-680+rng()*830,z=-620+rng()*1200,n=nearest(x,z),y=groundHeight(x,z);if(y<8||y>180||n.distance<35)continue;far.push(matrix(new THREE.Vector3(x,y,z),new THREE.Vector3(1,1.1,1).multiplyScalar(.75+rng()*.65),rng()*6.28));}
    addTrees(scene,near,far);
    addMarina(scene);
  }
  addGantry(scene,track,night);
  const rs=track.sample(track.length*.18+7),ramp=new THREE.Mesh(new THREE.BoxGeometry(4.8,.32,14),new THREE.MeshStandardMaterial({color:night?'#37596a':'#7b6751',roughness:.65,metalness:.3}));ramp.position.copy(rs.position).addScaledVector(rs.right,5.5);ramp.position.y+=.7;ramp.rotation.set(-.1,rs.yaw,0,'YXZ');ramp.receiveShadow=true;scene.add(ramp);
  for(let i=-4;i<6;i+=3){const bar=new THREE.Mesh(new THREE.BoxGeometry(4.7,.02,.25),new THREE.MeshStandardMaterial({color:'#e1ac55',roughness:.75}));bar.position.set(0,.17,i);ramp.add(bar);}
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
  return {scene,sun,update(time,position,forward=new THREE.Vector3(0,0,1)){
    water.material.uniforms.time.value=time;
    sun.position.copy(position).addScaledVector(sunDirection,180);sun.target.position.copy(position);
    if(night){const n=nearest(position.x,position.z);streetLights.forEach((light,i)=>{const d=Math.floor(n.progress/38)*38+18+(i-1)*38,s=track.sample(d);light.position.copy(s.position).addScaledVector(s.right,half-.8);light.position.y+=8.2;light.target.position.copy(s.position);});headlights.forEach((light,i)=>{const right=new THREE.Vector3().crossVectors(forward,UP);light.position.copy(position).addScaledVector(right,(i-.5)*1.6).addScaledVector(forward,1.7);light.position.y+=.55;light.target.position.copy(position).addScaledVector(forward,28);light.target.position.y-=.25;});}
  }};
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
function instanced(scene:THREE.Scene,geo:THREE.BufferGeometry,material:THREE.Material,transforms:THREE.Matrix4[],cast=false,colors?:THREE.Color[]){if(!transforms.length){geo.dispose();return;}const mesh=new THREE.InstancedMesh(geo,material,transforms.length);transforms.forEach((m,i)=>{mesh.setMatrixAt(i,m);if(colors)mesh.setColorAt(i,colors[i]);});mesh.castShadow=cast;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);return mesh;}
function ribbon(track:Track,left:number,right:number,height:number,material:THREE.Material){
  const p:number[]=[],uv:number[]=[],ix:number[]=[];
  for(let i=0;i<=track.count;i++){const s=track.samples[i%track.count];for(const x of [left,right]){const v=s.position.clone().addScaledVector(s.right,x);p.push(v.x,v.y+height,v.z);uv.push(x===left?0:1,i/track.count);}if(i<track.count){const a=i*2;ix.push(a,a+1,a+2,a+2,a+1,a+3);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();const mesh=new THREE.Mesh(g,material);mesh.receiveShadow=true;return mesh;
}
function wallRibbon(track:Track,side:number,top:number,bottom:number,material:THREE.Material){
  const p:number[]=[],uv:number[]=[],ix:number[]=[];for(let i=0;i<=track.count;i++){const s=track.samples[i%track.count],v=s.position.clone().addScaledVector(s.right,side);for(const h of [top,bottom]){p.push(v.x,v.y+h,v.z);uv.push(i/track.count*track.length/5,h===top?0:1);}if(i<track.count){const a=i*2;ix.push(a,a+1,a+2,a+2,a+1,a+3);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();const m=new THREE.Mesh(g,material);m.material=material.clone();(m.material as THREE.MeshStandardMaterial).side=THREE.DoubleSide;m.receiveShadow=true;return m;
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
function addPalms(scene:THREE.Scene,track:Track,rng:()=>number){
  const trunks:THREE.Matrix4[]=[],fronds:THREE.Matrix4[]=[];
  for(let d=30;d<track.length;d+=58){const s=track.sample(d);if(s.position.x>130)continue;for(const side of [-1,1]){if(rng()>.7)continue;const p=s.position.clone().addScaledVector(s.right,side*12.6);p.y-=.35;const h=8+rng()*4;trunks.push(matrix(p.clone().add(new THREE.Vector3(0,h/2,0)),new THREE.Vector3(.34,h,.34),rng()*6));for(let i=0;i<9;i++)fronds.push(matrix(p.clone().add(new THREE.Vector3(0,h,0)),new THREE.Vector3(1,1,1).multiplyScalar(.85+rng()*.25),i*Math.PI*2/9));}}
  instanced(scene,new THREE.CylinderGeometry(.55,1,1,10,8),new THREE.MeshStandardMaterial({map:tiled('bark-color.jpg',1,4),color:'#c2b397',roughness:.96}),trunks,true);
  const p:number[]=[],ix:number[]=[];
  const tri=(a:number[],b:number[],c:number[])=>{const i=p.length/3;p.push(...a,...b,...c);ix.push(i,i+1,i+2);};
  for(let i=1;i<24;i++){const t=i/24,z=t*4.7,y=Math.sin(t*Math.PI)*.5-t*t*1.8,len=Math.sin(t*Math.PI)*1.05;for(const side of [-1,1]){const a=[0,y,z-.07],b=[side*len,y-.17,z+.55],c=[0,y+.02,z+.12];tri(a,b,c);}}
  const leaf=new THREE.BufferGeometry();leaf.setAttribute('position',new THREE.Float32BufferAttribute(p,3));leaf.setIndex(ix);leaf.computeVertexNormals();instanced(scene,leaf,new THREE.MeshStandardMaterial({color:'#536a36',side:THREE.DoubleSide,roughness:.82}),fronds,true);
}
function addRoadsideDetail(scene:THREE.Scene,track:Track,height:(x:number,z:number)=>number,rng:()=>number){
  const rocks:THREE.Matrix4[]=[],rockColors:THREE.Color[]=[],tufts:THREE.Matrix4[]=[],grassColors:THREE.Color[]=[];
  for(let d=18;d<track.length;d+=12){const s=track.sample(d);if(s.position.x>130)continue;
    for(const side of [-1,1]){
      if(rng()<.7){const p=s.position.clone().addScaledVector(s.right,side*(20+rng()*10));p.y=height(p.x,p.z);if(p.y>0){const size=1.3+rng()*3.4;p.y+=size*.32;rocks.push(matrix(p,new THREE.Vector3(size*(1+rng()),size*.75,size*(.8+rng())),rng()*6.28));rockColors.push(new THREE.Color().setHSL(.09,.12,.52+rng()*.22));}}
      for(let i=0;i<24;i++){const p=s.position.clone().addScaledVector(s.right,side*(11.5+rng()*15)).addScaledVector(s.tangent,(rng()-.5)*12);p.y=height(p.x,p.z)-.08;if(p.y<0)continue;tufts.push(matrix(p,new THREE.Vector3(.55+rng()*.6,.35+rng()*.6,.55+rng()*.6),rng()*6.28));grassColors.push(new THREE.Color().setHSL(.12+rng()*.08,.22+rng()*.18,.22+rng()*.18));}
    }
  }
  const rock=mergeVertices(new THREE.IcosahedronGeometry(1,4)),positions=rock.attributes.position;
  for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),f=.9+.1*Math.sin(x*7+y*3)*Math.sin(z*6-y*5);positions.setXYZ(i,x*f,y*f,z*f);}rock.computeVertexNormals();
  instanced(scene,rock,new THREE.MeshStandardMaterial({map:tiled('ground-color.png',2),normalMap:tiled('ground-normal.png',2),normalScale:new THREE.Vector2(.7,.7),roughnessMap:tiled('ground-rough.png',2),roughness:1}),rocks,true,rockColors);
  const p:number[]=[],ix:number[]=[];
  for(let i=0;i<5;i++){const a=i*2.399,bend=.2+i*.03,base=p.length/3;for(const [w,y,b] of [[-.07,0,0],[.07,0,0],[-.035,.5,bend],[.035,.5,bend],[0,1,bend*1.5]])p.push(Math.cos(a)*w+Math.sin(a)*b,y,Math.sin(a)*w+Math.cos(a)*b);ix.push(base,base+2,base+1,base+1,base+2,base+3,base+2,base+4,base+3);}
  const grass=new THREE.BufferGeometry();grass.setAttribute('position',new THREE.Float32BufferAttribute(p,3));grass.setIndex(ix);grass.computeVertexNormals();
  const plants=instanced(scene,grass,new THREE.MeshStandardMaterial({side:THREE.DoubleSide,roughness:1}),tufts,false,grassColors);if(plants)plants.userData.skipAO=true;
}
function addVillas(scene:THREE.Scene,track:Track,height:(x:number,z:number)=>number,rng:()=>number){
  const walls:THREE.Matrix4[]=[],roof:THREE.Matrix4[]=[],windows:THREE.Matrix4[]=[],frames:THREE.Matrix4[]=[],colors:THREE.Color[]=[];
  for(let d=45;d<track.length;d+=70){const s=track.sample(d);if(s.position.x>75)continue;const side=rng()>.5?1:-1,p=s.position.clone().addScaledVector(s.right,side*(37+rng()*26));p.y=height(p.x,p.z);if(p.y<0||p.y>s.position.y+35)continue;const w=8+rng()*7,h=6+rng()*6,depth=7+rng()*5;
    walls.push(matrix(p.clone().add(new THREE.Vector3(0,h/2,0)),new THREE.Vector3(w,h,depth),s.yaw));colors.push(new THREE.Color().setHSL(.08+rng()*.04,.18+rng()*.15,.63+rng()*.18));roof.push(matrix(p.clone().add(new THREE.Vector3(0,h+.8,0)),new THREE.Vector3(w+1,2.1,depth+1),s.yaw));
    for(const face of [-1,1])for(let x=-w/2+1.8;x<w/2;x+=2.5)for(let y=2;y<h-.5;y+=3){const point=new THREE.Vector3(x,y,face*(depth/2+.03)).applyAxisAngle(UP,s.yaw).add(p);windows.push(matrix(point,new THREE.Vector3(1.15,1.65,.07),s.yaw));frames.push(matrix(point.clone().add(new THREE.Vector3(0,-.9,0)),new THREE.Vector3(1.45,.14,.3),s.yaw));}
  }
  instanced(scene,new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({map:tiled('ground-color.png',2),normalMap:tiled('ground-normal.png',2),normalScale:new THREE.Vector2(.08,.08),roughness:.95}),walls,true,colors);
  const shape=new THREE.Shape();shape.moveTo(-.5,0);shape.lineTo(0,.5);shape.lineTo(.5,0);shape.closePath();const rg=new THREE.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false});rg.translate(0,0,-.5);
  instanced(scene,rg,new THREE.MeshStandardMaterial({color:'#a45e3d',map:tiled('bark-color.jpg',2),roughness:.88}),roof,true);
  instanced(scene,new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({color:'#244246',metalness:.5,roughness:.25}),windows,false);instanced(scene,new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({color:'#dfd2b3',roughness:.9}),frames,true);
}
function addCity(scene:THREE.Scene,track:Track,rng:()=>number){
  const geometries:THREE.BufferGeometry[]=[],ledges:THREE.Matrix4[]=[],rooftops:THREE.Matrix4[]=[],baseBlocks:THREE.Matrix4[]=[];
  for(let x=-480;x<410;x+=48)for(let z=-430;z<410;z+=51){const px=x+rng()*12,pz=z+rng()*10,n=nearestRoad(track,px,pz);if(n.distance<29)continue;const w=18+rng()*15,d=18+rng()*15,h=24+Math.pow(rng(),1.6)*135,p=new THREE.Vector3(px,h/2-2,pz);
    const geo=new THREE.BoxGeometry(w,h,d);geo.translate(p.x,p.y,p.z);const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++){const face=Math.floor(i/4),horizontal=face<2?d:w;uv.setXY(i,uv.getX(i)*horizontal/12,uv.getY(i)*h/24);}const color=new THREE.Color().setHSL(.56+rng()*.06,.12+rng()*.15,.48+rng()*.23),cs=[];for(let i=0;i<geo.attributes.position.count;i++)cs.push(color.r,color.g,color.b);geo.setAttribute('color',new THREE.Float32BufferAttribute(cs,3));geometries.push(geo);
    ledges.push(matrix(new THREE.Vector3(px,h-1.85,pz),new THREE.Vector3(w+.8,.55,d+.8)));
    for(let y=12;y<h;y+=18)ledges.push(matrix(new THREE.Vector3(px,y-2,pz),new THREE.Vector3(w+.4,.23,d+.4)));
    rooftops.push(matrix(new THREE.Vector3(px,h+1.4,pz),new THREE.Vector3(w*.45,5,d*.45)));
    baseBlocks.push(matrix(new THREE.Vector3(px,1,pz),new THREE.Vector3(w+3,6,d+3)));
  }
  const maps=facadeTextures(),material=new THREE.MeshPhysicalMaterial({map:maps.color,emissiveMap:maps.light,emissive:'#ffdab0',emissiveIntensity:.95,vertexColors:true,roughness:.32,metalness:.42,clearcoat:.25});
  const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(geometry){const buildings=new THREE.Mesh(geometry,material);buildings.castShadow=true;buildings.receiveShadow=true;scene.add(buildings);}
  instanced(scene,new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({color:'#5c6871',metalness:.35,roughness:.55}),ledges,true);
  instanced(scene,new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({color:'#353f49',roughness:.7}),rooftops,true);
  instanced(scene,new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({color:'#5e6466',roughness:.8}),baseBlocks,true);
  for(let i=0;i<8;i++){const s=track.sample(i/8*track.length+35),p=s.position.clone().addScaledVector(s.right,i%2?33:-33);const board=new THREE.Mesh(new THREE.PlaneGeometry(13,5),new THREE.MeshStandardMaterial({map:signTexture(['NOVA / MOTORS','AFTER / HOURS','APEX / RUSH','PURE / VELOCITY'][i%4],i%2?'#e6b67c':'#6ed7e6','NEON HARBOR'),emissive:'#ffffff',emissiveIntensity:1,side:THREE.DoubleSide}));board.position.copy(p);board.position.y+=12;board.rotation.y=s.yaw+Math.PI;scene.add(board);}
}
function facadeTextures(){
  const c=document.createElement('canvas');c.width=384;c.height=768;const ctx=c.getContext('2d')!,e=c.cloneNode() as HTMLCanvasElement,ec=e.getContext('2d')!,rng=random(917);ctx.fillStyle='#283741';ctx.fillRect(0,0,c.width,c.height);ec.fillStyle='#000000';ec.fillRect(0,0,e.width,e.height);
  for(let y=0;y<768;y+=96)for(let x=0;x<384;x+=96){const light=rng()>.54;ctx.fillStyle=light?'#8a918d':'#334d5b';ctx.fillRect(x+7,y+7,82,75);ctx.fillStyle='#1b2832';ctx.fillRect(x+44,y+7,3,75);ctx.fillStyle='#81919a';ctx.fillRect(x,0,2,768);ctx.fillStyle='#4c5862';ctx.fillRect(x,y+87,96,8);if(light){ec.fillStyle=rng()>.25?'#a48c64':'#839bac';ec.fillRect(x+8,y+9,80,71);ec.fillStyle='#1c1e20';ec.fillRect(x+44,y+7,3,76);for(let k=0;k<3;k++)if(rng()>.45)ec.fillRect(x+12+k*22,y+59,9,21);}}
  const color=new THREE.CanvasTexture(c),light=new THREE.CanvasTexture(e);for(const t of [color,light]){t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;}return {color,light};
}
function addMarina(scene:THREE.Scene){
  const hullMaterial=new THREE.MeshStandardMaterial({color:'#dddcd2',roughness:.35,metalness:.15}),glass=new THREE.MeshStandardMaterial({color:'#233e49',metalness:.55,roughness:.15});
  for(let i=0;i<7;i++){const group=new THREE.Group();group.position.set(280+i*17,-9.65,-125+(i%2)*22);group.rotation.y=.25;scene.add(group);const hull=new THREE.Mesh(new THREE.CapsuleGeometry(1,6,3,8),hullMaterial);hull.rotation.x=Math.PI/2;hull.scale.set(1,.95,.55);group.add(hull);const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.5,.95,2.8),glass);cabin.position.set(0,.8,-.4);group.add(cabin);const deck=new THREE.Mesh(new THREE.BoxGeometry(1.85,.12,3.2),hullMaterial);deck.position.set(0,1.35,-.5);group.add(deck);}
}
