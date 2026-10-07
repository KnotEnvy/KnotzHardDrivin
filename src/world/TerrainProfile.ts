import {roadX,ROADSIDE_SITES} from './route';
export const TERRAIN_STEP=5;
export const SEA_LEVEL=-6.8;
export const TERRAIN_OFFSETS=[...new Set([
 ...Array.from({length:15},(_,i)=>-130+i*8),-13,-8.5,0,8.5,10.35,11.15,11.95,13,
 ...Array.from({length:19},(_,i)=>14+i*2),...Array.from({length:15},(_,i)=>54+i*4),
 ...Array.from({length:7},(_,i)=>120+i*10),...Array.from({length:25},(_,i)=>200+i*20)
])].sort((a,b)=>a-b);
export const FAR_TERRAIN_OFFSETS=TERRAIN_OFFSETS.filter((off,i)=>i%3===0||[-130,-13,-8.5,0,8.5,13,20,28,42,56,680].includes(off));
const smooth=(x:number,a:number,b:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
/** Small erosion shapes begin beyond the usable shoulder; site cuts stay level. */
function baseHeight(off:number,s:number):number{
 if(off< -13){const coast=Math.max(-9,-Math.pow((-off-13)*.11,1.25));const erosion=(Math.sin(s*.063+off*.19)*.46+Math.sin(s*.021-off*.15)*.38)*smooth(-off,20,40)*(1-smooth(-off,68,95));return coast+erosion;}
 if(off<13)return -.04;
 const rise=Math.min(1,(off-13)/95);
 const broad=rise*(30+18*Math.sin(s*.007+off*.008)+12*Math.sin(s*.014+off*.024))+Math.max(0,off-120)*.12+Math.min(1,(off-13)/45)*Math.sin(s*.057+off*.22)*Math.sin(off*.15-s*.028)*1.4;
 const erosion=(Math.sin(s*.09+off*.21)*.72+Math.sin(s*.23+off*.43)*.28+Math.sin(s*.026+off*.09)*1.15)*smooth(off,20,45);
 return broad+erosion;
}
export function terrainHeight(off:number,s:number):number{
 const original=baseHeight(off,s);if(off<8.5||off>56)return original;
 for(const site of ROADSIDE_SITES){const ds=Math.abs(s-site.s);if(ds>40)continue;const plateau=baseHeight(19,site.s),grade=plateau*smooth(off,8.5,20),weight=(1-smooth(ds,22,40))*(1-smooth(off,42,56));return original*(1-weight)+grade*weight;}
 return original;
}
/** Matches the high-detail mesh triangles, including curved-centreline interpolation. */
export function terrainSurfaceHeight(off:number,s:number):number{
 const row=Math.max(0,Math.min(1259,Math.floor((s+150)/TERRAIN_STEP))),s0=-150+row*TERRAIN_STEP,v=Math.max(0,Math.min(1,(s-s0)/TERRAIN_STEP));
 const x=roadX(s)+off-(roadX(s0)*(1-v)+roadX(s0+TERRAIN_STEP)*v);
 let i=0;while(i<TERRAIN_OFFSETS.length-2&&TERRAIN_OFFSETS[i+1]<x)i++;
 const left=TERRAIN_OFFSETS[i],right=TERRAIN_OFFSETS[i+1],u=Math.max(0,Math.min(1,(x-left)/(right-left)));
 const a=terrainHeight(left,s0),b=terrainHeight(right,s0),c=terrainHeight(left,s0+TERRAIN_STEP),d=terrainHeight(right,s0+TERRAIN_STEP);
 return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
}
