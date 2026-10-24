import {MathUtils} from 'three';
export function shiftGear(gear:number,speed:number){
  speed=Math.abs(speed);
  while(gear<7&&speed>gear*17+2)gear++;
  while(gear>1&&speed<(gear-1)*17-3)gear--;
  return gear;
}
/** Gear hysteresis prevents repeated shift clicks near a speed boundary. */
export class EngineVoice {
  gear=1;shiftRemaining=0;rpm=1000;private car='';
  update(id:string,speed:number,throttle:number,dt:number,gearOverride?:number){
    dt=MathUtils.clamp(dt,0,.1);speed=Math.abs(speed);
    if(id!==this.car){this.car=id;this.gear=Math.min(7,Math.floor(speed/17)+1);this.shiftRemaining=0;}
    const previous=this.gear;
    this.gear=gearOverride??shiftGear(this.gear,speed);
    if(previous!==this.gear)this.shiftRemaining=.13;
    else this.shiftRemaining=Math.max(0,this.shiftRemaining-dt);
    const rev=MathUtils.clamp((speed-(this.gear-1)*17)/21,0,1);
    const desired=1000+rev*6600+throttle*450;
    this.rpm+=(desired-this.rpm)*(1-Math.exp(-dt*11));
    const cylinders=id==='spectre'?12:id==='stratos'?10:8;
    return {rpm:this.rpm,gear:this.gear,frequency:this.rpm/60*cylinders/2,load:.32+throttle*.68,shift:this.shiftRemaining>0,changed:previous!==this.gear};
  }
}
