import {it,expect} from 'vitest';
import {ResolutionGovernor} from '../src/game/performance';
import {Track} from '../src/game/track';
const frames=(g:ResolutionGovernor,seconds:number,rate:number,active=true)=>{for(let i=0;i<seconds*rate;i++)g.sample(1/rate,active);};
it('reduces sustained slow rendering within a bounded resolution range',()=>{const g=new ResolutionGovernor();frames(g,40,25);expect(g.scale).toBe(.55);});
it('ignores pauses and isolated stalls, recovers gradually, and resets on manual changes',()=>{
  const g=new ResolutionGovernor();frames(g,4,60);g.sample(.2);frames(g,1,60);expect(g.scale).toBe(1);
  frames(g,10,25);expect(g.scale).toBeLessThan(1);const reduced=g.scale;frames(g,30,5,false);expect(g.scale).toBe(reduced);
  frames(g,35,60);expect(g.scale).toBeGreaterThan(reduced);g.reset();expect(g.scale).toBe(1);g.enabled=false;frames(g,30,10);expect(g.scale).toBe(1);
});
it('reuses immutable minimap geometry while live marker positions still follow the track',()=>{const t=new Track('city'),a=t.mapPath();expect(t.mapPath()).toBe(a);expect(a.point(0)).not.toEqual(a.point(100));expect(t.mapPath(190)).not.toBe(a);});
