import * as THREE from 'three';
import type {Driver} from './simulation';
import {footprint} from './contact';
const smokeColor=[.56,.62,.67] as const, sparkColor=[3.8,1.8,.36] as const;
interface Particle {position:THREE.Vector3;velocity:THREE.Vector3;life:number;max:number;size:number;spark:boolean;}
export class Effects {
  particles:Particle[]=Array.from({length:220},()=>({position:new THREE.Vector3(),velocity:new THREE.Vector3(),life:0,max:1,size:1,spark:false}));
  points:THREE.Points;cursor=0;geometry=new THREE.BufferGeometry();positions=new Float32Array(660);colors=new Float32Array(660);sizes=new Float32Array(220);
  private emissions=0;
  skids:THREE.InstancedMesh;skidCursor=0;dummy=new THREE.Object3D();lastSkid:THREE.Vector3|null=null;
  constructor(scene:THREE.Scene){
    this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3));this.geometry.setAttribute('color',new THREE.BufferAttribute(this.colors,3));this.geometry.setAttribute('size',new THREE.BufferAttribute(this.sizes,1));
    const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,vertexShader:'attribute float size;varying vec3 vColor;void main(){vColor=color;vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=min(70.,size*230./max(1.,-p.z));gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 vColor;void main(){float a=1.-length(gl_PointCoord-vec2(.5))*2.;if(a<0.)discard;gl_FragColor=vec4(vColor,pow(a,1.8)*.45);}'});
    this.points=new THREE.Points(this.geometry,mat);this.points.frustumCulled=false;scene.add(this.points);
    this.skids=new THREE.InstancedMesh(new THREE.PlaneGeometry(.24,.85),new THREE.MeshBasicMaterial({color:'#10151b',transparent:true,opacity:.36,depthWrite:false}),400);this.skids.frustumCulled=false;for(let i=0;i<400;i++){this.dummy.scale.setScalar(0);this.dummy.updateMatrix();this.skids.setMatrixAt(i,this.dummy.matrix);}scene.add(this.skids);
  }
  update(dt:number,driver:Driver,position:THREE.Vector3,yaw:number,pitch=0,roadNormal?:THREE.Vector3){
    const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),back=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
    const ground=driver.airborne<.1&&driver.rampLift<.1;
    const skid=ground&&driver.speed>15&&(Math.abs(driver.drift)>.18||driver.brakeInput>.65&&Math.abs(driver.sideSpeed)>3.5);
    const rates=ground&&driver.speed>12?Math.max(skid?22:0,driver.scrape*40):0;
    this.emissions=(rates?this.emissions:0)+dt*rates;
    const emit=Math.min(4,Math.floor(this.emissions));
    this.emissions-=emit;
    if(skid){
      const stamp=!this.lastSkid||position.distanceTo(this.lastSkid)>.65;
      const roadRotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));
      if(roadNormal){const forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)).projectOnPlane(roadNormal).normalize(),across=new THREE.Vector3().crossVectors(roadNormal,forward).normalize();roadRotation.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,roadNormal,forward));}
      for(const side of [-1,1]){
        for(let i=0;i<emit;i++){
          const p=this.particles[this.cursor++%this.particles.length];
          p.position.copy(position).addScaledVector(right,side*.95).addScaledVector(back,1.4);p.position.y+=.2;
          p.velocity.copy(back).multiplyScalar(Math.min(driver.speed*.095,5)).addScaledVector(right,(Math.random()-.5)*1.8);p.velocity.y=.45+Math.random()*.7;
          p.life=p.max=.55+Math.random()*.55;p.size=.68;p.spark=false;
        }
        if(stamp){this.dummy.position.set(side*.95,.06,-1.4).applyQuaternion(roadRotation).add(position);this.dummy.quaternion.copy(roadRotation).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2));this.dummy.scale.setScalar(1);this.dummy.updateMatrix();this.skids.setMatrixAt(this.skidCursor++%400,this.dummy.matrix);this.skids.instanceMatrix.needsUpdate=true;}
      }
      if(stamp)this.lastSkid=position.clone();
    }else this.lastSkid=null;
    if(ground&&driver.scrape>.2&&driver.speed>12){
      const edge=-Math.sign(driver.lateral)*footprint(driver).width;
      for(let i=0;i<emit;i++){
        const p=this.particles[this.cursor++%this.particles.length];
        p.position.copy(position).addScaledVector(right,edge).addScaledVector(back,(Math.random()-.5)*2.4);p.position.y+=.21;
        p.velocity.copy(back).multiplyScalar(7+Math.random()*9).addScaledVector(right,-Math.sign(edge)*Math.random()*2.1);p.velocity.y=1+Math.random()*2;
        p.life=p.max=.09+Math.random()*.16;p.size=.18;p.spark=true;
      }
    }
    for(let i=0;i<this.particles.length;i++){
      const p=this.particles[i];p.life-=dt;
      if(p.life<=0){this.sizes[i]=0;continue;}
      if(p.spark)p.velocity.y-=dt*13;
      p.position.addScaledVector(p.velocity,dt);p.position.toArray(this.positions,i*3);
      const fade=p.life/p.max;
      const color=p.spark?sparkColor:smokeColor;
      this.colors[i*3]=color[0]*fade;this.colors[i*3+1]=color[1]*fade;this.colors[i*3+2]=color[2]*fade;
      this.sizes[i]=(p.size+(p.spark?0:1.3*(1-fade)))*fade;
    }
    this.geometry.attributes.position.needsUpdate=true;this.geometry.attributes.color.needsUpdate=true;this.geometry.attributes.size.needsUpdate=true;
  }
  dispose(){this.points.removeFromParent();this.geometry.dispose();(this.points.material as THREE.Material).dispose();this.skids.removeFromParent();this.skids.geometry.dispose();(this.skids.material as THREE.Material).dispose();}
}
