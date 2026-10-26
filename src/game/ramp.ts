import * as THREE from 'three';
import type {Track} from './track';
export const RAMP={fraction:.18,length:13,rise:1.4,left:3.1,right:7.9};
type RampPose={distance:number;lateral:number;heading:number};
type Footprint={width:number;length:number};
const slope=RAMP.rise/RAMP.length;
function offsetAt(track:Track,distance:number){return ((distance%track.length)+track.length)%track.length-track.length*RAMP.fraction;}
export function rampHeight(track:Track,distance:number,lateral:number){
  const offset=offsetAt(track,distance);
  return offset>=0&&offset<RAMP.length&&lateral>=RAMP.left&&lateral<=RAMP.right?.05+offset/RAMP.length*RAMP.rise:0;
}
/** Full footprint against a slice of the wedge in the road's right/forward frame.
 * Returns an outward separation, not a rollback of the car's whole movement.
 */
function overlap(track:Track,pose:RampPose,shape:Footprint,from:number){
  if(from>=RAMP.length)return null;
  const z=offsetAt(track,pose.distance),c=Math.cos(pose.heading),s=Math.sin(pose.heading);
  const right={x:c,z:s},forward={x:-s,z:c};
  const halfWidth=(RAMP.right-RAMP.left)/2,halfLength=(RAMP.length-from)/2;
  const dx=pose.lateral-(RAMP.left+RAMP.right)/2,dz=z-(from+RAMP.length)/2;
  if(Math.abs(dx)>halfWidth+shape.width+shape.length||Math.abs(dz)>halfLength+shape.width+shape.length)return null;
  let depth=Infinity,normal={x:0,z:0};
  for(const axis of [{x:1,z:0},{x:0,z:1},right,forward]){
    const carRadius=Math.abs(axis.x*right.x+axis.z*right.z)*shape.width+Math.abs(axis.x*forward.x+axis.z*forward.z)*shape.length;
    const separation=dx*axis.x+dz*axis.z;
    const penetration=carRadius+halfWidth*Math.abs(axis.x)+halfLength*Math.abs(axis.z)-Math.abs(separation);
    if(penetration<=0)return null;
    if(penetration<depth){depth=penetration;const sign=separation>=0?1:-1;normal={x:axis.x*sign,z:axis.z*sign};}
  }
  return {x:normal.x*(depth+.0001),z:normal.z*(depth+.0001)};
}
/** A partly supported car follows the slope even when its center is beside it.
 * This deliberately forgiving arcade support prevents edge-straddling deadlocks.
 */
export function rampSupport(track:Track,pose:RampPose,shape:Footprint){
  const z=offsetAt(track,pose.distance);
  return z>=0&&z<RAMP.length&&overlap(track,pose,shape,0)? .05+z*slope:0;
}
/** Only the wedge above the car's climbable clearance is an obstacle.
 * The low front remains drivable; the raised sides and rear remain solid.
 */
export function rampContact(track:Track,pose:RampPose,shape:Footprint,height:number,travel=0){
  const from=Math.max(0,(height+.35+Math.abs(travel)*slope-.05)/slope);
  return overlap(track,pose,shape,from);
}
/** Orient the chassis to the surface plane even when it faces across/down the slope. */
export function surfaceTilt(roadTangentY:number,heading:number,onRamp:boolean){
  const grade=Math.tan(Math.asin(roadTangentY))+(onRamp?slope:0),along=grade*Math.cos(heading);
  return {pitch:-Math.atan(along),roll:-Math.atan2(grade*Math.sin(heading),Math.hypot(1,along))};
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
