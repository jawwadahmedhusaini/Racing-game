import type {Driver} from './simulation';
export function footprint(driver:Driver){if(driver.spec.id==='bmw-m3')return {width:1.1,length:2.48};if(driver.spec.shape==='grandtourer')return {width:1.24,length:2.48};return {width:driver.spec.shape==='track'?1.24:driver.spec.shape==='flow'?1.14:1.19,length:driver.spec.shape==='flow'?2.6:2.3};}
export function velocity(d:Driver,turn=0){const h=d.heading+(d.speed>0?d.slipAngle:0)+turn;return {x:-Math.sin(h)*d.speed+Math.cos(h)*d.sideSpeed,z:Math.cos(h)*d.speed+Math.sin(h)*d.sideSpeed};}
function impulse(d:Driver,x:number,z:number,turn=0){const h=d.heading+(d.speed>0?d.slipAngle:0)+turn;d.speed+=-Math.sin(h)*x+Math.cos(h)*z;d.sideSpeed+=Math.cos(h)*x+Math.sin(h)*z;}
/** Remove only velocity into a static face, leaving travel along/away from it. */
export function resolveStaticContactSpeed(d:Driver,normal:{x:number;z:number}){
  const length=Math.hypot(normal.x,normal.z);if(!length)return 0;
  const nx=normal.x/length,nz=normal.z/length,v=velocity(d),closing=-(v.x*nx+v.z*nz);
  if(closing<=0)return 0;
  impulse(d,nx*closing,nz*closing);return closing;
}
/** Equal-mass, inelastic planar impulse. Lateral recoil is dissipated by tire grip.
 * This remains an arcade solver: no angular inertia, rollover or damage simulation.
 */
export function resolveContactSpeed(a:Driver,b:Driver,normal:{x:number;z:number},roadTurn=0){
  const length=Math.hypot(normal.x,normal.z);if(!length)return 0;
  const nx=normal.x/length,nz=normal.z/length;
  const av=velocity(a),bv=velocity(b,roadTurn),closing=(av.x-bv.x)*nx+(av.z-bv.z)*nz;
  if(closing>=0)return 0;
  const force=-closing/2;
  impulse(a,force*nx,force*nz);impulse(b,-force*nx,-force*nz,roadTurn);
  // Rivals cannot engage reverse; player recoil retains its physical sign.
  if(a.id!==0)a.speed=Math.max(0,a.speed);
  if(b.id!==0)b.speed=Math.max(0,b.speed);
  return -closing;
}
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
