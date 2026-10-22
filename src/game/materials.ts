import * as THREE from 'three';
import {publicUrl} from './urls';

const surfaces = new Map<string, THREE.Texture>();
export async function loadSurfaceAssets() {
  const loader = new THREE.TextureLoader();
  await Promise.all(['ground-color.png','ground-normal.png','ground-rough.png','grass-color.png','water-normal.png','foliage-color.png','foliage-normal.png','bark-color.jpg','bark-normal.png'].map(async name => {
    const texture = await loader.loadAsync(publicUrl(`assets/surfaces/${name}`));
    if (name.includes('color')) texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    surfaces.set(name, texture);
  }));
}
export function surface(name: string) { const texture=surfaces.get(name);if(!texture)throw new Error(`Surface not loaded: ${name}`);return texture; }
export function tiled(name: string, x: number, y=x) { const texture=surface(name).clone();texture.repeat.set(x,y);return texture; }
export function random(seed: number) {return () => {seed=(Math.imul(1664525,seed)+1013904223)|0;return (seed>>>0)/4294967296;};}

/** Aggregate albedo, relief and patchy roughness share the same physical texel scale. */
export function asphaltMaterial(length: number, width: number, wet: boolean) {
  const size=512,rng=random(781),canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const c=canvas.getContext('2d')!,pixels=c.createImageData(size,size),heights=new Float32Array(size*size);
  const roughCanvas=canvas.cloneNode() as HTMLCanvasElement,rough=roughCanvas.getContext('2d')!,roughPixels=rough.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const i=y*size+x,grain=rng(),patch=Math.sin(x*.017+Math.sin(y*.019))*Math.sin(y*.023)+Math.sin(x*.049+y*.028)*.3;
    const value=43+grain*24+patch*4+(grain>.99?15:0);
    heights[i]=grain;
    pixels.data.set([value*.94,value*.97,value,255],i*4);
    const r=wet?135+Math.max(0,patch+.3)*60:195+grain*45;
    roughPixels.data.set([r,r,r,255],i*4);
  }
  c.putImageData(pixels,0,0);rough.putImageData(roughPixels,0,0);
  c.strokeStyle='rgba(18,20,23,.35)';c.lineWidth=1.2;
  for(let i=0;i<7;i++){let x=rng()*size,y=rng()*size;c.beginPath();c.moveTo(x,y);for(let j=0;j<8;j++){x+=(rng()-.5)*16;y+=rng()*14;c.lineTo(x,y);}c.stroke();}
  const normalCanvas=canvas.cloneNode() as HTMLCanvasElement,nc=normalCanvas.getContext('2d')!,np=nc.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const dx=heights[y*size+(x+1)%size]-heights[y*size+(x+size-1)%size],dy=heights[((y+1)%size)*size+x]-heights[((y+size-1)%size)*size+x];np.data.set([128+dx*48,128+dy*48,247,255],(y*size+x)*4);}nc.putImageData(np,0,0);
  const map=new THREE.CanvasTexture(canvas),normalMap=new THREE.CanvasTexture(normalCanvas),roughnessMap=new THREE.CanvasTexture(roughCanvas);
  map.colorSpace=THREE.SRGBColorSpace;
  for(const texture of [map,normalMap,roughnessMap]){texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(width/5,length/5);texture.anisotropy=16;}
  return new THREE.MeshPhysicalMaterial({map,normalMap,normalScale:new THREE.Vector2(.16,.16),roughnessMap,roughness:1,metalness:0,clearcoat:wet?.12:0,clearcoatRoughness:.24,envMapIntensity:wet?.55:.45});
}

export function terrainMaterial() {
  const material=new THREE.MeshStandardMaterial({color:'#d3c8b1',roughness:1,roughnessMap:surface('ground-rough.png'),normalMap:surface('ground-normal.png'),normalScale:new THREE.Vector2(.6,.6)});
  material.onBeforeCompile=shader=>{
    shader.uniforms.rockSurface={value:surface('ground-color.png')};
    shader.uniforms.grassSurface={value:surface('grass-color.png')};
    shader.vertexShader='varying vec3 vTerrainWorld; varying vec3 vTerrainNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvTerrainWorld=(modelMatrix*vec4(position,1.)).xyz;vTerrainNormal=normalize(mat3(modelMatrix)*normal);');
    shader.fragmentShader='uniform sampler2D rockSurface; uniform sampler2D grassSurface; varying vec3 vTerrainWorld; varying vec3 vTerrainNormal;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      vec3 weights=pow(abs(normalize(vTerrainNormal)),vec3(4.));weights/=max(.001,weights.x+weights.y+weights.z);
      vec3 rock=texture2D(rockSurface,vTerrainWorld.zy*.095).rgb*weights.x+texture2D(rockSurface,vTerrainWorld.xz*.095).rgb*weights.y+texture2D(rockSurface,vTerrainWorld.xy*.095).rgb*weights.z;
      vec3 grass=texture2D(grassSurface,vTerrainWorld.xz*.065).rgb*vec3(.78,.71,.48);
      float cover=smoothstep(.65,.93,vTerrainNormal.y)*smoothstep(-4.,18.,vTerrainWorld.y);
      float variation=.88+.12*sin(vTerrainWorld.x*.073+sin(vTerrainWorld.z*.053));
      diffuseColor.rgb*=mix(rock*1.15,grass,cover*.72)*variation;
    `);
  };
  material.customProgramCacheKey=()=> 'apex-triplanar-terrain-v2';
  return material;
}

export function signTexture(text: string, accent='#ff633b', sub='APEX MOTORSPORT') {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const c=canvas.getContext('2d')!;
  c.fillStyle='#101a20';c.fillRect(0,0,1024,256);c.fillStyle=accent;c.fillRect(0,0,14,256);c.fillRect(0,240,1024,16);
  c.textAlign='center';c.fillStyle='#eff2eb';c.font='700 92px Rajdhani, sans-serif';c.fillText(text,512,137);c.fillStyle=accent;c.font='500 28px Inter, sans-serif';c.fillText(sub,512,195);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
}
