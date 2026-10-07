import * as T from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { Physics } from '../core/Physics';
import { createCar } from '../entities/CarModel';
import { TRAFFIC_KINDS,TRAFFIC_SIZE,loadTrafficModels,trafficModel,type TrafficKind } from '../entities/TrafficModels';
import { trafficPaint } from '../entities/VehiclePaints';
import { roadX, roadHeading, roadOffset } from '../world/route';
import { advanceTraffic, overlapCars, updatePassEncounter, type PassEncounter } from './trafficMath';
interface Driver { kind:TrafficKind;color:number;halfWidth:number;halfLength:number; mesh:T.Group; body:RAPIER.RigidBody; s:number; lane:number; speed:number; cruise:number; encounter:PassEncounter; previousPosition:T.Vector3; currentPosition:T.Vector3; previousRotation:T.Quaternion; currentRotation:T.Quaternion; }
export class Traffic {
  private drivers:Driver[]=[];
  constructor(physics:Physics,scene:T.Scene) {
    for(let i=0;i<18;i++){
      const kind=TRAFFIC_KINDS[i%TRAFFIC_KINDS.length],size=TRAFFIC_SIZE[kind];
      const color=trafficPaint(i);
      const mesh=createCar(color);mesh.name=`Traffic ${kind}`;scene.add(mesh);
      const body=physics.world.createRigidBody(physics.RAPIER.RigidBodyDesc.kinematicPositionBased());
      physics.world.createCollider(physics.RAPIER.ColliderDesc.cuboid(size.width,size.height,size.length).setTranslation(0,size.height-.68,0).setFriction(.2).setRestitution(.25),body);
      const cruise=i%3===0?-17:15+i%6;
      this.drivers.push({kind,color,halfWidth:size.width,halfLength:size.length,mesh,body,s:90+i*97,lane:i%3===0?-3.2:3.2,speed:cruise,cruise,encounter:{close:false,contact:false,rewarded:false},previousPosition:new T.Vector3(),currentPosition:new T.Vector3(),previousRotation:new T.Quaternion(),currentRotation:new T.Quaternion()});
    }
  }
  async loadModels():Promise<void>{
    const models=await loadTrafficModels();
    for(const d of this.drivers){
      // Keep the interpolated transform on its existing root; replace only geometry.
      d.mesh.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});
      d.mesh.clear();d.mesh.add(trafficModel(models[TRAFFIC_KINDS.indexOf(d.kind)],d.color));
    }
  }
  snapshot(){return this.drivers.map(({s,lane,speed,cruise})=>({s,lane,speed,cruise}));}
  reset(s:number) {this.drivers.forEach((d,i)=>{d.s=s+100+i*85;d.speed=d.cruise;d.encounter={close:false,contact:false,rewarded:false};d.mesh.visible=i<5;this.place(d,true);});}
  update(dt:number,player:T.Vector3,speed:number,playerYaw=roadHeading(-player.z)):{near:number;hit:boolean} {
    let near=0,hit=false;
    const next=advanceTraffic(this.drivers,dt,{s:-player.z,lane:roadOffset(player.x,player.z),speed:speed*Math.cos(playerYaw-roadHeading(-player.z))});
    for(let i=0;i<this.drivers.length;i++){
      const d=this.drivers[i];d.s=next[i].s;d.speed=next[i].speed;
      d.mesh.visible=Math.abs(d.s+player.z)<420;
      if(d.s < -player.z-110 || d.s > -player.z+1750){
        let spawn=-player.z+1100+i*35;
        while(this.drivers.some((other,j)=>i!==j&&other.lane===d.lane&&Math.abs(other.s-spawn)<20))spawn+=25;
        d.s=spawn;d.speed=d.cruise;d.encounter={close:false,contact:false,rewarded:false};this.place(d,true);
      }else this.place(d,false);
      const yaw=roadHeading(d.s)+(d.cruise<0?Math.PI:0);
      const dx=d.mesh.position.x-player.x,dz=d.mesh.position.z-player.z;
      const along=-dx*Math.sin(playerYaw)-dz*Math.cos(playerYaw);
      const side=Math.abs(dx*Math.cos(playerYaw)-dz*Math.sin(playerYaw));
      const overlap=Math.abs(player.y-.7)<1.1&&overlapCars(
        {x:player.x,z:player.z,yaw:playerYaw,halfWidth:.9,halfLength:2},
        {x:d.mesh.position.x,z:d.mesh.position.z,yaw,halfWidth:d.halfWidth,halfLength:d.halfLength});
      hit ||= overlap;
      if(updatePassEncounter(d.encounter,along,side,overlap,speed,Math.abs(player.y-.7)<1.1))near++;

    }
    return {near,hit};
  }
  syncMeshes(alpha=1){
    const blend=Math.max(0,Math.min(1,alpha));
    for(const d of this.drivers){d.mesh.position.lerpVectors(d.previousPosition,d.currentPosition,blend);d.mesh.quaternion.copy(d.previousRotation).slerp(d.currentRotation,blend);}
  }
  private place(d:Driver,teleport:boolean) {
    d.previousPosition.copy(d.currentPosition);d.previousRotation.copy(d.currentRotation);
    const yaw=roadHeading(d.s)+(d.cruise<0?Math.PI:0);d.mesh.position.set(roadX(d.s)+d.lane,.7,-d.s);d.mesh.quaternion.setFromAxisAngle(T.Object3D.DEFAULT_UP,yaw);
    d.currentPosition.copy(d.mesh.position);d.currentRotation.copy(d.mesh.quaternion);
    if(teleport){d.previousPosition.copy(d.currentPosition);d.previousRotation.copy(d.currentRotation);d.body.setTranslation(d.mesh.position,true);d.body.setRotation(d.mesh.quaternion,true);}else{d.body.setNextKinematicTranslation(d.mesh.position);d.body.setNextKinematicRotation(d.mesh.quaternion);}
  }
}
