import * as THREE from 'three';
import {publicUrl} from './urls';
import {surface} from './materials';
import {spatialInstances} from './batching';

interface TreeData {positions:number[];normals:number[];uvs:number[];groups:{bark:number[];leaf:number[]};}
let trees:Record<'near'|'far',TreeData>;
export async function loadVegetation(){const response=await fetch(publicUrl('assets/vegetation.json'));if(!response.ok)throw new Error('Tree asset failed to load');trees=await response.json();}

/** Nearby trees retain their silhouette; matching lower-detail meshes take over beyond the road. */
export function addTrees(scene:THREE.Scene,near:THREE.Matrix4[],far:THREE.Matrix4[]){
  const bark=new THREE.MeshStandardMaterial({map:surface('bark-color.jpg'),normalMap:surface('bark-normal.png'),roughness:.95,color:'#d3c8ad'});
  const leaves=new THREE.MeshStandardMaterial({map:surface('foliage-color.png'),normalMap:surface('foliage-normal.png'),normalScale:new THREE.Vector2(.22,.22),color:'#c7c697',roughness:.85,alphaTest:.4,side:THREE.DoubleSide,alphaToCoverage:true});
  // A little transmitted skylight keeps sunlit leaf cards from becoming black paper.
  leaves.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\nreflectedLight.indirectDiffuse += diffuseColor.rgb * 0.035;');};
  const geometry=(level:'near'|'far',part:'bark'|'leaf')=>{
    const data=trees[level],g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(data.normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(data.uvs,2));g.setIndex(data.groups[part]);return g;
  };
  const geos={near:{bark:geometry('near','bark'),leaf:geometry('near','leaf')},far:{bark:geometry('far','bark'),leaf:geometry('far','leaf')}};
  const cells=new Map<string,THREE.Matrix4[]>();
  for(const transform of near){const e=transform.elements,key=`${Math.floor(e[12]/65)},${Math.floor(e[14]/65)}`;const cell=cells.get(key)??[];cell.push(transform);cells.set(key,cell);}
  for(const cell of cells.values()){
    const center=new THREE.Vector3();cell.forEach(m=>center.add(new THREE.Vector3().setFromMatrixPosition(m)));center.divideScalar(cell.length);
    const lod=new THREE.LOD();lod.position.copy(center);lod.userData.treeLOD=true;
    for(const level of ['near','far'] as const){
      const group=new THREE.Group();
      for(const part of ['bark','leaf'] as const){
        const mesh=new THREE.InstancedMesh(geos[level][part],part==='bark'?bark:leaves,cell.length);
        cell.forEach((m,i)=>{const local=m.clone();local.elements[12]-=center.x;local.elements[13]-=center.y;local.elements[14]-=center.z;mesh.setMatrixAt(i,local);});
        mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);
      }
      lod.addLevel(group,level==='near'?0:115,.12);
    }
    scene.add(lod);
  }
  for(const part of ['bark','leaf'] as const)scene.add(spatialInstances(geos.far[part],part==='bark'?bark:leaves,far,false,undefined,100));
}
