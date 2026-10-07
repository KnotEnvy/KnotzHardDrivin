import * as T from 'three';
import {roadX} from './route';
import {SEA_LEVEL,terrainSurfaceHeight} from './TerrainProfile';
/** Locate the actual terrain/water intersection instead of a constant road offset. */
export function shoreOffset(s:number):number{
 let land=-24,sea=-100;
 for(let i=0;i<16;i++){const mid=(land+sea)*.5;if(terrainSurfaceHeight(mid,s)>SEA_LEVEL)land=mid;else sea=mid;}
 return (land+sea)*.5;
}
export function shoreTexture():T.DataTexture{
 const size=1024,data=new Uint8Array(size*4);
 for(let i=0;i<size;i++){
  const s=i/(size-1)*6150,x=roadX(s)+shoreOffset(s),packed=Math.round((x+512)/1024*65535);
  data[i*4]=packed>>8;data[i*4+1]=packed&255;data[i*4+2]=128;data[i*4+3]=255;
 }
 const texture=new T.DataTexture(data,size,1);texture.minFilter=texture.magFilter=T.LinearFilter;texture.needsUpdate=true;texture.name='Terrain shoreline coordinates';return texture;
}
/** Periodic directional ripples. RGB stores tangent normals; alpha holds foam grain. */
export function rippleTexture(size=512):T.DataTexture{
 const data=new Uint8Array(size*size*4);let seed=28319;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const waves=Array.from({length:48},()=>{const x=2+Math.floor(random()*39),y=Math.floor(random()*51)-25,f=Math.hypot(x,y);return{x,y,phase:random()*Math.PI*2,amplitude:.105/(1+f*.07),frequency:f};});
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let gx=0,gy=0,h=0;
  for(const w of waves){const p=Math.PI*2*(w.x*x/size+w.y*y/size)+w.phase;gx+=Math.cos(p)*w.amplitude*w.x/w.frequency;gy+=Math.cos(p)*w.amplitude*w.y/w.frequency;h+=Math.sin(p)*w.amplitude*4/Math.sqrt(w.frequency);}
  const l=Math.sqrt(gx*gx+gy*gy+1),i=(y*size+x)*4;
  data[i]=Math.round((.5-gx/l*.5)*255);data[i+1]=Math.round((.5-gy/l*.5)*255);data[i+2]=Math.round((.5+.5/l)*255);data[i+3]=Math.round(T.MathUtils.clamp(.5+h*2.8,0,1)*255);
 }
 const texture=new T.DataTexture(data,size,size);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=true;texture.anisotropy=8;texture.needsUpdate=true;texture.name='Pacific directional ripple normals and foam';return texture;
}
/** Dense samples near the coast, broad cells beyond visible swell. Local XY is the mean plane. */
export function oceanGeometry():T.BufferGeometry{
 const rows=[-9000,-5000,-2200,-1000,-500,...Array.from({length:1134},(_,i)=>-350+i*6),7000,8500,11000,16000];
 const offsets=[-30,-38,-46,-54,-62,-70,-78,-86,-94,-102,-114,-130,-150,-180,-220,-280,-360,-460,-600,-850,-1200,-1800,-2800,-4500,-7500,-10000];
 const p:number[]=[],indices:number[]=[],cols=offsets.length;
 for(let j=0;j<rows.length;j++)for(let k=0;k<cols;k++){
  p.push(roadX(rows[j])+offsets[k],rows[j],0);
  if(j<rows.length-1&&k<cols-1){const a=j*cols+k;indices.push(a,a+cols,a+1,a+1,a+cols,a+cols+1);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g;
}
