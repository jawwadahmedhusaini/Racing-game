import {it,expect,vi,afterEach} from 'vitest';
import {AudioSystem} from '../src/game/audio';
import {freshSave} from '../src/game/storage';
afterEach(()=>vi.unstubAllGlobals());
it('closes a partially initialized audio graph and keeps frame updates safe',async()=>{const close=vi.fn().mockResolvedValue(undefined);vi.stubGlobal('AudioContext',class{close=close;createGain(){throw new Error('device unavailable');}});const audio=new AudioSystem(freshSave().settings);await expect(audio.start()).rejects.toThrow('device unavailable');expect(close).toHaveBeenCalledOnce();expect(()=>audio.update(null,false)).not.toThrow();expect(audio.context).toBeUndefined();});
it('effects muted at zero never create a tone',()=>{const audio=new AudioSystem({...freshSave().settings,effects:0}),createOscillator=vi.fn();audio.context={createOscillator} as unknown as AudioContext;audio.ready=true;audio.tone();expect(createOscillator).not.toHaveBeenCalled();});

import {ENGINE_BANKS,engineLayers,EngineVoice} from '../src/game/engine-voice';
import {tireIntensity} from '../src/game/audio';
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
for(const bank of Object.keys(ENGINE_BANKS) as (keyof typeof ENGINE_BANKS)[])it(`${bank} blends at most two neighboring recordings without gain holes`,()=>{for(let rpm=700;rpm<=10500;rpm+=47){const layers=engineLayers(bank,rpm);expect(layers.filter(l=>l.gain>1e-8).length).toBeLessThanOrEqual(2);expect(layers.reduce((n,l)=>n+l.gain*l.gain,0)).toBeCloseTo(1,6);expect(layers.every(l=>Number.isFinite(l.rate)&&l.rate>=.65&&l.rate<=1.6)).toBe(true);}});
it('tire sound responds to hard braking and sideways slip and stays silent at rest/in flight',()=>{const d={speed:40,drift:0,sideSpeed:0,brakeInput:1,airborne:0};expect(tireIntensity(d)).toBeGreaterThan(.4);expect(tireIntensity({...d,airborne:1})).toBe(0);expect(tireIntensity({...d,speed:0})).toBe(0);expect(tireIntensity({...d,brakeInput:0,sideSpeed:5})).toBeGreaterThan(.4);});
it('free revving rises while stationary and settles after releasing the pedal',()=>{const voice=new EngineVoice();for(let i=0;i<120;i++)voice.update('vanta',0,1,1/60,1,true);expect(voice.rpm).toBeGreaterThan(8000);for(let i=0;i<120;i++)voice.update('vanta',0,0,1/60,1,true);expect(voice.rpm).toBeLessThan(1100);});
it('all distributed audio has matching provenance hashes, compact PCM data and continuous loop seams',()=>{
 const manifest=JSON.parse(readFileSync('public/licenses/audio.json','utf8'));expect(manifest.license).toBe('CC-BY-4.0');let total=0;
 for(const asset of manifest.assets){const b=readFileSync('public/'+asset.file);total+=b.length;expect(createHash('sha256').update(b).digest('hex')).toBe(asset.sha256);expect(b.toString('ascii',0,4)).toBe('RIFF');expect(b.readUInt32LE(24)).toBe(44100);expect(b.readUInt16LE(22)).toBe(1);expect(b.readUInt16LE(34)).toBe(16);let peak=0;for(let i=44;i<b.length;i+=2)peak=Math.max(peak,Math.abs(b.readInt16LE(i))/32768);expect(peak).toBeLessThan(.86);if(asset.loop)expect(Math.abs(b.readInt16LE(44)-b.readInt16LE(b.length-2))/32768).toBeLessThan(.15);}
 expect(total).toBeLessThan(2*1024*1024);
});
