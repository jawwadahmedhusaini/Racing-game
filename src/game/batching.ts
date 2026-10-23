import * as THREE from 'three';

/** Keep static geometry in local cells so the GPU never draws an entire circuit for one visible object. */
export function spatialInstances(geometry:THREE.BufferGeometry,material:THREE.Material,transforms:THREE.Matrix4[],cast=false,colors?:THREE.Color[],cellSize=100){
  const group=new THREE.Group(),cells=new Map<string,number[]>();
  transforms.forEach((m,i)=>{const e=m.elements,key=`${Math.floor(e[12]/cellSize)},${Math.floor(e[14]/cellSize)}`;const cell=cells.get(key)??[];cell.push(i);cells.set(key,cell);});
  for(const indices of cells.values()){
    const mesh=new THREE.InstancedMesh(geometry,material,indices.length);
    indices.forEach((source,i)=>{mesh.setMatrixAt(i,transforms[source]);if(colors)mesh.setColorAt(i,colors[source]);});
    mesh.castShadow=cast;mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);
  }
  return group;
}

/** Preserve normals and texture coordinates across cell seams. The input geometry is consumed. */
export function spatialMesh(geometry:THREE.BufferGeometry,material:THREE.Material,cast=false,cellSize=150){
  const source=geometry.index?geometry.toNonIndexed():geometry,positions=source.attributes.position;
  const cells=new Map<string,number[]>(),group=new THREE.Group();
  for(let i=0;i<positions.count;i+=3){
    const x=(positions.getX(i)+positions.getX(i+1)+positions.getX(i+2))/3,z=(positions.getZ(i)+positions.getZ(i+1)+positions.getZ(i+2))/3;
    const key=`${Math.floor(x/cellSize)},${Math.floor(z/cellSize)}`,cell=cells.get(key)??[];cell.push(i,i+1,i+2);cells.set(key,cell);
  }
  for(const indices of cells.values()){
    const geo=new THREE.BufferGeometry();
    for(const [name,attribute] of Object.entries(source.attributes)){
      const values=new Float32Array(indices.length*attribute.itemSize);
      indices.forEach((index,i)=>{for(let j=0;j<attribute.itemSize;j++)values[i*attribute.itemSize+j]=attribute.getComponent(index,j);});
      geo.setAttribute(name,new THREE.BufferAttribute(values,attribute.itemSize));
    }
    geo.computeBoundingSphere();const mesh=new THREE.Mesh(geo,material);mesh.castShadow=cast;mesh.receiveShadow=true;group.add(mesh);
  }
  if(source!==geometry)source.dispose();geometry.dispose();return group;
}
