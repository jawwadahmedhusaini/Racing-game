import {it,expect} from 'vitest';
import {Track,angleDelta} from '../src/game/track';
import {RoadSpace} from '../src/game/road-space';
for(const id of ['coast','city'] as const){
  it(`${id} protects the full footprint beside every road section, including the seam`,()=>{
    const track=new Track(id),space=new RoadSpace(track);
    for(let d=-20;d<track.length;d+=5){const s=track.sample(d);for(const side of [-1,1]){
      const inside=s.position.clone().addScaledVector(s.right,side*15);
      expect(space.clear(inside.x,inside.z,5)).toBe(false);
    }}
    expect(space.clear(1200,1200,50)).toBe(true);
  });
  it(`${id} starts on a straight with enough space for the complete grid`,()=>{
    const track=new Track(id),front=track.sample(0),back=track.sample(-21);
    expect(Math.abs(angleDelta(front.yaw,back.yaw))).toBeLessThan(.04);
    expect(Math.max(...track.samples.map(s=>Math.abs(s.curvature)))*track.width/2).toBeLessThan(.6);
  });
}

it('keeps later foliage and props out of a reserved landmark footprint',()=>{const space=new RoadSpace(new Track('coast'));expect(space.reserve('pavilion',1200,1200,14)).toBe(true);expect(space.place('tree',1215,1200,7)).toBe(false);expect(space.place('tree',1225,1200,7)).toBe(true);expect(space.placements).toHaveLength(2);});
