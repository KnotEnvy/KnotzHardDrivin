import * as T from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { weatheredMaterial } from './surfaces';
import { LandSurfaces } from './LandSurfaces';
import { RoadFinish } from './RoadFinish';
import { Ocean } from './Ocean';
import { Landscape } from './Landscape';
import { TERRAIN_STEP,TERRAIN_OFFSETS,FAR_TERRAIN_OFFSETS,terrainHeight,terrainSurfaceHeight } from './TerrainProfile';
import { RoadLife } from './RoadLife';
import { WorldLife } from './WorldLife';
import { loadScenery } from './Scenery';
import { CoastalDetails } from './CoastalDetails';
import { partitionInstances } from './partition';
import { freezeStaticTransforms } from './staticTransforms';
import type { Physics } from '../core/Physics';
import { roadX, roadHeading, STAGES, EXPEDITION } from './route';


function random(seed: number) { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }
export class Coast {
  readonly group = new T.Group();
  readonly gates: T.Group[] = [];
  readonly ocean:Ocean;
  private readonly details: CoastalDetails;
  readonly life:WorldLife;
  readonly landscape:Landscape;
  private readonly surfaces=new LandSurfaces();
  constructor(physics: Physics, scene: T.Scene) {
    this.ribbon(0,17,.015,this.surfaces.gravel(),false,true);
    this.ribbon(0,13,.035,this.surfaces.road(),false,true);
    const white=this.surfaces.paint(0xe2dcc4),yellow=this.surfaces.paint(0xd8ae48);
    this.ribbon(-5.95,0.12,0.052,white); this.ribbon(5.95,0.12,0.052,white);
    this.ribbon(-0.15,0.1,0.052,yellow); this.ribbon(0.15,0.1,0.052,yellow);
    physics.world.createCollider(physics.RAPIER.ColliderDesc.cuboid(2000,0.5,3500).setTranslation(0,-0.5,-3000));
    this.terrain();
    this.ribbon(11.15,1.6,.012,this.surfaces.path(),true);
    this.ocean=new Ocean(this.group);
    this.rails(physics); this.landmarks(); this.roadDetails();
    new RoadFinish(this.group,this.surfaces);
    this.details=new CoastalDetails(this.group,(off,s)=>this.surfaceHeight(off,s));
    new RoadLife(this.group,(off,s)=>this.height(off,s));
    this.landscape=new Landscape(this.group,(off,s)=>this.surfaceHeight(off,s));
    this.life=new WorldLife(this.group,(off,s)=>this.surfaceHeight(off,s));
    partitionInstances(this.group);
    scene.add(this.group);
  }
  async loadLandmarks() {
    const [asset]=await Promise.all([
      new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}assets/pacific-point.glb`),
      this.surfaces.ready,loadScenery(this.group,(off,s)=>this.surfaceHeight(off,s)),this.landscape.load(),this.life.load(),
    ]);
    const s=210,offset=-36;
    asset.scene.position.set(roadX(s)+offset,this.height(offset,s),-s);
    asset.scene.rotation.y=.35;
    asset.scene.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});
    this.group.add(asset.scene);
    this.ocean.setContacts(this.landscape.waterContacts);
    this.ocean.setReflectionDetail([this.details.group,this.life.group,...this.landscape.group.children.filter(o=>/^(fern|scrub) habitat /.test(o.name))]);
    freezeStaticTransforms(this.group,new Set([this.life.group]));
  }
  update(time: number, checkpoint: number,sun?:T.Vector3,focus?:T.Vector3,active=false) { this.ocean.update(time,sun);this.details.update(time);this.landscape.update(time);this.life.update(time,focus,active); for(let i=0;i<this.gates.length;i++) this.gates[i].visible=i>=checkpoint; }
  setGates(stageIndex: number, enabled = true, expedition = false) {
    for(const gate of this.gates) { gate.removeFromParent(); gate.traverse(o=>{const m=o as T.Mesh;m.geometry?.dispose();if(m.material && !Array.isArray(m.material)) m.material.dispose();}); }
    this.gates.length=0;
    if(!enabled)return;
    const stage=expedition?EXPEDITION:STAGES[stageIndex];
    const gateCount=expedition?12:4;
    for(let i=1;i<=gateCount;i++) {
      const s=stage.start+(stage.end-stage.start)*i/gateCount;
      const gate=new T.Group(); gate.position.set(roadX(s),0,-s); gate.rotation.y=roadHeading(s);
      const mat=new T.MeshStandardMaterial({color:0xfed284,emissive:0xffb542,emissiveIntensity:1.4,transparent:true,opacity:0.8});
      for(const x of [-7.5,7.5]) { const post=new T.Mesh(new T.BoxGeometry(0.12,6,0.12),mat);post.position.set(x,3,0);gate.add(post); }
      const top=new T.Mesh(new T.BoxGeometry(15.1,0.12,0.12),mat);top.position.y=6;gate.add(top);
      this.sign(gate,i===gateCount?'DESTINATION':`CHECKPOINT  ${String(i).padStart(2,'0')}`,0,7,0,7.5,0.85);
      this.group.add(gate);freezeStaticTransforms(gate);this.gates.push(gate);
    }
  }
  private ribbon(offset:number,width:number,y:number,material:T.Material,followTerrain=false,brokenEdge=false) {
    const positions:number[]=[],uv:number[]=[],indices:number[]=[];
    for(let i=0;i<=1550;i++) { const s=-100+i*4;const x=roadX(s);const angle=roadHeading(s);const nx=Math.cos(angle),nz=-Math.sin(angle);
      for(const side of [-1,1]) {const d=offset+side*width/2+(brokenEdge?side*(Math.sin(s*.49)*.035+Math.sin(s*.83)*.017):0);positions.push(followTerrain?x+d:x+nx*d,followTerrain?this.surfaceHeight(d,s)+y:y,followTerrain?-s:-s+nz*d);uv.push(side*width/2,s);}
      if(i<1550) {const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
    const mesh=new T.Mesh(geo,material);mesh.receiveShadow=true;this.group.add(mesh);
  }
  private height(off:number,s:number){return terrainHeight(off,s);}
  private surfaceHeight(off:number,s:number){return terrainSurfaceHeight(off,s);}
  private terrain() {
    const material=this.surfaces.terrain();
    const mesh=(start:number,end:number,step:number,offsets:number[],centerS:number,centerX:number)=>{
      const p:number[]=[],normal:number[]=[],coords:number[]=[],ids:number[]=[],cols=offsets.length-1,rows=Math.round((end-start)/step);
      for(let j=0;j<=rows;j++){
        const s=start+j*step,roadDerivative=(roadX(s+.5)-roadX(s-.5));
        for(let i=0;i<=cols;i++){
          const off=offsets[i],y=this.height(off,s),gx=this.height(off+.5,s)-this.height(off-.5,s),gs=this.height(off,s+.5)-this.height(off,s-.5);
          p.push(roadX(s)+off-centerX,y,-s+centerS);coords.push(off,s);
          const n=new T.Vector3(-gx,1,gs-roadDerivative*gx).normalize();normal.push(n.x,n.y,n.z);
          if(j<rows&&i<cols){const a=j*(cols+1)+i;ids.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}
        }
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(normal,3));g.setAttribute('terrainCoord',new T.Float32BufferAttribute(coords,2));g.setIndex(ids);g.computeBoundingSphere();const m=new T.Mesh(g,material);m.receiveShadow=true;return m;
    };
    for(let start=-150;start<6150;start+=200){
      const end=Math.min(start+200,6150),centerS=(start+end)/2,centerX=roadX(centerS),lod=new T.LOD();lod.name=`Land sector ${start}`;lod.position.set(centerX,0,-centerS);
      lod.addLevel(mesh(start,end,TERRAIN_STEP,TERRAIN_OFFSETS,centerS,centerX),0);lod.addLevel(mesh(start,end,20,FAR_TERRAIN_OFFSETS,centerS,centerX),450);this.group.add(lod);
    }
    // Offshore stacks break up the horizon without blocking the coastal view.
    let rockGeo:T.BufferGeometry=new T.IcosahedronGeometry(1,3);const d=new T.Object3D();
    const rp=rockGeo.attributes.position;for(let i=0;i<rp.count;i++){const x=rp.getX(i),y=rp.getY(i),z=rp.getZ(i);const r=1+.13*Math.sin(x*13+z*7)*Math.cos(y*9);rp.setXYZ(i,x*r,y*r,z*r);}rockGeo.deleteAttribute('normal');rockGeo.deleteAttribute('uv');rockGeo=mergeVertices(rockGeo);rockGeo.computeVertexNormals();
    const talus=new T.InstancedMesh(rockGeo,weatheredMaterial(0x716958),340);
    for(let i=0;i<340;i++){
      const patch=Math.floor(i/8),ss=random(patch+940)*6100+(random(i+621)-.5)*28,off=-17-random(i+337)*30;
      const size=.6+random(i+81)*2.4;d.position.set(roadX(ss)+off,this.height(off,ss)+size*.35,-ss);d.scale.set(size,size*.75,size*1.3);d.rotation.set(random(i)*.4,random(i+44)*6,0);d.updateMatrix();talus.setMatrixAt(i,d.matrix);
    }
    talus.receiveShadow=true;this.group.add(talus);
  }
  private rails(physics:Physics) {
    const railMat=new T.MeshStandardMaterial({color:0x969f97,metalness:.65,roughness:.58});
    this.guardrail(-8.1,railMat);this.guardrail(8.1,railMat);
    const posts=new T.InstancedMesh(new T.BoxGeometry(.14,.9,.18),railMat,1550);const d=new T.Object3D();
    for(let i=0;i<775;i++){const s=-80+i*8;for(let k=0;k<2;k++){d.position.set(roadX(s)+(k===0?-8.1:8.1),.4,-s);d.rotation.y=roadHeading(s);d.updateMatrix();posts.setMatrixAt(i*2+k,d.matrix);}}
    this.group.add(posts);
    // Continuous segmented barriers share the same sampled road centreline.
    for(let s=-90;s<6100;s+=16)for(const side of [-1,1]) {
      const yaw=roadHeading(s+8);
      physics.world.createCollider(physics.RAPIER.ColliderDesc.cuboid(.18,.6,8.25).setTranslation(roadX(s+8)+side*8.2,.45,-s-8).setRotation({x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)}).setRestitution(.1).setFriction(.1));
    }
  }
  private guardrail(offset:number,material:T.Material){
    const p:number[]=[],ix:number[]=[];const profile=[[-.015,.54],[.05,.66],[-.025,.77],[.05,.88],[-.015,1.0]];
    for(let i=0;i<=775;i++){
      const s=-80+i*8,a=roadHeading(s),nx=Math.cos(a),nz=-Math.sin(a);
      for(const [rel,y]of profile)p.push(roadX(s)+nx*(offset+rel),y,-s+nz*(offset+rel));
      if(i<775)for(let k=0;k<4;k++){const n=i*5+k;ix.push(n,n+1,n+5,n+1,n+6,n+5);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();
    material.side=T.DoubleSide;const mesh=new T.Mesh(g,material);mesh.receiveShadow=true;this.group.add(mesh);
  }
  private sign(parent:T.Group,text:string,x:number,y:number,z:number,w:number,h:number) {
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const ctx=canvas.getContext('2d')!;
    ctx.fillStyle='#173f38';ctx.fillRect(0,0,1024,128);ctx.strokeStyle='#d6dcca';ctx.lineWidth=4;ctx.strokeRect(8,8,1008,112);ctx.fillStyle='#f5ebd4';ctx.font='500 48px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,66);
    const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
    const sign=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:tex,roughness:.8,side:T.DoubleSide}));sign.position.set(x,y,z);parent.add(sign);
  }
  private roadDetails() {
    const d=new T.Object3D();
    const reflectors=new T.InstancedMesh(new T.BoxGeometry(.10,.035,.20),new T.MeshStandardMaterial({color:0xfce3a1,emissive:0xa37424,emissiveIntensity:.3}),620);
    for(let i=0;i<620;i++){const s=i*10;d.position.set(roadX(s),.075,-s);d.rotation.set(0,roadHeading(s),0);d.updateMatrix();reflectors.setMatrixAt(i,d.matrix);}
    this.group.add(reflectors);
    // Irregular gravel along both shoulders makes a transition to the terrain.
    const stones=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),weatheredMaterial(0x98866b),3600);
    for(let i=0;i<3600;i++){const s=random(i+7812)*6100,off=(i%2?1:-1)*(6.65+random(i+691)*1.1);d.position.set(roadX(s)+off,.045,-s);d.scale.set(.04+random(i)*.13,.025+random(i+3)*.05,.06+random(i+6)*.20);d.rotation.set(0,random(i+19)*6,0);d.updateMatrix();stones.setMatrixAt(i,d.matrix);}this.group.add(stones);
  }
  private landmarks() {
    for(let i=0;i<STAGES.length;i++){const s=STAGES[i].start+65;const g=new T.Group();g.position.set(roadX(s)+7.3,0,-s);g.rotation.y=roadHeading(s);this.sign(g,`${STAGES[i].landmark}   ↑`,0,3.9,0,6,0.9);for(const x of [-2.5,2.5]){const p=new T.Mesh(new T.CylinderGeometry(.08,.08,4,8),new T.MeshStandardMaterial({color:0x77776c}));p.position.set(x,2,0);g.add(p);}this.group.add(g);}
  }
}
