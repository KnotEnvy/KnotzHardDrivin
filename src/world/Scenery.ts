import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { roadX,roadHeading,ROADSIDE_SITES,OVERLOOK_SITES } from './route';
import { loadTrafficModels,trafficModel } from '../entities/TrafficModels';
import { VEHICLE_PAINTS } from '../entities/VehiclePaints';
import { weatheredMaterial } from './surfaces';
const random=(seed:number)=>{const n=Math.sin(seed*127.1+311.7)*43758.5453;return n-Math.floor(n);};
/** Original architecture on graded sites; spatial near/far forest detail levels. */
export async function loadScenery(parent:T.Group,height:(off:number,s:number)=>number):Promise<void>{
  const loader=new GLTFLoader();const [station,lodge,tree,low,wide,wideLow,palm,palmLow,overlook]=await Promise.all(['last-light-station','horizon-lodge','pacific-redwood','pacific-redwood-lod','pacific-redwood-wide','pacific-redwood-wide-lod','pacific-palm','pacific-palm-lod','pacific-overlook'].map(name=>loader.loadAsync(`${import.meta.env.BASE_URL}assets/${name}.glb`)));
  const parked=await loadTrafficModels();
  for(let i=0;i<7;i++){
    const s=ROADSIDE_SITES[i].s,off=28,site=new T.Group();site.position.set(roadX(s)+off,height(off,s),-s);site.rotation.y=-Math.PI/2+roadHeading(s);
    const model=(i%2?lodge:station).scene.clone(true);model.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});site.add(model);parent.add(site);
    for(let j=0;j<2;j++){
      const car=trafficModel(parked[(i+j+1)%5],VEHICLE_PAINTS[(i*3+j*4)%VEHICLE_PAINTS.length].color);
      car.addLevel(new T.Group(),380);car.position.set(j?9:-9,i%2?.71:.87,8.2);car.rotation.y=Math.PI;site.add(car);
    }
    const apron=new T.Mesh(new T.BoxGeometry(24,.20,24),new T.MeshStandardMaterial({color:0x9c8d70,roughness:1}));apron.position.y=-.09;apron.receiveShadow=true;site.add(apron);
    // Graded approach follows the terrain cut and meets the existing shoulder.
    const p:number[]=[],uv:number[]=[],ix:number[]=[];
    for(let j=0;j<=12;j++)for(let k=0;k<2;k++){
      const offset=8.5+j*2.4,ss=s+(k?1:-1)*(4+j*.35);p.push(roadX(ss)+offset,height(offset,ss)+.04,-ss);uv.push(offset*.2,ss*.2);
      if(j<12&&k===0){const a=j*2;ix.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();
    const drive=new T.Mesh(g,weatheredMaterial(0x827964));drive.receiveShadow=true;parent.add(drive);
  }
  for(const s of OVERLOOK_SITES){
    const stop=new T.LOD(),model=overlook.scene.clone(true);model.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});
    stop.addLevel(model,0);stop.addLevel(new T.Group(),650);stop.position.set(roadX(s)-14.5,Math.max(height(-12,s),height(-17,s))+.02,-s);stop.rotation.y=roadHeading(s)+Math.PI/2;parent.add(stop);
  }
  // Palm canopy LODs share instance batches and disappear beyond the haze.
  const palmParts=(model:T.Group)=>{model.updateMatrixWorld(true);const parts:Array<{g:T.BufferGeometry;m:T.Material|T.Material[]}>=[];
    model.traverse(o=>{if(o instanceof T.Mesh){if(!Array.isArray(o.material))o.material.side=T.DoubleSide;parts.push({g:o.geometry.clone().applyMatrix4(o.matrixWorld),m:o.material});}});return parts;};
  const palms=[palmParts(palm.scene),palmParts(palmLow.scene)],pose=new T.Object3D();
  for(let chunk=0;chunk<20;chunk++){
    const sunset=chunk>=10,centerS=(sunset?3900:0)+(chunk%10+.5)*(sunset?215:173),centerX=roadX(centerS);
    const lod=new T.LOD();lod.position.set(centerX,0,-centerS);
    palms.forEach((parts,quality)=>{
      const group=new T.Group();
      for(const {g,m}of parts){
        const trees=new T.InstancedMesh(g,m,sunset?9:10);
        for(let j=0;j<trees.count;j++){
          const i=chunk*10+j,s=centerS+(random(i+700)-.5)*(sunset?215:173),off=(i%4===0?-1:1)*(12+random(i+40)*43),scale=.70+random(i+123)*.60;
          pose.position.set(roadX(s)+off-centerX,height(off,s),-s+centerS);pose.rotation.set(0,random(i+410)*Math.PI*2,0);pose.scale.setScalar(scale);pose.updateMatrix();trees.setMatrixAt(j,pose.matrix);
        }
        trees.castShadow=quality===0;trees.receiveShadow=true;trees.computeBoundingSphere();group.add(trees);
      }
      lod.addLevel(group,quality===0?0:190);
    });lod.addLevel(new T.Group(),1500);parent.add(lod);
  }
  const geometries=(model:T.Group)=>{model.updateMatrixWorld(true);const list:Array<{g:T.BufferGeometry;m:T.Material|T.Material[]}>=[];model.traverse(o=>{if(o instanceof T.Mesh){let material=o.material;if(!Array.isArray(material)&&material.name.includes('needle')){material=material.clone();material.transparent=false;material.alphaTest=.42;material.side=T.DoubleSide;}list.push({g:o.geometry.clone().applyMatrix4(o.matrixWorld),m:material});}});return list;};
  const detailed=geometries(tree.scene),distant=geometries(low.scene),alternate=geometries(wide.scene),alternateFar=geometries(wideLow.scene);
  const d=new T.Object3D();
  for(let chunk=0;chunk<12;chunk++){
    const centerS=1830+chunk*170,centerX=roadX(centerS)+25,lod=new T.LOD();lod.position.set(centerX,0,-centerS);
    for(const [quality,parts]of (chunk%2?[alternate,alternateFar]:[detailed,distant]).entries()){
      const group=new T.Group();
      for(const {g,m}of parts){
        const mesh=new T.InstancedMesh(g,m,32);
        for(let j=0;j<32;j++){
          const i=chunk*32+j,s=centerS+(random(i+93)-.5)*175;
          const off=(j%9===0?-1:1)*(12+Math.pow(random(i+54),1.7)*70);
          const scale=.66+random(i+123)*.55;
          d.position.set(roadX(s)+off-centerX,height(off,s),-s+centerS);d.rotation.set(0,random(i+21)*6.28,0);d.scale.set(scale*(.82+random(i+14)*.3),scale,scale);d.updateMatrix();mesh.setMatrixAt(j,d.matrix);
          mesh.setColorAt(j,new T.Color().setHSL(.07+random(i+4)*.07,.16,.67+random(i+33)*.18));
        }
        mesh.castShadow=quality===0;mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);
      }
      lod.addLevel(group,quality===0?0:210);
    }
    lod.addLevel(new T.Group(),1650);parent.add(lod);
  }
}
