import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { Sky } from 'three/addons/objects/Sky.js';
import type { Quality } from './content';
import { publicUrl } from './urls';
import {ResolutionGovernor} from './performance';

// Transparent effects and leaf cards should not become solid silhouettes in the AO buffer.
class ContactAOPass extends GTAOPass {
  override render(renderer:THREE.WebGLRenderer,writeBuffer:THREE.WebGLRenderTarget,readBuffer:THREE.WebGLRenderTarget,deltaTime:number,maskActive:boolean){
    const hidden:THREE.Object3D[]=[],center=new THREE.Vector3();
    this.scene.traverse(object=>{
      if(!(object instanceof THREE.Mesh)||!object.visible)return;
      const materials=Array.isArray(object.material)?object.material:[object.material];
      const bounds=object instanceof THREE.InstancedMesh?object.boundingSphere:object.geometry.boundingSphere;
      const distant=bounds&&center.copy(bounds.center).applyMatrix4(object.matrixWorld).distanceTo(this.camera.position)>90+bounds.radius;
      if(object instanceof Sky||object.userData.skipAO||distant||materials.some(m=>m.transparent||m.alphaTest>0)){hidden.push(object);object.visible=false;}
    });
    try {super.render(renderer,writeBuffer,readBuffer,deltaTime,maskActive);}finally{hidden.forEach(object=>object.visible=true);}
  }
}

export class RenderSystem {
  renderer: THREE.WebGLRenderer;
  camera=new THREE.PerspectiveCamera(40,1,.1,3500);
  scene=new THREE.Scene();
  composer: EffectComposer;
  renderPass: RenderPass;
  bloom: UnrealBloomPass;
  ao: ContactAOPass;
  quality: Quality='high';
  environment?: THREE.Texture;skyBackground?:THREE.Texture;
  probes=new WeakMap<THREE.Scene,THREE.WebGLRenderTarget>();
  ready: Promise<void>;
  width=1; height=1;governor=new ResolutionGovernor();
  constructor(container:HTMLElement) {
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.85;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.info.autoReset=false;
    this.renderer.domElement.id='game-canvas';this.renderer.domElement.setAttribute('aria-label','3D racing game');container.append(this.renderer.domElement);
    const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});
    this.composer=new EffectComposer(this.renderer,target);this.renderPass=new RenderPass(this.scene,this.camera);this.composer.addPass(this.renderPass);
    this.ao=new ContactAOPass(this.scene,this.camera,1,1);this.ao.blendIntensity=.45;
    this.ao.updateGtaoMaterial({radius:1.2,distanceExponent:1.5,thickness:1.5,distanceFallOff:.8,scale:1,samples:12,screenSpaceRadius:false});
    this.ao.updatePdMaterial({radius:3,rings:2,samples:8});this.composer.addPass(this.ao);
    this.bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.16,.55,1.6);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
    const pmrem=new THREE.PMREMGenerator(this.renderer);
    const room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.04).texture;room.dispose();this.scene.environment=this.environment;
    this.ready=new HDRLoader().loadAsync(publicUrl('assets/venice_sunset_1k.hdr')).then(hdr=>{
      const old=this.environment;this.environment=pmrem.fromEquirectangular(hdr).texture;this.scene.environment=this.environment;old?.dispose();hdr.mapping=THREE.EquirectangularReflectionMapping;this.skyBackground=hdr;pmrem.dispose();
    }).catch(()=>{pmrem.dispose();});
    this.resize();window.addEventListener('resize',()=>this.resize());
  }
  setScene(scene:THREE.Scene) {this.scene=scene;scene.environment=this.probes.get(scene)?.texture??this.environment??null;this.renderPass.scene=scene;this.ao.scene=scene;}
  captureEnvironment(scene:THREE.Scene,position:THREE.Vector3,hidden:THREE.Object3D[]=[]){
    if(this.probes.has(scene))return;
    const target=new THREE.WebGLCubeRenderTarget(128,{type:THREE.HalfFloatType}),camera=new THREE.CubeCamera(.25,1500,target);
    camera.position.copy(position);const visibility=hidden.map(o=>o.visible),shadows=this.renderer.shadowMap.enabled,probeOnly:THREE.Object3D[]=[];
    scene.traverse(o=>{if(o.userData.probeOnly)probeOnly.push(o);});
    const generator=new THREE.PMREMGenerator(this.renderer);
    try{
      hidden.forEach(o=>o.visible=false);probeOnly.forEach(o=>o.visible=true);this.renderer.shadowMap.enabled=false;
      scene.updateMatrixWorld(true);camera.update(this.renderer,scene);
      const probe=generator.fromCubemap(target.texture);this.probes.set(scene,probe);scene.environment=probe.texture;
    }finally{hidden.forEach((o,i)=>o.visible=visibility[i]);probeOnly.forEach(o=>o.visible=false);this.renderer.shadowMap.enabled=shadows;target.dispose();generator.dispose();}
  }
  async captureEnvironmentStaged(scene:THREE.Scene,position:THREE.Vector3,checkpoint:(label:string)=>Promise<void>){
    if(this.probes.has(scene))return;
    const renderer=this.renderer,target=new THREE.WebGLCubeRenderTarget(128,{type:THREE.HalfFloatType});
    const cube=new THREE.CubeCamera(.25,1500,target);cube.position.copy(position);cube.coordinateSystem=renderer.coordinateSystem;cube.updateCoordinateSystem();cube.updateMatrixWorld(true);
    const oldTarget=renderer.getRenderTarget(),oldFace=renderer.getActiveCubeFace(),oldMip=renderer.getActiveMipmapLevel(),shadows=renderer.shadowMap.enabled;
    const generator=new THREE.PMREMGenerator(renderer);target.texture.generateMipmaps=false;
    try{
      renderer.shadowMap.enabled=false;scene.updateMatrixWorld(true);
      for(let face=0;face<6;face++){
        await checkpoint(`Lighting the circuit · ${face+1} / 6`);
        renderer.setRenderTarget(target,face);renderer.render(scene,cube.children[face] as THREE.Camera);renderer.setRenderTarget(oldTarget,oldFace,oldMip);
      }
      await checkpoint('Finishing the reflections…');
      const probe=generator.fromCubemap(target.texture);this.probes.set(scene,probe);scene.environment=probe.texture;
    }finally{renderer.setRenderTarget(oldTarget,oldFace,oldMip);renderer.shadowMap.enabled=shadows;target.dispose();generator.dispose();}
  }
  setQuality(quality:Quality) {
    this.quality=quality;
    this.governor.reset();
    this.updateResolution();
    this.renderer.shadowMap.enabled=quality!=='low';this.bloom.enabled=this.ao.enabled=quality==='high'||quality==='ultra';this.resize();
  }
  setAdaptive(enabled:boolean){this.governor.enabled=enabled;this.governor.reset();this.updateResolution();this.resize();}
  sampleFrame(seconds:number,active:boolean){if(this.governor.sample(seconds,active)){this.updateResolution();this.resize();}}
  updateResolution(){
    const ratios={low:.75,medium:1,high:1.5,ultra:2};
    const pixels=this.quality==='ultra'?3840*2160:2560*1440;
    const cap=Math.sqrt(pixels/Math.max(1,innerWidth*innerHeight));
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,ratios[this.quality],cap)*this.governor.scale);
  }
  resize() {this.updateResolution();this.width=window.innerWidth;this.height=window.innerHeight;this.camera.aspect=this.width/this.height;this.camera.updateProjectionMatrix();this.renderer.setSize(this.width,this.height);this.composer.setPixelRatio(this.renderer.getPixelRatio());this.composer.setSize(this.width,this.height);const scale=this.renderer.getPixelRatio()*(this.quality==='ultra'?.75:.5);this.ao.setSize(Math.max(1,Math.round(this.width*scale)),Math.max(1,Math.round(this.height*scale)));}
  render() { this.renderer.info.reset();if(this.bloom.enabled)this.composer.render();else this.renderer.render(this.scene,this.camera); }
}

export function createShowroom() {
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#353534');
  scene.fog=new THREE.FogExp2('#353534',.031);
  scene.environmentIntensity=1.05;
  const group=new THREE.Group();
  scene.add(group);

  const floor=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({
    color:'#333331',roughness:.48,metalness:.12,
  }));
  floor.rotation.x=-Math.PI/2;
  floor.position.y=-.034;
  floor.receiveShadow=true;
  scene.add(floor);

  // A soft contact patch grounds the car even on presets without shadow maps.
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=128;
  const context=canvas.getContext('2d')!;
  const gradient=context.createRadialGradient(64,64,6,64,64,64);
  gradient.addColorStop(0,'rgba(3,3,3,.9)');
  gradient.addColorStop(.46,'rgba(3,3,3,.65)');
  gradient.addColorStop(1,'rgba(3,3,3,0)');
  context.fillStyle=gradient;
  context.fillRect(0,0,128,128);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({
    map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false,
  }));
  shadow.rotation.x=-Math.PI/2;
  shadow.position.y=-.022;
  group.add(shadow);

  scene.add(new THREE.HemisphereLight('#eef1f5','#57534d',.74));
  const key=new THREE.DirectionalLight('#fff2da',2.1);
  key.position.set(3,7,5);
  key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);
  Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-6});
  key.shadow.normalBias=.025;
  key.shadow.bias=-.0001;
  scene.add(key);
  const rim=new THREE.DirectionalLight('#e2eaff',1.4);
  rim.position.set(-5,3,-2.5);
  scene.add(rim);
  const fill=new THREE.DirectionalLight('#f9fafb',.55);
  fill.position.set(3,1,-6);
  scene.add(fill);

  // Off-camera panels are captured into the reflection probe.
  const softbox=new THREE.MeshBasicMaterial({color:new THREE.Color(2.45,2.35,2.22),side:THREE.DoubleSide});
  for(const [x,y,z,width,height] of [[-5,4,1,2.6,8],[3,6,-1,4.5,7],[1,3,6,6,1.2]]){
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(width,height),softbox);
    panel.position.set(x,y,z);
    panel.lookAt(0,.35,0);
    panel.userData.probeOnly=true;
    panel.visible=false;
    scene.add(panel);
  }
  return {scene,group,shadow};
}
