import {test,expect} from '@playwright/test';import {writeFileSync} from 'node:fs';

test('sample mixer renders revs, braking, impacts and pause/mute without clipping or leaking nodes',async({page})=>{
 await page.goto('/scripts/audio-lab.html');await page.waitForFunction(()=>(window as any).audioLab);
 const result=await page.evaluate(async()=>{
  const {AudioSystem,freshSave}=(window as any).audioLab;
  const results=[];
  for(const scenario of ['v8','v12','brakes','muted','pause','rivals','maxmix']){
   const length=8,ctx=new OfflineAudioContext(2,44100*length,44100),Original=window.AudioContext,resume=ctx.resume.bind(ctx);
   (ctx as any).resume=async()=>{};(window as any).AudioContext=function(){return ctx;};
   const audio=new AudioSystem({...freshSave().settings,engine:scenario==='brakes'?0:1,effects:1,music:0});
   try{await audio.start();}finally{window.AudioContext=Original;(ctx as any).resume=resume;}
   await audio.samplesLoading;if(audio.sampleStatus!=='ready')throw new Error('Samples failed to decode');
   const d:any={spec:{id:scenario==='v12'?'spectre':'vanta'},id:0,speed:0,gear:1,throttle:0,brakeInput:0,drift:0,sideSpeed:0,airborne:0,boost:0,scrape:0,impact:0,impactSerial:0,landingImpact:0,landingSerial:0,distance:50,lateral:0,heading:0};
   const other={...d,finishTime:null,eliminated:false,id:1,spec:{id:'bmw-m3'},lateral:5,distance:53,speed:40,throttle:1};
   const updates=Array.from({length:length*20-1},(_,i)=>({time:(i+1)/20,promise:ctx.suspend((i+1)/20)}));
   audio.muted=scenario==='muted';audio.update(d,true);
   const rendering=ctx.startRendering();let maxTransient=0,maxLayers=0;
   for(const {time,promise} of updates){await promise;
    d.speed=time<5?time*18:Math.max(0,90-(time-5)*32);d.gear=Math.min(7,Math.floor(d.speed/17)+1);d.throttle=time<5?1:0;d.brakeInput=time>=5?1:0;
    d.drift=time>3&&time<4?.8:0;d.boost=time>4&&time<5?1:0;d.scrape=time>6&&time<6.3?.5:0;
    if(Math.abs(time-6)<.001){d.impactSerial++;d.impact=.8;}if(Math.abs(time-7)<.001){d.landingSerial++;d.landingImpact=.8;}
    if(scenario==='maxmix'){d.throttle=1;d.drift=1;d.boost=2;d.scrape=1;d.impact=1;d.landingImpact=1;d.impactSerial++;d.landingSerial++;}
    audio.update(d,scenario!=='pause'||time<2,scenario==='rivals'||scenario==='maxmix'?[other,{...other,id:2,spec:{id:'spectre'},distance:48,lateral:4}]:[],2000);
    maxTransient=Math.max(maxTransient,audio.diagnostics().transients);maxLayers=Math.max(maxLayers,audio.diagnostics().engineLayers);await resume();
   }
   const out=await rendering,left=out.getChannelData(0),right=out.getChannelData(1);let peak=0,sum=0,tail=0,leftEnergy=0,rightEnergy=0;const sections=[];
   for(let i=0;i<left.length;i++){peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));sum+=left[i]**2+right[i]**2;leftEnergy+=left[i]**2;rightEnergy+=right[i]**2;if(i>44100*4)tail+=left[i]**2+right[i]**2;}
   for(let second=0;second<length;second++){let e=0;for(let i=second*44100;i<(second+1)*44100;i++)e+=left[i]**2;sections.push(Math.sqrt(e/44100));}
   const pcm=scenario==='v8'?Array.from(left,(_,i)=>[Math.round(Math.max(-1,Math.min(1,left[i]))*32767),Math.round(Math.max(-1,Math.min(1,right[i]))*32767)]).flat():undefined;
   results.push({scenario,peak,rms:Math.sqrt(sum/(left.length*2)),tailRms:Math.sqrt(tail/(44100*4*2)),sections,maxTransient,maxLayers,leftEnergy,rightEnergy,pcm});
  }return results;
 });
 for(const r of result){expect(Number.isFinite(r.peak)).toBe(true);expect(r.peak).toBeLessThan(.99);expect(r.maxTransient).toBeLessThanOrEqual(12);expect(r.maxLayers).toBeLessThanOrEqual(15);if(r.scenario==='rivals'){expect(r.maxLayers).toBe(15);expect(r.rightEnergy).toBeGreaterThan(r.leftEnergy*1.001);}if(r.scenario==='muted')expect(r.peak).toBeLessThan(.00001);else expect(r.rms).toBeGreaterThan(.008);if(r.scenario==='pause')expect(r.tailRms).toBeLessThan(.0001);if(r.scenario==='brakes'){expect(r.sections[0]).toBeLessThan(.005);expect(r.sections[5]).toBeGreaterThan(.008);}}
 const pcm=result[0].pcm!,wave=Buffer.alloc(44+pcm.length*2);wave.write('RIFF');wave.writeUInt32LE(wave.length-8,4);wave.write('WAVEfmt ',8);wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(2,22);wave.writeUInt32LE(44100,24);wave.writeUInt32LE(176400,28);wave.writeUInt16LE(4,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(pcm.length*2,40);pcm.forEach((v,i)=>wave.writeInt16LE(v,44+i*2));
 writeFileSync('artifacts/engine-demo.wav',wave);writeFileSync('artifacts/audio-render.json',JSON.stringify({date:new Date().toISOString(),passed:true,results:result.map(({pcm,...r})=>r)},null,2));
});

test('unavailable sample downloads keep the fallback engine usable',async({page})=>{
 await page.route('**/assets/audio/*.wav',route=>route.abort());await page.goto('/scripts/audio-lab.html');await page.waitForFunction(()=>(window as any).audioLab);
 const status=await page.evaluate(async()=>{const {AudioSystem,freshSave}=(window as any).audioLab;const audio=new AudioSystem(freshSave().settings);await audio.start();await audio.samplesLoading;audio.preview('vanta');audio.update(null,false);const result=audio.diagnostics();await audio.dispose();return result;});expect(status.ready).toBe(true);expect(status.samples).toBe('fallback');expect(status.context).toBe('running');
});
