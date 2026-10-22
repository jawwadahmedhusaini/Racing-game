import type {SaveData} from './storage';
import type {Driver} from './simulation';

// Original procedural sounds: no samples, no network and no autoplay before interaction.
export class AudioSystem {
  context?:AudioContext;engineGain?:GainNode;engineOsc?:OscillatorNode;engineOsc2?:OscillatorNode;
  windGain?:GainNode;driftGain?:GainNode;boostGain?:GainNode;musicGain?:GainNode;filter?:BiquadFilterNode;
  settings:SaveData['settings'];muted=false;lastBeat=0;note=0;lastCollision=0;
  constructor(settings:SaveData['settings']){this.settings=settings;}
  async start(){
    if(this.context){if(this.context.state==='suspended')await this.context.resume();return;}
    const ctx=new AudioContext();this.context=ctx;
    this.engineGain=ctx.createGain();this.engineGain.gain.value=0;this.filter=ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=700;this.filter.connect(this.engineGain);this.engineGain.connect(ctx.destination);
    for(let i=0;i<2;i++){const osc=ctx.createOscillator();osc.type=i?'triangle':'sawtooth';osc.frequency.value=40;osc.connect(this.filter);osc.start();if(i)this.engineOsc2=osc;else this.engineOsc=osc;}
    const noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),channel=noise.getChannelData(0);let prev=0;for(let i=0;i<channel.length;i++){prev=(prev+(Math.random()*2-1)*.08)/1.04;channel[i]=prev;}
    const source=ctx.createBufferSource();source.buffer=noise;source.loop=true;
    this.windGain=ctx.createGain();this.windGain.gain.value=0;source.connect(this.windGain);this.windGain.connect(ctx.destination);
    this.boostGain=ctx.createGain();this.boostGain.gain.value=0;const high=ctx.createBiquadFilter();high.type='highpass';high.frequency.value=1300;source.connect(high);high.connect(this.boostGain);this.boostGain.connect(ctx.destination);source.start();
    this.driftGain=ctx.createGain();this.driftGain.gain.value=0;const squeal=ctx.createOscillator();squeal.type='triangle';squeal.frequency.value=680;squeal.connect(this.driftGain);this.driftGain.connect(ctx.destination);squeal.start();
    this.musicGain=ctx.createGain();this.musicGain.gain.value=this.settings.music*.16;this.musicGain.connect(ctx.destination);
    await ctx.resume();
  }
  update(driver:Driver|null,playing:boolean){
    const ctx=this.context;if(!ctx)return;const t=ctx.currentTime;const volume=this.muted?0:1;
    const speed=driver?.speed??0,gear=Math.min(6,Math.floor(speed/17)+1),rpm=42+(speed%17)*4.4+gear*6;
    this.engineOsc!.frequency.setTargetAtTime(rpm,t,.09);this.engineOsc2!.frequency.setTargetAtTime(rpm*2.01,t,.09);this.filter!.frequency.setTargetAtTime(450+speed*22,t,.08);
    this.engineGain!.gain.setTargetAtTime(playing?this.settings.engine*.10*volume:0,t,.12);
    this.windGain!.gain.setTargetAtTime(playing?speed/100*this.settings.effects*.5*volume:0,t,.12);
    this.driftGain!.gain.setTargetAtTime(playing?Math.abs(driver?.drift??0)*this.settings.effects*.065*volume:0,t,.08);
    this.boostGain!.gain.setTargetAtTime(playing&&driver?.boost?this.settings.effects*.7*volume:0,t,.1);
    this.musicGain!.gain.setTargetAtTime(this.settings.music*.18*volume,t,.2);
    if(t-this.lastBeat>.375&&!this.muted){this.lastBeat=t;const sequence=[55,55,82.41,55,65.41,65.41,98,65.41,73.42,73.42,110,73.42,49,49,73.42,49];const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=sequence[this.note++%sequence.length]*(playing?1:2);gain.gain.setValueAtTime(.32,t);gain.gain.exponentialRampToValueAtTime(.001,t+.30);osc.connect(gain);gain.connect(this.musicGain!);osc.start(t);osc.stop(t+.32);}
    if(playing&&driver?.collision&&t-this.lastCollision>.7){this.lastCollision=t;this.tone(65,.15,.25);}
  }
  tone(freq=700,duration=.1,gain=.1){const ctx=this.context;if(!ctx||this.muted)return;const osc=ctx.createOscillator(),g=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(freq*.55,ctx.currentTime+duration);g.gain.setValueAtTime(gain*this.settings.effects,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);osc.connect(g);g.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+duration);}
}
