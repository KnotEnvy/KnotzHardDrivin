import * as T from 'three';

/** Bounded smoke/spark pool and persistent dual tire marks, all in world space. */
export class Effects {
  private readonly particles:T.Points;
  private readonly positions=new Float32Array(240*3);
  private readonly velocities=new Float32Array(240*3);
  private readonly life=new Float32Array(240);
  private readonly maxLife=new Float32Array(240);
  private readonly fade=new Float32Array(240);
  private readonly sizes=new Float32Array(240);
  private readonly colors=new Float32Array(240*3);
  private readonly marks:T.InstancedMesh;
  private readonly dummy=new T.Object3D();
  private smokeAccumulator=0;
  private boostAccumulator=0;
  private readonly smokeColor=new T.Color(0xbcb8a7);
  private readonly boostColor=new T.Color(0x91dce7);
  private readonly sparkColor=new T.Color(0xffb45b);
  private cursor=0;
  private markCursor=0;
  private readonly lastMark=new T.Vector3(99999,0,0);
  private readonly behind=new T.Vector3();
  constructor(scene:T.Scene) {
    this.positions.fill(-9999);const g=new T.BufferGeometry();
    g.setAttribute('position',new T.BufferAttribute(this.positions,3));g.setAttribute('aFade',new T.BufferAttribute(this.fade,1));g.setAttribute('aSize',new T.BufferAttribute(this.sizes,1));g.setAttribute('aColor',new T.BufferAttribute(this.colors,3));
    const material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{pixelScale:{value:500}},vertexShader:`attribute float aFade;attribute float aSize;attribute vec3 aColor;varying float fade;varying vec3 color;uniform float pixelScale;void main(){fade=aFade;color=aColor;vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=min(90.,aSize*pixelScale/max(1.,-p.z));gl_Position=projectionMatrix*p;}`,fragmentShader:`varying float fade;varying vec3 color;void main(){float r=length(gl_PointCoord-.5)*2.;float alpha=pow(max(0.,1.-r*r),2.)*fade;gl_FragColor=vec4(color,alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`});
    this.particles=new T.Points(g,material);this.particles.frustumCulled=false;scene.add(this.particles);
    this.marks=new T.InstancedMesh(new T.PlaneGeometry(.19,1),new T.MeshBasicMaterial({color:0x171b1c,transparent:true,opacity:.25,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),640);
    this.dummy.scale.setScalar(0);this.dummy.updateMatrix();for(let i=0;i<640;i++)this.marks.setMatrixAt(i,this.dummy.matrix);
    this.marks.frustumCulled=false;scene.add(this.marks);
  }
  private emit(p:T.Vector3,color:T.Color,size:number,duration:number,vx:number,vy:number,vz:number){
    const i=this.cursor++%240;this.positions.set([p.x,p.y,p.z],i*3);this.velocities.set([vx,vy,vz],i*3);this.colors.set([color.r,color.g,color.b],i*3);this.sizes[i]=size;this.life[i]=this.maxLife[i]=duration;
  }
  impact(position:T.Vector3){
    const warm=this.sparkColor;
    for(let k=0;k<22;k++)this.emit(position,warm,.09,.25+Math.random()*.3,(Math.random()-.5)*6,Math.random()*3,(Math.random()-.5)*6);
  }
  setViewport(height:number,fov:number){(this.particles.material as T.ShaderMaterial).uniforms.pixelScale.value=height*.5/Math.tan(T.MathUtils.degToRad(fov*.5));}
  update(dt:number,position:T.Vector3,emit:boolean,forward=new T.Vector3(0,0,-1),speed=0,boosting=false) {
    for(let i=0;i<240;i++)if(this.life[i]>0){
      this.life[i]=Math.max(0,this.life[i]-dt);const age=1-this.life[i]/this.maxLife[i];this.fade[i]=(1-age)*Math.min(1,age*10)*.27;
      for(let k=0;k<3;k++)this.positions[i*3+k]+=this.velocities[i*3+k]*dt;
      if(this.sizes[i]>.3)this.sizes[i]+=dt*.6;
      if(this.life[i]===0){this.positions[i*3+1]=-9999;this.fade[i]=0;}
    }
    this.behind.copy(position).addScaledVector(forward,-1.45);this.behind.y=.14;
    if(emit){
      this.smokeAccumulator+=dt*27;
      while(this.smokeAccumulator>=1){
        this.smokeAccumulator--;
        for(const side of [-1,1]){
          this.behind.x+=forward.z*.84*side;this.behind.z-=forward.x*.84*side;
          this.emit(this.behind,this.smokeColor,.24+Math.random()*.16,.8+Math.random()*.7,-forward.x*speed*.1+(Math.random()-.5)*1.1,.35+Math.random()*.6,-forward.z*speed*.1+(Math.random()-.5)*1.1);
          this.behind.x-=forward.z*.84*side;this.behind.z+=forward.x*.84*side;
        }
      }
      const distance=this.behind.distanceTo(this.lastMark);
      if(distance>=.20){
        if(distance<3){
          for(const side of [-1,1]){
            this.dummy.position.set((this.behind.x+this.lastMark.x)*.5+forward.z*.84*side,.061,(this.behind.z+this.lastMark.z)*.5-forward.x*.84*side);
            this.dummy.rotation.set(-Math.PI/2,0,Math.atan2(-forward.x,-forward.z));this.dummy.scale.set(1,distance+.04,1);this.dummy.updateMatrix();this.marks.setMatrixAt(this.markCursor++%640,this.dummy.matrix);
          }
          this.marks.instanceMatrix.needsUpdate=true;
        }
        this.lastMark.copy(this.behind);
      }
    }else {this.lastMark.set(99999,0,0);this.smokeAccumulator=0;}
    if(boosting){
      this.boostAccumulator+=dt*60;this.behind.copy(position).addScaledVector(forward,-2.22);this.behind.y-=.24;
      while(this.boostAccumulator>=1){this.boostAccumulator--;this.emit(this.behind,this.boostColor,.16,.18,-forward.x*4,.03,-forward.z*4);}
    }else this.boostAccumulator=0;
    for(const name of ['position','aFade','aSize','aColor'])this.particles.geometry.attributes[name].needsUpdate=true;
  }
  clear(){
    this.smokeAccumulator=this.boostAccumulator=0;this.life.fill(0);this.fade.fill(0);this.positions.fill(-9999);
    this.dummy.scale.setScalar(0);this.dummy.updateMatrix();for(let i=0;i<640;i++)this.marks.setMatrixAt(i,this.dummy.matrix);this.marks.instanceMatrix.needsUpdate=true;
    this.lastMark.set(99999,0,0);
  }
}
