import '@fontsource/rajdhani/latin-500.css';
import '@fontsource/rajdhani/latin-600.css';
import '@fontsource/rajdhani/latin-700.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import './style.css';
import * as THREE from 'three';
import {RenderSystem,createShowroom} from './game/renderer';
import {createCar,loadVehicleAsset,trimVehicleCache,vehicleAssetKey,vehicleCacheStats,type CarModel} from './game/car';
import {CARS,EVENTS,type RaceMode,type TrackId,type Quality,type Difficulty} from './game/content';
import {Track} from './game/track';
import {createWorld,auditRoad,type World} from './game/world';
import {RaceSimulation,NO_INPUT,type Controls} from './game/simulation';
import {InputSystem} from './game/input';
import {AudioSystem} from './game/audio';
import {Effects} from './game/effects';
import {loadSave,saveProgress,buyCar,upgradeCar,SAVE_KEY} from './game/storage';
import {UI,type Result} from './ui/ui';
import {logo} from './ui/icons';
import {loadSurfaceAssets} from './game/materials';
import {loadVegetation} from './game/vegetation';
import {claimPlaySession} from './game/session';
import {abortable} from './game/preparation';
import {RAMP,surfaceTilt} from './game/ramp';
import {RaceCamera} from './game/camera';

const app=document.getElementById('app')!;
const loading=document.createElement('div');loading.className='loading';loading.innerHTML=`<span class="brand">${logo}<span>APEX<span class="brand-small">RUSH</span></span></span><div class="loading-bar"></div><p>PREPARING YOUR NEXT GREAT DRIVE</p>`;app.append(loading);
let game:Game;
class Game {
  vehicleRequest=0;vehicleLoading=false;vehicleStatus=document.createElement('output');
  preparation?:AbortController;pauseAfterLoad=false;loadMetrics:{totalMs:number;cancelled:boolean;stages:{label:string;elapsedSinceYieldMs:number}[]}={totalMs:0,cancelled:false,stages:[]};
  ready:Promise<void>;graphicsLost=false;performanceDisplay=document.createElement('output');storageNotice=document.createElement('div');render:RenderSystem;ui:UI;input=new InputSystem();save=loadSave();audio=new AudioSystem(this.save.settings);
  showroom=createShowroom();garageCar:CarModel;raceCars:CarModel[]=[];worlds=new Map<TrackId,{track:Track;world:World}>();
  simulation?:RaceSimulation;effects?:Effects;world?:World;paused=false;cameraMode=0;accumulator=0;lastTime=0;hudTime=0;
  raceCamera=new RaceCamera();rotation=.0;dragging=false;dragX=0;cameraInitialized=false;result?:Result;lastCountdown=4;
  fps=0;frames=0;fpsTimer=0;raceCompleted=false;settingsFromPause=false;lastRace={track:'coast' as TrackId,mode:'quick' as RaceMode,event:0};
  constructor(){
    this.render=new RenderSystem(app);const uiRoot=document.createElement('div');uiRoot.id='ui';app.append(uiRoot);this.ui=new UI(uiRoot,this.save);
    this.garageCar=createCar(CARS.find(c=>c.id===this.save.selected)!,this.save.paints[this.save.selected]);this.showroom.group.add(this.garageCar.group);this.render.setScene(this.showroom.scene);this.render.setQuality(this.save.settings.quality);
    this.ui.onAction=(action,value)=>this.action(action,value);this.input.onPause=()=>{if(this.preparation){this.preparation.abort();return;}if(this.simulation&&this.ui.screen==='racing')this.paused?(document.getElementById('modal')?.classList.contains('pause-modal')?this.resume():this.ui.pause()):this.pause();else this.ui.closeModal();};this.input.onCamera=()=>{if(this.ui.screen==='racing'&&!this.paused)this.cameraMode=(this.cameraMode+1)%3;};this.input.onRecover=()=>this.recover();this.input.autoAccelerate=this.save.settings.autoAccelerate;
    this.render.setAdaptive(this.save.settings.adaptiveResolution);this.performanceDisplay.className='performance-display';this.performanceDisplay.setAttribute('aria-label','Rendering performance');app.append(this.performanceDisplay);this.storageNotice.className='storage-notice';this.storageNotice.hidden=true;this.storageNotice.setAttribute('role','status');this.storageNotice.textContent='Progress is not saving — browser storage is unavailable.';app.append(this.storageNotice);
    this.vehicleStatus.className='vehicle-status';this.vehicleStatus.hidden=true;this.vehicleStatus.setAttribute('role','status');app.append(this.vehicleStatus);
    this.ui.viewed=Math.max(0,CARS.findIndex(c=>c.id===this.save.selected));this.ui.garage();this.applyQuality();
    this.render.renderer.domElement.addEventListener('pointerdown',e=>{if(this.ui.screen!=='garage')return;this.dragging=true;this.dragX=e.clientX;this.render.renderer.domElement.setPointerCapture(e.pointerId);});
    this.render.renderer.domElement.addEventListener('pointermove',e=>{if(this.dragging){this.rotation+=(e.clientX-this.dragX)*.008;this.dragX=e.clientX;}});this.render.renderer.domElement.addEventListener('pointerup',()=>this.dragging=false);this.render.renderer.domElement.addEventListener('pointercancel',()=>this.dragging=false);this.render.renderer.domElement.addEventListener('lostpointercapture',()=>this.dragging=false);window.addEventListener('blur',()=>this.dragging=false);
    this.render.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.graphicsLost=true;this.preparation?.abort();this.input.clear();this.audio.muted=true;if(this.simulation)this.pause();showFatal('Graphics interrupted','The browser lost its graphics connection. Reload to restart the game. Your last saved garage and completed races will be restored.');});
    document.addEventListener('visibilitychange',()=>{this.audio.muted=document.hidden||this.graphicsLost;if(document.hidden){this.audio.cancelPreview();this.audio.update(null,false);}if(document.hidden&&this.preparation)this.pauseAfterLoad=true;if(document.hidden&&this.ui.screen==='racing'&&!this.paused)this.pause();});window.addEventListener('blur',()=>{if(this.preparation)this.pauseAfterLoad=true;this.audio.cancelPreview();if(this.ui.screen==='racing'&&!this.paused)this.pause();else this.audio.update(null,false);});
    window.addEventListener('storage',e=>{if(e.key===SAVE_KEY)this.saveConflict();});
    document.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const modal=document.getElementById('modal');if(!modal)return;const elements=[...modal.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]')];if(!elements.length)return;const first=elements[0],last=elements.at(-1)!;if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
    this.ready=Promise.all([this.render.ready,document.fonts.ready]).then(()=>{this.render.captureEnvironment(this.showroom.scene,new THREE.Vector3(0,1.2,0),[this.showroom.group]);loading.style.opacity='0';setTimeout(()=>loading.remove(),600);});
    requestAnimationFrame(t=>this.frame(t));
  }
  persist(){const result=saveProgress(this.save);this.storageNotice.hidden=result!=='unavailable';if(result==='conflict')this.saveConflict();}
  saveConflict(){this.graphicsLost=true;this.input.clear();this.audio.muted=true;if(this.simulation)this.pause();showFatal('Progress changed in another tab','Reload to use the latest saved progress. This tab has stopped so it cannot overwrite your other session.');}
  cancelVehicleLoad(){this.vehicleRequest++;this.vehicleLoading=false;this.vehicleStatus.hidden=true;}
  async selectCar(index:number){
    const spec=CARS[index];if(!spec)return;const request=++this.vehicleRequest;
    if(this.garageCar.group.name===spec.name){this.vehicleLoading=false;this.vehicleStatus.hidden=true;this.ui.garage(index);return;}
    this.vehicleLoading=true;this.vehicleStatus.textContent=`Loading ${spec.maker} ${spec.name}…`;this.vehicleStatus.hidden=false;
    try{
      await loadVehicleAsset(spec);
      if(request!==this.vehicleRequest||this.graphicsLost)return;
      const next=createCar(spec,this.save.paints[spec.id]);
      this.garageCar.group.removeFromParent();this.garageCar.dispose();this.garageCar=next;this.showroom.group.add(next.group);this.rotation=0;
      if(this.save.owned.includes(spec.id)){this.save.selected=spec.id;this.persist();}this.ui.garage(index);
    }catch(error){if(request===this.vehicleRequest&&!this.graphicsLost)this.ui.toast('This car could not load. Select it again to retry.');}
    finally{if(request===this.vehicleRequest){this.vehicleLoading=false;this.vehicleStatus.hidden=true;}if(!this.preparation)trimVehicleCache();}
  }
  async action(action:string,value:string){
    if(this.graphicsLost)return;
    if(this.vehicleLoading&&['paint','buy','upgrade','rev','start'].includes(action)){this.ui.toast('Your car is still loading. Please wait a moment.');return;}
    if(this.preparation){if(action==='cancel-load'){this.preparation.abort();this.ui.loadProgress('Returning to race selection…',0);}return;}
    if(action!=='setting')void this.audio.start().catch(()=>{});if(!['paint','setting'].includes(action))this.audio.tone(680,.05,.07);
    switch(action){
      case 'garage':this.leaveRace();this.ui.garage();break;
      case 'rev':await this.audio.start().catch(()=>{});this.audio.preview(CARS[this.ui.viewed].id);break;
      case 'car':this.audio.cancelPreview();void this.selectCar(Number(value));break;
      case 'paint':{const id=CARS[this.ui.viewed].id;this.save.paints[id]=value;this.garageCar.paint.color.set(value);this.persist();this.ui.garage();break;}
      case 'buy':if(buyCar(this.save,value)){this.persist();this.ui.garage();this.ui.toast('Welcome to your garage. Your new car is ready.');}else this.ui.toast('Keep racing to earn more credits.');break;
      case 'upgrade':{const id=CARS[this.ui.viewed].id;if(upgradeCar(this.save,id)){this.persist();this.ui.garage();this.ui.toast('Performance upgrade installed. More power. More speed.');}else this.ui.toast('Not enough credits for this upgrade.');break;}
      case 'race-select':this.leaveRace();this.ui.mode='quick';this.ui.select();break;
      case 'track':this.ui.selectedTrack=value as TrackId;this.ui.select();break;
      case 'mode':this.ui.mode=value as RaceMode;this.ui.select();break;
      case 'career':this.leaveRace();this.ui.career();break;
      case 'event':this.ui.careerIndex=Number(value);if(this.ui.careerIndex<=this.save.career){const event=EVENTS[this.ui.careerIndex];this.startRace(event.track,'career',this.ui.careerIndex);}break;
      case 'start':this.startRace(this.ui.selectedTrack,this.ui.mode);break;
      case 'replay':case 'restart':this.startRace(this.lastRace.track,this.lastRace.mode,this.lastRace.event);break;
      case 'pause':this.pause();break;
      case 'resume':this.resume();break;
      case 'recover':this.recover();break;
      case 'settings':this.settingsFromPause=this.ui.screen==='racing';if(this.settingsFromPause&&!this.paused)this.pause();this.ui.settings(this.settingsFromPause);break;
      case 'controls':this.ui.controls();break;
      case 'credits':this.ui.credits();break;
      case 'close-modal':if(this.ui.screen==='racing'&&this.paused)this.ui.pause();else this.ui.closeModal();break;
      case 'setting':{const [key,val]=value.split(':');const settings=this.save.settings;if(key==='quality'){settings.quality=val as Quality;this.render.setQuality(settings.quality);this.applyQuality();}else if(key==='adaptiveResolution'){settings.adaptiveResolution=val==='true';this.render.setAdaptive(settings.adaptiveResolution);}else if(key==='reducedMotion')settings.reducedMotion=val==='true';else if(key==='showPerformance')settings.showPerformance=val==='true';else if(key==='difficulty')settings.difficulty=val as Difficulty;else if(key==='autoAccelerate'){settings.autoAccelerate=val==='true';this.input.autoAccelerate=settings.autoAccelerate;}else if(['engine','music','effects'].includes(key))settings[key as 'engine']=Number(val);this.persist();break;}
    }
  }
  async startRace(trackId:TrackId,mode:RaceMode,event=0){
    if(this.preparation||this.graphicsLost)return;
    this.cancelVehicleLoad();
    const controller=new AbortController();this.preparation=controller;this.pauseAfterLoad=false;
    const started=performance.now();let lastYield=started,progress=0;
    this.loadMetrics={totalMs:0,cancelled:false,stages:[]};
    const checkpoint=async(label:string,value?:number)=>{
      this.loadMetrics.stages.push({label,elapsedSinceYieldMs:performance.now()-lastYield});
      progress=value??Math.min(62,progress+2);this.ui.loadProgress(label,progress);
      // Let the loading card paint and input events run between construction stages.
      await new Promise<void>(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
      if(controller.signal.aborted||this.graphicsLost)throw new DOMException('Race preparation cancelled','AbortError');
      lastYield=performance.now();
    };
    this.audio.cancelPreview();this.disposeRace();this.paused=false;this.raceCompleted=false;this.cameraInitialized=false;this.accumulator=0;this.lastCountdown=4;this.input.clear();this.ui.closeModal();this.ui.preparing(trackId);this.audio.update(null,false);
    try{
      await checkpoint('Preparing the circuit…',2);
      let cached=this.worlds.get(trackId);
      if(!cached){const track=new Track(trackId);const world=await createWorld(track,checkpoint);cached={track,world};this.worlds.set(trackId,cached);}
      await checkpoint('Setting the light…',65);
      this.render.governor.reset();this.render.resize();this.world=cached.world;this.render.setScene(this.world.scene);this.applyQuality();
      const grid=cached.track.sample(0);this.world.update(0,grid.position,grid.tangent);await this.render.captureEnvironmentStaged(this.world.scene,grid.position.clone().add(new THREE.Vector3(0,2,0)),label=>checkpoint(label,Math.min(69,progress+.5)));
      this.render.camera.clearViewOffset();this.render.renderer.toneMappingExposure=trackId==='city'?.95:.9;
      this.simulation=new RaceSimulation({car:CARS.find(c=>c.id===this.save.selected)!,track:cached.track,mode,difficulty:this.save.settings.difficulty,upgrade:this.save.upgrades[this.save.selected]??0});
      await checkpoint('Loading the race grid…',69);
      const vehicles=this.simulation.drivers.map(d=>loadVehicleAsset(d.spec,true));vehicles.push(loadVehicleAsset(this.simulation.player.spec));
      await abortable(Promise.all(vehicles),controller.signal);
      for(const [i,d] of this.simulation.drivers.entries()){
        await checkpoint(`Preparing car ${i+1} of ${this.simulation.drivers.length}…`,70+i*3);
        const car=createCar(d.spec,i===0?(this.save.paints[d.spec.id]??d.spec.color):['#a6bdc7','#e5dcba','#5f73b3','#82cdb9','#ea564b','#287c86'][i-1],i!==0||this.save.settings.quality==='low');
        car.group.userData.detailLevel=i===0&&this.save.settings.quality!=='low';car.group.traverse(o=>{if(o instanceof THREE.Mesh&&i!==0)o.castShadow=false;});this.world.scene.add(car.group);this.raceCars.push(car);
      }
      trimVehicleCache([vehicleAssetKey(this.simulation.player.spec),vehicleAssetKey(this.simulation.player.spec,true)]);
      this.effects=new Effects(this.world.scene);this.updateRaceView(1/60,performance.now()/1000);
      await checkpoint('Warming up the graphics…',90);
      await abortable(this.render.renderer.compileAsync(this.world.scene,this.render.camera),controller.signal);
      await checkpoint('Ready at the starting line…',94);
      this.render.render(); // Upload textures and warm the first frame before starting the countdown.
      await checkpoint('Ready to race',100);
      this.lastRace={track:trackId,mode,event};this.ui.hud(this.simulation);this.ui.updateHUD(this.simulation);
      // Keep keys deliberately pressed during loading; focus loss and pause still clear them.
      this.accumulator=0;this.lastTime=performance.now();this.render.governor.reset();
      if(this.pauseAfterLoad||document.hidden)this.pause();
    }catch(error){
      this.loadMetrics.cancelled=controller.signal.aborted;
      this.leaveRace();this.ui.select();
      if(!controller.signal.aborted&&!this.graphicsLost){console.error(error);this.ui.toast('The race could not prepare. Try again or choose a lower graphics setting.');}
    }finally{
      this.loadMetrics.totalMs=performance.now()-started;this.preparation=undefined;
    }
  }
  applyQuality(){
    const quality=this.save.settings.quality,size={low:256,medium:1024,high:2048,ultra:4096}[quality];
    for(const scene of [this.showroom.scene,...[...this.worlds.values()].map(w=>w.world.scene)]){
      scene.userData.quality=quality;
      scene.traverse(o=>{
        if(o instanceof THREE.DirectionalLight&&o.castShadow&&o.shadow.mapSize.x!==size){o.shadow.mapSize.set(size,size);o.shadow.map?.dispose();o.shadow.map=null;}
        if(o instanceof THREE.LOD&&o.userData.treeLOD)o.levels[1].distance={low:0,medium:75,high:115,ultra:170}[quality];
      });
    }
    const player=this.raceCars[0],detailed=quality!=='low';
    if(player&&player.group.userData.detailLevel!==detailed){
      const spec=this.simulation!.player.spec,car=createCar(spec,this.save.paints[spec.id],!detailed);
      car.group.userData.detailLevel=detailed;player.group.removeFromParent();player.dispose();this.raceCars[0]=car;this.world!.scene.add(car.group);
    }
  }
  recover(){if(this.ui.screen==='racing'&&!this.paused&&!this.raceCompleted){this.simulation?.recover();this.cameraInitialized=false;}}
  pause(){if(this.ui.screen!=='racing')return;this.paused=true;this.input.clear();this.ui.pause();this.audio.update(null,false);}
  resume(){this.paused=false;this.input.clear();this.ui.closeModal();this.accumulator=0;}
  disposeRace(){this.raceCars.forEach(c=>{c.group.removeFromParent();c.dispose();});this.raceCars=[];this.effects?.dispose();this.effects=undefined;this.simulation=undefined;}
  leaveRace(){this.cancelVehicleLoad();this.disposeRace();this.paused=false;this.ui.closeModal();this.render.setScene(this.showroom.scene);this.render.renderer.toneMappingExposure=.85;void this.selectCar(this.ui.viewed);trimVehicleCache();this.input.clear();}
  completeRace(){
    if(!this.simulation||this.raceCompleted)return;this.raceCompleted=true;const sim=this.simulation,pos=sim.resultPosition;
    const reward=sim.player.eliminated?Math.max(200,900-pos*90):sim.mode==='time'?1100:[2200,1700,1400,1100,900,750][pos-1]??750;
    const stars=sim.player.eliminated?0:pos===1?3:pos<=3?2:1;let careerBonus=0;
    if(sim.mode==='career'){const e=EVENTS[this.lastRace.event];if(this.lastRace.event===this.save.career&&pos<=e.target&&!sim.player.eliminated){careerBonus=e.reward;this.save.career++;this.save.stars+=stars;}}
    this.save.credits+=reward+careerBonus;this.save.races++;if(pos===1&&!sim.player.eliminated)this.save.wins++;
    const key=`${sim.track.id}-v7-${sim.mode}`,time=sim.player.finishTime??sim.elapsed,best=!sim.player.eliminated&&(!this.save.bestTimes[key]||time<this.save.bestTimes[key]);if(best)this.save.bestTimes[key]=time;
    this.persist();this.result={position:pos,reward,careerBonus,stars,time,best,eliminated:sim.player.eliminated};this.audio.tone(pos===1?880:440,.6,.25);this.ui.results(sim,this.result);this.input.clear();
  }
  updateRaceView(dt:number,time:number){
    const sim=this.simulation!;
    const moving=!this.preparation&&!this.paused&&!this.raceCompleted;
    for(const d of sim.drivers){const car=this.raceCars[d.id],s=sim.track.sample(d.distance),tilt=surfaceTilt(s.tangent.y,d.heading,d.rampLift>0);car.group.position.copy(s.position).addScaledVector(s.right,d.lateral);car.group.position.y+=d.airborne+d.rampLift+.025;car.group.rotation.set(d.airborne>0?-Math.atan2(d.verticalSpeed,Math.max(12,Math.abs(d.speed)))*.65:tilt.pitch,s.yaw+d.heading,d.airborne>0?0:tilt.roll,'YXZ');car.group.visible=!d.eliminated;car.update(moving?d.speed:0,d.steer,d.drift,d.boost,d.id===0?this.input.read().brake>0:d.acceleration<-5,time,moving?d.acceleration:0,moving?d.landingImpact:0);}
    const player=sim.player,car=this.raceCars[0],s=sim.track.sample(player.distance);
    const forward=new THREE.Vector3(Math.sin(s.yaw+player.heading),s.tangent.y,Math.cos(s.yaw+player.heading)).normalize();
    if(!this.cameraInitialized){this.raceCamera.reset();this.cameraInitialized=true;}
    this.raceCamera.update(this.render.camera,sim.track,player,car.group.position,dt,time,this.cameraMode,moving,this.save.settings.reducedMotion);
    this.world!.update(time,car.group.position,forward);if(moving)this.effects?.update(dt,player,car.group.position,s.yaw+player.heading,-Math.asin(s.tangent.y),new THREE.Vector3().crossVectors(s.right,s.tangent).normalize());
  }
  frame(now:number){
    if(this.graphicsLost||this.preparation){this.lastTime=now;requestAnimationFrame(t=>this.frame(t));return;}
    const rawDelta=(now-this.lastTime)/1000||1/60,dt=Math.min(.1,rawDelta);this.lastTime=now;this.fpsTimer+=rawDelta;this.frames++;if(this.fpsTimer>=1){this.fps=Math.round(this.frames/this.fpsTimer);this.frames=0;this.fpsTimer=0;}
    if(this.simulation){
      if(!this.paused&&!this.raceCompleted){this.accumulator+=dt;let count=0;while(this.accumulator>=1/60&&count++<8){this.simulation.step(1/60,this.input.read());this.accumulator-=1/60;}
        const cd=Math.ceil(this.simulation.countdown);if(cd!==this.lastCountdown&&cd>=0){this.lastCountdown=cd;this.audio.tone(cd===0?1100:550,.12,.22);}if(this.simulation.status==='finished')this.completeRace();}
      this.updateRaceView(dt,now/1000);this.hudTime+=dt;if(this.hudTime>.08){this.ui.updateHUD(this.simulation);this.hudTime=0;}
      this.audio.update(this.simulation.player,!this.paused&&this.simulation.status!=='finished',this.simulation.drivers,this.simulation.track.length,this.cameraMode,this.simulation.status==='countdown'?this.input.read().throttle:null);
    }else {
      const mobile=this.render.width<600,landscape=this.render.height<550&&this.render.width>600;
      this.garageCar.group.rotation.y=this.rotation+(mobile?.15:-.28)+Math.sin(now*.00017)*.08;
      const bounds=this.garageCar.dimensions;
      const horizontalHalfFov=Math.atan(Math.tan(39*Math.PI/360)*this.render.camera.aspect);
      const distance=mobile?Math.max(15.3,(Math.hypot(bounds.x,bounds.z)/2+.25)/Math.sin(horizontalHalfFov)):9.1;this.render.camera.fov=mobile?39:38;this.render.camera.position.set(distance*.70,mobile?3.6:3.0,distance*.71);this.render.camera.lookAt(0,.6,0);
      if(mobile)this.render.camera.setViewOffset(this.render.width,this.render.height,0,this.render.height*.03,this.render.width,this.render.height);
      else this.render.camera.setViewOffset(this.render.width,this.render.height,-this.render.width*.16,landscape?this.render.height*.10:this.render.height*.035,this.render.width,this.render.height);
      this.render.camera.updateProjectionMatrix();this.audio.update(null,false);
    }
    this.render.sampleFrame(rawDelta,!document.hidden&&!this.paused);
    this.performanceDisplay.hidden=!this.save.settings.showPerformance;
    if(this.save.settings.showPerformance){const ratio=this.render.renderer.getPixelRatio();this.performanceDisplay.textContent=`${this.fps} FPS · ${this.fps?Math.round(1000/this.fps):'—'} ms · ${Math.round(this.render.width*ratio)} × ${Math.round(this.render.height*ratio)} · ${this.render.quality.toUpperCase()}${this.save.settings.adaptiveResolution?' · AUTO':''}`;}
    this.render.render();requestAnimationFrame(t=>this.frame(t));
  }
}
function showFatal(title:string,message:string){
  if(document.querySelector('.fatal'))return;
  loading.remove();const fatal=document.createElement('section');fatal.className='fatal';fatal.setAttribute('role','alert');
  const heading=document.createElement('h1');heading.textContent=title;const description=document.createElement('p');description.textContent=message;
  const retry=document.createElement('button');retry.className='primary';retry.textContent='RELOAD GAME';retry.onclick=()=>location.reload();fatal.append(heading,description,retry);app.append(fatal);retry.focus();
}
let startupStage='assets';
try {if(!await claimPlaySession()){showFatal('The game is open in another tab','Close the other APEX RUSH tab, then reload here. One active session protects your credits and race progress.');}else{await Promise.all([loadVehicleAsset(CARS.find(c=>c.id===loadSave().selected)!),loadSurfaceAssets(),loadVegetation()]);startupStage='graphics';game=new Game();await game.ready;}}
catch(error){console.error(error);showFatal(startupStage==='assets'?'Game files could not load':'Graphics could not start',startupStage==='assets'?'Check your connection, then reload to retry the download. If you are playing the ZIP, keep the web folder intact and run the included launcher.':'Use a current Chrome, Edge, Firefox or Safari browser with WebGL 2 and hardware acceleration enabled, then reload.');}

// Development-only observability. Production builds do not expose test controls or progression cheats.
if(import.meta.env.DEV)Object.defineProperty(window,'__apex',{get:()=>({
  auditRoad:()=>auditRoad(game.world!,game.simulation!.track),
  viewAt:(distance:number)=>{const sim=game.simulation!;sim.recover();sim.lastEvent='';sim.eventTimer=0;sim.player.distance=distance;sim.player.speed=0;game.cameraInitialized=false;game.updateRaceView(1/60,performance.now()/1000);game.render.render();},
  wallScenario:(side:number,kind:'glance'|'head-on'|'slide')=>{const sim=game.simulation!;if(sim.mode!=='time')throw new Error('Wall diagnostics require time attack');sim.recover();const d=sim.player;Object.assign(d,{distance:120,heading:kind==='slide'?0:-Math.sign(side)*(kind==='head-on'?Math.PI/2:.55),speed:kind==='slide'?0:kind==='head-on'?20:35,sideSpeed:kind==='slide'?10:0,impactYaw:0,impactSerial:0});d.lateral=kind==='slide'?0:Math.sign(side)*(sim.roadClearance(d)-.12);game.cameraInitialized=false;game.updateRaceView(1/60,performance.now()/1000);game.ui.updateHUD(sim);},
  rampScenario:(scenario:'edge'|'side'|'back')=>{const sim=game.simulation!;if(sim.mode!=='time')throw new Error('Ramp diagnostics require time attack');sim.recover();const start=sim.track.length*RAMP.fraction;Object.assign(sim.player,{distance:start+(scenario==='edge'?-7:scenario==='side'?7:RAMP.length+3),lateral:scenario==='back'?5.5:RAMP.left-.2,speed:scenario==='edge'?30:scenario==='back'?-10:0});game.cameraInitialized=false;game.updateRaceView(1/60,performance.now()/1000);game.ui.updateHUD(sim);return {start,lip:start+RAMP.length};},
  pose:()=>{const sim=game.simulation!,s=sim.track.sample(sim.player.distance);game.render.camera.updateMatrixWorld();return {position:s.position.addScaledVector(s.right,sim.player.lateral).toArray(),worldYaw:s.yaw+sim.player.heading,roadYaw:s.yaw,cameraRight:new THREE.Vector3(1,0,0).applyQuaternion(game.render.camera.quaternion).toArray(),cameraFov:game.render.camera.fov,cameraPosition:game.render.camera.position.toArray(),cameraDistance:game.render.camera.position.distanceTo(game.raceCars[0].group.position),frontWheelYaw:game.raceCars[0].wheels[2].rotation.y};},
  state:()=>({vehicleCache:vehicleCacheStats(),vehicleLoading:game.vehicleLoading,viewedCar:game.garageCar.group.name,audio:game.audio.diagnostics(),preparing:!!game.preparation,loadMetrics:game.loadMetrics,sceneryCount:game.world?.roadSpace.placements.length,screen:game.ui.screen,status:game.simulation?.status,paused:game.paused,input:game.input.read(),player:game.simulation?{...game.simulation.player,spec:game.simulation.player.spec.id}:null,elapsed:game.simulation?.elapsed,rank:game.simulation?.rank,credits:game.save.credits,selected:game.save.selected,quality:game.save.settings.quality,reducedMotion:game.save.settings.reducedMotion,opponents:game.simulation?.drivers.length?game.simulation.drivers.length-1:0,cameraMode:game.cameraMode,adaptiveScale:game.render.governor.scale,pixelRatio:game.render.renderer.getPixelRatio(),textures:game.render.renderer.info.memory.textures,skidMarks:game.effects?.skidCursor,carBounds:game.garageCar.dimensions.toArray(),invalidCarShadows:game.raceCars[0]?game.raceCars[0].flames.filter(f=>f.castShadow).length:0,fps:game.fps,drawCalls:game.render.renderer.info.render.calls,triangles:game.render.renderer.info.render.triangles,geometries:game.render.renderer.info.memory.geometries}),
  advance:(seconds:number,input:Partial<Controls>|null={},center:boolean|'race'|number=false)=>{const sim=game.simulation;if(!sim||game.paused||game.preparation)return;for(let t=0;t<seconds;t+=1/60){const controls=input===null?game.input.read():{...NO_INPUT,...input};if(center==='race'){const planned=sim.aiInput(sim.player);controls.steer=planned.steer;controls.brake=planned.brake;controls.throttle=planned.throttle;}else if(typeof center==='number'||center)controls.steer=sim.steeringFor(sim.player,typeof center==='number'?center:0);sim.step(1/60,controls);if(sim.status==='finished')break;}game.cameraInitialized=false;game.updateRaceView(1/60,performance.now()/1000);game.ui.updateHUD(sim);if(sim.status==='finished')game.completeRace();},
  snapshot:()=>{game.render.render();return game.render.renderer.domElement.toDataURL();},
})});
