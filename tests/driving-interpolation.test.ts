import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {Physics} from '../src/core/Physics';
import {Vehicle} from '../src/entities/Vehicle';
import {Traffic} from '../src/systems/Traffic';
import { roadHeading, roadX } from '../src/world/route';
import {updatePassEncounter,type PassEncounter} from '../src/systems/trafficMath';
const empty=():PassEncounter=>({close:false,contact:false,rewarded:false});
describe('completed close passes',()=>{
  it('rewards once only after a clean pass clears the other car',()=>{
    const state=empty();expect(updatePassEncounter(state,2,2.4,false,30)).toBe(false);
    expect(updatePassEncounter(state,-3,2.4,false,30)).toBe(false);
    expect(updatePassEncounter(state,-8,2.4,false,30)).toBe(true);
    expect(updatePassEncounter(state,-12,2.4,false,30)).toBe(false);
  });
  it('rejects approach-then-contact and contact-then-slide at every overlap distance',()=>{
    for(const along of [0,4.1,5]){
      const state=empty();updatePassEncounter(state,2,2.4,false,30);
      updatePassEncounter(state,along,1.5,true,30);
      expect(updatePassEncounter(state,-8,2.4,false,30)).toBe(false);
      expect(state.contact).toBe(true);
    }
  });
  it('does not award low-speed or abandoned approaches',()=>{
    const slow=empty();updatePassEncounter(slow,0,2.4,false,10);expect(updatePassEncounter(slow,-9,2.4,false,10)).toBe(false);
    const abandoned=empty();updatePassEncounter(abandoned,0,2.4,false,30);updatePassEncounter(abandoned,15,2.4,false,30);expect(updatePassEncounter(abandoned,-9,2.4,false,30)).toBe(false);
  });
});
it('interpolates car and traffic without mutating physics, and snaps after teleport',async()=>{
  const physics=new Physics();await physics.init();
  try{
    physics.world.createCollider(physics.RAPIER.ColliderDesc.cuboid(1000,.5,3500).setTranslation(0,-.5,-3000));
    const scene=new T.Scene(),car=new Vehicle(physics,scene),traffic=new Traffic(physics,scene);
    const input={throttle:1,brake:0,steer:.2,handbrake:false,reset:false,pause:false},dt=1/60;
    for(let i=0;i<180;i++){car.fixedUpdate(dt,input);physics.step(dt);}
    const before=car.getPosition(new T.Vector3()).clone();car.fixedUpdate(dt,input);physics.step(dt);const after=car.getPosition(new T.Vector3()).clone();
    expect(before.distanceTo(after)).toBeGreaterThan(.1);
    for(const alpha of [0,.25,.5,.75,1]){
      car.syncMesh(alpha);expect(car.mesh.position.distanceTo(before.clone().lerp(after,alpha))).toBeLessThan(1e-6);
      expect(car.getPosition(new T.Vector3()).distanceTo(after)).toBeLessThan(1e-6);
    }
    const spawn=new T.Vector3(10,car.spawnHeight,-500);car.respawn(spawn,new T.Quaternion());car.syncMesh(0);expect(car.mesh.position.distanceTo(spawn)).toBeLessThan(1e-6);
    traffic.reset(0);const trafficMesh=scene.children.find(o=>o!==car.mesh)!;const previous=trafficMesh.position.clone();
    traffic.update(dt,new T.Vector3(0,.7,0),0);const current=trafficMesh.position.clone(),s=traffic.snapshot()[0].s;
    traffic.syncMeshes(.5);expect(trafficMesh.position.distanceTo(previous.lerp(current,.5))).toBeLessThan(1e-6);expect(traffic.snapshot()[0].s).toBe(s);
    traffic.reset(3000);const reset=trafficMesh.position.clone();traffic.syncMeshes(0);expect(trafficMesh.position.distanceTo(reset)).toBeLessThan(1e-6);
  }finally{physics.dispose();}
},20000);
it('keeps oncoming traffic facing its travel direction across interpolated frames',async()=>{
  const physics=new Physics();await physics.init();
  try {
    const scene=new T.Scene(),traffic=new Traffic(physics,scene);traffic.reset(100);
    for(let frame=0;frame<90;frame++){
      traffic.update(1/60,new T.Vector3(roadX(100),.7,-100),20);
      const states=traffic.snapshot();
      for(const alpha of [0,.35,.8,1]){
        traffic.syncMeshes(alpha);
        states.forEach((d,i)=>{
          const yaw=roadHeading(d.s)+(d.cruise<0?Math.PI:0);
          const expected=new T.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
          const facing=new T.Vector3(0,0,-1).applyQuaternion(scene.children[i].quaternion);
          expect(facing.dot(expected)).toBeGreaterThan(.999);
        });
      }
    }
  }finally{physics.dispose();}
},20000);
