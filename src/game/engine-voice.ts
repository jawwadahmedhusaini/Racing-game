import {MathUtils} from 'three';
export function shiftGear(gear:number,speed:number){
  speed=Math.abs(speed);
  while(gear<7&&speed>gear*17+2)gear++;
  while(gear>1&&speed<(gear-1)*17-3)gear--;
  return gear;
}
export const ENGINE_BANKS={
  v8f:[1000,3000,5000,7000,9000],v12d:[1000,3000,5000,7000,9000],
  'b-v8':[1000,2000,4000,6000,7000],'b-i6r':[1000,3000,5000,7000,8000],
} as const;
export type EngineBank=keyof typeof ENGINE_BANKS;
export function engineBank(id:string):EngineBank{return id==='spectre'?'v12d':id==='solstice'?'b-i6r':id==='bmw-m3'?'b-v8':'v8f';}
/** Adjacent RPM recordings overlap at constant power; never pitch one sample across the entire range. */
export function engineLayers(bank:EngineBank,rpm:number){
  const points=ENGINE_BANKS[bank],r=MathUtils.clamp(rpm,points[0],points[points.length-1]);
  let lower=0;while(lower<points.length-2&&r>points[lower+1])lower++;
  const mix=(r-points[lower])/(points[lower+1]-points[lower]);
  return points.map((base,i)=>({rpm:base,rate:MathUtils.clamp(rpm/base,.65,1.6),gain:i===lower?Math.cos(mix*Math.PI/2):i===lower+1?Math.sin(mix*Math.PI/2):0}));
}
/** Shared gear state, clutch slip at launch and free revs with unloaded wheels. */
export class EngineVoice {
  gear=1;shiftRemaining=0;rpm=1000;private car='';
  update(id:string,speed:number,throttle:number,dt:number,gearOverride?:number,unloaded=false){
    dt=MathUtils.clamp(dt,0,.1);speed=Math.abs(speed);throttle=MathUtils.clamp(throttle,0,1);
    if(id!==this.car){this.car=id;this.gear=Math.min(7,Math.floor(speed/17)+1);this.shiftRemaining=0;this.rpm=1000;}
    const previous=this.gear;this.gear=gearOverride??shiftGear(this.gear,speed);
    if(previous!==this.gear)this.shiftRemaining=.13;
    else this.shiftRemaining=Math.max(0,this.shiftRemaining-dt);
    const ratio=[3.1,2.13,1.58,1.23,1,.84,.72][this.gear-1],bank=engineBank(id);
    const redline=ENGINE_BANKS[bank].at(-1)!;
    const desired=unloaded?1000+throttle*(redline-1000):Math.min(redline,Math.max(950+throttle*1100,950+speed*86*ratio+throttle*160));
    this.rpm+=(desired-this.rpm)*(1-Math.exp(-dt*(previous>this.gear?18:9)));
    const cylinders=bank==='v12d'?12:bank==='b-i6r'?6:8;
    return {rpm:this.rpm,gear:this.gear,frequency:this.rpm/60*cylinders/2,load:.28+throttle*.72,shift:this.shiftRemaining>0,changed:previous!==this.gear,downshift:previous>this.gear};
  }
}
