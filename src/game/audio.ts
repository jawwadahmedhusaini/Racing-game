import type {SaveData} from './storage';
import type {Driver} from './simulation';
import {EngineVoice,ENGINE_BANKS,engineBank,engineLayers,type EngineBank} from './engine-voice';
import {publicUrl} from './urls';

const clamp=(n:number,min=0,max=1)=>Math.max(min,Math.min(max,n));
const target=(param:AudioParam,value:number,t:number,fade=.035)=>{param.cancelScheduledValues(t);param.setTargetAtTime(value,t,fade);};
type Layer={source:AudioBufferSourceNode;gain:GainNode};
/** Bounded five-layer engine; all buffers are shared by player and nearby opponents. */
class SampleVoice {
  bank?:EngineBank;layers:Layer[]=[];filter:BiquadFilterNode;gain:GainNode;pan:StereoPannerNode;
  constructor(private ctx:AudioContext,output:AudioNode,private buffers:Map<string,AudioBuffer>){
    this.filter=ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.Q.value=.45;
    this.gain=ctx.createGain();this.gain.gain.value=0;this.pan=ctx.createStereoPanner();
    this.filter.connect(this.gain);this.gain.connect(this.pan);this.pan.connect(output);
  }
  update(id:string,rpm:number,load:number,volume:number,pan=0,doppler=1){
    const bank=engineBank(id),t=this.ctx.currentTime;
    if(bank!==this.bank){
      this.layers.forEach(({source,gain})=>{target(gain.gain,0,t,.01);source.stop(t+.06);source.onended=()=>{source.disconnect();gain.disconnect();};});this.layers=[];this.bank=bank;
      for(const base of ENGINE_BANKS[bank]){const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=this.buffers.get(`${bank}-${base/1000}`)!;source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(this.filter);source.start();this.layers.push({source,gain});}
    }
    engineLayers(bank,rpm).forEach((layer,i)=>{target(this.layers[i].source.playbackRate,layer.rate*doppler,t,.045);target(this.layers[i].gain.gain,layer.gain,t,.045);});
    target(this.filter.frequency,650+rpm*.6+load*2700,t,.055);target(this.gain.gain,volume*(.32+load*.68),t);target(this.pan.pan,clamp(pan,-1,1),t,.06);
  }
  silence(){target(this.gain.gain,0,this.ctx.currentTime,.02);}
  dispose(){for(const {source,gain} of this.layers){source.stop();source.disconnect();gain.disconnect();}this.layers=[];this.filter.disconnect();this.gain.disconnect();this.pan.disconnect();}
}
export function tireIntensity(driver:Pick<Driver,'speed'|'drift'|'sideSpeed'|'brakeInput'|'airborne'>){
  if(driver.airborne>.05)return 0;
  return clamp((Math.abs(driver.drift)*.85+Math.abs(driver.sideSpeed)*.1+driver.brakeInput*.48)*Math.min(1,Math.abs(driver.speed)/18));
}

export class AudioSystem {
  context?:AudioContext;ready=false;starting?:Promise<void>;samplesLoading?:Promise<void>;sampleStatus:'idle'|'loading'|'ready'|'fallback'='idle';
  settings:SaveData['settings'];muted=false;voice=new EngineVoice();lastUpdate=0;
  master?:GainNode;engineBus?:GainNode;effectsBus?:GainNode;musicGain?:GainNode;limiter?:DynamicsCompressorNode;
  private playerVoice?:SampleVoice;private rivals:SampleVoice[]=[];private buffers=new Map<string,AudioBuffer>();
  private fallback?:OscillatorNode;private fallbackGain?:GainNode;private wind?:GainNode;private tires?:GainNode;private tireFilter?:BiquadFilterNode;private squeal?:OscillatorNode;private squealGain?:GainNode;private boost?:GainNode;private scrape?:GainNode;
  private loops:AudioScheduledSourceNode[]=[];private transients=new Set<AudioScheduledSourceNode>();private lastDriver:Driver|null=null;private lastImpact=0;private lastLanding=0;private lastThrottle=0;private lastPop=-10;private lastBeat=0;private note=0;
  previewUntil=0;previewId='vanta';
  constructor(settings:SaveData['settings']){this.settings=settings;}
  start(){if(this.starting)return this.starting;this.starting=this.initialize().finally(()=>this.starting=undefined);return this.starting;}
  private async initialize(){
    if(this.context){if(this.context.state==='suspended')await this.context.resume();return;}
    const ctx=new AudioContext({latencyHint:'interactive'});
    try{
      this.master=ctx.createGain();this.master.gain.value=0;
      this.limiter=ctx.createDynamicsCompressor();this.limiter.threshold.value=-8;this.limiter.knee.value=10;this.limiter.ratio.value=8;this.limiter.attack.value=.003;this.limiter.release.value=.16;
      this.master.connect(this.limiter);this.limiter.connect(ctx.destination);
      this.engineBus=ctx.createGain();this.effectsBus=ctx.createGain();this.musicGain=ctx.createGain();
      for(const bus of [this.engineBus,this.effectsBus,this.musicGain]){bus.gain.value=0;bus.connect(this.master);}
      this.fallback=ctx.createOscillator();this.fallback.type='sawtooth';this.fallbackGain=ctx.createGain();this.fallbackGain.gain.value=0;
      const low=ctx.createBiquadFilter();low.frequency.value=1500;this.fallback.connect(low);low.connect(this.fallbackGain);this.fallbackGain.connect(this.engineBus);this.fallback.start();this.loops.push(this.fallback);
      const noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=noise.getChannelData(0);let seed=714;
      for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/4294967296)*2-1;}
      this.buffers.set('noise',noise);
      const bed=(frequency:number,type:BiquadFilterType)=>{const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=noise;source.loop=true;filter.type=type;filter.frequency.value=frequency;filter.Q.value=.7;gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(this.effectsBus!);source.start();this.loops.push(source);return {gain,filter};};
      this.wind=bed(650,'lowpass').gain;const tire=bed(1750,'bandpass');this.tires=tire.gain;this.tireFilter=tire.filter;
      this.boost=bed(2400,'bandpass').gain;
      this.squeal=ctx.createOscillator();this.squeal.type='sine';this.squealGain=ctx.createGain();this.squealGain.gain.value=0;this.squeal.connect(this.squealGain);this.squealGain.connect(this.effectsBus);this.squeal.start();this.loops.push(this.squeal);
      await ctx.resume();this.context=ctx;this.ready=true;
      this.samplesLoading=this.loadSamples(ctx);
    }catch(error){this.ready=false;this.loops=[];await ctx.close().catch(()=>{});throw error;}
  }
  private async loadSamples(ctx:AudioContext){
    this.sampleStatus='loading';
    const names=[...Object.entries(ENGINE_BANKS).flatMap(([bank,rpms])=>rpms.map(rpm=>`${bank}-${rpm/1000}`)),'impact-light','impact-heavy','scrape'];
    try{
      const decoded=await Promise.all(names.map(async name=>{const response=await fetch(publicUrl(`assets/audio/${name}.wav`),{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Audio unavailable');return [name,await ctx.decodeAudioData(await response.arrayBuffer())] as const;}));
      if(this.context!==ctx||ctx.state==='closed')return;
      decoded.forEach(([name,buffer])=>this.buffers.set(name,buffer));
      this.playerVoice=new SampleVoice(ctx,this.engineBus!,this.buffers);this.rivals=Array.from({length:2},()=>new SampleVoice(ctx,this.engineBus!,this.buffers));
      const source=ctx.createBufferSource();source.buffer=this.buffers.get('scrape')!;source.loop=true;this.scrape=ctx.createGain();this.scrape.gain.value=0;source.connect(this.scrape);this.scrape.connect(this.effectsBus!);source.start();this.loops.push(source);
      this.sampleStatus='ready';
    }catch{if(this.context===ctx)this.sampleStatus='fallback';}
  }
  preview(id:string){this.previewId=id;this.previewUntil=(this.context?.currentTime??0)+2.5;}
  cancelPreview(){this.previewUntil=0;}
  update(driver:Driver|null,playing:boolean,rivals:Driver[]=[],trackLength=1,camera=0,freeRev:number|null=null){
    const ctx=this.context;if(!ctx||!this.ready)return;
    const t=ctx.currentTime,dt=this.lastUpdate?clamp(t-this.lastUpdate,0,.1):1/60;this.lastUpdate=t;
    target(this.master!.gain,this.muted?0:.72,t,.015);target(this.engineBus!.gain,this.settings.engine,t);target(this.effectsBus!.gain,this.settings.effects,t);target(this.musicGain!.gain,this.settings.music*.10,t,.15);
    const preview=!driver&&this.previewUntil>t&&!this.muted,active=playing||preview;
    const throttle=freeRev??(preview?Math.sin(clamp((this.previewUntil-t)/2.5)*Math.PI)*.9:driver?.speed&&driver.speed<0?driver.brakeInput:driver?.throttle??0);
    const engine=this.voice.update(preview?this.previewId:driver?.spec.id??'vanta',Math.abs(driver?.speed??0),active?throttle:0,dt,driver?.gear,freeRev!==null||preview||(driver?.airborne??0)>.05);
    const gain=active?(engine.shift?.48:1)*(camera===2?.72:1):0;
    this.playerVoice?.update(preview?this.previewId:driver?.spec.id??'vanta',engine.rpm,engine.load,gain);
    target(this.fallback!.frequency,engine.frequency,t,.05);target(this.fallbackGain!.gain,!this.playerVoice?gain*.08:0,t);
    const speed=Math.abs(driver?.speed??0),tire=driver&&playing?tireIntensity(driver):0;
    target(this.wind!.gain,playing?Math.pow(clamp(speed/115),2)*.16:0,t,.12);
    target(this.tires!.gain,tire*.26,t,.035);target(this.tireFilter!.frequency,1000+tire*1700,t,.05);
    target(this.squeal!.frequency,700+tire*400+Math.sin(t*21)*17,t,.03);target(this.squealGain!.gain,tire*tire*.045,t);
    target(this.boost!.gain,playing&&driver?.boost ? .14 : 0,t,.07);if(this.scrape)target(this.scrape.gain,playing?(driver?.scrape??0)*.32:0,t,.035);
    // Two nearest rivals, distance attenuation, stereo passing and bounded Doppler.
    const nearby=playing&&driver?rivals.filter(d=>d!==driver&&!d.eliminated&&d.finishTime===null).map(d=>{const dz=((d.distance-driver.distance+trackLength/2)%trackLength+trackLength)%trackLength-trackLength/2,dx=d.lateral-driver.lateral;return {d,dz,dx,distance:Math.hypot(dx,dz)};}).filter(o=>o.distance<60).sort((a,b)=>a.distance-b.distance).slice(0,2):[];
    this.rivals.forEach((voice,i)=>{const other=nearby[i];if(!other){voice.silence();return;}const {d,dz,dx,distance}=other;const rpm=950+Math.abs(d.speed)*86*[3.1,2.13,1.58,1.23,1,.84,.72][d.gear-1];const radial=(d.speed-(driver?.speed??0))*dz/Math.max(1,distance),doppler=clamp(343/(343+radial),.88,1.12);const pan=(dx*Math.cos(driver!.heading)+dz*Math.sin(driver!.heading))/Math.max(4,distance);voice.update(d.spec.id,rpm,.3+d.throttle*.7,.24/(1+(distance/9)**2),pan,doppler);});
    if(driver!==this.lastDriver){this.lastDriver=driver;this.lastImpact=driver?.impactSerial??0;this.lastLanding=driver?.landingSerial??0;this.lastThrottle=0;}
    if(driver){
      if(playing&&driver.impactSerial!==this.lastImpact)this.impact(driver.impact,false);
      if(playing&&driver.landingSerial!==this.lastLanding)this.impact(driver.landingImpact,true);
      this.lastImpact=driver.impactSerial;this.lastLanding=driver.landingSerial;
    }
    if(active&&engine.changed)this.burst('noise',.055,.10,this.engineBus!,engine.downshift?160:100);
    if(active&&this.lastThrottle>.6&&throttle<.15&&engine.rpm>3600&&t-this.lastPop>.35){this.lastPop=t;this.burst('noise',.085,.14,this.engineBus!,260);}
    this.lastThrottle=throttle;
    if(t-this.lastBeat>.375&&!this.muted&&this.settings.music>0){this.lastBeat=t;const notes=[55,55,82.41,55,65.41,65.41,98,65.41];this.oscTone(notes[this.note++%notes.length]*(playing?1:2),.30,.16,this.musicGain!);}
  }
  private track(source:AudioScheduledSourceNode,nodes:AudioNode[]){this.transients.add(source);source.onended=()=>{this.transients.delete(source);source.disconnect();nodes.forEach(n=>n.disconnect());};}
  private burst(name:string,duration:number,gain:number,bus:AudioNode,frequency=18000){
    const ctx=this.context;if(!ctx||this.muted||this.transients.size>=12)return;
    const buffer=this.buffers.get(name)??this.buffers.get('noise')!;const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),level=ctx.createGain();
    const t=ctx.currentTime;source.buffer=buffer;filter.frequency.value=frequency;level.gain.setValueAtTime(0,t);level.gain.linearRampToValueAtTime(gain,t+.004);level.gain.exponentialRampToValueAtTime(.0001,t+duration);
    source.connect(filter);filter.connect(level);level.connect(bus);this.track(source,[filter,level]);source.start(t);source.stop(t+Math.min(duration,buffer.duration));
  }
  private impact(strength:number,landing:boolean){if(this.settings.effects<=0||strength<.04)return;this.burst(strength>.45?'impact-heavy':'impact-light',landing?.28:.42,clamp(strength)*.95,this.effectsBus!,landing?750:7500);this.oscTone(landing?52:76,.16,strength*.12,this.effectsBus!);}
  private oscTone(freq:number,duration:number,gain:number,bus:AudioNode){
    const ctx=this.context;if(!ctx||this.muted||this.transients.size>=12)return;const osc=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;
    osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(freq*.62,t+duration);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(g);g.connect(bus);this.track(osc,[g]);osc.start();osc.stop(t+duration);
  }
  tone(freq=700,duration=.1,gain=.1){if(!this.ready||this.muted||this.settings.effects<=0||!this.effectsBus)return;this.oscTone(freq,duration,gain,this.effectsBus);}
  diagnostics(){return {ready:this.ready,samples:this.sampleStatus,decoded:this.buffers.size,transients:this.transients.size,engineLayers:(this.playerVoice?.layers.length??0)+this.rivals.reduce((n,v)=>n+v.layers.length,0),rpm:this.voice.rpm,context:this.context?.state};}
  async dispose(){this.ready=false;this.cancelPreview();this.playerVoice?.dispose();this.rivals.forEach(v=>v.dispose());this.loops.forEach(s=>{try{s.stop();s.disconnect();}catch{}});this.transients.forEach(s=>{try{s.stop();s.disconnect();}catch{}});const ctx=this.context;this.context=undefined;this.buffers.clear();await ctx?.close();}
}
