import type {Driver} from './simulation';
import type {Track} from './track';
import {RAMP} from './ramp';
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export function raceGap(a:number,b:number,length:number){return ((a-b+length/2)%length+length)%length-length/2;}

/** Choose a complete passing corridor; nearby traffic on either side is considered. */
export function planOpponent(driver:Driver,drivers:Driver[],track:Track){
  const look=track.sample(driver.distance+Math.max(30,driver.speed*.8));
  const bend=Math.max(Math.abs(look.curvature),Math.abs(track.sample(driver.distance+12).curvature));
  const rampApproach=raceGap(driver.distance,track.length*RAMP.fraction,track.length);
  const avoidRamp=rampApproach>-65&&rampApproach<RAMP.length+15;
  const ideal=avoidRamp?-2:clamp(-look.curvature*220,-2.8,2.8)+(driver.id%3-1)*.4;
  const obstacles=drivers.filter(o=>o.id!==driver.id&&!o.eliminated&&o.finishTime===null&&Math.abs(o.airborne+o.rampLift-driver.airborne-driver.rampLift)<1.5);
  let lead:Driver|undefined,gap=Infinity;
  for(const other of obstacles){const d=raceGap(other.distance,driver.distance,track.length);if(d>0&&d<34&&Math.abs(other.lateral-driver.lateral)<2.9&&d<gap){lead=other;gap=d;}}
  const committed=Math.abs(driver.targetLane)>4&&obstacles.some(other=>{const d=raceGap(other.distance,driver.distance,track.length);return d>-9&&d<35&&Math.abs(other.lateral-driver.targetLane)>3;});
  let lane=committed&&!avoidRamp?driver.targetLane:ideal,speedLimit=Infinity;
  if(lead){
    const choices=(avoidRamp?[-5,0]:[-5,0,5]).filter(candidate=>Math.abs(candidate-lead!.lateral)>3);
    const safe=choices.filter(candidate=>obstacles.every(other=>{
      const d=raceGap(other.distance,driver.distance,track.length);
      const rear=Math.max(9,(other.speed-driver.speed)*1.2+7),front=Math.max(12,(driver.speed-other.speed)*.8+9);
      const sameLane=Math.abs(other.lateral-driver.lateral)<2.6;
      const crossing=Math.abs(other.lateral-candidate)<2.8||(!sameLane&&other.lateral>=Math.min(driver.lateral,candidate)-2.6&&other.lateral<=Math.max(driver.lateral,candidate)+2.6);
      if(other===lead&&d>5.5)return true;
      return !(d>-rear&&d<front&&crossing);
    }));
    safe.sort((a,b)=>(Math.abs(a-driver.targetLane)*1.2+Math.abs(a-ideal)*.3)-(Math.abs(b-driver.targetLane)*1.2+Math.abs(b-ideal)*.3));
    lane=safe[0]??driver.lateral;
    if(gap<17||!safe.length)speedLimit=Math.max(0,lead.speed)+Math.max(0,gap-6)*1.25+(safe.length?4:0);
  }
  return {lane:clamp(lane,-5,5),speedLimit,bend};
}
