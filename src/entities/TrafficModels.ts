import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
export const TRAFFIC_KINDS=['sedan','wagon','compact','pickup','camper'] as const;
export type TrafficKind=typeof TRAFFIC_KINDS[number];
export const TRAFFIC_SIZE:Record<TrafficKind,{width:number;length:number;height:number}>={
 sedan:{width:1.07,length:2.37,height:.82},wagon:{width:1.09,length:2.44,height:.92},compact:{width:1.03,length:1.94,height:.84},pickup:{width:1.13,length:2.55,height:.92},camper:{width:1.15,length:2.61,height:1.23},
};
let templates:Promise<Array<[T.Group,T.Group]>>|undefined;
export function loadTrafficModels():Promise<Array<[T.Group,T.Group]>>{
 return templates??=Promise.all(TRAFFIC_KINDS.map(async kind=>{
  const loader=new GLTFLoader();const models=await Promise.all(['','-lod'].map(suffix=>loader.loadAsync(`${import.meta.env.BASE_URL}assets/traffic-${kind}${suffix}.glb`)));
  return [models[0].scene,models[1].scene] as [T.Group,T.Group];
 }));
}
export function trafficModel(templates:[T.Group,T.Group],color:number):T.LOD{
 const lod=new T.LOD(),copies=new Map<T.Material,T.Material>();
 const paint=(m:T.Material)=>{
  if(!m.name.startsWith('Traffic enamel')&&!m.name.startsWith('Traffic accent'))return m;
  let copy=copies.get(m) as T.MeshStandardMaterial|undefined;
  if(!copy){copy=(m as T.MeshStandardMaterial).clone();copy.color.setHex(color);
   if(m.name.startsWith('Traffic accent'))copy.color.lerp(new T.Color(0xf5efe0),.75);
   copies.set(m,copy);
  }return copy;
 };
 templates.forEach((template,index)=>{
 const model=template.clone(true);
 model.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;
  o.material=Array.isArray(o.material)?o.material.map(paint):paint(o.material);
 }});lod.addLevel(model,index===0?0:95);
 });return lod;
}
