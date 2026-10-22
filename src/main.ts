import '@fontsource/rajdhani/latin-500.css';
import '@fontsource/rajdhani/latin-600.css';
import '@fontsource/rajdhani/latin-700.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import './style.css';
import * as THREE from 'three';
import {RenderSystem,createShowroom} from './game/renderer';
import {createCar,loadVehicleAsset,type CarModel} from './game/car';
import {CARS,EVENTS,type RaceMode,type TrackId,type Quality,type Difficulty} from './game/content';
import {Track} from './game/track';
import {createWorld,type World} from './game/world';
import {RaceSimulation,NO_INPUT,type Controls} from './game/simulation';
import {InputSystem} from './game/input';
import {AudioSystem} from './game/audio';
import {Effects} from './game/effects';
import {loadSave,saveProgress,buyCar,upgradeCar} from './game/storage';
import {UI,type Result} from './ui/ui';
import {logo} from './ui/icons';

const app=document.getElementById('app')!;
const loading=document.createElement('div');loading.className='loading';loading.innerHTML=`<span class="brand">${logo}<span>APEX<span class="brand-small">RUSH</span></span></span><div class="loading-bar"></div><p>PREPARING YOUR NEXT GREAT DRIVE</p>`;app.append(loading);
let game:Game;
class Game {
  render:RenderSystem;ui:UI;input=new InputSystem();save=loadSave();audio=new AudioSystem(this.save.settings);
  showroom=createShowroom();garageCar:CarModel;raceCars:CarModel[]=[];worlds=new Map<TrackId,{track:Track;world:World}>();
  simulation?:RaceSimulation;effects?:Effects;world?:World;paused=false;cameraMode=0;accumulator=0;lastTime=0;hudTime=0;
  rotation=.0;dragging=false;dragX=0;cameraFocus=new THREE.Vector3();cameraInitialized=false;result?:Result;lastCountdown=4;
  fps=0;frames=0;fpsTimer=0;raceCompleted=false;settingsFromPause=false;lastRace={track:'coast' as TrackId,mode:'quick' as RaceMode,event:0};
  constructor(){
    this.render=new RenderSystem(app);const uiRoot=document.createElement('div');uiRoot.id='ui';app.append(uiRoot);this.ui=new UI(uiRoot,this.save);
    this.garageCar=createCar(CARS.find(c=>c.id===this.save.selected)!,this.save.paints[this.save.selected]);this.showroom.group.add(this.garageCar.group);this.render.setScene(this.showroom.scene);this.render.setQuality(this.save.settings.quality);
    this.ui.onAction=(action,value)=>this.action(action,value);this.input.onPause=()=>{if(this.simulation&&this.ui.screen==='racing')this.paused?this.resume():this.pause();else this.ui.closeModal();};this.input.onCamera=()=>this.cameraMode=(this.cameraMode+1)%3;this.input.onRecover=()=>this.simulation?.recover();this.input.autoAccelerate=this.save.settings.autoAccelerate;
    this.ui.viewed=Math.max(0,CARS.findIndex(c=>c.id===this.save.selected));this.ui.garage();this.applyQuality();
    this.render.renderer.domElement.addEventListener('pointerdown',e=>{if(this.ui.screen!=='garage')return;this.dragging=true;this.dragX=e.clientX;this.render.renderer.domElement.setPointerCapture(e.pointerId);});
    this.render.renderer.domElement.addEventListener('pointermove',e=>{if(this.dragging){this.rotation+=(e.clientX-this.dragX)*.008;this.dragX=e.clientX;}});this.render.renderer.domElement.addEventListener('pointerup',()=>this.dragging=false);this.render.renderer.domElement.addEventListener('pointercancel',()=>this.dragging=false);
    this.render.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(this.simulation)this.pause();this.ui.toast('Graphics context interrupted. Reload the page to restore rendering. Your progress is saved.');});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.ui.screen==='racing'&&!this.paused)this.pause();});window.addEventListener('blur',()=>{if(this.ui.screen==='racing'&&!this.paused)this.pause();});
    document.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const modal=document.getElementById('modal');if(!modal)return;const elements=[...modal.querySelectorAll<HTMLElement>('button:not([disabled]),input,select')];if(!elements.length)return;const first=elements[0],last=elements.at(-1)!;if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
    Promise.all([this.render.ready,document.fonts.ready]).then(()=>{loading.style.opacity='0';setTimeout(()=>loading.remove(),600);});
    requestAnimationFrame(t=>this.frame(t));
  }
  persist(){if(!saveProgress(this.save))this.ui.toast('Browser storage is unavailable. This session still works, but progress cannot be saved.');}
  selectCar(index:number){const spec=CARS[index];this.garageCar.group.removeFromParent();this.garageCar.dispose();this.garageCar=createCar(spec,this.save.paints[spec.id]);this.showroom.group.add(this.garageCar.group);this.rotation=0;if(this.save.owned.includes(spec.id)){this.save.selected=spec.id;this.persist();}this.ui.garage(index);}
  async action(action:string,value:string){
    if(action!=='setting')void this.audio.start().catch(()=>{});if(!['paint','setting'].includes(action))this.audio.tone(680,.05,.07);
    switch(action){
      case 'garage':this.leaveRace();this.ui.garage();break;
      case 'car':this.selectCar(Number(value));break;
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
      case 'settings':this.settingsFromPause=this.ui.screen==='racing';if(this.settingsFromPause&&!this.paused)this.pause();this.ui.settings(this.settingsFromPause);break;
      case 'controls':this.ui.controls();break;
      case 'credits':this.ui.credits();break;
      case 'close-modal':if(this.ui.screen==='racing'&&this.paused)this.ui.pause();else this.ui.closeModal();break;
      case 'setting':{const [key,val]=value.split(':');const settings=this.save.settings;if(key==='quality'){settings.quality=val as Quality;this.render.setQuality(settings.quality);this.applyQuality();}else if(key==='difficulty')settings.difficulty=val as Difficulty;else if(key==='autoAccelerate'){settings.autoAccelerate=val==='true';this.input.autoAccelerate=settings.autoAccelerate;}else if(['engine','music','effects'].includes(key))settings[key as 'engine']=Number(val);this.persist();break;}
    }
  }
  startRace(trackId:TrackId,mode:RaceMode,event=0){
    this.disposeRace();this.paused=false;this.raceCompleted=false;this.cameraInitialized=false;this.lastRace={track:trackId,mode,event};this.accumulator=0;this.lastCountdown=4;this.input.clear();this.ui.closeModal();
    let cached=this.worlds.get(trackId);if(!cached){const track=new Track(trackId);cached={track,world:createWorld(track)};this.worlds.set(trackId,cached);}
    this.world=cached.world;this.render.setScene(this.world.scene);this.render.camera.clearViewOffset();this.render.renderer.toneMappingExposure=trackId==='city'?.95:.9;
    this.simulation=new RaceSimulation({car:CARS.find(c=>c.id===this.save.selected)!,track:cached.track,mode,difficulty:this.save.settings.difficulty,upgrade:this.save.upgrades[this.save.selected]??0});
    this.raceCars=this.simulation.drivers.map((d,i)=>{const car=createCar(d.spec,i===0?(this.save.paints[d.spec.id]??d.spec.color):['#a6bdc7','#e5dcba','#5f73b3','#82cdb9','#ea564b'][i-1],true);car.group.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=i===0;});this.world!.scene.add(car.group);return car;});
    this.effects=new Effects(this.world.scene);this.ui.hud(this.simulation);this.applyQuality();this.updateRaceView(1/60,0);this.ui.updateHUD(this.simulation);
  }
  applyQuality(){const size={low:256,medium:512,high:1024,ultra:2048}[this.save.settings.quality];for(const scene of [this.showroom.scene,...[...this.worlds.values()].map(w=>w.world.scene)])scene.traverse(o=>{if(o instanceof THREE.DirectionalLight&&o.castShadow){o.shadow.mapSize.set(size,size);o.shadow.map?.dispose();o.shadow.map=null;}});}
  pause(){if(this.ui.screen!=='racing')return;this.paused=true;this.input.clear();this.ui.pause();this.audio.update(null,false);}
  resume(){this.paused=false;this.input.clear();this.ui.closeModal();this.accumulator=0;}
  disposeRace(){this.raceCars.forEach(c=>{c.group.removeFromParent();c.dispose();});this.raceCars=[];this.effects?.dispose();this.effects=undefined;this.simulation=undefined;}
  leaveRace(){this.disposeRace();this.paused=false;this.ui.closeModal();this.render.setScene(this.showroom.scene);this.render.renderer.toneMappingExposure=.85;this.selectCar(this.ui.viewed);this.input.clear();}
  completeRace(){
    if(!this.simulation||this.raceCompleted)return;this.raceCompleted=true;const sim=this.simulation,pos=sim.resultPosition;
    const reward=sim.player.eliminated?Math.max(200,900-pos*90):sim.mode==='time'?1100:[2200,1700,1400,1100,900,750][pos-1]??750;
    const stars=sim.player.eliminated?0:pos===1?3:pos<=3?2:1;let careerBonus=0;
    if(sim.mode==='career'){const e=EVENTS[this.lastRace.event];if(this.lastRace.event===this.save.career&&pos<=e.target&&!sim.player.eliminated){careerBonus=e.reward;this.save.career++;this.save.stars+=stars;}}
    this.save.credits+=reward+careerBonus;this.save.races++;if(pos===1&&!sim.player.eliminated)this.save.wins++;
    const key=`${sim.track.id}-${sim.mode}`,time=sim.player.finishTime??sim.elapsed,best=!sim.player.eliminated&&(!this.save.bestTimes[key]||time<this.save.bestTimes[key]);if(best)this.save.bestTimes[key]=time;
    this.persist();this.result={position:pos,reward,careerBonus,stars,time,best,eliminated:sim.player.eliminated};this.audio.tone(pos===1?880:440,.6,.25);this.ui.results(sim,this.result);this.input.clear();
  }
  updateRaceView(dt:number,time:number){
    const sim=this.simulation!;
    for(const d of sim.drivers){const car=this.raceCars[d.id],s=sim.track.sample(d.distance);car.group.position.copy(s.position).addScaledVector(s.right,d.lateral);car.group.position.y+=d.airborne+.045;car.group.rotation.set(-Math.asin(s.tangent.y),s.yaw+d.heading+d.drift*.38,0,'YXZ');car.group.visible=!d.eliminated;car.update(d.speed,d.steer,d.drift,d.boost,d.id===0?this.input.read().brake>0:false,time);}
    const player=sim.player,car=this.raceCars[0],s=sim.track.sample(player.distance),speed=player.speed;
    const chase=this.cameraMode===1?6.9:this.cameraMode===2?13:9.9,height=this.cameraMode===1?2.9:this.cameraMode===2?6.7:3.9;
    const desired=car.group.position.clone().addScaledVector(s.tangent,-chase-speed*.018).addScaledVector(s.right,-player.drift*.7);desired.y+=height;
    const focus=car.group.position.clone().addScaledVector(s.tangent,9+speed*.04);focus.y+=.8;
    if(!this.cameraInitialized){this.render.camera.position.copy(desired);this.cameraFocus.copy(focus);this.cameraInitialized=true;}else{this.render.camera.position.addScaledVector(s.tangent,speed*dt).lerp(desired,1-Math.exp(-dt*7));this.cameraFocus.addScaledVector(s.tangent,speed*dt).lerp(focus,1-Math.exp(-dt*10));}
    if(player.collision>.3){this.render.camera.position.x+=Math.sin(time*70)*.07;this.render.camera.position.y+=Math.cos(time*80)*.055;}
    this.render.camera.lookAt(this.cameraFocus);const fov=58+Math.min(13,speed*.13)+(player.boost===2?12:player.boost?7:0);this.render.camera.fov+=(fov-this.render.camera.fov)*Math.min(1,dt*4);this.render.camera.updateProjectionMatrix();
    this.world!.update(time,car.group.position);if(!this.paused)this.effects?.update(dt,player,car.group.position,s.yaw+player.heading);
  }
  frame(now:number){
    const rawDelta=(now-this.lastTime)/1000||1/60,dt=Math.min(.1,rawDelta);this.lastTime=now;this.fpsTimer+=rawDelta;this.frames++;if(this.fpsTimer>=1){this.fps=Math.round(this.frames/this.fpsTimer);this.frames=0;this.fpsTimer=0;}
    if(this.simulation){
      if(!this.paused&&!this.raceCompleted){this.accumulator+=dt;let count=0;while(this.accumulator>=1/60&&count++<8){this.simulation.step(1/60,this.input.read());this.accumulator-=1/60;}
        const cd=Math.ceil(this.simulation.countdown);if(cd!==this.lastCountdown&&cd>=0){this.lastCountdown=cd;this.audio.tone(cd===0?1100:550,.12,.22);}if(this.simulation.status==='finished')this.completeRace();}
      this.updateRaceView(dt,now/1000);this.hudTime+=dt;if(this.hudTime>.08){this.ui.updateHUD(this.simulation);this.hudTime=0;}
      this.audio.update(this.simulation.player,!this.paused&&this.simulation.status==='racing');
    }else {
      const mobile=this.render.width<600,landscape=this.render.height<550&&this.render.width>600;
      this.garageCar.group.rotation.y=this.rotation+(mobile?.15:-.28)+Math.sin(now*.00017)*.08;
      const distance=mobile?15.3:9.1;this.render.camera.fov=mobile?39:38;this.render.camera.position.set(distance*.70,mobile?3.6:3.0,distance*.71);this.render.camera.lookAt(0,.6,0);
      if(mobile)this.render.camera.setViewOffset(this.render.width,this.render.height,0,this.render.height*.03,this.render.width,this.render.height);
      else this.render.camera.setViewOffset(this.render.width,this.render.height,-this.render.width*.16,landscape?this.render.height*.10:this.render.height*.035,this.render.width,this.render.height);
      this.render.camera.updateProjectionMatrix();this.audio.update(null,false);
    }
    this.render.render();requestAnimationFrame(t=>this.frame(t));
  }
}
try {await loadVehicleAsset();game=new Game();}catch(error){console.error(error);loading.remove();const fatal=document.createElement('section');fatal.className='fatal';fatal.innerHTML='<h1>LET’S GET YOU BACK ON TRACK.</h1><p>The 3D renderer could not start. Use a current Chrome, Edge, Firefox or Safari browser with WebGL 2 and hardware acceleration enabled, then reload.</p><button class="primary" onclick="location.reload()">RETRY</button>';app.append(fatal);}

// Development-only observability. Production builds do not expose test controls or progression cheats.
if(import.meta.env.DEV)Object.defineProperty(window,'__apex',{get:()=>({
  state:()=>({screen:game.ui.screen,status:game.simulation?.status,paused:game.paused,input:game.input.read(),player:game.simulation?{...game.simulation.player,spec:game.simulation.player.spec.id}:null,elapsed:game.simulation?.elapsed,rank:game.simulation?.rank,credits:game.save.credits,selected:game.save.selected,quality:game.save.settings.quality,fps:game.fps,drawCalls:game.render.renderer.info.render.calls,triangles:game.render.renderer.info.render.triangles,geometries:game.render.renderer.info.memory.geometries}),
  advance:(seconds:number,input:Partial<Controls>|null={},center=false)=>{const sim=game.simulation;if(!sim||game.paused)return;for(let t=0;t<seconds;t+=1/60){const controls=input===null?game.input.read():{...NO_INPUT,...input};if(center)controls.steer=Math.max(-1,Math.min(1,-sim.player.lateral*.18-sim.player.heading*2));sim.step(1/60,controls);if(sim.status==='finished')break;}game.cameraInitialized=false;game.updateRaceView(1/60,performance.now()/1000);game.ui.updateHUD(sim);if(sim.status==='finished')game.completeRace();},
  snapshot:()=>{game.render.render();return game.render.renderer.domElement.toDataURL();},
})});
