import * as T from 'three';
/** Mineral detail uses meter-scale UVs; variation is deterministic and tileable. */
export function groundDetail():T.CanvasTexture {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d')!,data=ctx.createImageData(512,512);let seed=1783;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const i=(y*512+x)*4,value=211+(random()-.5)*35;
    data.data[i]=data.data[i+1]=data.data[i+2]=value;data.data[i+3]=255;
  }
  ctx.putImageData(data,0,0);const texture=new T.CanvasTexture(canvas);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;return texture;
}
/** Broad irregular soil patches and broken mineral layers; no regular hatch pattern. */
export function weatheredMaterial(color:number,vertexColors=false):T.MeshStandardMaterial {
  const material=new T.MeshStandardMaterial({color,vertexColors,roughness:1});
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vGroundPosition;varying float vGroundSlope;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vGroundPosition=position;vGroundSlope=1.-abs(normal.y);
      #ifdef USE_INSTANCING
        vGroundPosition=(instanceMatrix*vec4(position,1.0)).xyz;
      #endif`);
    shader.fragmentShader=`varying vec3 vGroundPosition;varying float vGroundSlope;
      float mineralHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float mineralNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(mineralHash(i),mineralHash(i+vec3(1,0,0)),f.x),mix(mineralHash(i+vec3(0,1,0)),mineralHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(mineralHash(i+vec3(0,0,1)),mineralHash(i+vec3(1,0,1)),f.x),mix(mineralHash(i+vec3(0,1,1)),mineralHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 p=vGroundPosition;
      float coarse=mineralNoise(p*.16),small=mineralNoise(p*1.4),fine=mineralNoise(p*14.);
      float strata=sin(p.y*1.5+mineralNoise(p*.3)*8.);
      diffuseColor.rgb*=.76+coarse*.36+small*.14+fine*.06+strata*.035;
      ${vertexColors?`float soil=smoothstep(.50,.70,coarse+vGroundSlope*.4);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.24,.195,.14),soil*.60);`:''}`);
  };
  material.customProgramCacheKey=()=> 'pacific-weathered-v2';return material;
}
