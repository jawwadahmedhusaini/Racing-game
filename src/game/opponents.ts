import type {Driver} from './simulation';
import type {Track} from './track';
import {RAMP} from './ramp';
import {footprint,velocity} from './contact';
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export function raceGap(a:number,b:number,length:number){return ((a-b+length/2)%length+length)%length-length/2;}

// Variations apply to line choice and pace only. Every rival uses the same
// clearance checks and vehicle forces as the rest of the grid.
const profiles=[
  {offset:0, corner:1, boostBend:.002, reserve:35, boostWindow:0},
  {offset:-.24, corner:1.015, boostBend:.002, reserve:33, boostWindow:-.12},
  {offset:.22, corner:.985, boostBend:.0016, reserve:43, boostWindow:.2},
  {offset:-.12, corner:1.01, boostBend:.0021, reserve:32, boostWindow:0},
  {offset:.18, corner:1.005, boostBend:.0024, reserve:39, boostWindow:-.2},
  {offset:-.18, corner:.99, boostBend:.0018, reserve:47, boostWindow:.28},
  {offset:.2, corner:1, boostBend:.002, reserve:35, boostWindow:.13},
] as const;
export const rivalProfile=(id:number)=>profiles[id]??profiles[0];

/** Choose a complete passing corridor; nearby traffic on either side is considered. */
export function planOpponent(driver:Driver,drivers:Driver[],track:Track){
  const look=track.sample(driver.distance+Math.max(30,driver.speed*.8));
  const bend=Math.max(Math.abs(look.curvature),Math.abs(track.sample(driver.distance+12).curvature));
  const rampApproach=raceGap(driver.distance,track.length*RAMP.fraction,track.length);
  const avoidRamp=rampApproach>-65&&rampApproach<RAMP.length+15;
  const ideal=avoidRamp?-2:clamp(-look.curvature*220,-2.8,2.8)+(driver.id%3-1)*.4+rivalProfile(driver.id).offset;
  const obstacles=drivers.filter(o=>o.id!==driver.id&&!o.eliminated&&o.finishTime===null&&Math.abs(o.airborne+o.rampLift-driver.airborne-driver.rampLift)<1.5);
  const horizon=Math.max(34,driver.speed*.5+driver.speed*driver.speed/48+9);
  const lateralRadius=(d:Driver)=>{const f=footprint(d);return Math.abs(Math.cos(d.heading))*f.width+Math.abs(Math.sin(d.heading))*f.length;};
  const motion=velocity(driver), radius=lateralRadius(driver);
  let lead:Driver|undefined,gap=Infinity;
  for(const other of obstacles){
    const d=raceGap(other.distance,driver.distance,track.length);
    if(d<=0||d>=Math.min(horizon,gap))continue;
    const clearance=radius+lateralRadius(other)+.4;
    const lateralGap=other.lateral-driver.lateral;
    // A car already sliding across lanes can enter the occupied corridor well
    // before its steering reaches the new target. Brake for that trajectory.
    if(Math.abs(lateralGap)<clearance){
      lead=other;gap=d;continue;
    }
    const otherMotion=velocity(other);
    const time=clamp((d-5)/Math.max(4,motion.z-otherMotion.z),0,1.25);
    const projected=lateralGap+(otherMotion.x-motion.x)*time;
    if(Math.abs(projected)<clearance||projected*lateralGap<0){lead=other;gap=d;}
  }
  const committed=Math.abs(driver.targetLane)>4&&obstacles.some(other=>{const d=raceGap(other.distance,driver.distance,track.length);return d>-9&&d<horizon&&Math.abs(other.lateral-driver.targetLane)>3;});
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
    if(gap<17||!safe.length)speedLimit=Math.max(0,lead.speed)+Math.max(0,gap-6)*1.25+(safe.length?1.5:0);
    // A fixed 34 m lookahead is shorter than braking distance at racing speed.
    // Brake for the current occupied corridor even while planning a pass.
    speedLimit=Math.min(speedLimit,Math.max(0,lead.speed)+Math.sqrt(48*Math.max(0,gap-7))+(safe.length?1.5:0));
    // A stopped car needs room to clear laterally before we resume full power.
    if(lead.speed<5)speedLimit=Math.min(speedLimit,Math.max(0,lead.speed)+Math.max(safe.length?7:2, (gap-7)*1.35));

  }
  return {lane:clamp(lane,-5,5),speedLimit,bend};
}
