import * as THREE from 'three';
import type { TrackId } from './content';
import {rampHeight} from './ramp';

export interface TrackSample { position:THREE.Vector3; tangent:THREE.Vector3; right:THREE.Vector3; yaw:number; curvature:number; }
export class Track {
  id:TrackId; length:number; width=18; curve:THREE.CatmullRomCurve3;
  samples:TrackSample[]=[]; count=1800;
  private maps=new Map<string,{path:string;point:(distance:number)=>{x:number;y:number}}>();
  constructor(id:TrackId) {
    this.id=id;
    const points=id==='coast'?[
      [0,8,0],[0,10,180],[-110,19,330],[-280,24,290],[-365,16,110],[-280,10,-65],[-190,15,-255],[20,20,-320],[210,13,-180],[235,9,-25],[120,8,-40],
    ]:[
      [180,6,-260],[180,6,40],[180,7,310],[90,8,400],[-60,10,360],[-180,10,300],[-330,10,340],[-410,12,220],[-320,19,130],[-200,23,80],[-210,20,-30],[-380,13,-100],[-400,8,-260],[-260,6,-370],[-60,5,-360],[90,6,-345],
    ];
    this.curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],p[1],p[2])),true,'catmullrom',id==='coast'?.65:.5);
    this.curve.arcLengthDivisions=3600;this.curve.updateArcLengths();this.length=this.curve.getLength();
    for(let i=0;i<this.count;i++) {
      const t=(i/this.count+90/this.length)%1,position=this.curve.getPointAt(t),tangent=this.curve.getTangentAt(t).normalize();
      // Travel direction × world up: camera-right when looking along the road.
      const right=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();
      const before=this.curve.getTangentAt((t-1/this.count+1)%1),after=this.curve.getTangentAt((t+1/this.count)%1);
      const delta=angleDelta(Math.atan2(before.x,before.z),Math.atan2(after.x,after.z));
      this.samples.push({position,tangent,right,yaw:Math.atan2(tangent.x,tangent.z),curvature:delta/(this.length*2/this.count)});
    }
  }
  sample(distance:number):TrackSample {
    const f=((distance%this.length+this.length)%this.length)/this.length*this.count;
    const i=Math.floor(f),t=f-i,a=this.samples[i],b=this.samples[(i+1)%this.count];
    return {position:a.position.clone().lerp(b.position,t),tangent:a.tangent.clone().lerp(b.tangent,t).normalize(),right:a.right.clone().lerp(b.right,t).normalize(),yaw:a.yaw+angleDelta(a.yaw,b.yaw)*t,curvature:a.curvature+(b.curvature-a.curvature)*t};
  }
  rampAt(distance:number,lateral:number){return rampHeight(this,distance,lateral)>0;}
  mapPath(size=180,pad=12) {
    const key=`${size}:${pad}`,cached=this.maps.get(key);if(cached)return cached;
    const xs=this.samples.map(s=>s.position.x),zs=this.samples.map(s=>s.position.z);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),scale=(size-pad*2)/Math.max(maxX-minX,maxZ-minZ);
    const point=(distance:number)=>{const p=this.sample(distance).position;return {x:pad+(p.x-minX)*scale+(size-pad*2-(maxX-minX)*scale)/2,y:pad+(p.z-minZ)*scale+(size-pad*2-(maxZ-minZ)*scale)/2};};
    let path='';for(let i=0;i<=100;i++){const p=point(i/100*this.length);path+=`${i?'L':'M'}${p.x.toFixed(1)},${p.y.toFixed(1)} `;}const result={path:path+'Z',point};this.maps.set(key,result);return result;
  }
}
export function angleDelta(a:number,b:number) {return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
