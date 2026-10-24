import * as THREE from 'three';
import type {Track} from './track';
export const RAMP={fraction:.18,length:13,rise:1.4,left:3.1,right:7.9};
export function rampHeight(track:Track,distance:number,lateral:number){
  const offset=((distance%track.length)+track.length)%track.length-track.length*RAMP.fraction;
  return offset>=0&&offset<RAMP.length&&lateral>=RAMP.left&&lateral<=RAMP.right?.05+offset/RAMP.length*RAMP.rise:0;
}
/** The visible wedge follows the same curved road samples and height function as the tires. */
export function rampGeometry(track:Track){
  const positions:number[]=[],indices:number[]=[];
  for(let i=0;i<=RAMP.length;i++){
    const s=track.sample(track.length*RAMP.fraction+i);
    for(const height of [.05+i/RAMP.length*RAMP.rise,.015])for(const lateral of [RAMP.left,RAMP.right]){
      const p=s.position.clone().addScaledVector(s.right,lateral);positions.push(p.x,p.y+height,p.z);
    }
    if(i<RAMP.length){const a=i*4;indices.push(a,a+1,a+4,a+4,a+1,a+5,a,a+4,a+2,a+2,a+4,a+6,a+1,a+3,a+5,a+3,a+7,a+5);}
  }
  const end=RAMP.length*4;indices.push(0,2,1,1,2,3,end,end+1,end+2,end+1,end+3,end+2);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
