import {it,expect,vi,afterEach} from 'vitest';
import {AudioSystem} from '../src/game/audio';
import {freshSave} from '../src/game/storage';
afterEach(()=>vi.unstubAllGlobals());
it('closes a partially initialized audio graph and keeps frame updates safe',async()=>{const close=vi.fn().mockResolvedValue(undefined);vi.stubGlobal('AudioContext',class{close=close;createGain(){throw new Error('device unavailable');}});const audio=new AudioSystem(freshSave().settings);await expect(audio.start()).rejects.toThrow('device unavailable');expect(close).toHaveBeenCalledOnce();expect(()=>audio.update(null,false)).not.toThrow();expect(audio.context).toBeUndefined();});
it('effects muted at zero never create a tone',()=>{const audio=new AudioSystem({...freshSave().settings,effects:0}),createOscillator=vi.fn();audio.context={createOscillator} as unknown as AudioContext;audio.ready=true;audio.tone();expect(createOscillator).not.toHaveBeenCalled();});
