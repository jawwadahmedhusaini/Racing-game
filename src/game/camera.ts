import {groundSpeed} from './contact';
import {MathUtils,PerspectiveCamera,Vector3} from 'three';
import type {Track} from './track';
import type {Driver} from './simulation';

/** Stateful camera presentation only. Never writes to the driver or its controls. */
export class RaceCamera {
  focus=new Vector3();lastPosition=new Vector3();forward=new Vector3(0,0,1);
  initialized=false;acceleration=0;compression=0;roll=0;
  reset(){this.initialized=false;this.acceleration=this.compression=this.roll=0;}
  update(camera:PerspectiveCamera,track:Track,driver:Driver,position:Vector3,dt:number,time:number,mode:number,moving:boolean,reducedMotion=false){
    dt=MathUtils.clamp(dt,0,.1);
    const blend=(rate:number)=>1-Math.exp(-rate*dt),s=track.sample(driver.distance);
    const yaw=s.yaw+driver.heading,speed=groundSpeed(driver),reverse=driver.speed<-.1;
    const heading=new Vector3(Math.sin(yaw),s.tangent.y,Math.cos(yaw)).normalize();
    const reset=!this.initialized||position.distanceToSquared(this.lastPosition)>2500;
    if(reset)this.forward.copy(heading);else if(moving)this.forward.lerp(heading,blend(reverse?10:Math.abs(driver.drift)>.1?4.5:8)).normalize();
    this.acceleration+=(MathUtils.clamp(moving?driver.acceleration:0,-40,35)-this.acceleration)*blend(5);
    this.compression+=(Math.max(0,moving?driver.landingImpact:0)-this.compression)*blend(16);
    const energy=reducedMotion?0:1;
    const chase=reverse?11:mode===1?5.7:mode===2?11:7.4;
    const height=reverse?5.5:mode===1?1.65:mode===2?5.1:2.65;
    const distance=chase+speed*.009+energy*Math.max(0,this.acceleration)*.014+(driver.boost&&!reverse?energy*.35:0);
    const desired=position.clone().addScaledVector(this.forward,-distance);
    desired.y+=height-energy*this.compression*.45+(driver.airborne>0?.25:0);
    const right=new Vector3(-this.forward.z,0,this.forward.x).normalize();
    desired.addScaledVector(right,energy*driver.drift*.6);
    // Keep the lens in the drivable corridor, above road/terrain. Scenery is
    // placed outside this corridor; this also stops the lens crossing barriers.
    const behind=track.sample(driver.distance-distance*Math.cos(driver.heading));
    const lateral=desired.clone().sub(behind.position).dot(behind.right),limit=track.width/2-.9;
    desired.addScaledVector(behind.right,MathUtils.clamp(lateral,-limit,limit)-lateral);
    desired.y=Math.max(desired.y,behind.position.y+1.1);
    const focus=position.clone().addScaledVector(heading,reverse?1:12+speed*.045);
    focus.addScaledVector(right,energy*driver.drift*1.7);focus.y+=.6;
    if(reset){camera.position.copy(desired);this.focus.copy(focus);this.initialized=true;}
    else if(moving){
      // Actual displacement avoids camera creep when physics is paused or capped.
      const travel=position.clone().sub(this.lastPosition);
      camera.position.add(travel).lerp(desired,blend(8));this.focus.add(travel).lerp(focus,blend(7));
    }else{camera.position.lerp(desired,blend(8));this.focus.lerp(focus,blend(7));}
    // Clamp after smoothing too: a curve or recovery must not interpolate through a wall.
    const side=camera.position.clone().sub(behind.position).dot(behind.right);
    camera.position.addScaledVector(behind.right,MathUtils.clamp(side,-limit,limit)-side);
    camera.position.y=Math.max(camera.position.y,behind.position.y+1.1);
    const shake=moving&&!reducedMotion?Math.max(driver.collision*.05,driver.boost===2?.012:0):0;
    camera.position.addScaledVector(right,Math.sin(time*57)*shake);camera.position.y+=Math.cos(time*71)*shake*.6;
    camera.lookAt(this.focus);
    const roll=energy*MathUtils.clamp(-driver.drift*.018-driver.yawVelocity*.009,-.025,.025);
    this.roll+=(roll-this.roll)*blend(5);camera.rotateZ(this.roll);
    const fov=reverse?55:reducedMotion?58:55+Math.min(9,speed*.10)+(driver.boost===2?8:driver.boost?5:0);
    camera.fov+=(fov-camera.fov)*blend(4);camera.updateProjectionMatrix();
    this.lastPosition.copy(position);
  }
}
