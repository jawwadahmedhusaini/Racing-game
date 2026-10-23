import type {Driver} from './simulation';
export function footprint(driver:Driver){return {width:driver.spec.shape==='track'?1.24:driver.spec.shape==='flow'?1.14:1.19,length:driver.spec.shape==='flow'?2.6:2.3};}
// Separating-axis test in the road's local right/forward frame. Race progress is
// unwrapped; physical contact must wrap at the start line, including lapped cars.
export function contactOffset(a:Driver,b:Driver,trackLength:number,roadTurn=0){
  const dx=a.lateral-b.lateral,dz=((a.distance-b.distance+trackLength/2)%trackLength+trackLength)%trackLength-trackLength/2;
  if(Math.abs(dx)>6||Math.abs(dz)>6)return null;
  const box=(d:Driver,heading:number)=>{const c=Math.cos(heading),s=Math.sin(heading);return {axes:[{x:c,z:s},{x:-s,z:c}],...footprint(d)};};
  const aa=box(a,a.heading),bb=box(b,b.heading+roadTurn);
  let depth=Infinity,normal={x:0,z:0};
  for(const axis of [...aa.axes,...bb.axes]){
    const radius=(box:typeof aa)=>Math.abs(axis.x*box.axes[0].x+axis.z*box.axes[0].z)*box.width+Math.abs(axis.x*box.axes[1].x+axis.z*box.axes[1].z)*box.length;
    const separation=axis.x*dx+axis.z*dz,overlap=radius(aa)+radius(bb)-Math.abs(separation);
    if(overlap<=0)return null;
    if(overlap<depth){depth=overlap;const sign=separation>=0?1:-1;normal={x:axis.x*sign,z:axis.z*sign};}
  }
  return {x:normal.x*(depth+.01)*.5,z:normal.z*(depth+.01)*.5,dz};
}
