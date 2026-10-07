import * as T from 'three';
const textureNames=['asphalt','grass','soil','sand','needles','rock','gravel'] as const;
/** Original PBR maps share bounded samplers and consistent meter scales. */
export class LandSurfaces{
 readonly ready:Promise<void>;
 private readonly textures=new Map<string,T.Texture>();
 constructor(){
  const pending:Promise<void>[]=[];const loader=new T.TextureLoader();
  for(const name of textureNames)for(const field of ['color','surface',...(['asphalt','rock','gravel'].includes(name)?['normal']:[])]){
   let texture:T.Texture;const promise=new Promise<void>((resolve,reject)=>{texture=loader.load(`${import.meta.env.BASE_URL}assets/land/${name}-${field}.png`,()=>resolve(),undefined,reject);});
   texture!.wrapS=texture!.wrapT=T.RepeatWrapping;texture!.anisotropy=8;texture!.colorSpace=field==='color'?T.SRGBColorSpace:T.NoColorSpace;this.textures.set(`${name}-${field}`,texture!);pending.push(promise);
  }
  this.ready=Promise.all(pending).then(()=>{});
 }
 private map(name:string,field:string,repeat=1):T.Texture{const map=this.textures.get(`${name}-${field}`)!.clone();map.repeat.setScalar(repeat);return map;}
 road(repair=false):T.MeshStandardMaterial{
  const material=new T.MeshStandardMaterial({map:this.map('asphalt','color',.45),normalMap:this.map('asphalt','normal',.45),normalScale:new T.Vector2(.35,.35),roughnessMap:this.map('asphalt','surface',.45),roughness:1,color:repair?0xb1b4ad:0xffffff});material.name=repair?'Fresh asphalt repairs':'Weathered Pacific asphalt';
  material.onBeforeCompile=shader=>{
   shader.vertexShader='varying vec2 vRoadMeters;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRoadMeters=uv;');
   shader.fragmentShader='varying vec2 vRoadMeters;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float lane=abs(vRoadMeters.x)-3.1;
    float tire=max(exp(-pow((lane-.82)*4.,2.)),exp(-pow((lane+.82)*4.,2.)));
    float roadAge=sin(vRoadMeters.y*.039+sin(vRoadMeters.y*.013)*2.)*.018;
    diffuseColor.rgb*=1.-tire*.045+roadAge;
    float dust=smoothstep(5.45,6.5,abs(vRoadMeters.x));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.13,.11,.08),dust*.16);`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor*=1.-tire*.07;');
  };material.customProgramCacheKey=()=> 'pacific-road-pbr-v1';return material;
 }
 gravel():T.MeshStandardMaterial{return new T.MeshStandardMaterial({name:'Graded mineral shoulder',map:this.map('gravel','color',.55),normalMap:this.map('gravel','normal',.55),normalScale:new T.Vector2(.40,.40),roughnessMap:this.map('gravel','surface',.55),roughness:1});}
 path():T.MeshStandardMaterial{return new T.MeshStandardMaterial({name:'Compacted scenic path',map:this.map('soil','color',.6),roughnessMap:this.map('soil','surface',.6),roughness:1,color:0xa49b82});}
 paint(color:number):T.MeshStandardMaterial{
  const material=new T.MeshStandardMaterial({name:'Worn mineral road paint',color,roughness:.91});
  material.onBeforeCompile=shader=>{
   shader.vertexShader='varying vec2 vPaintMeters;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPaintMeters=uv;');
   shader.uniforms.uPaintGrain={value:this.textures.get('asphalt-surface')!};
   shader.fragmentShader='varying vec2 vPaintMeters;uniform sampler2D uPaintGrain;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float wear=texture2D(uPaintGrain,vPaintMeters*vec2(.65,.45)).r;
    float fading=smoothstep(.40,.66,wear);diffuseColor.rgb*=mix(.81,1.,fading);
    diffuseColor.rgb*=.93+.07*sin(vPaintMeters.y*.31);`);
  };material.customProgramCacheKey=()=> 'pacific-road-paint-v2';return material;
 }
 terrain():T.MeshStandardMaterial{
  const material=new T.MeshStandardMaterial({name:'Pacific layered terrain',roughness:1});
  material.onBeforeCompile=shader=>{
   for(const kind of ['grass','soil','sand','needles','rock'])for(const field of ['color','surface'])shader.uniforms[`uLand_${kind}_${field}`]={value:this.textures.get(`${kind}-${field}`)!};
   shader.vertexShader='attribute vec2 terrainCoord;varying vec2 vLandCoord;varying vec3 vLandPosition;varying vec3 vLandNormal;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vLandCoord=terrainCoord;vLandPosition=(modelMatrix*vec4(position,1.)).xyz;vLandNormal=normalize(mat3(modelMatrix)*normal);`);
   shader.fragmentShader=`varying vec2 vLandCoord;varying vec3 vLandPosition;varying vec3 vLandNormal;
    ${['grass','soil','sand','needles','rock'].flatMap(kind=>['color','surface'].map(field=>`uniform sampler2D uLand_${kind}_${field};`)).join('\n')}
    float landHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float landNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(landHash(i),landHash(i+vec2(1,0)),f.x),mix(landHash(i+vec2(0,1)),landHash(i+1.),f.x),f.y);}
    vec3 landTriplanar(sampler2D tex,vec3 p,vec3 w){return texture2D(tex,p.zy*.23).rgb*w.x+texture2D(tex,p.xz*.23).rgb*w.y+texture2D(tex,p.xy*.23).rgb*w.z;}
    vec3 landRelief(vec3 viewPoint,vec3 n,float h){vec3 dx=normalize(dFdx(viewPoint)),dy=normalize(dFdy(viewPoint));vec3 a=cross(dy,n),b=cross(n,dx);float determinant=dot(dx,a);vec3 grad=sign(determinant)*(dFdx(h)*a+dFdy(h)*b);return normalize(abs(determinant)*n-grad);}
    `+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec3 landP=vLandPosition;float landS=vLandCoord.y,landOff=vLandCoord.x;
    float forest=smoothstep(1750.,1880.,landS)*(1.-smoothstep(3790.,3960.,landS));
    float slope=1.-abs(normalize(vLandNormal).y);
    float macro=landNoise(landP.xz*.032),patches=landNoise(landP.xz*.19);
    vec3 weights=pow(abs(normalize(vLandNormal)),vec3(4.));weights/=max(dot(weights,vec3(1.)),.001);
    vec3 grass=texture2D(uLand_grass_color,landP.xz*.28).rgb;
    vec3 needles=texture2D(uLand_needles_color,landP.xz*.30).rgb;
    vec3 soil=texture2D(uLand_soil_color,landP.xz*.42).rgb;
    vec3 sand=texture2D(uLand_sand_color,landP.xz*.35).rgb;
    vec3 stone=landTriplanar(uLand_rock_color,landP,weights);
    vec3 grassP=texture2D(uLand_grass_surface,landP.xz*.28).rgb;
    vec3 needleP=texture2D(uLand_needles_surface,landP.xz*.30).rgb;
    vec3 soilP=texture2D(uLand_soil_surface,landP.xz*.42).rgb;
    vec3 sandP=texture2D(uLand_sand_surface,landP.xz*.35).rgb;
    vec3 stoneP=landTriplanar(uLand_rock_surface,landP,weights);
    float earth=smoothstep(.50,.69,macro*.62+patches*.36+slope*.48);
    float rock=smoothstep(.07,.30,slope)*(.45+macro*.55);
    rock=max(rock,smoothstep(.72,.89,patches+macro*.13)*smoothstep(20.,35.,landOff)*.65);
    float beach=(1.-smoothstep(-14.,-10.,landOff))*(1.-smoothstep(-.8,.2,landP.y));
    float shoreRock=smoothstep(.57,.76,patches)*smoothstep(-5.4,-1.2,landP.y)*beach;
    rock=max(rock,shoreRock*.75);
    vec3 ground=mix(grass,needles,forest*.92),landSurface=mix(grassP,needleP,forest*.92);
    ground=mix(ground,soil,earth*.68);landSurface=mix(landSurface,soilP,earth*.68);
    ground=mix(ground,sand,beach);landSurface=mix(landSurface,sandP,beach);
    ground=mix(ground,stone,rock);landSurface=mix(landSurface,stoneP,rock);
    float damp=(1.-smoothstep(-6.6,-4.1,landP.y))*beach;
    ground*=mix(.74,1.15,macro)*(1.-damp*.28);
    ground*=mix(1.,.90+.10*sin(landP.y*3.+landNoise(landP.xz*.15)*2.),rock);
    diffuseColor.rgb*=ground*mix(.85,1.,landSurface.b);
    float landBump=landSurface.r*.032;`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(landSurface.g-damp*.14,.65,1.);');
   shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=landRelief(-vViewPosition,normal,landBump);');
  };material.customProgramCacheKey=()=> 'pacific-layered-land-v2';return material;
 }
}
