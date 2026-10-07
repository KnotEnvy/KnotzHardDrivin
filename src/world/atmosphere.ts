import * as T from 'three';
import { LIGHTING } from '../config/lighting.config';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
/** Physical Rayleigh/Mie scattering with wind-advected, depth-shaded cloud layers. */
export function atmosphere(sun:T.Vector3):Sky {
  const sky=new Sky();sky.name='Living Pacific atmosphere';sky.scale.setScalar(10000);sky.frustumCulled=false;
  const m=sky.material,u=m.uniforms;
  u.sunPosition.value=sun;u.turbidity.value=3.4;u.rayleigh.value=1.65;u.mieCoefficient.value=.0035;u.mieDirectionalG.value=.76;
  u.cloudTime={value:0};u.skyBrightness={value:LIGHTING.skyBrightness};
  m.fragmentShader=`uniform float cloudTime;uniform float skyBrightness;
float cHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float cNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(cHash(i),cHash(i+vec2(1,0)),f.x),mix(cHash(i+vec2(0,1)),cHash(i+1.),f.x),f.y);}
float cField(vec2 p){return cNoise(p)*.57+cNoise(p*2.03+5.7)*.28+cNoise(p*4.09+13.1)*.15;}
vec3 cloudComposite(vec3 background,vec3 direction,vec3 sunlight){
 if(direction.y<.025)return background;
 vec2 wind=vec2(cloudTime*6.5,cloudTime*1.7);
 float base=(900.-cameraPosition.y)/direction.y;
 float stepSize=520./direction.y/6.;
 float transmittance=1.;vec3 light=vec3(0.);
 float forwardScatter=pow(max(dot(direction,sunlight),0.),14.);
 for(int i=0;i<6;i++){
   float layer=(float(i)+.5)/6.;vec3 p=cameraPosition+direction*(base+stepSize*(float(i)+.5));
   vec2 uv=(p.xz+wind)*.0010;
   float field=cField(uv+vec2(layer*.14,layer*.11));
   float shape=smoothstep(.0,.20,layer)*(1.-smoothstep(.55,1.,layer));
   float density=smoothstep(.52,.67,field-.16*layer+(cNoise(uv*9.+layer*3.)-.5)*.065)*shape;
   float alpha=(1.-exp(-density*stepSize*.011))*smoothstep(.025,.09,direction.y);
   float bright=clamp(.55+(field-cField(uv+sunlight.xz*.16))*4.+layer*.30,0.,1.);
   vec3 shade=mix(vec3(.22,.29,.35),vec3(1.24,1.08,.82),bright);
   shade+=vec3(1.0,.73,.39)*forwardScatter*(1.-density)*.65;
   float haze=1.-exp(-max(base-2400.,0.)*.000075);shade=mix(shade,background,haze);
   light+=transmittance*alpha*shade;transmittance*=1.-alpha;
 }
 // Wispy high cirrus drifts at a separate speed and altitude.
 vec2 high=(cameraPosition.xz+direction.xz*(3800./direction.y)+wind*.42)*.00037;
 float cirrus=smoothstep(.64,.83,cField(high*vec2(1.,3.8)))*.18*smoothstep(.04,.2,direction.y);
 return mix(background*transmittance+light,vec3(1.12,1.02,.89),cirrus);
}
`+m.fragmentShader.replace('gl_FragColor = vec4( retColor, 1.0 );','gl_FragColor = vec4( cloudComposite(texColor*skyBrightness,direction,vSunDirection), 1.0 );');
  return sky;
}
/** Same low-frequency field as the cloud shader, used for soft moving sunlight. */
export function cloudShade(x:number,z:number,time:number,sun:T.Vector3):number {
  const hash=(x:number,y:number)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
  const noise=(x:number,y:number)=>{const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);return T.MathUtils.lerp(T.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),fx),T.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),fx),fy);};
  const px=(x+sun.x*900/Math.max(.1,sun.y)+time*6.5)*.0010,pz=(z+sun.z*900/Math.max(.1,sun.y)+time*1.7)*.0010;
  const field=noise(px,pz)*.57+noise(px*2.03+5.7,pz*2.03+5.7)*.28+noise(px*4.09+13.1,pz*4.09+13.1)*.15;
  return 1-T.MathUtils.smoothstep(field,.52,.67)*.30;
}
