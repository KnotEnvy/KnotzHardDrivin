import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {roadX,ROADSIDE_SITES,OVERLOOK_SITES} from './route';
import {SEA_LEVEL} from './TerrainProfile';
import type {WaterContact} from './Ocean';
const rand=(n:number)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
type Part={geometry:T.BufferGeometry;material:T.Material|T.Material[]};
/** Original geology and regional groundcover, grouped into distance-limited habitats. */
export class Landscape{
 readonly group=new T.Group();
 readonly waterContacts:WaterContact[]=[];
 private readonly wind={value:0};
 private plants=0;
 private rocks=0;
 constructor(parent:T.Group,private readonly height:(off:number,s:number)=>number){this.group.name='Pacific ground habitats';parent.add(this.group);}
 async load():Promise<void>{
  const loader=new GLTFLoader(),names=['outcrop','outcrop-lod','fern','scrub'],templates=await Promise.all(names.map(name=>loader.loadAsync(`${import.meta.env.BASE_URL}assets/pacific-${name}.glb`)));
  const parts=(index:number):Part[]=>{const root=templates[index].scene,result:Part[]=[];root.updateMatrixWorld(true);root.traverse(o=>{if(o instanceof T.Mesh){const material=o.material as T.Material|T.Material[];
   if(index>=2){for(const m of Array.isArray(material)?material:[material]){m.onBeforeCompile=shader=>{shader.uniforms.uGroundWind=this.wind;shader.vertexShader='uniform float uGroundWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    #ifdef USE_INSTANCING
     transformed.x+=sin(uGroundWind*1.3+instanceMatrix[3].z*.09)*.045*position.y*position.y;
    #endif`);};m.customProgramCacheKey=()=> 'pacific-ground-wind-v1';}}
   result.push({geometry:o.geometry.clone().applyMatrix4(o.matrixWorld),material});}});return result;};
  const stone=parts(0),lowStone=parts(1),fern=parts(2),scrub=parts(3),pose=new T.Object3D();
  const plantCells=new Map<string,{kind:'fern'|'scrub';s:number;poses:T.Matrix4[]}>(),stoneCells=new Map<number,{s:number;poses:T.Matrix4[];colors:T.Color[]}>();
  const open=(s:number,off:number)=>!ROADSIDE_SITES.some(site=>Math.abs(s-site.s)<44&&off>12&&off<60)&&!OVERLOOK_SITES.some(stop=>Math.abs(s-stop)<10&&off< -10&&off> -20);
  for(let i=0;i<1060;i++){
   const isFern=i<430,s=isFern?1880+rand(i+922)*1950:(i%2?65+rand(i+514)*1650:4020+rand(i+833)*1910);
   const off=isFern?14+rand(i+76)*33:(i%5===0?-1:1)*(13.8+rand(i+9)*28);
   if(!open(s,off))continue;
   const kind=isFern?'fern':'scrub',cell=Math.floor(s/200),key=`${kind}-${cell}`,c=plantCells.get(key)??{kind,s:cell*200+100,poses:[]};
   pose.position.set(roadX(s)+off-roadX(c.s),this.height(off,s)+.015,-s+c.s);pose.scale.setScalar((isFern?.75:.85)+rand(i+23)*.75);pose.rotation.set(0,rand(i+56)*Math.PI*2,0);pose.updateMatrix();c.poses.push(pose.matrix.clone());plantCells.set(key,c);this.plants++;
  }
  for(const cell of plantCells.values()){
   const lod=new T.LOD();lod.name=`${cell.kind} habitat ${cell.s}`;lod.position.set(roadX(cell.s),0,-cell.s);const detail=new T.Group();
   for(const part of cell.kind==='fern'?fern:scrub){const m=new T.InstancedMesh(part.geometry,part.material,cell.poses.length);cell.poses.forEach((matrix,i)=>m.setMatrixAt(i,matrix));m.receiveShadow=true;m.computeBoundingSphere();detail.add(m);}
   lod.addLevel(detail,0);lod.addLevel(new T.Group(),330);this.group.add(lod);
  }
  for(let i=0;i<232;i++){
   const offshore=i<130,s=rand(i+208)*6000,off=offshore?-65-rand(i+991)*280:19+rand(i+23)*38;if(!offshore&&!open(s,off))continue;
   const cell=Math.floor(s/200),c=stoneCells.get(cell)??{s:cell*200+100,poses:[],colors:[]};
   const height=offshore?SEA_LEVEL-2.2-rand(i+78)*.8:this.height(off,s)-.30;
   pose.position.set(roadX(s)+off-roadX(c.s),height,-s+c.s);pose.rotation.set((rand(i+3)-.5)*.08,rand(i+7)*Math.PI*2,(rand(i+61)-.5)*.10);
   pose.scale.set(offshore?3+rand(i+11)*5:.55+rand(i+22)*1.15,offshore?1.55+rand(i+83)*2.9:.45+rand(i+70)*.9,offshore?2.4+rand(i+317)*5.8:.6+rand(i+881)*1.1);pose.updateMatrix();c.poses.push(pose.matrix.clone());
   if(offshore)this.waterContacts.push({x:roadX(s)+off,z:-s,rx:pose.scale.x*1.22,rz:pose.scale.z*.93,angle:pose.rotation.y});
   const forest=s>1850&&s<3900&&!offshore;c.colors.push(forest?new T.Color(.79,.87,.74):new T.Color(.90+rand(i+93)*.10,.91+rand(i+93)*.09,.89+rand(i+93)*.11));stoneCells.set(cell,c);this.rocks++;
  }
  for(const cell of stoneCells.values()){
   const lod=new T.LOD();lod.name=`Sandstone habitat ${cell.s}`;lod.position.set(roadX(cell.s),0,-cell.s);
   for(const [index,components]of [stone,lowStone].entries()){
    const detail=new T.Group();for(const part of components){const m=new T.InstancedMesh(part.geometry,part.material,cell.poses.length);cell.poses.forEach((matrix,i)=>{m.setMatrixAt(i,matrix);m.setColorAt(i,cell.colors[i]);});m.castShadow=index===0;m.receiveShadow=true;m.computeBoundingSphere();detail.add(m);}lod.addLevel(detail,index===0?0:240);
   }this.group.add(lod);
  }
 }
 update(time:number):void{this.wind.value=time;}
 inspect(){return{plants:this.plants,outcrops:this.rocks,habitats:this.group.children.length};}
}
