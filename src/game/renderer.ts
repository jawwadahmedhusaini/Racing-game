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

// Transparent effects and leaf cards should not become solid silhouettes in the AO buffer.
class ContactAOPass extends GTAOPass {
  override render(renderer:THREE.WebGLRenderer,writeBuffer:THREE.WebGLRenderTarget,readBuffer:THREE.WebGLRenderTarget,deltaTime:number,maskActive:boolean){
    const hidden:THREE.Object3D[]=[];
    this.scene.traverse(object=>{
      if(!(object instanceof THREE.Mesh)||!object.visible)return;
      const materials=Array.isArray(object.material)?object.material:[object.material];
      if(object instanceof Sky||object.userData.skipAO||materials.some(m=>m.transparent||m.alphaTest>0)){hidden.push(object);object.visible=false;}
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
  ready: Promise<void>;
  width=1; height=1;
  constructor(container:HTMLElement) {
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.85;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.info.autoReset=false;
    this.renderer.domElement.id='game-canvas';this.renderer.domElement.setAttribute('aria-label','3D racing game');container.append(this.renderer.domElement);
    const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});
    this.composer=new EffectComposer(this.renderer,target);this.renderPass=new RenderPass(this.scene,this.camera);this.composer.addPass(this.renderPass);
    this.ao=new ContactAOPass(this.scene,this.camera,1,1);this.ao.blendIntensity=.7;
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
  setScene(scene:THREE.Scene) {this.scene=scene;scene.environment=this.environment??null;if(scene.userData.useHDRSky&&this.skyBackground){scene.background=this.skyBackground;scene.backgroundIntensity=.85;scene.backgroundBlurriness=.025;scene.backgroundRotation.y=.5;}this.renderPass.scene=scene;this.ao.scene=scene;}
  setQuality(quality:Quality) {
    this.quality=quality;
    const ratios={low:.75,medium:1,high:1.5,ultra:2};
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,ratios[quality]));
    this.renderer.shadowMap.enabled=quality!=='low';this.bloom.enabled=this.ao.enabled=quality==='high'||quality==='ultra';this.resize();
  }
  resize() {this.width=window.innerWidth;this.height=window.innerHeight;this.camera.aspect=this.width/this.height;this.camera.updateProjectionMatrix();this.renderer.setSize(this.width,this.height);this.composer.setPixelRatio(this.renderer.getPixelRatio());this.composer.setSize(this.width,this.height);const scale=this.renderer.getPixelRatio()*(this.quality==='ultra'?.75:.5);this.ao.setSize(Math.max(1,Math.round(this.width*scale)),Math.max(1,Math.round(this.height*scale)));}
  render() { this.renderer.info.reset();if(this.bloom.enabled)this.composer.render();else this.renderer.render(this.scene,this.camera); }
}

export function createShowroom() {
  const scene=new THREE.Scene();scene.background=new THREE.Color('#0c151e');scene.fog=new THREE.FogExp2('#0c151e',.023);scene.environmentIntensity=.4;
  const group=new THREE.Group();scene.add(group);
  const floorMaterial=new THREE.MeshStandardMaterial({color:'#18232d',metalness:.12,roughness:.65});
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=-.08;floor.receiveShadow=true;scene.add(floor);
  const platform=new THREE.Mesh(new THREE.CylinderGeometry(4.1,4.25,.14,100),new THREE.MeshStandardMaterial({color:'#222c35',metalness:.28,roughness:.5}));platform.position.y=-.045;platform.receiveShadow=true;scene.add(platform);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(4.12,.012,5,150),new THREE.MeshBasicMaterial({color:'#8de0e5',transparent:true,opacity:.65}));ring.rotation.x=Math.PI/2;ring.position.y=.02;scene.add(ring);
  for(let i=0;i<40;i++) {
    const a=i*Math.PI/20;
    const tick=new THREE.Mesh(new THREE.BoxGeometry(.018,.004,i%5===0?.16:.06),new THREE.MeshBasicMaterial({color:i%5===0?'#9bb7c1':'#44545c'}));tick.position.set(Math.sin(a)*3.92,.03,Math.cos(a)*3.92);tick.rotation.y=a;scene.add(tick);
  }
  const ambient=new THREE.HemisphereLight('#c4e4ff','#263238',.65);scene.add(ambient);
  const key=new THREE.DirectionalLight('#f3f6ff',1.6);key.position.set(3,8,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=6;key.shadow.camera.bottom=-6;key.shadow.normalBias=.03;key.shadow.bias=-.0001;scene.add(key);
  const rim=new THREE.DirectionalLight('#87d2e9',1.0);rim.position.set(-4,3,-4);scene.add(rim);
  const warm=new THREE.PointLight('#ff8159',9,12,2);warm.position.set(-3,2,1);scene.add(warm);
  // Architectural light bars and wall ribs give the garage real depth.
  const lit=new THREE.MeshBasicMaterial({color:'#b0e8ed',toneMapped:false});
  for(let i=-5;i<=5;i++) {
    const rib=new THREE.Mesh(new THREE.BoxGeometry(.12,7,.2),new THREE.MeshStandardMaterial({color:'#293944',metalness:.7,roughness:.4}));rib.position.set(i*2,3,-9);scene.add(rib);
    if(i%2===0){const bar=new THREE.Mesh(new THREE.BoxGeometry(.025,5,.03),lit);bar.position.set(i*2-.12,2.8,-8.85);scene.add(bar);}
  }
  const ceiling=new THREE.Mesh(new THREE.BoxGeometry(12,.03,.13),lit);ceiling.position.set(0,6,-2);ceiling.rotation.z=-.10;scene.add(ceiling);
  return {scene,group};
}
