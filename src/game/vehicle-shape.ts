import {BufferGeometry,Vector3} from 'three';
import type {CarSpec} from './content';
type Shape=CarSpec['shape'];
// Coherent body and glass remodeling of the licensed chassis. Wheel assemblies
// move as rigid units so tire circles and brake discs are never stretched.
function profile(x:number,y:number,z:number,shape:Shape){
  const t=Math.max(0,Math.min(1,(y-.67)/.58)),roof=t*t*(3-2*t),derivative=t>0&&t<1?6*t*(1-t)/.58:0;
  if(shape==='flow')return {x:x*(.96-.08*roof),y:y+.07*roof,z:1.1*z+.04*(Math.sqrt(z*z+.1)-Math.sqrt(.1))-.30*roof,sx:.96-.08*roof,xy:-.08*x*derivative,xz:0,sy:1+.07*derivative,zy:-.30*derivative,sz:1.1+.04*z/Math.sqrt(z*z+.1)};
  const arch=Math.exp(-Math.pow((z*z-1.7)/1.4,2)),archD=arch*(-4*z*(z*z-1.7)/(1.4*1.4));
  return {x:x*(1.05+.045*arch-.12*roof),y:y-.14*roof,z:.98*z+.10*roof,sx:1.05+.045*arch-.12*roof,xy:-.12*x*derivative,xz:.045*x*archD,sy:1-.14*derivative,zy:.10*derivative,sz:.98};
}
export function reshapePoint(point:Vector3,shape:Shape){if((shape==='wedge'||shape==='grandtourer'))return point;const p=profile(point.x,point.y,point.z,shape);return point.set(p.x,p.y,p.z);}
export function reshapeGeometry(geometry:BufferGeometry,shape:Shape){
  if((shape==='wedge'||shape==='grandtourer'))return;
  const positions=geometry.attributes.position,normals=geometry.attributes.normal,n=new Vector3();
  for(let i=0;i<positions.count;i++){
    const p=profile(positions.getX(i),positions.getY(i),positions.getZ(i),shape);
    positions.setXYZ(i,p.x,p.y,p.z);
    if(normals){
      // Inverse-transpose Jacobian preserves the original authored smooth normals.
      n.x=normals.getX(i)/p.sx;n.z=(normals.getZ(i)-p.xz*n.x)/p.sz;n.y=(normals.getY(i)-p.xy*n.x-p.zy*n.z)/p.sy;n.normalize();normals.setXYZ(i,n.x,n.y,n.z);
    }
  }
  positions.needsUpdate=true;if(normals)normals.needsUpdate=true;geometry.computeBoundingBox();geometry.computeBoundingSphere();
}
