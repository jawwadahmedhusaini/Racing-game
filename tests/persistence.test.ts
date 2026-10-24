import {it,expect,vi,afterEach} from 'vitest';
import {freshSave,parseSave,loadSave,saveProgress,SAVE_KEY} from '../src/game/storage';
afterEach(()=>vi.unstubAllGlobals());
it('preserves old progress and validates the new device settings without resetting the save',()=>{const old={...freshSave(),credits:12345,owned:['vanta','spectre'],selected:'spectre',settings:{quality:'medium',adaptiveResolution:'false',showPerformance:1}};const save=parseSave(JSON.stringify(old));expect(save.credits).toBe(12345);expect(save.selected).toBe('spectre');expect(save.settings).toMatchObject({quality:'medium',adaptiveResolution:true,showPerformance:false});});
it('refuses a stale write when another session changed the serialized save',()=>{const storage=new Map([[SAVE_KEY,JSON.stringify(freshSave())]]);vi.stubGlobal('localStorage',{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)});const ours=loadSave();ours.credits+=1100;storage.set(SAVE_KEY,JSON.stringify({...freshSave(),credits:8000}));expect(saveProgress(ours)).toBe('conflict');expect(JSON.parse(storage.get(SAVE_KEY)!).credits).toBe(8000);const latest=loadSave();latest.credits+=200;expect(saveProgress(latest)).toBe('saved');expect(loadSave().credits).toBe(8200);});
it('storage access denied at both read and write does not throw',()=>{vi.stubGlobal('localStorage',{getItem(){throw new Error('denied');},setItem(){throw new Error('denied');}});expect(loadSave()).toEqual(freshSave());expect(saveProgress(freshSave())).toBe('unavailable');});

it('preserves old circuit records separately from the revised circuit records',()=>{
  const save=parseSave(JSON.stringify({version:1,credits:9000,owned:['vanta','spectre'],selected:'spectre',bestTimes:{'coast-time':35,'coast-v2-time':41,'city-v2-quick':90}}));
  expect(save.credits).toBe(9000);expect(save.selected).toBe('spectre');expect(save.bestTimes).toEqual({'coast-time':35,'coast-v2-time':41,'city-v2-quick':90});
});

it('retains Solstice ownership, reduced motion and separate 2.4 records across parsing',()=>{const save=freshSave();save.owned.push('solstice');save.selected='solstice';save.settings.reducedMotion=true;save.bestTimes={'coast-v2-quick':85,'coast-v3-quick':84};expect(parseSave(JSON.stringify(save))).toEqual(save);});
