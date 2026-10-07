import { describe, it, expect } from 'vitest';
import * as T from 'three';
import { Physics } from '../src/core/Physics';
import { Vehicle } from '../src/entities/Vehicle';
import { Journey } from '../src/systems/Journey';
import { Traffic } from '../src/systems/Traffic';
import { roadX, roadHeading, roadOffset, STAGES } from '../src/world/route';

const dt=1/60;
const neutral={throttle:0,brake:0,steer:0,handbrake:false,reset:false,pause:false};
describe('Independent judge: physical campaign drive',()=>{
  for(let stage=0;stage<3;stage++)it(`physically completes chapter ${stage+1} without boost or recovery`,async()=>{
    const physics=new Physics();await physics.init();
    try {
      physics.world.createCollider(physics.RAPIER.ColliderDesc.cuboid(2000,.5,3500).setTranslation(0,-.5,-3000));
      const vehicle=new Vehicle(physics,new T.Scene());
      const st=STAGES[stage],s0=st.start+6;
      vehicle.respawn(new T.Vector3(roadX(s0)+3.1,vehicle.spawnHeight,-s0),new T.Quaternion().setFromAxisAngle(T.Object3D.DEFAULT_UP,roadHeading(s0)));
      const journey=new Journey();journey.start(stage,'tour');
      const p=new T.Vector3(),f=new T.Vector3();let maximumOffset=0,minimumHeight=100,maximumSpeed=0;
      for(let frame=0;frame<Math.ceil((st.limit+4)/dt)&&journey.phase!=='results';frame++){
        vehicle.getPosition(p);vehicle.getFlatForward(f);
        const s=-p.z,lookAhead=12+vehicle.speed*.6;
        const targetYaw=-Math.atan2(roadX(s+lookAhead)+3.1-p.x,lookAhead);
        const yaw=Math.atan2(-f.x,-f.z);
        const error=Math.atan2(Math.sin(targetYaw-yaw),Math.cos(targetYaw-yaw));
        const steer=Math.max(-1,Math.min(1,-error*4));
        vehicle.fixedUpdate(dt,journey.phase==='driving'?{...neutral,throttle:1,steer}:neutral);physics.step(dt);
        vehicle.getPosition(p);journey.update(dt,-p.z,roadOffset(p.x,p.z));
        maximumOffset=Math.max(maximumOffset,Math.abs(roadOffset(p.x,p.z)));minimumHeight=Math.min(minimumHeight,p.y);maximumSpeed=Math.max(maximumSpeed,vehicle.speed);
      }
      console.log({stage:stage+1,elapsed:journey.elapsed,checkpoints:journey.checkpoint,maximumOffset,minimumHeight,maximumSpeed});
      expect(journey.success).toBe(true);expect(journey.checkpoint).toBe(4);expect(maximumOffset).toBeLessThan(6);expect(minimumHeight).toBeGreaterThan(.3);
      const initialSpeed=vehicle.forwardSpeed;
      for(let i=0;i<90;i++){vehicle.fixedUpdate(dt,{...neutral,brake:1});physics.step(dt);}
      expect(initialSpeed-vehicle.forwardSpeed).toBeGreaterThan(10);
    }finally{physics.dispose();}
  },20000);
  it('keeps an intentional traffic impact finite and permits a clean respawn',async()=>{
    const physics=new Physics();await physics.init();
    try{
      physics.world.createCollider(physics.RAPIER.ColliderDesc.cuboid(2000,.5,3500).setTranslation(0,-.5,-3000));
      const scene=new T.Scene(),vehicle=new Vehicle(physics,scene),traffic=new Traffic(physics,scene);
      vehicle.respawn(new T.Vector3(roadX(6)-3.2,vehicle.spawnHeight,-6),new T.Quaternion().setFromAxisAngle(T.Object3D.DEFAULT_UP,roadHeading(6)));traffic.reset(0);
      const p=new T.Vector3(),f=new T.Vector3();let hit=false,maxY=0,maxSpeed=0;
      for(let frame=0;frame<600;frame++){
        vehicle.getPosition(p);vehicle.getFlatForward(f);const s=-p.z,look=12+vehicle.speed*.6;
        const desired=-Math.atan2(roadX(s+look)-3.2-p.x,look),yaw=Math.atan2(-f.x,-f.z),error=Math.atan2(Math.sin(desired-yaw),Math.cos(desired-yaw));
        vehicle.fixedUpdate(dt,{...neutral,throttle:1,steer:Math.max(-1,Math.min(1,-error*4))});
        hit=traffic.update(dt,p,vehicle.speed).hit||hit;physics.step(dt);vehicle.getPosition(p);maxY=Math.max(maxY,p.y);maxSpeed=Math.max(maxSpeed,vehicle.speed);
        expect(Number.isFinite(p.x+p.y+p.z+vehicle.speed)).toBe(true);
      }
      console.log({intentionalImpact:hit,maxY,maxSpeed});expect(hit).toBe(true);
      vehicle.respawn(new T.Vector3(roadX(6)+3.1,vehicle.spawnHeight,-6),new T.Quaternion().setFromAxisAngle(T.Object3D.DEFAULT_UP,roadHeading(6)));
      for(let frame=0;frame<180;frame++){vehicle.fixedUpdate(dt,neutral);physics.step(dt);}
      expect(vehicle.speed).toBeLessThan(.5);expect(vehicle.groundedCount).toBe(4);
    }finally{physics.dispose();}
  },20000);
});
