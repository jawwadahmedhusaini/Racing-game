/** Interpolate the actual triangles of a regular Three.js PlaneGeometry heightfield. */
export class HeightField {
  constructor(readonly minX:number,readonly minZ:number,readonly width:number,readonly depth:number,readonly columns:number,readonly rows:number,readonly heights:Float32Array){}
  height(x:number,z:number):number|undefined {
    const gx=(x-this.minX)/this.width*this.columns,gz=(z-this.minZ)/this.depth*this.rows;
    if(gx<0||gz<0||gx>this.columns||gz>this.rows)return undefined;
    const ix=Math.min(this.columns-1,Math.floor(gx)),iz=Math.min(this.rows-1,Math.floor(gz)),u=gx-ix,v=gz-iz,i=iz*(this.columns+1)+ix;
    const a=this.heights[i],b=this.heights[i+this.columns+1],c=this.heights[i+this.columns+2],d=this.heights[i+1];
    return u+v<=1?a+u*(d-a)+v*(b-a):c+(1-u)*(b-c)+(1-v)*(d-c);
  }
}
