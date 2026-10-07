import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {roadX,roadHeading} from './route';
import {LandSurfaces} from './LandSurfaces';
const rand=(n:number)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
/** Cosmetic road work: sealed cracks and repairs lie below the painted markings. */
export class RoadFinish{
 readonly group=new T.Group();
 readonly repairs=28;
 readonly crackClusters=78;
 constructor(parent:T.Group,surfaces:LandSurfaces){
  this.group.name='Road surface details';
  const point=(off:number,s:number,y:number)=>{const a=roadHeading(s);return new T.Vector3(roadX(s)+Math.cos(a)*off,y,-s-Math.sin(a)*off);};
  const bins=new Map<number,{patches:T.BufferGeometry[];seal:T.BufferGeometry[]}>();
  const bin=(s:number)=>{const key=Math.floor(s/200);let b=bins.get(key);if(!b){b={patches:[],seal:[]};bins.set(key,b);}return b;};
  const strip=(points:Array<[number,number]>,width:number)=>{
   const p:number[]=[],uv:number[]=[],ids:number[]=[];
   points.forEach(([off,s],i)=>{for(const side of [-1,1]){point(off+side*width/2,s,.044).toArray(p,p.length);uv.push(off+side*width/2,s);}if(i<points.length-1){const j=i*2;ids.push(j,j+1,j+2,j+1,j+3,j+2);}});
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();return g;
  };
  for(let i=0;i<this.repairs;i++){
   const s=120+i*203+(rand(i+22)-.5)*64,off=(i%2?1:-1)*(2.9+(rand(i+91)-.5)*.8),w=.6+rand(i+7)*.9,length=1.8+rand(i+10)*3.2;
   const positions:number[]=point(off,s,.043).toArray(),uv:number[]=[off,s],ids:number[]=[];
   for(let k=0;k<16;k++){const a=k*Math.PI*2/16,edge=1+(rand(i*17+k+15)-.5)*.10,dx=Math.sign(Math.cos(a))*Math.pow(Math.abs(Math.cos(a)),.35)*w*edge,ds=Math.sign(Math.sin(a))*Math.pow(Math.abs(Math.sin(a)),.35)*length*edge;point(off+dx,s+ds,.043).toArray(positions,positions.length);uv.push(off+dx,s+ds);ids.push(0,k+1,(k+1)%16+1);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();bin(s).patches.push(g);
  }
  for(let i=0;i<this.crackClusters;i++){
   const s=70+i*76+(rand(i+19)-.5)*30,off=(i%2?1:-1)*(2.8+(rand(i+60)-.5)*1.3),points:Array<[number,number]>=[];
   for(let k=0;k<9;k++)points.push([off+Math.sin(k*2.13+i)*.12,s-2.3+k*.58]);bin(s).seal.push(strip(points,.022+rand(i+18)*.016));
   if(i%3===0)bin(s).seal.push(strip([[off,s],[off+.45,s+.43],[off+.75,s+.7]],.018));
  }
  // A narrow, slightly irregular construction joint in the centre gap.
  for(let s=0;s<6000;s+=200){const points:Array<[number,number]>=[];for(let k=0;k<=40;k++)points.push([Math.sin((s+k*5)*.071)*.016,s+k*5]);bin(s).seal.push(strip(points,.036));}
  const patch=surfaces.road(true),seal=new T.MeshStandardMaterial({name:'Flexible road crack sealant',color:0x242823,roughness:.82});
  for(const {patches,seal:lines}of bins.values())for(const [parts,material]of [[patches,patch],[lines,seal]] as const){if(!parts.length)continue;const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());if(g){const m=new T.Mesh(g,material);m.receiveShadow=true;this.group.add(m);}}
  parent.add(this.group);
 }
}
