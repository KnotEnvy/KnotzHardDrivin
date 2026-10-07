import * as T from 'three';
import { AdaptiveResolution, graphicsQuality, graphicsProfile, renderPixelRatio, type GraphicsQuality } from '../core/graphicsQuality';
import { setDistanceDetail } from '../world/distanceDetail';
import { LIGHTING } from '../config/lighting.config';
import { Renderer } from '../core/Renderer';
import { Physics } from '../core/Physics';
import { Input, type InputState } from '../core/Input';
import { PostFX } from '../core/PostFX';
import { Vehicle } from '../entities/Vehicle';
import { GameLoop } from './GameLoop';
import { Coast } from '../world/Coast';
import { roadX, roadHeading, roadOffset } from '../world/route';
import { Journey, type Mode } from '../systems/Journey';
import { Sound } from '../systems/Sound';
import { Traffic } from '../systems/Traffic';
import { Ghost } from '../systems/Ghost';
import { Effects } from '../systems/Effects';
import { contactShadow } from '../world/contactShadow';
import { Experience } from '../ui/Experience';

export class App {
  private readonly renderer: Renderer;
  private readonly physics = new Physics();
  private readonly input = new Input();
  private readonly journey = new Journey();
  private readonly sound = new Sound();
  private readonly loop: GameLoop;
  private readonly ui: Experience;
  private vehicle!: Vehicle;
  private coast!: Coast;
  private traffic!: Traffic;
  private effects!: Effects;
  private ghost!: Ghost;
  private postfx?: PostFX;
  private position=new T.Vector3();
  private forward=new T.Vector3();
  private desired=new T.Vector3();
  private look=new T.Vector3();
  private rotation=new T.Quaternion();
  private boost=100;
  private cruise=false;
  private cruiseHeld=false;
  private shadow!:T.Mesh;
  private cameraMode=0;
  private cameraSnap=true;
  private time=0;
  private frameDelta=1/60;
  private lastFrame=performance.now();
  private pauseHeld=false;
  private resetHeld=false;
  private cameraHeld=false;
  private hornHeld=false;
  private lastHorn=-Infinity;
  private collisionCooldown=0;
  private previousSpeed=0;
  private quality:GraphicsQuality='balanced';
  private readonly adaptiveResolution=new AdaptiveResolution();
  private lastUiUpdate=-Infinity;
  private running=false;
  private readonly onResize=()=>this.resizeGraphics();
  private readonly onVisibility=()=>{
    if(document.hidden){
      if(this.journey.phase==='driving'||this.journey.phase==='countdown'){this.journey.pause();this.input.clear();this.sound.update(0,0,false,false);}
      this.loop.stop();this.wasDriving=false;this.adaptiveResolution.resetSampling();
    }else if(this.running){this.lastFrame=performance.now();this.loop.start();}
  };
  private frameTimes:number[]=[];
  private wasDriving=false;
  private checkpointPulse=0;
  private isBoosting=false;
  private neutral:InputState={ throttle:0,brake:0,steer:0,handbrake:true,reset:false,pause:false };

  constructor(canvas:HTMLCanvasElement) {
    this.renderer=new Renderer(canvas,renderPixelRatio(window.innerWidth,window.innerHeight,window.devicePixelRatio,graphicsQuality(this.journey.save.quality)));
    this.loop=new GameLoop({fixedStep:1/60,update:dt=>this.update(dt),render:alpha=>this.render(alpha)});
    this.ui=new Experience(this.journey,{start:(s,m)=>this.startJourney(s,m),continueRun:()=>this.continueJourney(),resume:()=>this.resume(),menu:()=>this.menu(),reset:()=>this.recover(),camera:()=>this.cameraMode=1-this.cameraMode,cruise:()=>this.toggleCruise(),paint:c=>this.vehicle?.setPaint(c),quality:q=>this.setQuality(q),key:(k,p)=>this.input.setKey(k,p)});
    window.addEventListener('blur',()=>{if(this.journey.phase==='driving'||this.journey.phase==='countdown'){this.journey.pause();this.sound.update(0,0,false,false);}});
    document.addEventListener('visibilitychange',this.onVisibility);
  }
  async start() {
    await this.physics.init();
    this.coast=new Coast(this.physics,this.renderer.scene);
    this.shadow=contactShadow();this.renderer.scene.add(this.shadow);this.vehicle=new Vehicle(this.physics,this.renderer.scene);
    this.traffic=new Traffic(this.physics,this.renderer.scene);this.effects=new Effects(this.renderer.scene);this.ghost=new Ghost(this.renderer.scene);
    // ImageBitmapLoader caches in-flight requests too: each shared image is fetched/decoded once.
    const wasCaching=T.Cache.enabled;T.Cache.enabled=true;
    try{await Promise.all([this.coast.loadLandmarks(),this.vehicle.loadCoachwork(),this.traffic.loadModels()]);}
    finally{if(!wasCaching){T.Cache.clear();T.Cache.enabled=false;}}
    this.vehicle.setPaint(this.journey.save.color);

    this.renderer.addResizeListener(()=>this.postfx?.resize());
    window.addEventListener('resize',this.onResize);this.setQuality(this.journey.save.quality);
    this.spawn(12);this.traffic.reset(0);
    for(let i=0;i<100;i++){this.vehicle.fixedUpdate(1/60,{...this.neutral,brake:0});this.physics.step(1/60);}
    this.vehicle.getPosition(this.position);this.renderer.bakeReflection(this.position,[this.vehicle.mesh,this.shadow]);
    this.input.attach();this.running=true;if(!document.hidden)this.loop.start();document.getElementById('boot')?.classList.add('is-hidden');
  }
  stop(){this.running=false;window.removeEventListener('resize',this.onResize);document.removeEventListener('visibilitychange',this.onVisibility);this.journey.pause();this.loop.stop();this.input.detach();this.postfx?.dispose();this.coast?.ocean.dispose();this.physics.dispose();this.renderer.dispose();}
  private setQuality(value:string){
    const q=graphicsQuality(value);
    if(this.quality!==q){this.frameTimes=[];this.wasDriving=false;this.ui.performanceSummary='Drive for a few seconds to measure frame pacing.';}
    this.quality=q;this.adaptiveResolution.reset();this.coast?.ocean.setQuality(q);
    setDistanceDetail(this.renderer.scene,q==='performance'?.7:1);
    const profile=graphicsProfile(q),shadow=this.renderer.sun.shadow;
    if(shadow.mapSize.x!==profile.shadowSize){
      shadow.mapSize.set(profile.shadowSize,profile.shadowSize);
      shadow.map?.dispose();shadow.map=null;shadow.needsUpdate=true;
    }
    this.resizeGraphics();
    if(!profile.postFX){this.postfx?.dispose();this.postfx=undefined;}
    else{
      this.postfx??=new PostFX(this.renderer.gl,this.renderer.scene,this.renderer.camera,{bloomStrength:LIGHTING.bloom.strength,bloomThreshold:LIGHTING.bloom.threshold,bloomRadius:LIGHTING.bloom.radius});
      this.postfx.resize();
    }
  }
  private resizeGraphics(){
    this.renderer.setPixelRatio(renderPixelRatio(window.innerWidth,window.innerHeight,window.devicePixelRatio,this.quality,this.quality==='auto'?this.adaptiveResolution.scale:1));
  }
  private startJourney(stage:number,mode:Mode){this.journey.start(stage,mode);this.prepareJourney(false);}
  private continueJourney(){if(this.journey.continueRun())this.prepareJourney(true);}
  private prepareJourney(continuing:boolean){
    const j=this.journey;
    this.frameTimes=[];this.ui.performanceSummary="Drive for a few seconds to measure frame pacing.";
    this.ghost.start(j.recordingSlot,!continuing);this.cruise=false;this.boost=continuing?0:100;this.collisionCooldown=0;this.previousSpeed=0;this.input.clear();
    document.getElementById('game')?.focus();this.spawn(j.recoveryPosition);this.traffic.reset(j.recoveryPosition);
    this.effects.clear();this.checkpointPulse=0;this.isBoosting=false;this.coast.setGates(j.stage,j.mode!=='free',j.mode==='expedition');this.sound.volume=j.save.volume;
    void this.sound.start().catch(()=>this.ui.notice('Audio unavailable. You can still drive.'));
    this.ui.notice(continuing?'Drive continued from your checkpoint. +3 seconds.':j.mode!=='free'?(this.ghost.hasBest?'Chase your best run. The cyan car is your ghost.':'Pass every checkpoint. Finish to record your pace ghost.'):'No timer. Explore the coast at your own pace.');
  }
  private toggleCruise(){if(this.journey.phase!=='driving')return;this.cruise=!this.cruise;this.ui.notice(this.cruise?'Cruise on · You steer. Brake to disengage.':'Cruise off');}
  private resume(){this.journey.phase=this.journey.countdown>0?'countdown':'driving';this.input.clear();}
  private menu(){this.journey.phase='menu';this.isBoosting=false;this.vehicle.setLights(false,false);document.body.classList.remove('boosting');this.ghost.hide();this.input.clear();this.spawn(12);this.cameraMode=0;this.vehicle.setPaint(this.journey.save.color);}
  private spawn(s:number){this.position.set(roadX(s)+3.1,this.vehicle.spawnHeight,-s);this.rotation.setFromAxisAngle(T.Object3D.DEFAULT_UP,roadHeading(s));this.vehicle.respawn(this.position,this.rotation);this.cameraSnap=true;}
  private recover(){if(this.journey.phase!=='driving')return;const st=this.journey.route;const s=this.journey.mode==='free'?Math.max(5,Math.min(6000,-this.position.z)):st.start+this.journey.checkpoint*(st.end-st.start)/this.journey.gateCount+5;this.cruise=false;this.spawn(s);this.previousSpeed=0;this.collisionCooldown=2;this.journey.elapsed+=3;this.ui.notice('Back on the road · +3 seconds');}
  private update(dt:number){
    this.ui.updateMenuInput();
    this.input.update();const input=this.input.state;
    if(this.input.gamepadDisconnected&&(this.journey.phase==='driving'||this.journey.phase==='countdown')){
      this.cruise=false;this.journey.pause();this.input.clear();
      this.ui.notice('Controller disconnected. Reconnect or resume with the keyboard.');
    }
    if(input.pause&&!this.pauseHeld){if(this.journey.phase==='paused')this.resume();else if(this.journey.phase==='driving'||this.journey.phase==='countdown')this.journey.pause();}this.pauseHeld=input.pause;
    const c=Boolean(input.camera);if(c&&!this.cameraHeld)this.cameraMode=1-this.cameraMode;this.cameraHeld=c;
    if(input.reset&&!this.resetHeld)this.recover();this.resetHeld=input.reset;
    const cruiseKey=Boolean(input.cruise);if(cruiseKey&&!this.cruiseHeld)this.toggleCruise();this.cruiseHeld=cruiseKey;
    const phase=this.journey.phase;
    if(phase==='menu'||phase==='paused'||phase==='results')return;
    this.time+=dt;this.checkpointPulse=Math.max(0,this.checkpointPulse-dt*1.4);this.vehicle.getPosition(this.position);
    const active=phase==='driving';
    const horn=Boolean(input.horn);
    if(active&&horn&&!this.hornHeld&&this.time-this.lastHorn>1.2){this.lastHorn=this.time;this.sound.horn();this.coast.life.honk(this.position);}
    this.hornHeld=horn;
    if(input.brake>0||input.handbrake)this.cruise=false;
    if(active&&this.cruise)input.throttle=Math.max(input.throttle,Math.max(0,Math.min(1,(32-this.vehicle.forwardSpeed)*.5)));
    const drive=active?input:this.neutral;
    const boosting=active&&input.boost&&this.boost>1&&input.throttle>0;
    this.isBoosting=Boolean(boosting);this.vehicle.setLights(input.brake>0,this.isBoosting);
    if(boosting){drive.throttle*=1.65;this.boost=Math.max(0,this.boost-dt*24);}else this.boost=Math.min(100,this.boost+dt*8);
    this.vehicle.fixedUpdate(dt,drive);
    this.vehicle.getFlatForward(this.forward);
    const traffic=this.traffic.update(dt,this.position,this.vehicle.forwardSpeed,Math.atan2(-this.forward.x,-this.forward.z));
    this.physics.step(dt);this.vehicle.getPosition(this.position);
    if(active&&this.journey.mode!=='free'){this.vehicle.getFlatForward(this.forward);this.ghost.record(this.journey.elapsed+dt,this.position,this.forward);}
    const before=this.journey.checkpoint;const beforePhase=this.journey.phase;this.journey.update(dt,-this.position.z,roadOffset(this.position.x,this.position.z));
    if(this.journey.checkpoint>before){this.checkpointPulse=1;this.sound.cue(880);this.ui.notice(this.journey.checkpoint===this.journey.gateCount?'Destination reached':`Checkpoint ${this.journey.checkpoint} / ${this.journey.gateCount} · Keep it flowing`);}
    if(beforePhase==='countdown'&&this.journey.phase==='driving'){this.sound.cue(880,.4);this.ui.notice('Let’s get out there.');}
    if(this.journey.phase==='results'&&beforePhase!=='results'){this.sound.cue(this.journey.success?1046:220,.6);if(this.journey.success&&!this.ghost.finish(this.journey.elapsed))this.journey.saveFailed=true;}
    this.collisionCooldown-=dt;
    const speed=this.vehicle.speed;
    if(active&&this.collisionCooldown<=0&&(traffic.hit||this.previousSpeed-speed>5)) {this.journey.collisions++;this.collisionCooldown=2;this.effects.impact(this.position);this.ui.notice('Easy on the paint.');this.sound.cue(90,.22);}
    if(traffic.near){this.journey.nearMisses+=traffic.near;this.boost=Math.min(100,this.boost+12);this.ui.notice('Close call · +12 overdrive');this.sound.cue(740,.12);}
    this.previousSpeed=speed;
    if(this.position.y< -2||this.position.y>12||Math.abs(roadOffset(this.position.x,this.position.z))>22){if(active)this.recover();}
    if(this.journey.mode==='free'&&-this.position.z>6050){this.spawn(5);this.previousSpeed=0;this.collisionCooldown=2;this.traffic.reset(0);this.ui.notice('Another lap of the coastline.');}
    if(-this.position.z< -60&&active)this.recover();
    this.vehicle.getFlatForward(this.forward);this.effects.update(dt,this.position,active&&speed>12&&(input.handbrake||Math.abs(roadOffset(this.position.x,this.position.z))>6.2),this.forward,speed,this.isBoosting);
    document.body.classList.toggle('boosting',boosting);
  }
  private render(alpha:number){
    if(document.hidden)return;
    const now=performance.now();
    if ((this.journey.phase==='menu'||this.journey.phase==='paused'||this.journey.phase==='results') && now-this.lastFrame<50) return;
    const driving=this.journey.phase==='driving';
    if(driving&&this.wasDriving){const ms=now-this.lastFrame;this.frameTimes.push(ms);if(this.frameTimes.length>600)this.frameTimes.shift();if(this.quality==='auto'&&this.adaptiveResolution.sample(ms))this.resizeGraphics();}
    else this.adaptiveResolution.resetSampling();
    const previouslyDriving=this.wasDriving;this.wasDriving=driving;
    if(this.journey.phase==='paused'&&previouslyDriving&&this.frameTimes.length>=30){
      const sorted=[...this.frameTimes].sort((a,b)=>a-b);
      const mean=this.frameTimes.reduce((a,b)=>a+b,0)/this.frameTimes.length;
      this.ui.performanceSummary=`${Math.round(1000/mean)} FPS average · ${sorted[Math.floor(sorted.length*.95)].toFixed(1)} ms p95 · last ${this.frameTimes.length} driving frames`;
    }
    this.frameDelta=Math.min(.06,(now-this.lastFrame)/1000);this.lastFrame=now;
    if(!this.vehicle)return;
    const blend=this.journey.phase==='driving'||this.journey.phase==='countdown'?alpha:1;
    this.vehicle.syncMesh(blend);this.traffic.syncMeshes(blend);
    this.position.copy(this.vehicle.mesh.position);this.forward.set(0,0,-1).applyQuaternion(this.vehicle.mesh.quaternion);this.forward.y=0;this.forward.normalize();this.shadow.position.set(this.position.x,.065,this.position.z);this.shadow.rotation.z=-Math.atan2(-this.forward.x,-this.forward.z);
    this.ghost.enabled=this.journey.save.ghost;
    if(this.journey.phase==='driving'&&this.journey.mode!=='free')this.ghost.render(this.journey.elapsed,this.position);else this.ghost.hide();
    const cam=this.renderer.camera;const menu=this.journey.phase==='menu';const speed=this.vehicle.forwardSpeed;
    if(menu){const angle=roadHeading(12);this.desired.set(7.6,3.2,9.8).applyAxisAngle(T.Object3D.DEFAULT_UP,angle).add(this.position);if(cam.aspect<.8)this.desired.sub(this.position).multiplyScalar(1.12).add(this.position);this.look.set(cam.aspect<.8?-1.2:-2.8,cam.aspect<.8?-.3:.35,cam.aspect<.8?0:-2.5).add(this.position);cam.fov=44;}
    else if(this.cameraMode===1){this.desired.copy(this.position).addScaledVector(this.forward,.55);this.desired.y+=.84;this.look.copy(this.position).addScaledVector(this.forward,45);this.look.y+=.1;cam.fov=72;}
    else{this.desired.copy(this.position).addScaledVector(this.forward,-7.9-Math.min(Math.abs(speed)*.014,.8));this.desired.y+=3.0;this.look.copy(this.position).addScaledVector(this.forward,5.0);this.look.y+=.65;const targetFov=58+Math.min(14,Math.abs(speed)*.23)+(this.isBoosting&&driving?3:0);cam.fov+=(targetFov-cam.fov)*(1-Math.exp(-this.frameDelta*3));}
    if(this.cameraSnap||menu||this.cameraMode===1){cam.position.copy(this.desired);this.cameraSnap=false;}else cam.position.lerp(this.desired,1-Math.exp(-this.frameDelta*7));
    cam.lookAt(this.look);cam.updateProjectionMatrix();this.effects.setViewport(this.renderer.gl.domElement.height,cam.fov);this.renderer.updateAtmosphere(this.journey.phase==='paused'?0:this.frameDelta,this.position);this.coast.update(this.renderer.atmosphereTime,this.journey.checkpoint,this.renderer.lightDirection,this.position,driving);
    this.postfx?.setMotion(speed,driving&&this.isBoosting,this.time,this.checkpointPulse);
    if(this.postfx)this.postfx.render();else this.renderer.render();
    this.sound.volume=this.journey.save.volume;this.sound.radio=this.journey.save.radio;this.sound.update(speed,this.input.state.throttle,this.journey.phase==='driving'||this.journey.phase==='countdown',this.input.state.handbrake&&Math.abs(speed)>10);
    if(now-this.lastUiUpdate>=50){this.lastUiUpdate=now;this.ui.update(speed,-this.position.z,this.position.x,this.boost,this.cruise);}
  }
}
