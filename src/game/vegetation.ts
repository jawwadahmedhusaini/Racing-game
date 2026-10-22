import * as THREE from 'three';
import {publicUrl} from './urls';
import {surface} from './materials';

interface TreeData {positions:number[];normals:number[];uvs:number[];groups:{bark:number[];leaf:number[]};}
let trees:Record<'near'|'far',TreeData>;
export async function loadVegetation(){const response=await fetch(publicUrl('assets/vegetation.json'));if(!response.ok)throw new Error('Tree asset failed to load');trees=await response.json();}

/** Baked, openly licensed 3D tree LODs, drawn in two material batches per LOD. */
export function addTrees(scene:THREE.Scene,near:THREE.Matrix4[],far:THREE.Matrix4[]){
  const bark=new THREE.MeshStandardMaterial({map:surface('bark-color.jpg'),normalMap:surface('bark-normal.png'),roughness:.95,color:'#d3c8ad'});
  const leaves=new THREE.MeshStandardMaterial({map:surface('foliage-color.png'),normalMap:surface('foliage-normal.png'),normalScale:new THREE.Vector2(.35,.35),color:'#b9b789',roughness:.87,alphaTest:.48,side:THREE.DoubleSide,alphaToCoverage:true});
  for(const [lod,transforms] of [['near',near],['far',far]] as const){
    const data=trees[lod];
    // Spatial batches let frustum and shadow culling discard distant groves.
    const cells=new Map<string,THREE.Matrix4[]>();
    for(const transform of transforms){const e=transform.elements,key=`${Math.floor(e[12]/150)},${Math.floor(e[14]/150)}`;const cell=cells.get(key)??[];cell.push(transform);cells.set(key,cell);}
    for(const part of ['bark','leaf'] as const){
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(data.normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(data.uvs,2));geometry.setIndex(data.groups[part]);
      for(const cell of cells.values()){
        const mesh=new THREE.InstancedMesh(geometry,part==='bark'?bark:leaves,cell.length);cell.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.castShadow=lod==='near';mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);
      }
    }
  }
}
