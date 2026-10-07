import * as T from 'three';
/** Spatial batches retain instance tints while culling distant vegetation. */
export function partitionInstances(group:T.Group) {
  const originals:T.InstancedMesh[]=[];group.traverse(o=>{if(o instanceof T.InstancedMesh)originals.push(o);});
  for(const mesh of originals){
    const buckets=new Map<number,Array<{matrix:T.Matrix4;color?:T.Color}>>();
    for(let i=0;i<mesh.count;i++){
      const matrix=new T.Matrix4();mesh.getMatrixAt(i,matrix);const key=Math.floor(matrix.elements[14]/180);
      const color=mesh.instanceColor?new T.Color():undefined;if(color)mesh.getColorAt(i,color);
      const a=buckets.get(key)??[];a.push({matrix,color});buckets.set(key,a);
    }
    for(const items of buckets.values()){
      const part=new T.InstancedMesh(mesh.geometry,mesh.material,items.length);
      items.forEach(({matrix,color},i)=>{part.setMatrixAt(i,matrix);if(color)part.setColorAt(i,color);});
      part.castShadow=mesh.castShadow;part.receiveShadow=mesh.receiveShadow;part.computeBoundingSphere();group.add(part);
    }
    mesh.removeFromParent();mesh.dispose();
  }
}
