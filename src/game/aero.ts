import * as THREE from 'three';

/** A tapered, cambered airfoil with smoothly raised tips, rather than a rectangular plank. */
export function wingGeometry(width:number,chord:number){
  const p:number[]=[],uv:number[]=[],indices:number[]=[];
  for(let i=0;i<=24;i++)for(let j=0;j<=32;j++){
    const t=i/24*2-1,a=j/32*Math.PI*2,span=Math.abs(t),c=chord*(1-.28*span**3);
    p.push(t*width/2,Math.sin(a)*.022-Math.sin(a)**2*.014+span**4*.07,Math.cos(a)*c/2+.07*span**2);uv.push(i/24,j/32);
    if(i<24&&j<32){const k=i*33+j;indices.push(k,k+33,k+1,k+1,k+33,k+34);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
