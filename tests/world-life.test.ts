import {describe,it,expect} from 'vitest';
import {LifeEncounter} from '../src/world/LifeEncounter';
describe('Roadside greetings',()=>{
 it('greets once per approach and waits for the car to leave before greeting again',()=>{
  const e=new LifeEncounter(1);expect(e.update(10,35,true)).toBe(1);
  expect(e.update(17,30,true)).toBeCloseTo(.125);expect(e.update(40,30,true)).toBe(0);
  e.update(41,80,true);expect(e.update(42,35,true)).toBe(1);
 });
 it('has no greeting while paused or in the garage and does not drain attention while time is frozen',()=>{
  const e=new LifeEncounter(2);expect(e.update(1,20,false)).toBe(0);
  expect(e.update(2,20,true)).toBe(1);expect(e.update(2,20,false)).toBe(1);
 });
 it('lets a nearby horn retrigger attention without restarting on every held input frame',()=>{
  const e=new LifeEncounter(3);expect(e.horn(10,65)).toBe(true);expect(e.horn(10.2,20)).toBe(false);
  expect(e.attention(12)).toBeCloseTo(.75);expect(e.horn(14,20)).toBe(true);expect(e.horn(30,66)).toBe(false);
 });
 it('gives scenes different cycles that remain finite across long drives',()=>{
  expect(new LifeEncounter(1).cycle(120)).not.toBe(new LifeEncounter(2).cycle(120));
  expect(new LifeEncounter(3).cycle(90000)).toBeGreaterThanOrEqual(0);expect(new LifeEncounter(3).cycle(90000)).toBeLessThan(26);
 });
});
