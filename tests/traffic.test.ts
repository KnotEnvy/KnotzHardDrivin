import {describe,it,expect} from 'vitest';
import {advanceTraffic,overlapCars,type TrafficState} from '../src/systems/trafficMath';
describe('predictable traffic encounters',()=>{
  it('maintains a gap when a faster follower catches a slower car',()=>{
    let cars:TrafficState[]=[{s:0,lane:3.2,speed:20,cruise:20},{s:35,lane:3.2,speed:10,cruise:10}];let gap=Infinity;
    for(let i=0;i<3600;i++){cars=advanceTraffic(cars,1/60);gap=Math.min(gap,cars[1].s-cars[0].s);}
    expect(gap).toBeGreaterThan(5.39);expect(cars[0].speed).toBeCloseTo(10,1);
  });
  it.each([1,-1])('stops for a stationary player in direction %s and resumes when clear',direction=>{
    let cars:TrafficState[]=[{s:0,lane:direction*3.2,speed:20*direction,cruise:20*direction}];
    for(let i=0;i<600;i++)cars=advanceTraffic(cars,1/60,{s:100*direction,lane:direction*3.2,speed:0});
    expect(cars[0].s*direction).toBeLessThan(95);expect(Math.abs(cars[0].speed)).toBeLessThan(.1);
    for(let i=0;i<180;i++)cars=advanceTraffic(cars,1/60);expect(Math.abs(cars[0].speed)).toBeGreaterThan(7);
  });
  it('does not brake for an unobstructed neighboring lane',()=>{
    const [car]=advanceTraffic([{s:0,lane:3.2,speed:20,cruise:20}],1/60,{s:8,lane:-3.2,speed:0});expect(car.speed).toBeCloseTo(20);
  });
  it('gives the same contact decision when a whole encounter rotates',()=>{
    for(const yaw of [0,.6,1.5,2.7])for(const offset of [1.5,2.2]){
      const a={x:0,z:0,yaw,halfWidth:.9,halfLength:2};
      const b={...a,x:offset*Math.cos(yaw),z:-offset*Math.sin(yaw)};
      expect(overlapCars(a,b)).toBe(offset<1.8);
    }
  });
});
