import {it,expect} from 'vitest';
import {HARBOR_UNDERPASS,isHarborUnderpass,Track} from '../src/game/track';

for(const id of ['coast','city'] as const)it(`${id}: non-adjacent road corridors do not cross or overlap`,()=>{
  const track=new Track(id),step=8,samples=Array.from({length:Math.ceil(track.length/step)},(_,i)=>track.sample(i*step).position);
  let clearance=Infinity;
  for(let i=0;i<samples.length;i++)for(let j=i+1;j<samples.length;j++){
    const along=(j-i)*step;if(Math.min(along,track.length-along)<100)continue;
    clearance=Math.min(clearance,Math.hypot(samples[i].x-samples[j].x,samples[i].z-samples[j].z)-track.width);
  }
  expect(clearance).toBeGreaterThan(12);
});
it('the harbor route has a separate length and elevation profile from the coast',()=>{
  const coast=new Track('coast'),city=new Track('city');
  expect(city.length-coast.length).toBeGreaterThan(500);
  const heights=city.samples.map(s=>s.position.y);expect(Math.max(...heights)-Math.min(...heights)).toBeGreaterThan(17);
  expect(city.samples.filter(s=>Math.abs(s.curvature)<.001).length).toBeGreaterThan(180);
});

it('separates the harbor chicane, underpass, and high waterfront straight',()=>{
  const city=new Track('city');
  const dock=city.sample(120);
  const bends=Array.from({length:35},(_,index)=>city.sample(690+index*6).curvature);
  const underpass=city.sample((HARBOR_UNDERPASS.start+HARBOR_UNDERPASS.end)/2);
  expect(isHarborUnderpass(HARBOR_UNDERPASS.start-1,city.length)).toBe(false);
  expect(isHarborUnderpass(HARBOR_UNDERPASS.start+city.length,city.length)).toBe(true);
  expect(isHarborUnderpass(HARBOR_UNDERPASS.end,city.length)).toBe(false);
  const waterfront=city.sample(city.length-490);
  expect(Math.abs(dock.curvature)).toBeLessThan(.001);
  expect(Math.max(...bends)).toBeGreaterThan(.008);
  expect(Math.min(...bends)).toBeLessThan(-.008);
  expect(Math.abs(underpass.curvature)).toBeLessThan(.003);
  expect(waterfront.position.y).toBeGreaterThan(22);
  expect(Math.abs(waterfront.curvature)).toBeLessThan(.003);
});
