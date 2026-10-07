import {LOD,type Object3D} from 'three';
const distances=new WeakMap<LOD,number[]>();
/** Preserve authored levels and restore them exactly when leaving Performance. */
export function setDistanceDetail(root:Object3D,factor:number):void {
 root.traverse(node=>{
  if(!(node instanceof LOD))return;
  let original=distances.get(node);
  if(!original){original=node.levels.map(level=>level.distance);distances.set(node,original);}
  node.levels.forEach((level,index)=>level.distance=original![index]*factor);
 });
}
