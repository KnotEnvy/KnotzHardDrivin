import { describe,it,expect } from 'vitest';
import * as T from 'three';
import { Physics } from '../src/core/Physics';
import { Vehicle } from '../src/entities/Vehicle';
const dt=1/60,neutral={throttle:0,brake:0,steer:0,handbrake:false,reset:false,pause:false};
describe('driving handbrake behavior',()=>{
  it.each([1,-1])('brakes travel direction %s without inducing the opposite gear',async(direction)=>{
    const p=new Physics();await p.init();
    try{
      p.world.createCollider(p.RAPIER.ColliderDesc.cuboid(500,.5,500).setTranslation(0,-.5,0));
      const car=new Vehicle(p,new T.Scene());
      const run=(input:typeof neutral,n:number)=>{for(let i=0;i<n;i++){car.fixedUpdate(dt,input);p.step(dt);}};
      run(neutral,90);run({...neutral,throttle:direction>0?1:0,brake:direction<0?1:0},180);
      const before=car.forwardSpeed;expect(Math.abs(before)).toBeGreaterThan(5);
      run({...neutral,handbrake:true},180);
      expect(Math.abs(car.forwardSpeed)).toBeLessThan(Math.abs(before)*.35);
      run({...neutral,handbrake:true},300);expect(Math.abs(car.forwardSpeed)).toBeLessThan(.15);expect(car.groundedCount).toBe(4);
    }finally{p.dispose();}
  },20000);
});
