import * as T from 'three';
import { roadX } from './route';
import { partitionInstances } from './partition';

const random=(i:number)=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
/** Small-scale wind-driven habitat detail. No per-frame allocations. */
export class CoastalDetails {
  readonly group=new T.Group();
  private readonly foliage:T.MeshStandardMaterial;
  private wind?:{value:number};
  constructor(parent:T.Group,height:(off:number,s:number)=>number){
    const vertices:number[]=[],ids:number[]=[];
    for(let k=0;k<17;k++){
      const a=k*2.399,dx=Math.cos(a),dz=Math.sin(a),i=vertices.length/3;
      const x=dx*random(k+30)*.25,z=dz*random(k+57)*.25,h=.25+random(k+11)*.36,w=.025+random(k+19)*.02;
      vertices.push(x-dz*w,0,z+dx*w,x+dz*w,0,z-dx*w,x+dx*.13,h*.6,z+dz*.13,x+dx*.31,h,z+dz*.31);
      ids.push(i,i+1,i+2,i+1,i+3,i+2);
    }
    const blades=new T.BufferGeometry();blades.setAttribute('position',new T.Float32BufferAttribute(vertices,3));blades.setIndex(ids);blades.computeVertexNormals();
    this.foliage=new T.MeshStandardMaterial({color:0xd5cd91,roughness:.95,side:T.DoubleSide});
    this.foliage.onBeforeCompile=shader=>{
      this.wind=shader.uniforms.uCoastalWind={value:0};
      shader.vertexShader='uniform float uCoastalWind;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifdef USE_INSTANCING
        transformed.x+=sin(uCoastalWind*1.4+instanceMatrix[3].z*.08+instanceMatrix[3].x*.1)*.12*position.y*position.y;
      #endif`);
    };
    this.foliage.customProgramCacheKey=()=> 'coastal-wind-v1';
    const grasses=new T.InstancedMesh(blades,this.foliage,5800),d=new T.Object3D();
    for(let i=0;i<5800;i++){
      const patch=Math.floor(i/14),centerS=random(patch+8381)*6100;
      const centerOff=(patch%5===0?-1:1)*(10+random(patch+33)*44);
      const s=centerS+(random(i+471)-.5)*12,rawOff=centerOff+(random(i+812)-.5)*7,off=Math.sign(rawOff)*Math.max(9.5,Math.abs(rawOff));
      d.position.set(roadX(s)+off,height(off,s)+.01,-s);d.scale.setScalar(.5+random(i+4)*.85);d.rotation.y=random(i+5)*6;d.updateMatrix();grasses.setMatrixAt(i,d.matrix);
      const forest=s>1800&&s<3900;const color=new T.Color().setHSL(forest?.19+random(i+1)*.07:.13+random(i+1)*.06,.21+random(i+8)*.12,forest?.30+random(i+15)*.09:.40+random(i+15)*.13);grasses.setColorAt(i,color);
    }
    this.group.add(grasses);
    partitionInstances(this.group);parent.add(this.group);
  }
  update(time:number){if(this.wind)this.wind.value=time;}
}
