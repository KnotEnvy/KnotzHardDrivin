import * as THREE from 'three';
import { LIGHTING } from '../config/lighting.config';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
export interface PostFXOptions {bloomStrength?:number;bloomRadius?:number;bloomThreshold?:number;}
/** Restrained HDR highlights, teal shadows and edge-only overdrive streaks. */
export class PostFX {
  private readonly composer:EffectComposer;
  private readonly bloom:UnrealBloomPass;
  private readonly finish:ShaderPass;
  private readonly renderer:THREE.WebGLRenderer;
  private readonly size=new THREE.Vector2();
  private readonly reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.Camera,opts:PostFXOptions={}){
    this.renderer=renderer;renderer.getDrawingBufferSize(this.size);
    const target=new THREE.WebGLRenderTarget(this.size.x,this.size.y,{type:THREE.HalfFloatType,samples:2});
    this.composer=new EffectComposer(renderer,target);this.composer.setPixelRatio(1);this.composer.addPass(new RenderPass(scene,camera));
    this.bloom=new UnrealBloomPass(this.size.clone(),opts.bloomStrength??LIGHTING.bloom.strength,opts.bloomRadius??LIGHTING.bloom.radius,opts.bloomThreshold??LIGHTING.bloom.threshold);this.composer.addPass(this.bloom);
    this.finish=new ShaderPass({uniforms:{tDiffuse:{value:null},motion:{value:0},time:{value:0},pulse:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D tDiffuse;uniform float motion;uniform float time;uniform float pulse;varying vec2 vUv;void main(){vec3 col=texture2D(tDiffuse,vUv).rgb;vec2 q=(vUv-.5)*vec2(1.2,1.);float r=length(q);float l=dot(col,vec3(.2126,.7152,.0722));col*=mix(vec3(.91,1.01,1.03),vec3(1.035,1.01,.97),smoothstep(.05,.85,l));float vignette=smoothstep(.30,.76,r);col*=1.-vignette*.075;float angle=atan(q.y,q.x);float streak=pow(max(0.,sin(angle*83.+sin(angle*17.)*3.)),24.);float travel=pow(max(0.,sin(r*30.-time*12.+angle*8.)),8.);float edge=smoothstep(.36,.70,r);col+=vec3(.12,.22,.25)*streak*travel*edge*motion;col+=vec3(.05,.027,.008)*edge*pulse;gl_FragColor=vec4(col,1.);}`});
    this.composer.addPass(this.finish);this.composer.addPass(new OutputPass());
  }
  setMotion(speed:number,boosting:boolean,time:number,pulse:number){this.finish.uniforms.motion.value=this.reducedMotion?0:Math.max(0,Math.min(1,(Math.abs(speed)-27)/25))*(boosting?1:.18);this.finish.uniforms.time.value=time;this.finish.uniforms.pulse.value=this.reducedMotion?0:pulse;}
  render(){this.composer.render();}
  setBloomStrength(strength:number){this.bloom.strength=strength;}
  resize(){this.renderer.getDrawingBufferSize(this.size);this.composer.setSize(this.size.x,this.size.y);this.bloom.resolution.set(this.size.x,this.size.y);}
  dispose(){for(const pass of this.composer.passes)pass.dispose();this.composer.dispose();}
}
