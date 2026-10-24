import type {SaveData} from './storage';
import type {Driver} from './simulation';
import {EngineVoice} from './engine-voice';

// Original procedural sounds: no samples, no network and no autoplay before interaction.
export class AudioSystem {
  context?:AudioContext;engineGain?:GainNode;engineOsc?:OscillatorNode;engineOsc2?:OscillatorNode;
  windGain?:GainNode;driftGain?:GainNode;boostGain?:GainNode;musicGain?:GainNode;filter?:BiquadFilterNode;
  voice=new EngineVoice();lastUpdate=0;lastLanding=0;ready=false;starting?:Promise<void>;
  settings:SaveData['settings'];muted=false;lastBeat=0;note=0;lastCollision=0;
  constructor(settings:SaveData['settings']){this.settings=settings;}
  start(){if(this.starting)return this.starting;this.starting=this.initialize().finally(()=>this.starting=undefined);return this.starting;}
  private async initialize(){
    if(this.context){if(this.context.state==='suspended')await this.context.resume();return;}
    const ctx=new AudioContext();
    try {
    this.engineGain=ctx.createGain();this.engineGain.gain.value=0;this.filter=ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=700;this.filter.connect(this.engineGain);this.engineGain.connect(ctx.destination);
    for(let i=0;i<2;i++){const osc=ctx.createOscillator();const real=new Float32Array(17),imag=new Float32Array(17);for(let h=1;h<17;h++)imag[h]=(i?Math.sin(h*.7):1)/Math.pow(h,i?1.7:1.25);osc.setPeriodicWave(ctx.createPeriodicWave(real,imag));osc.frequency.value=60;osc.connect(this.filter);osc.start();if(i)this.engineOsc2=osc;else this.engineOsc=osc;}
    const noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),channel=noise.getChannelData(0);let prev=0;for(let i=0;i<channel.length;i++){prev=(prev+(Math.random()*2-1)*.08)/1.04;channel[i]=prev;}
    const source=ctx.createBufferSource();source.buffer=noise;source.loop=true;
    this.windGain=ctx.createGain();this.windGain.gain.value=0;source.connect(this.windGain);this.windGain.connect(ctx.destination);
    this.boostGain=ctx.createGain();this.boostGain.gain.value=0;const high=ctx.createBiquadFilter();high.type='highpass';high.frequency.value=1300;source.connect(high);high.connect(this.boostGain);this.boostGain.connect(ctx.destination);source.start();
    this.driftGain=ctx.createGain();this.driftGain.gain.value=0;const squeal=ctx.createOscillator();squeal.type='triangle';squeal.frequency.value=680;squeal.connect(this.driftGain);this.driftGain.connect(ctx.destination);squeal.start();
    this.musicGain=ctx.createGain();this.musicGain.gain.value=this.settings.music*.16;this.musicGain.connect(ctx.destination);
    await ctx.resume();this.context=ctx;this.ready=true;
    }catch(error){this.ready=false;await ctx.close().catch(()=>{});throw error;}
  }
  update(driver:Driver|null,playing:boolean){
    const ctx=this.context;if(!ctx||!this.ready)return;const t=ctx.currentTime;const volume=this.muted?0:1;
    const speed=Math.abs(driver?.speed??0),dt=this.lastUpdate?Math.min(.1,t-this.lastUpdate):1/60;this.lastUpdate=t;
    const engine=this.voice.update(driver?.spec.id??'vanta',speed,playing?driver?.throttle??0:0,dt,driver?.gear);
    this.engineOsc!.frequency.setTargetAtTime(engine.frequency,t,.045);this.engineOsc2!.frequency.setTargetAtTime(engine.frequency*.501,t,.06);this.filter!.frequency.setTargetAtTime(350+engine.rpm*.30+engine.load*800,t,.07);
    this.engineGain!.gain.setTargetAtTime(playing?this.settings.engine*.075*volume*engine.load*(engine.shift?.38:1):0,t,.035);
    if(playing&&engine.changed&&this.settings.engine>0)this.tone(90,.055,.035*this.settings.engine);
    if(playing&&(driver?.landingImpact??0)>.3&&t-this.lastLanding>.5){this.lastLanding=t;this.tone(48,.14,.14*driver!.landingImpact);}
    this.windGain!.gain.setTargetAtTime(playing?speed/100*this.settings.effects*.5*volume:0,t,.12);
    this.driftGain!.gain.setTargetAtTime(playing?Math.abs(driver?.drift??0)*this.settings.effects*.065*volume:0,t,.08);
    this.boostGain!.gain.setTargetAtTime(playing&&driver?.boost?this.settings.effects*.7*volume:0,t,.1);
    this.musicGain!.gain.setTargetAtTime(this.settings.music*.18*volume,t,.2);
    if(t-this.lastBeat>.375&&!this.muted&&this.settings.music>0){this.lastBeat=t;const sequence=[55,55,82.41,55,65.41,65.41,98,65.41,73.42,73.42,110,73.42,49,49,73.42,49];const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=sequence[this.note++%sequence.length]*(playing?1:2);gain.gain.setValueAtTime(.32,t);gain.gain.exponentialRampToValueAtTime(.001,t+.30);osc.connect(gain);gain.connect(this.musicGain!);osc.onended=()=>{osc.disconnect();gain.disconnect();};osc.start(t);osc.stop(t+.32);}
    if(playing&&driver?.collision&&t-this.lastCollision>.7){this.lastCollision=t;this.tone(65,.15,.25);}
  }
  tone(freq=700,duration=.1,gain=.1){const ctx=this.context;if(!ctx||!this.ready||this.muted||this.settings.effects<=0)return;const osc=ctx.createOscillator(),g=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(freq*.55,ctx.currentTime+duration);g.gain.setValueAtTime(gain*this.settings.effects,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);osc.connect(g);g.connect(ctx.destination);osc.onended=()=>{osc.disconnect();g.disconnect();};osc.start();osc.stop(ctx.currentTime+duration);}
}
