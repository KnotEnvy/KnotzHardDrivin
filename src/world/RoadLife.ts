import * as T from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { roadHeading,roadX } from './route';
/** Coastal infrastructure, beach debris beyond the barriers. */
export class RoadLife {
 readonly group=new T.Group();
 constructor(parent:T.Group,height:(off:number,s:number)=>number){
  const timber=new T.MeshStandardMaterial({color:0x6e5c40,roughness:.92});
  const steel=new T.MeshStandardMaterial({color:0x777e78,metalness:.65,roughness:.54});
  const ceramic=new T.MeshStandardMaterial({color:0xd3caba,roughness:.30});
  const pieces:T.Mesh[]=[];
  const box=(size:T.Vector3,p:T.Vector3,m:T.Material)=>{const mesh=new T.Mesh(new T.BoxGeometry(size.x,size.y,size.z),m);mesh.position.copy(p);pieces.push(mesh);return mesh;};
  const between=(a:T.Vector3,b:T.Vector3,r:number,m:T.Material)=>{
   const mesh=new T.Mesh(new T.CylinderGeometry(r,r,a.distanceTo(b),7),m);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(T.Object3D.DEFAULT_UP,b.clone().sub(a).normalize());pieces.push(mesh);
  };
  let previous:T.Vector3|undefined;
  const wireMaterial=new T.LineBasicMaterial({color:0x333b3b});
  for(let i=0;i<56;i++){
   const s=60+i*110,off=17.5,x=roadX(s)+off,y=height(off,s);const p=new T.Vector3(x,y+8.9,-s);
   between(new T.Vector3(x,y,-s),p,.105,timber);
   box(new T.Vector3(2.4,.12,.14),p, timber);
   for(const dx of [-.95,0,.95]){
    box(new T.Vector3(.11,.24,.11),p.clone().add(new T.Vector3(dx,.16,0)),ceramic);
    if(previous){
     const points=[];
     for(let k=0;k<=12;k++){
      const t=k/12,q=previous.clone().lerp(p,t);q.x+=dx;q.y+=.25-Math.sin(t*Math.PI)*1.3;points.push(q);
     }
     this.group.add(new T.Line(new T.BufferGeometry().setFromPoints(points),wireMaterial));
    }
   }
   if(i%8===1){const m=box(new T.Vector3(.35,.65,.35),p.clone().add(new T.Vector3(.28,-.58,0)),steel);m.name='Pole transformer';}
   previous=p;
  }
  for(let i=0;i<140;i++){
   const s=70+i*43,off=-21-(i%5)*3.7,y=height(off,s),x=roadX(s)+off;
   const a=new T.Vector3(x,y+.16,-s),b=a.clone().add(new T.Vector3(1.5+Math.sin(i)*.6,.15,Math.cos(i*3)*2.2));
   between(a,b,.10+(i%3)*.04,timber);
   if(i%4===0)between(a.clone().lerp(b,.45),a.clone().add(new T.Vector3(1,.45,1)),.045,timber);
  }
  // Batch by spatial region and material; debris and pole fittings share draws.
  const buckets=new Map<string,{material:T.Material;parts:T.BufferGeometry[]}>();
  for(const mesh of pieces){mesh.updateMatrix();const key=`${Math.floor(mesh.position.z/220)}-${(mesh.material as T.Material).uuid}`;const item=buckets.get(key)??{material:mesh.material as T.Material,parts:[]};item.parts.push(mesh.geometry.clone().applyMatrix4(mesh.matrix));buckets.set(key,item);mesh.geometry.dispose();}
  for(const {material,parts}of buckets.values()){
   const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());if(g){const m=new T.Mesh(g,material);m.castShadow=true;m.receiveShadow=true;this.group.add(m);}
  }
  const destinations=[[580,'OCEAN VIEWS','NEXT 2 MILES'],[1690,'REDWOOD GROVE','SCENIC CURVES'],[4040,'GOLDEN COAST','TAKE YOUR TIME'],[5130,'SUNSET POINT','ENJOY THE DRIVE']] as const;
  for(const [s,title,sub]of destinations){
   const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;const c=canvas.getContext('2d')!;
   c.fillStyle='#23493f';c.fillRect(0,0,768,256);c.strokeStyle='#e6e4c5';c.lineWidth=9;c.strokeRect(12,12,744,232);c.fillStyle='#ece8cf';c.textAlign='center';c.font='600 57px Arial';c.fillText(title,384,108);c.font='32px Arial';c.fillText(sub,384,181);
   const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
   const board=new T.Mesh(new T.BoxGeometry(3.4,1.14,.045),new T.MeshStandardMaterial({color:0x617368,roughness:.8}));
   board.position.set(roadX(s)+9.6,height(9.6,s)+2.6,-s);board.rotation.y=roadHeading(s);this.group.add(board);
   const face=new T.Mesh(new T.PlaneGeometry(3.4,1.14),new T.MeshStandardMaterial({map:tex,roughness:.84}));face.position.z=.027;board.add(face);
   const post=new T.Mesh(new T.CylinderGeometry(.05,.05,2.3,8),steel);post.position.copy(board.position).add(new T.Vector3(0,-1.58,0));this.group.add(post);
  }
  parent.add(this.group);
 }
}
