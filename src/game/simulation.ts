import {CARS,HARBOR_SPRINT,canRaceModeOnTrack,raceLapCount,type CarSpec,type RaceMode,type Difficulty} from './content';
import {Track,angleDelta,GUARDRAIL_HEIGHT} from './track';
import {contactOffset,footprint,resolveContactSpeed,resolveStaticContactSpeed,velocity,setVelocity,groundSpeed} from './contact';
import {rampSupport,rampContact,RAMP} from './ramp';
import {planOpponent,rivalProfile} from './opponents';
import {shiftGear} from './engine-voice';

export interface Controls {throttle:number; brake:number; steer:number; drift:boolean; nitro:boolean;}
export const NO_INPUT:Controls={throttle:0,brake:0,steer:0,drift:false,nitro:false};
export interface Driver {
  id:number; name:string; spec:CarSpec; distance:number; lateral:number; speed:number; heading:number; yawVelocity:number; impactYaw:number; sideSpeed:number; brakeInput:number; impact:number; impactSerial:number; impactCooldown:number; scrape:number; landingSerial:number;
  nitro:number; boost:number; drift:number; driftTotal:number; airborne:number; verticalSpeed:number; rampLift:number; jumpRewardPending:boolean; jumpClean:boolean;
  finishTime:number|null; eliminated:boolean; eliminationPosition:number|null; collision:number; steer:number; lap:number;
  targetLane:number; lastRamp:number; boostCooldown:number; boostPrevious:boolean; jumpTotal:number; reverseHold:number; slipAngle:number; acceleration:number; landingImpact:number; throttle:number; gear:number;
}
export interface RaceOptions {car:CarSpec;track:Track;mode:RaceMode;difficulty:Difficulty;upgrade:number; laps?:number;}
export class RaceSimulation {
  track:Track;drivers:Driver[]=[];mode:RaceMode;difficulty:Difficulty;upgrade:number;
  status:'countdown'|'racing'|'finished'='countdown';countdown=3.5;elapsed=0;laps:number;resultPosition=0;
  eliminatedAt=0;nextElimination=28;bestSpeed=0;lastEvent='';eventTimer=0;rank=1;finishedAt=0;
  bestLap:number|null=null;
  private lapStart=0;
  private nextLap=1;
  private readonly railDeparture=new Map<Driver,number>();
  constructor(options:RaceOptions) {
    if(!canRaceModeOnTrack(options.mode,options.track.id)) throw new Error('The sprint is only available at Neon Harbor.');
    this.track=options.track;this.mode=options.mode;this.difficulty=options.difficulty;this.upgrade=options.upgrade;
    this.laps=options.mode===HARBOR_SPRINT.mode?HARBOR_SPRINT.laps:options.laps??raceLapCount(options.mode);
    const names=['YOU','M. KOVA','J. SANTOS','R. WOLFF','A. RIVERA','K. MORI','L. COSTA'];
    const gridSize=this.mode==='time'?1:this.mode===HARBOR_SPRINT.mode?1+HARBOR_SPRINT.rivals:names.length;
    for(let i=0;i<gridSize;i++)this.drivers.push({id:i,name:names[i],spec:i===0?options.car:CARS[(i-1)%CARS.length],distance:-Math.floor(i/2)*7,lateral:(i%2===0?-1:1)*3,speed:0,heading:0,yawVelocity:0,impactYaw:0,sideSpeed:0,brakeInput:0,impact:0,impactSerial:0,impactCooldown:0,scrape:0,landingSerial:0,nitro:65,boost:0,drift:0,driftTotal:0,airborne:0,verticalSpeed:0,rampLift:0,jumpRewardPending:false,jumpClean:false,finishTime:null,eliminated:false,eliminationPosition:null,collision:0,steer:0,lap:1,targetLane:(i%2===0?-1:1)*3,lastRamp:-1,boostCooldown:0,boostPrevious:false,jumpTotal:0,reverseHold:0,slipAngle:0,acceleration:0,landingImpact:0,throttle:0,gear:1});
    this.updateRank();
  }
  get player(){return this.drivers[0];}
  get ordered(){return [...this.drivers].sort((a,b)=>{
    if(a.eliminated!==b.eliminated)return Number(a.eliminated)-Number(b.eliminated);
    if(a.eliminated)return (a.eliminationPosition??Infinity)-(b.eliminationPosition??Infinity);
    if(a.finishTime!==null||b.finishTime!==null)return a.finishTime===null?1:b.finishTime===null?-1:a.finishTime-b.finishTime;
    return b.distance-a.distance;
  });}
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
    // A single lap leaves less time to recover from a slow launch. A more
    // measured sprint pace keeps the field in reach before the chicane.
    const pace=this.mode===HARBOR_SPRINT.mode?{rookie:.59,pro:.64,expert:.78}:{rookie:.77,pro:.91,expert:1.02};
    const factor=pace[this.difficulty],personality=.96+(d.id%3)*.025;
    const profile=rivalProfile(d.id);
    const targetSpeed=Math.min((d.spec.topSpeed/3.6)*factor*personality,Math.sqrt(36/(bend+.0015))*.83*profile.corner,speedLimit);
    d.targetLane=lane;
    return {throttle:targetSpeed<.5?0:d.speed<targetSpeed?1:.15,brake:d.speed>targetSpeed+1?.75:0,steer:this.steeringFor(d,d.targetLane),drift:false,nitro:d.speed<speedLimit-10&&d.nitro>profile.reserve&&bend<profile.boostBend&&d.speed>40&&Math.sin(this.elapsed*.2+d.id)>profile.boostWindow};
  }
  step(dt:number,input:Controls) {
    if(!Number.isFinite(dt)||dt<=0)return;
    // Bound displacement per contact solve even when a caller supplies a long frame.
    const duration=Math.min(dt,.2),steps=Math.ceil(duration*120);
    for(let i=0;i<steps;i++)this.substep(duration/steps,input);
  }
  private substep(dt:number,input:Controls) {
    if(this.status==='finished')return;
    if(this.status==='countdown'){this.countdown-=dt;if(this.countdown<=0){this.status='racing';this.event('GO · OWN THE HORIZON');}return;}
    this.elapsed+=dt;this.eventTimer=Math.max(0,this.eventTimer-dt);
    for(const d of this.drivers) {
      if(d.eliminated||d.finishTime!==null)continue;
      const before=d.distance,controls=d.id===0?input:this.aiInput(d);this.integrate(d,dt,controls);
      if(d===this.player&&!this.railDeparture.has(d)&&d.distance>=this.track.length*this.nextLap){
        const line=this.track.length*this.nextLap;
        const fraction=clamp((line-before)/Math.max(1e-9,d.distance-before),0,1);
        const crossing=this.elapsed-dt+dt*fraction;
        const lapTime=crossing-this.lapStart;
        this.bestLap=Math.min(this.bestLap??Infinity,lapTime);
        this.lapStart=crossing;
        this.nextLap++;
      }
      if(d.distance>=this.track.length*this.laps&&!this.railDeparture.has(d)){
        const fraction=clamp((this.track.length*this.laps-before)/Math.max(1e-9,d.distance-before),0,1);
        d.finishTime=this.elapsed-dt+dt*fraction;d.speed=d.sideSpeed=d.impactYaw=d.yawVelocity=0;d.boost=0;
      }
    }
    // Broadphase for seven cars: physical separation and speed exchange on close contact.
    for(let pass=0;pass<3;pass++){
    for(let i=0;i<this.drivers.length;i++)for(let j=i+1;j<this.drivers.length;j++) {
      const a=this.drivers[i],b=this.drivers[j];if(a.eliminated||b.eliminated||a.finishTime!==null||b.finishTime!==null||Math.abs(a.airborne+a.rampLift-b.airborne-b.rampLift)>1)continue;
      const aYaw=this.track.sample(a.distance).yaw,bYaw=this.track.sample(b.distance).yaw,roadTurn=angleDelta(aYaw,bYaw);
      const contact=contactOffset(a,b,this.track.length,roadTurn);
      if(contact){
        const closing=resolveContactSpeed(a,b,contact,roadTurn);
        this.registerImpact(a,closing);this.registerImpact(b,closing);
        a.lateral+=contact.x;b.lateral-=contact.x;a.distance+=contact.z;b.distance-=contact.z;
        a.heading=angleDelta(0,a.heading-angleDelta(aYaw,this.track.sample(a.distance).yaw));
        b.heading=angleDelta(0,b.heading-angleDelta(bYaw,this.track.sample(b.distance).yaw));
        if(closing>1)a.collision=b.collision=.25;
      }
    }
    // Rival contact can push a car across the wall after its own integration.
    for(const d of this.drivers)if(!d.eliminated&&d.finishTime===null){this.constrainRamp(d);this.constrainToRoad(d,0);}
    }
    if(this.mode==='elimination'&&this.elapsed>=this.nextElimination) {
      const active=this.ordered.filter(d=>!d.eliminated&&d.finishTime===null);
      if(active.length>1){const last=active[active.length-1];last.eliminationPosition=this.drivers.filter(d=>!d.eliminated).length;last.eliminated=true;last.speed=last.sideSpeed=last.impactYaw=last.yawVelocity=0;last.boost=0;this.event(last.id===0?'ELIMINATED':`${last.name} ELIMINATED`);}
      this.eliminatedAt=this.elapsed;this.nextElimination+=22;
    }
    this.updateRank();this.bestSpeed=Math.max(this.bestSpeed,groundSpeed(this.player)*3.6);
    if(this.player.finishTime!==null||this.player.eliminated||(this.mode==='elimination'&&this.drivers.filter(d=>!d.eliminated).length===1)) {
      this.resultPosition=this.player.eliminated?this.player.eliminationPosition!:this.rank;
      this.player.finishTime??=this.elapsed;this.status='finished';this.finishedAt=this.elapsed;
    }
  }
  integrate(d:Driver,dt:number,c:Controls) {
    const previousDistance=d.distance,previousLift=d.rampLift,previousSpeed=d.speed;
    d.landingImpact=Math.max(0,d.landingImpact-dt*3);d.impact=Math.max(0,d.impact-dt*2);d.impactCooldown=Math.max(0,d.impactCooldown-dt);d.scrape=Math.max(0,d.scrape-dt*5);d.brakeInput=clamp(c.brake,0,1);
    const inAir=d.airborne>0||d.verticalSpeed>0;
    const sample=this.track.sample(d.distance),up=d.id===0?this.upgrade:0;
    const max=d.spec.topSpeed/3.6*(1+up*.024);
    const nitroRating=clamp(d.spec.nitro/90,.8,1.15);
    const accel=(15+d.spec.acceleration*.09)*(1+up*.06);
    d.boostCooldown=Math.max(0,d.boostCooldown-dt);
    const pressingWall=d.airborne+d.rampLift<=GUARDRAIL_HEIGHT&&Math.abs(d.lateral)>=this.roadClearance(d)-.04&&-Math.sin(d.heading+d.slipAngle)*Math.sign(d.lateral)>.15;
    if(c.nitro&&!c.brake&&d.speed>5&&!pressingWall) {
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
    if(inAir){
      // Braking/traction cannot change horizontal momentum while the tires are airborne.
      const thrust=(d.boost===2?16:d.boost?10:0)*nitroRating;
      const ceiling=max+(d.boost===2?30:19)*nitroRating;
      d.speed=Math.min(d.speed*Math.exp(-dt*.018)+dt*thrust,Math.max(d.speed,ceiling));
    }else if(d.speed<0){
      if(throttle>0)d.speed=Math.min(0,d.speed+dt*39*throttle);
      else if(c.brake&&d.id===0)d.speed=Math.max(-10,d.speed-dt*8*c.brake);
      else d.speed=Math.min(0,d.speed+dt*(c.brake*39+5.2));
    }else if(d.reverseHold>=.35){d.speed=Math.max(-10,d.speed-dt*8*c.brake);}
    else {
      // A driven tire scrubbing sideways against the rail cannot put full engine
      // power into forward travel. Grip returns as soon as the body unloads.
      const release=d.id===0?Math.max(0,-steering*Math.sign(d.lateral)*Math.sign(d.speed)):0;
      const wallGrip=1/(1+18*d.scrape*(1-release));
      const power=throttle*accel*wallGrip*(1-Math.pow(d.speed/(max+(d.boost?25*nitroRating:0)),2));
      const ceiling=max+(d.boost===2?30:d.boost?19:0)*nitroRating;
      // Releasing/exhausting boost lowers the power ceiling, not existing momentum.
      d.speed=clamp(d.speed+dt*(power-c.brake*39-(throttle?1.4:5.2)-Math.abs(d.drift)*5.5+(d.boost===2?32:d.boost?21:0)*nitroRating),0,Math.max(d.speed,ceiling));
    }
    // Integrate the car's own world heading. Curved road coordinates never steer it.
    // Positive control means physical right, which is negative world-Y yaw.
    const desiredYaw=-steering*this.turnCapacity(d)*(inAir?.16:drifting?1.17:1);
    // Countersteering unloads a grounded corner from the rail. Let the tires
    // respond promptly while the player is actively steering into the road.
    const unloading=d.id===0&&!inAir&&steering*d.lateral*d.speed<0&&this.roadClearance(d)-Math.abs(d.lateral)<.8;
    d.yawVelocity+=(desiredYaw-d.yawVelocity)*Math.min(1,dt*(d.airborne>.3?1.2:drifting?3.8:unloading?22:7.5));
    d.heading+=d.yawVelocity*dt;
    // A collision turns the body, not its existing world-space momentum.
    if(Math.abs(d.impactYaw)>1e-9){const motion=velocity(d);d.heading+=d.impactYaw*dt;setVelocity(d,motion);d.impactYaw*=Math.exp(-dt*(inAir?.8:3.5));}else d.impactYaw=0;
    const slip=d.slipAngle;
    d.sideSpeed*=Math.exp(-dt*(inAir?.1:6*grip));
    d.lateral+=(-Math.sin(d.heading+slip)*d.speed+Math.cos(d.heading+slip)*d.sideSpeed)*dt;
    const advance=(d.speed*Math.cos(d.heading+slip)+Math.sin(d.heading+slip)*d.sideSpeed)/Math.max(.5,1+sample.curvature*d.lateral)*dt;
    d.distance+=advance;
    const roadTurn=angleDelta(sample.yaw,this.track.sample(d.distance).yaw);
    d.heading=angleDelta(0,d.heading-roadTurn);
    d.collision=Math.max(0,d.collision-dt);
    if(this.constrainToRoad(d,dt,previousDistance))return;
    this.constrainRamp(d,advance);
    const floor=rampSupport(this.track,d,footprint(d));
    const lap=Math.floor(Math.max(0,d.distance)/this.track.length);
    if(d.airborne===0&&d.verticalSpeed===0){
      if(previousLift>floor+.03){
        d.airborne=previousLift;d.rampLift=0;
        const lip=this.track.length*RAMP.fraction+RAMP.length+lap*this.track.length,forward=velocity(d).z;
        const launch=forward>25&&previousLift>1.05&&previousDistance<lip&&d.distance>=lip;
        d.verticalSpeed=launch?8+forward*.04+sample.tangent.y*forward:0;
        if(launch&&d.lastRamp!==lap){d.lastRamp=lap;d.jumpTotal++;d.jumpRewardPending=true;d.jumpClean=true;if(d.id===0)this.event('AIR TIME');}
      }else d.rampLift=floor;
    }
    if(d.airborne>0||d.verticalSpeed>0){
      if(inAir)d.airborne-=this.track.sample(d.distance).position.y-sample.position.y;
      d.verticalSpeed-=dt*15;d.airborne+=d.verticalSpeed*dt;
      if(d.airborne<=GUARDRAIL_HEIGHT&&this.railDeparture.has(d)&&this.constrainToRoad(d,dt,previousDistance))return;
      if(d.airborne<=floor){
        const roadVerticalSpeed=(this.track.sample(d.distance).position.y-sample.position.y)/dt;
        d.landingImpact=clamp((roadVerticalSpeed-d.verticalSpeed)/18,0,1);d.landingSerial++;
        d.speed*=1-d.landingImpact*.035;d.sideSpeed*=.45;d.airborne=0;d.verticalSpeed=0;d.rampLift=floor;
        if(d.jumpRewardPending){if(d.jumpClean&&Math.abs(d.heading)<.8&&d.impact<.3){d.nitro=Math.min(100,d.nitro+12);if(d.id===0)this.event('CLEAN LANDING · +12 NITRO');}else if(d.id===0)this.event('ROUGH LANDING · LINE UP YOUR APPROACH');d.jumpRewardPending=false;d.jumpClean=false;}
      }
    }
    if(!this.railDeparture.has(d)){
      if(lap+1>d.lap&&lap<this.laps&&d.id===0)this.event(lap+1===this.laps?'FINAL LAP':`LAP ${lap+1}`);
      d.lap=lap+1;
    }
    d.gear=shiftGear(d.gear,d.speed);
    d.acceleration=(d.speed-previousSpeed)/Math.max(dt,1/600);
  }
  roadClearance(d:Driver){
    // Project the full rotated car footprint, including the wider track aero package.
    const {width:halfWidth,length:halfLength}=footprint(d);
    const radius=Math.abs(Math.cos(d.heading))*halfWidth+Math.abs(Math.sin(d.heading))*halfLength;
    // The concrete Jersey face recedes with height. The inboard edge of the
    // upper metal strip lies 0.405 m outside the road (0.45 m center, 0.09 m wide).
    const height=d.rampLift+d.airborne;
    const faceOffset=-.06+.465*clamp(height/1.07,0,1);
    return this.track.width/2+faceOffset-radius;
  }
  constrainRamp(d:Driver,travel=0){
    const contact=rampContact(this.track,d,footprint(d),d.rampLift+d.airborne,travel);
    if(!contact)return;
    const yaw=this.track.sample(d.distance).yaw,closing=resolveStaticContactSpeed(d,contact,.16,true);
    d.lateral+=contact.x;d.distance+=contact.z;
    d.heading=angleDelta(0,d.heading-angleDelta(yaw,this.track.sample(d.distance).yaw));
    if(closing>1){this.registerImpact(d,closing);d.collision=Math.max(d.collision,.12);if(closing>8)d.boost=0;}
  }
  registerImpact(d:Driver,closing:number){
    if(closing<1)return;
    if(d.airborne>0&&closing>3)d.jumpClean=false;
    d.impact=Math.max(d.impact,clamp(closing/38,0,1));
    if(d.impactCooldown===0){d.impactSerial++;d.impactCooldown=.14;}
  }
  constrainToRoad(d:Driver,_dt:number,previousDistance=d.distance){
    const bound=this.roadClearance(d),offset=Math.abs(d.lateral);
    if(offset<=bound){
      this.railDeparture.delete(d);
      return;
    }
    const above=d.airborne+d.rampLift>GUARDRAIL_HEIGHT;
    if(above&&!this.railDeparture.has(d))this.railDeparture.set(d,previousDistance);
    const departure=this.railDeparture.get(d);
    // Exterior terrain is scenery. Once the center is outside and drops to the
    // rail, or leaves the short flyover corridor, return to the departure point.
    if(departure!==undefined&&(offset>this.track.width/2+8||(!above&&offset>this.track.width/2+.45))){
      this.recoverDeparture(d,departure);
      return true;
    }
    if(above)return;
    this.railDeparture.delete(d);
    const side=Math.sign(d.lateral),v=velocity(d);
    d.lateral=side*bound;
    let verticalClosing=0;
    if(departure!==undefined&&d.verticalSpeed<0){
      // The center is still inboard. A tire or sill clips the upper strip and
      // slides back onto the deck. Absorb part of the fall at this first touch.
      verticalClosing=-d.verticalSpeed;
      d.verticalSpeed*=.65;
      d.jumpClean=false;
    }
    const closing=Math.max(verticalClosing,resolveStaticContactSpeed(d,{x:-side,z:0},.36));
    if(closing<=0)return;
    this.registerImpact(d,closing);
    if(closing>8){d.boost=0;if(d.collision===0&&d.id===0)this.event('BARRIER CONTACT · STEER AWAY OR REVERSE');}
    d.scrape=Math.min(1,Math.abs(v.z)/55);
    d.collision=Math.max(d.collision,.12);
  }
  private recoverDeparture(d:Driver,departure:number){
    d.distance=departure;
    this.resetOnRoad(d,0);
    // Walk back in full car lengths until the spawn footprint is clear. Check
    // the wrapped gap too, since another car may be one lap ahead or behind.
    const occupied=()=>this.drivers.some(other=>{
      if(other===d||other.eliminated||other.finishTime!==null)return false;
      const yaw=angleDelta(this.track.sample(d.distance).yaw,this.track.sample(other.distance).yaw);
      return contactOffset(d,other,this.track.length,yaw)!==null;
    });
    while(occupied())d.distance-=8;
    d.lap=Math.floor(Math.max(0,d.distance)/this.track.length)+1;
    d.gear=1;
    if(d.id===0)this.event('BACK ON TRACK');
  }
  private resetOnRoad(d:Driver,speed:number){
    Object.assign(d,{lateral:0,heading:0,yawVelocity:0,impactYaw:0,sideSpeed:0,impact:0,scrape:0,collision:0,
      speed,reverseHold:0,slipAngle:0,drift:0,acceleration:0,landingImpact:0,airborne:0,verticalSpeed:0,
      rampLift:0,jumpRewardPending:false,jumpClean:false,boost:0});
    this.railDeparture.delete(d);
  }
  recover(){
    if(this.status==='finished')return;
    const d=this.player;
    const departure=this.railDeparture.get(d);
    if(departure!==undefined){this.recoverDeparture(d,departure);return;}
    this.resetOnRoad(d,clamp(d.speed,0,25));
    this.event('BACK ON TRACK');
  }
}
export function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value));}
export function formatTime(seconds:number){const mins=Math.floor(seconds/60),secs=Math.floor(seconds%60),ms=Math.floor(seconds%1*100);return `${mins}:${String(secs).padStart(2,'0')}.${String(ms).padStart(2,'0')}`;}
