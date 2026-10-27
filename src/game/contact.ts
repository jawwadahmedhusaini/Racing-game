import type {Driver} from './simulation';
export function footprint(driver:Driver){if(driver.spec.id==='bmw-m3')return {width:1.1,length:2.48};if(driver.spec.shape==='grandtourer')return {width:1.24,length:2.48};return {width:driver.spec.shape==='track'?1.24:driver.spec.shape==='flow'?1.14:1.19,length:driver.spec.shape==='flow'?2.6:2.3};}
export function groundSpeed(d:Pick<Driver,'speed'|'sideSpeed'>){return Math.hypot(d.speed,d.sideSpeed);}
export function velocity(d:Driver,turn=0){const h=d.heading+d.slipAngle+turn;return {x:-Math.sin(h)*d.speed+Math.cos(h)*d.sideSpeed,z:Math.cos(h)*d.speed+Math.sin(h)*d.sideSpeed};}
export function setVelocity(d:Driver,v:{x:number;z:number},turn=0){const h=d.heading+d.slipAngle+turn;d.speed=-Math.sin(h)*v.x+Math.cos(h)*v.z;d.sideSpeed=Math.cos(h)*v.x+Math.sin(h)*v.z;if(Math.abs(d.speed)<1e-9)d.speed=0;if(Math.abs(d.sideSpeed)<1e-9)d.sideSpeed=0;}
function impulse(d:Driver,x:number,z:number,turn=0){const h=d.heading+d.slipAngle+turn;d.speed+=-Math.sin(h)*x+Math.cos(h)*z;d.sideSpeed+=Math.cos(h)*x+Math.sin(h)*z;}
export function inertia(d:Driver){const f=footprint(d);return (f.width*f.width+f.length*f.length)/3;}
function spin(value:number){return Math.max(-3,Math.min(3,value));}
/** Average extreme face when aligned; corner otherwise. A centered head-on hit
 * must not invent a left/right torque by arbitrarily choosing one corner. */
function supportPoint(d:Driver,n:{x:number;z:number},turn=0){
 const h=d.heading+turn,c=Math.cos(h),s=Math.sin(h),f=footprint(d);
 // Blend toward the face midpoint for near-flush contact. Choosing a full
 // corner for a tiny angle made a stopped car twist against a ramp's back.
 const sign=(v:number)=>Math.max(-1,Math.min(1,v/.1));
 const x=sign(c*n.x+s*n.z)*f.width,z=sign(-s*n.x+c*n.z)*f.length;
 return {x:c*x-s*z,z:s*x+c*z};
}
/** Inelastic planar contact with a finite yaw inertia, bounded spin and friction.
 * Project remaining inward COM motion out of a static face to avoid wall riding.
 */
export function resolveStaticContactSpeed(d:Driver,normal:{x:number;z:number},frictionCoefficient=.16){
  const length=Math.hypot(normal.x,normal.z);if(!length)return 0;
  const nx=normal.x/length,nz=normal.z/length,v=velocity(d),point=supportPoint(d,{x:-nx,z:-nz});
  const arm=point.x*nz-point.z*nx,ii=inertia(d),closing=-(v.x*nx+v.z*nz+arm*d.impactYaw);
  if(closing<=0)return 0;
  const force=closing/(1+arm*arm/ii);
  d.impactYaw=spin(d.impactYaw+arm*force/ii);
  v.x+=nx*force;v.z+=nz*force;
  const inward=Math.min(0,v.x*nx+v.z*nz);v.x-=nx*inward;v.z-=nz*inward;
  const tangent=-nz*v.x+nx*v.z,friction=Math.min(Math.abs(tangent),(force-inward)*frictionCoefficient)*Math.sign(tangent);
  v.x+=nz*friction;v.z-=nx*friction;setVelocity(d,v);return closing;
}
/** Equal-mass planar impulse at the contact patch, including off-center yaw.
 * Tire grip settles linear recoil; impact spin is damped separately from steering.
 */
export function resolveContactSpeed(a:Driver,b:Driver,normal:{x:number;z:number;dz?:number},roadTurn=0){
  const length=Math.hypot(normal.x,normal.z);if(!length)return 0;
  const nx=normal.x/length,nz=normal.z/length;
  const ap=supportPoint(a,{x:-nx,z:-nz}),bp=supportPoint(b,{x:nx,z:nz},roadTurn);
  const dx=b.lateral-a.lateral,dz=normal.dz===undefined?b.distance-a.distance:-normal.dz;
  const point={x:(ap.x+dx+bp.x)/2,z:(ap.z+dz+bp.z)/2};
  const armA=point.x*nz-point.z*nx,armB=(point.x-dx)*nz-(point.z-dz)*nx,ia=inertia(a),ib=inertia(b);
  const av=velocity(a),bv=velocity(b,roadTurn),closing=(av.x-bv.x)*nx+(av.z-bv.z)*nz+armA*a.impactYaw-armB*b.impactYaw;
  if(closing>=0)return 0;
  const force=-closing/(2+armA*armA/ia+armB*armB/ib);
  impulse(a,force*nx,force*nz);impulse(b,-force*nx,-force*nz,roadTurn);
  a.impactYaw=spin(a.impactYaw+armA*force/ia);b.impactYaw=spin(b.impactYaw-armB*force/ib);
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
