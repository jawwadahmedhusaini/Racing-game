import * as THREE from 'three';
import type {Driver} from './simulation';
interface Particle {position:THREE.Vector3;velocity:THREE.Vector3;life:number;max:number;size:number;}
export class Effects {
  particles:Particle[]=Array.from({length:220},()=>({position:new THREE.Vector3(),velocity:new THREE.Vector3(),life:0,max:1,size:1}));
  points:THREE.Points;cursor=0;geometry=new THREE.BufferGeometry();positions=new Float32Array(660);colors=new Float32Array(660);sizes=new Float32Array(220);
  skids:THREE.InstancedMesh;skidCursor=0;dummy=new THREE.Object3D();lastSkid=new THREE.Vector3();
  constructor(scene:THREE.Scene){
    this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3));this.geometry.setAttribute('color',new THREE.BufferAttribute(this.colors,3));this.geometry.setAttribute('size',new THREE.BufferAttribute(this.sizes,1));
    const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,vertexShader:'attribute float size;varying vec3 vColor;void main(){vColor=color;vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=min(70.,size*230./max(1.,-p.z));gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 vColor;void main(){float a=1.-length(gl_PointCoord-vec2(.5))*2.;if(a<0.)discard;gl_FragColor=vec4(vColor,pow(a,1.8)*.45);}'});
    this.points=new THREE.Points(this.geometry,mat);this.points.frustumCulled=false;scene.add(this.points);
    this.skids=new THREE.InstancedMesh(new THREE.PlaneGeometry(.24,.85),new THREE.MeshBasicMaterial({color:'#10151b',transparent:true,opacity:.36,depthWrite:false}),400);this.skids.frustumCulled=false;for(let i=0;i<400;i++){this.dummy.scale.setScalar(0);this.dummy.updateMatrix();this.skids.setMatrixAt(i,this.dummy.matrix);}scene.add(this.skids);
  }
  update(dt:number,driver:Driver,position:THREE.Vector3,yaw:number){
    const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),back=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
    if(Math.abs(driver.drift)>.18&&driver.speed>15&&driver.airborne<.1) {
      for(const side of [-1,1]){const p=this.particles[this.cursor++%this.particles.length];p.position.copy(position).addScaledVector(right,side*.95).addScaledVector(back,1.4);p.position.y+=.2;p.velocity.set((Math.random()-.5)*2,.8+Math.random(),(Math.random()-.5)*2);p.life=p.max=.6+Math.random()*.7;p.size=.7;
        if(position.distanceTo(this.lastSkid)>.65){this.dummy.position.copy(p.position);this.dummy.position.y=position.y+.06;this.dummy.rotation.set(-Math.PI/2,0,-yaw);this.dummy.scale.setScalar(1);this.dummy.updateMatrix();this.skids.setMatrixAt(this.skidCursor++%400,this.dummy.matrix);this.skids.instanceMatrix.needsUpdate=true;}
      }this.lastSkid.copy(position);
    }
    for(let i=0;i<this.particles.length;i++){const p=this.particles[i];p.life-=dt;if(p.life>0){p.position.addScaledVector(p.velocity,dt);this.positions.set(p.position.toArray(),i*3);const fade=p.life/p.max;this.colors.set([.62*fade,.67*fade,.68*fade],i*3);this.sizes[i]=(p.size+1.2*(1-fade))*fade;}else this.sizes[i]=0;}
    this.geometry.attributes.position.needsUpdate=true;this.geometry.attributes.color.needsUpdate=true;this.geometry.attributes.size.needsUpdate=true;
  }
  dispose(){this.points.removeFromParent();this.geometry.dispose();(this.points.material as THREE.Material).dispose();this.skids.removeFromParent();this.skids.geometry.dispose();(this.skids.material as THREE.Material).dispose();}
}
