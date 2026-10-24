import {CARS,type CarSpec,type RaceMode,type Difficulty} from './content';
import {Track,angleDelta} from './track';
import {contactOffset,footprint} from './contact';
import {rampHeight,RAMP} from './ramp';
import {planOpponent} from './opponents';
import {shiftGear} from './engine-voice';

export interface Controls {throttle:number; brake:number; steer:number; drift:boolean; nitro:boolean;}
export const NO_INPUT:Controls={throttle:0,brake:0,steer:0,drift:false,nitro:false};
export interface Driver {
  id:number; name:string; spec:CarSpec; distance:number; lateral:number; speed:number; heading:number; yawVelocity:number;
  nitro:number; boost:number; drift:number; driftTotal:number; airborne:number; verticalSpeed:number; rampLift:number; jumpRewardPending:boolean;
  finishTime:number|null; eliminated:boolean; collision:number; steer:number; lap:number;
  targetLane:number; lastRamp:number; boostCooldown:number; boostPrevious:boolean; jumpTotal:number; reverseHold:number; slipAngle:number; acceleration:number; landingImpact:number; throttle:number; gear:number;
}
export interface RaceOptions {car:CarSpec;track:Track;mode:RaceMode;difficulty:Difficulty;upgrade:number; laps?:number;}
export class RaceSimulation {
  track:Track;drivers:Driver[]=[];mode:RaceMode;difficulty:Difficulty;upgrade:number;
  status:'countdown'|'racing'|'finished'='countdown';countdown=3.5;elapsed=0;laps:number;resultPosition=0;
  eliminatedAt=0;nextElimination=28;bestSpeed=0;lastEvent='';eventTimer=0;rank=1;finishedAt=0;
  constructor(options:RaceOptions) {
    this.track=options.track;this.mode=options.mode;this.difficulty=options.difficulty;this.upgrade=options.upgrade;this.laps=options.laps??(options.mode==='time'?1:2);
    const names=['YOU','M. KOVA','J. SANTOS','R. WOLFF','A. RIVERA','K. MORI','L. COSTA'];
    for(let i=0;i<(this.mode==='time'?1:7);i++)this.drivers.push({id:i,name:names[i],spec:i===0?options.car:CARS[(i-1)%CARS.length],distance:-Math.floor(i/2)*7,lateral:(i%2===0?-1:1)*3,speed:0,heading:0,yawVelocity:0,nitro:65,boost:0,drift:0,driftTotal:0,airborne:0,verticalSpeed:0,rampLift:0,jumpRewardPending:false,finishTime:null,eliminated:false,collision:0,steer:0,lap:1,targetLane:(i%2===0?-1:1)*3,lastRamp:-1,boostCooldown:0,boostPrevious:false,jumpTotal:0,reverseHold:0,slipAngle:0,acceleration:0,landingImpact:0,throttle:0,gear:1});
    this.updateRank();
  }
  get player(){return this.drivers[0];}
  get ordered(){return [...this.drivers].sort((a,b)=>Number(a.eliminated)-Number(b.eliminated)||(a.finishTime!==null&&b.finishTime!==null?a.finishTime-b.finishTime:b.distance-a.distance));}
  updateRank(){this.rank=this.ordered.findIndex(d=>d.id===0)+1;}
  event(text:string){this.lastEvent=text;this.eventTimer=2.1;}
  turnCapacity(d:Driver){return Math.sign(d.speed)*Math.min(Math.abs(d.speed)/9,1)*1.75/(1+Math.abs(d.speed)*.018)*(d.spec.handling/90);}
  // Explicit driver steering controller for rivals and deterministic race diagnostics.
  // The player never receives this input unless a diagnostic explicitly supplies it.
  steeringFor(d:Driver,lane=0){
    const sample=this.track.sample(d.distance);
    const desiredHeading=clamp(-(lane-d.lateral)*.065,-.42,.42);
    const turn=sample.curvature*d.speed/Math.max(.5,1+sample.curvature*d.lateral)+angleDelta(d.heading,desiredHeading)*3.2;
    return clamp(-turn/Math.max(.15,this.turnCapacity(d)),-1,1);
  }
  aiInput(d:Driver):Controls {
    const {lane,speedLimit,bend}=planOpponent(d,this.drivers,this.track);
    const factor={rookie:.77,pro:.91,expert:1.02}[this.difficulty],personality=.96+(d.id%3)*.025;
    const targetSpeed=Math.min((d.spec.topSpeed/3.6)*factor*personality,Math.sqrt(36/(bend+.0015))*.83,speedLimit);
    d.targetLane=lane;
    return {throttle:targetSpeed<.5?0:d.speed<targetSpeed?1:.15,brake:d.speed>targetSpeed+1?.75:0,steer:this.steeringFor(d,d.targetLane),drift:false,nitro:d.nitro>35&&bend<.002&&d.speed>40&&(Math.sin(this.elapsed*.2+d.id)>0)};
  }
  step(dt:number,input:Controls) {
    if(this.status==='finished')return;
    if(this.status==='countdown'){this.countdown-=dt;if(this.countdown<=0){this.status='racing';this.event('GO · OWN THE HORIZON');}return;}
    this.elapsed+=dt;this.eventTimer=Math.max(0,this.eventTimer-dt);
    for(const d of this.drivers) {
      if(d.eliminated||d.finishTime!==null)continue;
      const controls=d.id===0?input:this.aiInput(d);this.integrate(d,dt,controls);
      if(d.distance>=this.track.length*this.laps){d.finishTime=this.elapsed;d.speed=0;}
    }
    // Broadphase for seven cars: physical separation and speed exchange on close contact.
    for(let i=0;i<this.drivers.length;i++)for(let j=i+1;j<this.drivers.length;j++) {
      const a=this.drivers[i],b=this.drivers[j];if(a.eliminated||b.eliminated||a.finishTime!==null||b.finishTime!==null||Math.abs(a.airborne+a.rampLift-b.airborne-b.rampLift)>1)continue;
      const contact=contactOffset(a,b,this.track.length,angleDelta(this.track.sample(a.distance).yaw,this.track.sample(b.distance).yaw));
      if(contact){
        a.lateral+=contact.x;b.lateral-=contact.x;a.distance+=contact.z;b.distance-=contact.z;
        if(Math.abs(contact.dz)>2.5){const rear=contact.dz>0?b:a,front=contact.dz>0?a:b;const impulse=Math.max(0,rear.speed-front.speed)*.55;rear.speed-=impulse;front.speed+=impulse*.3;}
        a.collision=b.collision=.4;
      }
    }
    // Rival contact can push a car across the wall after its own integration.
    for(const d of this.drivers)if(!d.eliminated&&d.finishTime===null)this.constrainToRoad(d,0);
    if(this.mode==='elimination'&&this.elapsed>=this.nextElimination) {
      const active=this.ordered.filter(d=>!d.eliminated&&d.finishTime===null);
      if(active.length>1){const last=active[active.length-1];last.eliminated=true;last.speed=0;this.event(last.id===0?'ELIMINATED':`${last.name} ELIMINATED`);}
      this.eliminatedAt=this.elapsed;this.nextElimination+=22;
    }
    this.updateRank();this.bestSpeed=Math.max(this.bestSpeed,this.player.speed*3.6);
    if(this.player.finishTime!==null||this.player.eliminated||(this.mode==='elimination'&&this.drivers.filter(d=>!d.eliminated).length===1)) {
      this.resultPosition=this.player.eliminated?this.drivers.filter(d=>!d.eliminated).length+1:this.rank;
      this.player.finishTime??=this.elapsed;this.status='finished';this.finishedAt=this.elapsed;
    }
  }
  integrate(d:Driver,dt:number,c:Controls) {
    const previousDistance=d.distance,previousLateral=d.lateral,previousLift=d.rampLift,previousSpeed=d.speed;
    d.landingImpact=Math.max(0,d.landingImpact-dt*3);
    const sample=this.track.sample(d.distance),up=d.id===0?this.upgrade:0;
    const max=d.spec.topSpeed/3.6*(1+up*.024);
    const nitroRating=clamp(d.spec.nitro/90,.8,1.15);
    const accel=(15+d.spec.acceleration*.09)*(1+up*.06);
    d.boostCooldown=Math.max(0,d.boostCooldown-dt);
    if(c.nitro&&!c.brake&&d.speed>5) {
      if(d.nitro>0){
        if(!d.boostPrevious||d.boost===0){d.boost=d.nitro>=95?2:1;if(d.id===0)this.event(d.boost===2?'SHOCKWAVE':'NITRO');}
        d.nitro=Math.max(0,d.nitro-dt*(d.boost===2?23:17)/nitroRating);
      }
    } else {d.boost=0;d.nitro=Math.min(100,d.nitro+dt*(c.throttle>0?2.3:1.2));}
    d.boostPrevious=c.nitro;
    if(d.nitro<=0)d.boost=0;
    const steering=clamp(c.steer,-1,1);d.steer=steering;
    const drifting=c.drift&&!c.brake&&d.speed>13&&Math.abs(steering)>.1&&d.airborne<.05&&d.rampLift===0&&d.collision===0;
    d.drift+=((drifting?steering:0)-d.drift)*(1-Math.exp(-dt*(drifting?5:7)));
    // Separate travel slip from body yaw. Grip returns smoothly after drift release.
    const grip=d.spec.handling/90;
    d.slipAngle+=((drifting?d.drift*.16:0)-d.slipAngle)*(1-Math.exp(-dt*(drifting?5:8*grip)));
    if(drifting){d.nitro=Math.min(100,d.nitro+dt*15);d.driftTotal+=dt;}
    // A held brake stops forward travel first, then engages reverse after a deliberate dwell.
    // Opponents use the same brakes but cannot request reverse.
    const throttle=c.brake?0:c.throttle;d.throttle=throttle;
    if(c.brake&&d.id===0&&d.speed<=.05)d.reverseHold+=dt;else d.reverseHold=0;
    if(d.speed<0){
      if(throttle>0)d.speed=Math.min(0,d.speed+dt*39*throttle);
      else if(c.brake&&d.id===0)d.speed=Math.max(-10,d.speed-dt*8*c.brake);
      else d.speed=Math.min(0,d.speed+dt*(c.brake*39+5.2));
    }else if(d.reverseHold>=.35){d.speed=Math.max(-10,d.speed-dt*8*c.brake);}
    else {
      const power=throttle*accel*(1-Math.pow(d.speed/(max+(d.boost?25*nitroRating:0)),2));
      d.speed=clamp(d.speed+dt*(power-c.brake*39-(throttle?1.4:5.2)-Math.abs(d.drift)*5.5+(d.boost===2?32:d.boost?21:0)*nitroRating),0,max+(d.boost===2?30:d.boost?19:0)*nitroRating);
    }
    // Integrate the car's own world heading. Curved road coordinates never steer it.
    // Positive control means physical right, which is negative world-Y yaw.
    const desiredYaw=-steering*this.turnCapacity(d)*(drifting?1.17:1);
    d.yawVelocity+=(desiredYaw-d.yawVelocity)*Math.min(1,dt*(d.airborne>.3?1.2:drifting?3.8:7.5));
    d.heading+=d.yawVelocity*dt;
    const slip=d.speed>0?d.slipAngle:0;
    d.lateral-=Math.sin(d.heading+slip)*d.speed*dt;
    const advance=d.speed*Math.cos(d.heading+slip)/Math.max(.5,1+sample.curvature*d.lateral)*dt;
    d.distance+=advance;
    const roadTurn=angleDelta(sample.yaw,this.track.sample(d.distance).yaw);
    d.heading=angleDelta(0,d.heading-roadTurn);
    d.collision=Math.max(0,d.collision-dt);
    this.constrainToRoad(d,dt);
    let floor=rampHeight(this.track,d.distance,d.lateral);
    // Raised sides and the back of the wedge are solid. Its low leading edge is climbable.
    const shape=footprint(d);let highestRamp=floor;
    for(const x of [-shape.width,shape.width])for(const z of [-shape.length,shape.length])highestRamp=Math.max(highestRamp,rampHeight(this.track,d.distance+x*Math.sin(d.heading)+z*Math.cos(d.heading),d.lateral+x*Math.cos(d.heading)-z*Math.sin(d.heading)));
    if(highestRamp>previousLift+d.airborne+.35+Math.abs(d.speed)*dt*RAMP.rise/RAMP.length){
      d.distance=previousDistance;d.lateral=previousLateral;d.heading=angleDelta(0,d.heading+roadTurn);d.speed*=.35;d.boost=0;d.collision=.4;floor=rampHeight(this.track,d.distance,d.lateral);
    }
    const lap=Math.floor(Math.max(0,d.distance)/this.track.length);
    if(d.airborne===0&&d.verticalSpeed===0){
      if(previousLift>floor+.03){
        d.airborne=previousLift;d.rampLift=0;
        const lip=this.track.length*RAMP.fraction+RAMP.length,progress=((d.distance%this.track.length)+this.track.length)%this.track.length;
        const launch=d.speed>25&&previousLift>1.05&&progress>=lip&&progress<lip+5&&d.lateral>=RAMP.left&&d.lateral<=RAMP.right;
        d.verticalSpeed=launch?8+d.speed*.04:0;
        if(launch&&d.lastRamp!==lap){d.lastRamp=lap;d.jumpTotal++;d.jumpRewardPending=true;if(d.id===0)this.event('AIR TIME');}
      }else d.rampLift=floor;
    }
    if(d.airborne>0||d.verticalSpeed>0){
      d.verticalSpeed-=dt*15;d.airborne+=d.verticalSpeed*dt;
      if(d.airborne<=floor){
        d.landingImpact=clamp(-d.verticalSpeed/18,0,1);d.airborne=0;d.verticalSpeed=0;d.rampLift=floor;
        if(d.jumpRewardPending){d.nitro=Math.min(100,d.nitro+12);if(d.id===0)this.event('CLEAN LANDING · +12 NITRO');d.jumpRewardPending=false;}
      }
    }
    if(lap+1>d.lap&&lap<this.laps&&d.id===0)this.event(lap+1===this.laps?'FINAL LAP':`LAP ${lap+1}`);
    d.gear=shiftGear(d.gear,d.speed);
    d.acceleration=(d.speed-previousSpeed)/Math.max(dt,1/600);
    d.lap=lap+1;
  }
  roadClearance(d:Driver){
    // Project the full rotated car footprint, including the wider track aero package.
    const {width:halfWidth,length:halfLength}=footprint(d);
    return this.track.width/2-(Math.abs(Math.cos(d.heading))*halfWidth+Math.abs(Math.sin(d.heading))*halfLength)-.06;
  }
  constrainToRoad(d:Driver,dt:number){
    const bound=this.roadClearance(d);
    if(Math.abs(d.lateral)>bound){
      d.lateral=clamp(d.lateral,-bound,bound);
      if(d.collision<=0){d.speed*=.48;d.collision=.7;if(d.id===0)this.event('BARRIER CONTACT · STEER AWAY OR RECOVER');}
      d.speed=Math.sign(d.speed)*Math.max(0,Math.abs(d.speed)-dt*38);
    }
  }
  recover(){if(this.status==='finished')return;this.player.lateral=0;this.player.heading=0;this.player.yawVelocity=0;this.player.speed=clamp(this.player.speed,0,25);this.player.reverseHold=0;this.player.slipAngle=0;this.player.drift=0;this.player.acceleration=0;this.player.landingImpact=0;this.player.airborne=0;this.player.verticalSpeed=0;this.player.rampLift=0;this.player.jumpRewardPending=false;this.event('BACK ON TRACK');}
}
export function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value));}
export function formatTime(seconds:number){const mins=Math.floor(seconds/60),secs=Math.floor(seconds%60),ms=Math.floor(seconds%1*100);return `${mins}:${String(secs).padStart(2,'0')}.${String(ms).padStart(2,'0')}`;}
