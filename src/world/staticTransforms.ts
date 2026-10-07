import type { Object3D } from 'three';
/** Call only after placement. Shader wind/waves and LOD visibility remain live.
 * Animated subtrees must be excluded, or explicitly rebaked after relocation.
 */
export function freezeStaticTransforms(root:Object3D,excluded:ReadonlySet<Object3D>=new Set()):number {
  root.updateWorldMatrix(true,true);
  let count=0;
  const freeze=(node:Object3D)=>{
    if(excluded.has(node))return;
    node.matrixAutoUpdate=false;node.matrixWorldAutoUpdate=false;count++;
    for(const child of node.children)freeze(child);
  };
  freeze(root);
  return count;
}
