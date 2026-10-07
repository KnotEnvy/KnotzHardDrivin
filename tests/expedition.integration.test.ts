import { describe, it, expect } from 'vitest';
import * as T from 'three';
import { Physics } from '../src/core/Physics';
import { Vehicle } from '../src/entities/Vehicle';
import { Journey } from '../src/systems/Journey';
import { roadX, roadHeading, roadOffset, EXPEDITION } from '../src/world/route';

const dt=1/60;
const neutral={throttle:0,brake:0,steer:0,handbrake:false,reset:false,pause:false};
describe('Grand Tour physical route',()=>{
  it('completes all twelve gates without resetting the car',async()=>{
    const physics=new Physics();await physics.init();
    try {
      physics.world.createCollider(physics.RAPIER.ColliderDesc.cuboid(2000,.5,3500).setTranslation(0,-.5,-3000));
      const vehicle=new Vehicle(physics,new T.Scene());
      const st=EXPEDITION,s0=6;
      vehicle.respawn(new T.Vector3(roadX(s0)+3.1,vehicle.spawnHeight,-s0),new T.Quaternion().setFromAxisAngle(T.Object3D.DEFAULT_UP,roadHeading(s0)));
      const journey=new Journey();journey.start(0,'expedition');
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
      console.log({mode:journey.mode,elapsed:journey.elapsed,checkpoints:journey.checkpoint,maximumOffset,minimumHeight,maximumSpeed});
      expect(journey.success).toBe(true);expect(journey.checkpoint).toBe(12);expect(maximumOffset).toBeLessThan(6);expect(minimumHeight).toBeGreaterThan(.3);
      const initialSpeed=vehicle.forwardSpeed;
      for(let i=0;i<90;i++){vehicle.fixedUpdate(dt,{...neutral,brake:1});physics.step(dt);}
      expect(initialSpeed-vehicle.forwardSpeed).toBeGreaterThan(10);
    }finally{physics.dispose();}
  },20000);
});
