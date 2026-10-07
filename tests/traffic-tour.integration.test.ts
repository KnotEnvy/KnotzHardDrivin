import {it,expect} from 'vitest';
import * as T from 'three';
import {Physics} from '../src/core/Physics';
import {Vehicle} from '../src/entities/Vehicle';
import {Traffic} from '../src/systems/Traffic';
import {Journey} from '../src/systems/Journey';
import {roadX,roadHeading,roadOffset} from '../src/world/route';
it('completes a Grand Tour with live traffic and deliberate overtakes',async()=>{
  const physics=new Physics();await physics.init();
  try{
    physics.world.createCollider(physics.RAPIER.ColliderDesc.cuboid(2000,.5,3500).setTranslation(0,-.5,-3000));
    const scene=new T.Scene(),car=new Vehicle(physics,scene),traffic=new Traffic(physics,scene),journey=new Journey();
    car.respawn(new T.Vector3(roadX(6)+3.2,car.spawnHeight,-6),new T.Quaternion().setFromAxisAngle(T.Object3D.DEFAULT_UP,roadHeading(6)));traffic.reset(0);journey.start(0,'expedition');
    const p=new T.Vector3(),f=new T.Vector3(),dt=1/60;let lane=3.2,passes=0,passTarget:number|null=null,hits=0,wasHit=false,maxOffset=0;
    for(let tick=0;tick<15000&&journey.phase!=='results';tick++){
      car.getPosition(p);car.getFlatForward(f);const s=-p.z,users=traffic.snapshot();
      const lead=users.filter(d=>d.lane>0&&d.s>s&&d.s-s<40).sort((a,b)=>a.s-b.s)[0];
      if(lane>0&&lead&&!users.some(d=>d.lane<0&&d.s-s>-30&&d.s-s<210)){lane=-3.2;passTarget=users.indexOf(lead);passes++;}
      if(lane<0&&passTarget!==null&&(s>users[passTarget].s+12||users.some(d=>d.lane<0&&d.s-s>0&&d.s-s<85))&&!users.some(d=>d.lane>0&&Math.abs(d.s-s)<22)){lane=3.2;passTarget=null;}
      const blocker=users.filter(d=>Math.abs(d.lane-lane)<1&&d.s>s&&d.s-s<38).sort((a,b)=>a.s-b.s)[0];
      const look=12+car.speed*.6,target=-Math.atan2(roadX(s+look)+lane-p.x,look),yaw=Math.atan2(-f.x,-f.z),error=Math.atan2(Math.sin(target-yaw),Math.cos(target-yaw));
      const desired=blocker?Math.max(0,blocker.speed+(blocker.s-s-12)*.45):42;
      const active=journey.phase==='driving';
      car.fixedUpdate(dt,{throttle:active?Math.max(0,Math.min(1,(desired-car.forwardSpeed)*.4)):0,brake:active?Math.max(0,Math.min(1,(car.forwardSpeed-desired)*.3)):0,steer:Math.max(-1,Math.min(1,-error*4)),handbrake:!active,reset:false,pause:false});
      const encounter=traffic.update(dt,p,car.forwardSpeed,yaw);if(encounter.hit&&!wasHit)hits++;wasHit=encounter.hit;
      physics.step(dt);car.getPosition(p);journey.update(dt,-p.z,roadOffset(p.x,p.z));maxOffset=Math.max(maxOffset,Math.abs(roadOffset(p.x,p.z)));
    }
    console.log({trafficTourSeconds:journey.elapsed,checkpoints:journey.checkpoint,passes,hits,maxOffset});
    expect(journey.success).toBe(true);expect(journey.checkpoint).toBe(12);expect(passes).toBeGreaterThan(0);expect(hits).toBe(0);expect(maxOffset).toBeLessThan(8);
  }finally{physics.dispose();}
},20000);
