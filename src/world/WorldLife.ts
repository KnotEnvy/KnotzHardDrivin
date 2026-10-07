import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { roadX,roadHeading,ROADSIDE_SITES,OVERLOOK_SITES } from './route';
import { LifeEncounter } from './LifeEncounter';

type Kind='dog'|'deer'|'gull'|'visitor'|'cyclist'|'kite';
type Joint={node:T.Object3D;rest:T.Euler};
interface Actor{kind:Kind;id:string;root:T.LOD;model:T.Group;s:number;off:number;yaw:number;seed:number;moment:LifeEncounter;joints:Map<string,Joint>;attention:number;walkClock:number;floor?:number;role?:'photographer'|'kite';flash?:T.Mesh;ball?:T.Mesh;}
interface KiteRig{actor:Actor;person:Actor;string:T.Line;tail:T.Mesh;positions:Float32Array;}
const NAMES=['dog','deer','gull','visitor','cyclist','kite','picnic'] as const;
const wrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
/** Authored coastal vignettes: bounded roadside activity and player-aware reactions. */
export class WorldLife {
 readonly group=new T.Group();
 private readonly actors:Actor[]=[];
 private readonly kites:KiteRig[]=[];
 private time=0;
 private readonly boneA=new T.Vector3();
 private readonly boneB=new T.Vector3();
 private readonly boneC=new T.Vector3();
 private readonly boneQ=new T.Quaternion();
 private readonly view=new T.Vector3();
 private readonly steel=new T.MeshStandardMaterial({color:0x9aada8,metalness:.7,roughness:.35});
 private readonly blue=new T.MeshStandardMaterial({color:0x225c64,roughness:.32});
 private readonly ballMaterial=new T.MeshStandardMaterial({color:0xc7cf58,roughness:.86});
 constructor(parent:T.Group,private readonly height:(off:number,s:number)=>number){this.group.name='Life along the Pacific';parent.add(this.group);}
 async load():Promise<void>{
  const loader=new GLTFLoader(),templates=new Map<string,T.Group>();
  await Promise.all(NAMES.map(async name=>templates.set(name,(await loader.loadAsync(`${import.meta.env.BASE_URL}assets/pacific-${name}.glb`)).scene)));
  const make=(kind:Kind,s:number,off:number,seed:number,scale=1,moment=new LifeEncounter(seed)):Actor=>{
   const root=new T.LOD(),model=templates.get(kind)!.clone(true),joints=new Map<string,Joint>();root.name=`${kind}-${seed}`;root.addLevel(model,0);root.addLevel(new T.Group(),kind==='gull'||kind==='kite'?600:190);root.scale.setScalar(scale);
   model.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=kind!=='gull'&&kind!=='kite';o.receiveShadow=true;}
    if(['Head','Tail','ArmL','ArmR','ForearmL','ForearmR','LegFrontL','LegFrontR','LegBackL','LegBackR','WingL','WingR','WheelFront','WheelBack','Crank','KneeL','KneeR'].includes(o.name))joints.set(o.name,{node:o,rest:o.rotation.clone()});
   });
   // Each visitor wears a coordinated color; geometry stays shared.
   if(kind==='visitor'||kind==='cyclist'){
    const colors=[0x336f74,0xa94f32,0xd0b875,0x718469],copies=new Map<T.Material,T.Material>();
    model.traverse(o=>{if(o instanceof T.Mesh){const tint=(m:T.Material)=>{if(!m.name.startsWith('Visitor coastal linen'))return m;let c=copies.get(m);if(!c){c=m.clone();(c as T.MeshStandardMaterial).color.setHex(colors[seed%4]);copies.set(m,c);}return c;};o.material=Array.isArray(o.material)?o.material.map(tint):tint(o.material);}});
   }
   root.position.set(roadX(s)+off,this.height(off,s),-s);
   if(kind==='dog'){
    const coats=[0xa97c40,0x785039,0xc3b18e,0x454a45],collars=[0x246f78,0xaa493c,0x407468,0xba9b43],style=Math.floor(seed/2)%4,copies=new Map<T.Material,T.Material>();
    model.traverse(o=>{if(o instanceof T.Mesh){const tint=(m:T.Material)=>{
      if(!m.name.startsWith('Golden retriever coat')&&!m.name.startsWith('Retriever ocean collar'))return m;
      let c=copies.get(m);if(!c){c=m.clone();(c as T.MeshStandardMaterial).color.setHex(m.name.startsWith('Golden')?coats[style]:collars[style]);copies.set(m,c);}return c;
    };o.material=Array.isArray(o.material)?o.material.map(tint):tint(o.material);}});
   }
   const a:Actor={kind,id:root.name,root,model,s,off,yaw:roadHeading(s)+(kind==='gull'?0:Math.PI/2),seed,moment,joints,attention:0,walkClock:0};this.actors.push(a);this.group.add(root);return a;
  };
  for(const site of ROADSIDE_SITES){
   const {s,index}=site,moment=new LifeEncounter(index+1);
   if(site.kind==='station'){
    const dog=make('dog',s-13,14.2,index+1,1.10,moment);
    const ball=new T.Mesh(new T.SphereGeometry(.075,12,8),this.ballMaterial);ball.name='Retriever tennis ball';dog.ball=ball;this.group.add(ball);
    const hostPoint=new T.Vector3(6.2,0,9.8).applyAxisAngle(T.Object3D.DEFAULT_UP,-Math.PI/2+roadHeading(s)).add(new T.Vector3(roadX(s)+28,0,-s));
    const hostS=-hostPoint.z,host=make('visitor',hostS,hostPoint.x-roadX(hostS),index+11,1,moment);host.floor=this.height(28,s)+.17;
    const bowl=new T.LOD(),body=new T.Mesh(new T.CylinderGeometry(.22,.18,.11,16),this.steel),water=new T.Mesh(new T.CircleGeometry(.17,16),this.blue);body.position.y=.055;water.rotation.x=-Math.PI/2;water.position.y=.093;const parts=new T.Group();parts.add(body,water);bowl.addLevel(parts,0);bowl.addLevel(new T.Group(),140);bowl.position.set(roadX(s-10)+15.3,this.height(15.3,s-10)+.03,-s+10);this.group.add(bowl);
   }else{
    const person=make('visitor',s-14,15.2,index+20,1,moment);person.role='photographer';this.cameraProp(person);
   }
  }
  // Distinct moments through all three regions, with slightly different timing.
  for(const [flock,s]of [160,800,1500,4070,4970,5730].entries()){
   const moment=new LifeEncounter(flock+40);for(let j=0;j<3;j++)make('gull',s+j*5,-12.5,flock*3+j+40,1.30,moment);
  }
  for(const [i,s]of [2180,2980,3490].entries()){
   const moment=new LifeEncounter(i+60);
   for(let j=0;j<2;j++){const deer=make('deer',s+j*7,15.5+j*3,i*2+j+60,j?.72:1,moment);if(j)deer.model.getObjectByName('Antlers')!.visible=false;}
  }
  for(const [i,s]of [990,1360,2390,3280,4700].entries())make('cyclist',s,11.15,i+70,1);
  for(const [i,s]of OVERLOOK_SITES.entries()){
   const visitor=make('visitor',s-1,-14.5,i+80,1);visitor.role=i%2?'photographer':'kite';if(visitor.role==='photographer')this.cameraProp(visitor);
   const picnic=new T.LOD();picnic.addLevel(templates.get('picnic')!.clone(true),0);picnic.addLevel(new T.Group(),170);picnic.position.set(-2,.90,-.01).applyAxisAngle(T.Object3D.DEFAULT_UP,roadHeading(s)+Math.PI/2).add(new T.Vector3(roadX(s)-14.5,-.02,-s));picnic.rotation.y=roadHeading(s)+Math.PI/2;this.group.add(picnic);
   const kite=make('kite',s+9,-35,i+90,1.7,visitor.moment);this.makeKite(kite,visitor);
  }
  this.update(0,new T.Vector3(roadX(12)+3,1,-12),false);
 }
 private cameraProp(a:Actor):void{
  const hand=a.joints.get('ForearmR')?.node;if(!hand)return;
  const body=new T.Mesh(new T.BoxGeometry(.15,.08,.065),new T.MeshStandardMaterial({color:0x29312f,roughness:.55}));body.position.set(0,-.22,-.065);hand.add(body);
  const lens=new T.Mesh(new T.CylinderGeometry(.033,.036,.08,12),this.steel);lens.rotation.x=Math.PI/2;lens.position.z=-.064;body.add(lens);
  const flash=new T.Mesh(new T.PlaneGeometry(.052,.033),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.90}));flash.position.set(.044,.027,-.045);flash.rotation.y=Math.PI;body.add(flash);a.flash=flash;
 }
 private makeKite(actor:Actor,person:Actor):void{
  const string=new T.Line(new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(new Float32Array(6),3)),new T.LineBasicMaterial({color:0xc6c1a3,transparent:true,opacity:.62}));this.group.add(string);
  const positions=new Float32Array(32*2*3),colors=new Float32Array(positions.length),indices:number[]=[],color=new T.Color();
  for(let j=0;j<32;j++){
   color.setHex([0xdd683f,0xdbb35f,0x4caaa6,0xe4d5b2][Math.floor(j/4)%4]);for(let side=0;side<2;side++)color.toArray(colors,(j*2+side)*3);
   if(j<31){const n=j*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.setIndex(indices);
  const tail=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:.92,side:T.DoubleSide}));tail.frustumCulled=false;this.group.add(tail);this.kites.push({actor,person,string,tail,positions});
 }
 private rotate(a:Actor,name:string,axis:'x'|'y'|'z',angle:number):void{const joint=a.joints.get(name);if(joint)joint.node.rotation[axis]=joint.rest[axis]+angle;}
 /** Two-link leg solve keeps the rider's shoes with the rotating pedals. */
 private pedalLeg(a:Actor,side:string,phase:number):void{
  const hip=a.joints.get('LegFront'+side)?.node,knee=a.joints.get('Knee'+side)?.node;if(!hip||!knee)return;
  const h=hip.position,sign=side==='L'?-1:1,footY=.49+Math.cos(phase)*.16,footZ=.01+Math.sin(phase)*.16;
  const dy=footY-h.y,dz=footZ-h.z,d=Math.hypot(dy,dz),upper=knee.position.length(),lower=Math.hypot(.33,.27);
  const along=(upper*upper-lower*lower+d*d)/(2*d),bend=Math.sqrt(Math.max(0,upper*upper-along*along));
  this.boneB.set(sign*.14-h.x,dy/d*along-dz/d*bend,dz/d*along+dy/d*bend);
  this.boneA.copy(knee.position).normalize();hip.quaternion.setFromUnitVectors(this.boneA,this.boneB.normalize());
  this.boneB.copy(knee.position).applyQuaternion(hip.quaternion).add(h);
  this.boneC.set(sign*.14,footY,footZ).sub(this.boneB).applyQuaternion(this.boneQ.copy(hip.quaternion).invert()).normalize();
  this.boneA.set(0,-.33,.27).normalize();knee.quaternion.setFromUnitVectors(this.boneA,this.boneC);
 }
 update(time:number,observer?:T.Vector3,active=false):void{
  const dt=Math.max(0,Math.min(.1,time-this.time));this.time=time;if(observer)this.view.copy(observer);const focus=this.view;
  for(const a of this.actors){
   const distance=Math.hypot(a.root.position.x-focus.x,a.root.position.z-focus.z);a.attention=a.moment.update(time,distance,active);
   a.root.visible=distance<(a.kind==='gull'||a.kind==='kite'?600:300);if(!a.root.visible){if(a.ball)a.ball.visible=false;if(a.flash)a.flash.visible=false;continue;}
   const phase=time+a.seed*1.37,cycle=a.moment.cycle(time),attention=a.attention;
   let s=a.s,off=a.off,yaw=a.yaw,y:number;
   for(const joint of a.joints.values())joint.node.rotation.copy(joint.rest);
   if(a.kind==='dog'){
    a.walkClock+=dt*(1-attention);const roam=a.walkClock+a.seed*1.37,walkCycle=a.moment.cycle(a.walkClock);
    const walk=T.MathUtils.smoothstep(walkCycle,7,8)*(1-T.MathUtils.smoothstep(walkCycle,16,17));
    off+=Math.sin(roam*.50)*1.5*walk;s+=Math.cos(roam*.50)*2.0*walk;
    const facing=Math.atan2(-Math.cos(roam*.50)*.75,-Math.sin(roam*.50));yaw+=wrap(facing-yaw)*walk;
    for(const [j,name]of ['LegFrontL','LegBackR','LegFrontR','LegBackL'].entries())this.rotate(a,name,'x',Math.sin(roam*5+(j<2?0:Math.PI))*.30*walk*(1-attention));
    this.rotate(a,'Head','x',cycle<7&&!attention ? -.36-.08*Math.sin(phase*2) : .02);
    this.rotate(a,'Tail','y',Math.sin(phase*(attention?10:4))*(attention ? .65 : .20));
   }else if(a.kind==='deer'){
    off+=(1-attention)*Math.sin(phase*.23)*.45+attention*.8;s+=Math.sin(phase*.15)*.7;
    this.rotate(a,'Head','x',-(1-attention)*(.45+.15*Math.sin(phase*.5)));
    this.rotate(a,'Tail','y',Math.sin(phase*4)*.13);
   }else if(a.kind==='cyclist'){
    const q=phase*.022,velocity=Math.cos(q);s+=Math.sin(q)*85;yaw=roadHeading(s)+Math.PI*(.5-.5*Math.tanh(velocity*8));
    for(const name of ['WheelFront','WheelBack'])this.rotate(a,name,'x',phase*5);
    this.rotate(a,'Crank','x',phase*4);
    for(const side of ['L','R'])this.pedalLeg(a,side,phase*4+(side==='L'?0:Math.PI));
   }else if(a.kind==='gull'){
    const q=phase*.18,swoop=attention*Math.sin((1-attention)*Math.PI);s+=Math.cos(q)*16;off=-19+Math.sin(q)*10+swoop*23;
    yaw=Math.atan2(-Math.cos(q)*10,-Math.sin(q)*16);y=7.5+Math.sin(phase*.24)*2+attention*5+(a.seed%3)*1.1;
    this.rotate(a,'WingL','z',Math.sin(phase*(attention?7:4.8))*.40+.08);this.rotate(a,'WingR','z',-Math.sin(phase*(attention?7:4.8))*.40-.08);
    a.root.position.set(roadX(s)+off,y,-s);a.root.rotation.set(Math.sin(q)*.05,yaw,Math.cos(q)*.16);continue;
   }else if(a.kind==='kite'){
    off+=Math.sin(phase*.31)*6;s+=Math.cos(phase*.21)*5;y=17+Math.sin(phase*.47)*2.2;
    a.root.position.set(roadX(s)+off,y,-s);a.root.rotation.set(.20+Math.sin(phase*.3)*.10,-1.3+Math.sin(phase*.27)*.36,Math.sin(phase*.55)*.18);continue;
   }else{
    const wave=attention>0||cycle>20;
    this.rotate(a,'ArmL','x',a.role==='kite'?.75:Math.sin(phase*.6)*.025);
    if(a.role==='kite')this.rotate(a,'ForearmL','x',.45);
    if(a.role==='photographer'&&!attention){this.rotate(a,'ArmR','x',1.12);this.rotate(a,'ForearmR','x',1.08);}
    else if(wave){this.rotate(a,'ArmR','z',2.30);this.rotate(a,'ArmR','x',.15);this.rotate(a,'ForearmR','x',-.4);this.rotate(a,'ForearmR','z',Math.sin(phase*5)*.25);}
    if(a.flash)a.flash.visible=!attention&&cycle>11&&cycle<11.12;
   }
   y=a.floor??this.height(off,s)+.015;
   if(a.kind==='visitor'&&a.off<0)y=.24;
   a.root.position.set(roadX(s)+off,y,-s);
   if(attention&&a.kind!=='cyclist'){
    const target=Math.atan2(focus.x-a.root.position.x,focus.z-a.root.position.z)+Math.PI;
    const turn=wrap(target-yaw);this.rotate(a,'Head','y',T.MathUtils.clamp(turn,-.65,.65)*attention);yaw+=turn*attention*.35;
   }
   a.root.rotation.set(0,yaw,0);
   if(a.kind==='dog'||a.kind==='deer'){
    const forwardX=-Math.sin(yaw)*.4,forwardS=Math.cos(yaw)*.4;
    const slope=(this.height(off+forwardX,s+forwardS)-this.height(off-forwardX,s-forwardS))/.8;
    a.root.rotation.x=Math.atan(slope);
   }
   if(a.ball){a.ball.visible=a.root.visible;const throwPhase=Math.max(0,Math.min(1,(cycle-7)/10));a.ball.position.set(roadX(a.s)+a.off+Math.sin(throwPhase*Math.PI)*2.2,this.height(a.off,a.s-1)+.10,-a.s+1);}
  }
  for(const rig of this.kites){
   const {actor,person,string,tail,positions}=rig;string.visible=tail.visible=actor.root.visible;if(!actor.root.visible)continue;
   const p=actor.root.position,hand=person.root.position;
   const line=string.geometry.attributes.position as T.BufferAttribute;line.setXYZ(0,hand.x,hand.y+1.03,hand.z);line.setXYZ(1,p.x,p.y,p.z);line.needsUpdate=true;
   for(let j=0;j<32;j++)for(let side=0;side<2;side++){
    const n=(j*2+side)*3,k=j/31;positions[n]=p.x+Math.sin(time*2-k*8+actor.seed)*k*1.5+(side?1:-1)*.13;positions[n+1]=p.y-1.15-k*7.5;positions[n+2]=p.z+Math.sin(time*1.4-k*10)*k*.85;
   }
   tail.geometry.attributes.position.needsUpdate=true;tail.geometry.computeVertexNormals();
  }
 }
 honk(focus:T.Vector3):number{
  const moments=new Set<LifeEncounter>();let reactions=0;
  for(const a of this.actors){if(a.kind==='kite'||moments.has(a.moment))continue;moments.add(a.moment);if(a.moment.horn(this.time,Math.hypot(a.root.position.x-focus.x,a.root.position.z-focus.z)))reactions++;}
  return reactions;
 }
 inspect(){return this.actors.map(a=>({id:a.id,kind:a.kind,anchor:a.s,offset:a.off,position:a.root.position.toArray(),attention:a.attention,visible:a.root.visible,joints:[...a.joints.keys()]}));}
}
