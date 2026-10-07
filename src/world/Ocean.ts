import * as T from 'three';
import {Reflector} from 'three/examples/jsm/objects/Reflector.js';
import {SEA_LEVEL} from './TerrainProfile';
import {oceanGeometry,rippleTexture,shoreTexture} from './OceanProfile';
export type WaterContact={x:number;z:number;rx:number;rz:number;angle:number};
const wavesGLSL=`
 uniform float time;
 uniform vec4 uWaves[4];
 vec3 swell(vec2 p,out vec2 gradient){
  vec3 delta=vec3(0.);gradient=vec2(0.);
  for(int i=0;i<4;i++){
   vec4 wave=uWaves[i];float phase=dot(wave.xy,p)*wave.z-sqrt(9.81*wave.z)*time+float(i)*1.73;
   float height=wave.w*sin(phase),side=.32*wave.w*cos(phase);
   delta+=vec3(wave.x*side,height,wave.y*side);gradient+=wave.xy*wave.z*wave.w*cos(phase);
  }
  return delta;
 }
`;
const shoreGLSL=`
 uniform sampler2D shoreline;
 float shoreX(float s){vec2 bytes=texture2D(shoreline,vec2((clamp(s/6150.,0.,1.)*1023.+.5)/1024.,.5)).rg;return dot(bytes,vec2(65280.,255.))/65535.*1024.-512.;}
`;
/** Maintained planar reflection with an original calm-ocean surface and terrain-following surf. */
export class Ocean{
 readonly mesh:Reflector;
 readonly group=new T.Group();
 private readonly material:T.ShaderMaterial;
 private readonly normal=rippleTexture();
 private readonly shoreline=shoreTexture();
 private readonly windWaves=[new T.Vector4(.955,-.296,Math.PI*2/42,.17),new T.Vector4(.8,.6,Math.PI*2/28,.095),new T.Vector4(.985,.172,Math.PI*2/18,.047),new T.Vector4(.57,.822,Math.PI*2/12,.018)];
 private readonly clock={value:0};
 private quality='high';
 private lastCapture=-Infinity;
 private captures=0;
 private reflectionDetail:T.Object3D[]=[];
 private foam?:T.InstancedMesh;
 private foamMaterial?:T.ShaderMaterial;
 private readonly eye=new T.Vector3();
 private readonly previousEye=new T.Vector3(Infinity,Infinity,Infinity);
 private readonly previousRotation=new T.Quaternion();
 private readonly previousProjection=new T.Matrix4();
 constructor(parent:T.Group){
  this.group.name='Pacific ocean and contact foam';parent.add(this.group);
  this.mesh=new Reflector(oceanGeometry(),{textureWidth:512,textureHeight:512,clipBias:.003,multisample:0});
  this.mesh.name='Reflective Pacific ocean';this.mesh.rotation.x=-Math.PI/2;this.mesh.position.y=SEA_LEVEL;
  this.material=this.mesh.material as T.ShaderMaterial;this.material.name='Pacific swell, reflection and surf';this.material.fog=true;
  Object.assign(this.material.uniforms,T.UniformsUtils.clone(T.UniformsLib.fog),{time:this.clock,uWaves:{value:this.windWaves},shoreline:{value:this.shoreline},ripples:{value:this.normal},eye:{value:this.eye},sun:{value:new T.Vector3(-.35,.14,-.9).normalize()}});
  this.material.vertexShader=`uniform mat4 textureMatrix;varying vec4 reflectionCoord;varying vec3 waterPosition;
   ${wavesGLSL}${shoreGLSL}
   #include <common>
   #include <fog_pars_vertex>
   void main(){
    vec3 original=(modelMatrix*vec4(position,1.)).xyz;vec2 gradient;
    float offshore=shoreX(-original.z)-original.x;vec3 delta=swell(original.xz,gradient)*smoothstep(0.,26.,offshore);
    vec3 local=position+vec3(delta.x,-delta.z,delta.y);
    waterPosition=(modelMatrix*vec4(local,1.)).xyz;reflectionCoord=textureMatrix*vec4(local,1.);
    vec4 mvPosition=viewMatrix*vec4(waterPosition,1.);gl_Position=projectionMatrix*mvPosition;
    #include <fog_vertex>
   }`;
  this.material.fragmentShader=`uniform sampler2D tDiffuse;uniform sampler2D ripples;uniform vec3 eye;uniform vec3 sun;
   varying vec4 reflectionCoord;varying vec3 waterPosition;
   ${wavesGLSL}${shoreGLSL}
   #include <common>
   #include <fog_pars_fragment>
   void main(){
    vec2 p=waterPosition.xz,gradient;vec3 displacement=swell(p,gradient);
    float offshore=shoreX(-p.y)-p.x;float shoreFade=smoothstep(0.,26.,offshore);
    vec4 fine=texture2D(ripples,p/22.+vec2(-time*.013,time*.006));
    vec4 crossRipple=texture2D(ripples,mat2(.866,-.5,.5,.866)*p/31.+vec2(time*.008,-time*.011));
    vec3 toEye=eye-waterPosition;float viewDistance=length(toEye);vec3 viewDirection=normalize(toEye);
    float detail=(1.-smoothstep(120.,1250.,viewDistance))*(.35+.65*shoreFade);
    vec2 ripple=(fine.rg*2.-1.)+(crossRipple.rg*2.-1.)*.65;
    vec3 n=normalize(vec3(-gradient.x*shoreFade+ripple.x*detail*.72,1.,-gradient.y*shoreFade+ripple.y*detail*.72));
    float theta=max(dot(n,viewDirection),0.);float fresnel=.02+.98*pow(1.-theta,5.);
    vec2 distortion=n.xz*.009*(.3+.7*detail);
    vec2 reflectionUV=reflectionCoord.xy/reflectionCoord.w+distortion;
    vec3 reflected=min(texture2D(tDiffuse,clamp(reflectionUV,.002,.998)).rgb,vec3(1.3));
    float depth=smoothstep(1.,90.,max(offshore,0.));
    vec3 body=mix(vec3(.025,.16,.145),vec3(.009,.047,.073),depth);
    body*=.88+.12*sin(p.x*.018+p.y*.027)+.12*max(0.,displacement.y);
    float sparkle=pow(max(dot(reflect(-sun,n),viewDirection),0.),180.);
    vec3 color=mix(body,reflected*.62,fresnel)+vec3(.95,.72,.40)*sparkle*.28;
    float broken=smoothstep(.29,.70,fine.a*.65+crossRipple.a*.35);
    float phase=offshore*.53-time*.83+sin(p.y*.043)*.9+crossRipple.a*.75;
    float crest=pow(max(0.,sin(phase)),10.);
    float surf=crest*(1.-smoothstep(3.,17.,offshore))*smoothstep(-1.5,.7,offshore)*broken;
    float wash=exp(-pow((offshore-1.4-sin(time*.47+p.y*.023)*1.2)/2.3,2.))*broken*.40;
    float cap=smoothstep(.90,.99,fine.a)*smoothstep(.047,.075,length(gradient))*shoreFade*.10;
    float foam=clamp(surf*.72+wash+cap,0.,.85);
    color=mix(color,vec3(.57,.66,.59),foam);
    gl_FragColor=vec4(color,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
   }`;
  const capture=this.mesh.onBeforeRender;
  this.mesh.onBeforeRender=(renderer,scene,camera,geometry,material,group)=>{
   // Cube probes sample the ocean without recursively baking a planar view for every face.
   this.eye.setFromMatrixPosition(camera.matrixWorld);
   if(camera.parent instanceof T.CubeCamera)return;
   const interval=this.quality==='high'?.10:this.quality==='performance'?.35:.24;
   // Ignore subpixel FOV easing so the reflection cadence remains bounded.
   const changed=this.previousEye.distanceToSquared(this.eye)>64||Math.abs(this.previousRotation.dot(camera.quaternion))<.9995||Math.abs(this.previousProjection.elements[0]-camera.projectionMatrix.elements[0])>.012||Math.abs(this.previousProjection.elements[5]-camera.projectionMatrix.elements[5])>.012;
   if(this.clock.value-this.lastCapture<interval&&!changed)return;
   const visible=this.foam?.visible;if(this.foam)this.foam.visible=false;
   const detailVisibility=this.reflectionDetail.map(o=>o.visible);this.reflectionDetail.forEach(o=>o.visible=false);
   try{capture.call(this.mesh,renderer,scene,camera,geometry,material,group);}
   finally{if(this.foam)this.foam.visible=visible!;this.reflectionDetail.forEach((o,i)=>o.visible=detailVisibility[i]);}
   this.lastCapture=this.clock.value;this.previousEye.copy(this.eye);this.previousRotation.copy(camera.quaternion);this.previousProjection.copy(camera.projectionMatrix);this.captures++;
  };
  this.group.add(this.mesh);
 }
 setReflectionDetail(objects:T.Object3D[]):void{this.reflectionDetail=objects;}
 setContacts(contacts:WaterContact[]):void{
  this.foam?.removeFromParent();this.foam?.geometry.dispose();this.foamMaterial?.dispose();
  const geometry=new T.RingGeometry(.65,1.45,48,3),material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,fog:true,
   uniforms:{...T.UniformsUtils.clone(T.UniformsLib.fog),time:this.clock,uWaves:{value:this.windWaves},ripples:{value:this.normal}},
   vertexShader:`varying vec2 ring;varying vec2 worldXZ;${wavesGLSL}
    #include <common>
    #include <fog_pars_vertex>
    void main(){ring=position.xy;vec4 p=modelMatrix*instanceMatrix*vec4(position,1.);worldXZ=p.xz;vec2 grad;p.y+=swell(p.xz,grad).y+.04;vec4 mvPosition=viewMatrix*p;gl_Position=projectionMatrix*mvPosition;
     #include <fog_vertex>
    }`,
   fragmentShader:`varying vec2 ring;varying vec2 worldXZ;uniform sampler2D ripples;uniform float time;
    #include <common>
    #include <fog_pars_fragment>
    void main(){float radius=length(ring);float grain=texture2D(ripples,worldXZ*.09+vec2(-time*.016,time*.012)).a;
     float edge=1.+sin(time*.76+atan(ring.y,ring.x)*3.)*.08;
     float foam=exp(-pow((radius-edge)/.17,2.))*smoothstep(.24,.63,grain)*.54;
     gl_FragColor=vec4(.59,.68,.63,foam);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
     #include <fog_fragment>
    }`});
  const foam=new T.InstancedMesh(geometry,material,contacts.length),pose=new T.Object3D();foam.name='Broken rock contact foam';foam.renderOrder=2;
  contacts.forEach((c,i)=>{pose.position.set(c.x,SEA_LEVEL,c.z);pose.rotation.set(-Math.PI/2,0,c.angle);pose.scale.set(c.rx,c.rz,1);pose.updateMatrix();foam.setMatrixAt(i,pose.matrix);});foam.computeBoundingSphere();
  this.foam=foam;this.foamMaterial=material;this.group.add(foam);
 }
 update(time:number,sun?:T.Vector3):void{this.clock.value=time;if(sun)this.material.uniforms.sun.value.copy(sun);}
 setQuality(quality:string):void{if(this.quality===quality)return;this.quality=quality;const size=quality==='high'?512:quality==='performance'?128:256;this.mesh.getRenderTarget().setSize(size,size);this.refresh();}
 refresh():void{this.lastCapture=-Infinity;}
 inspect(){return{time:this.clock.value,quality:this.quality,reflectionSize:this.mesh.getRenderTarget().width,captures:this.captures,contactFoam:this.foam?.count??0,triangles:this.mesh.geometry.index!.count/3};}
 dispose():void{this.mesh.dispose();this.mesh.geometry.dispose();this.foam?.geometry.dispose();this.foamMaterial?.dispose();this.normal.dispose();this.shoreline.dispose();this.group.removeFromParent();}
}
