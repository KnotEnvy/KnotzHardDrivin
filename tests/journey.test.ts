import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Journey, readSave } from '../src/systems/Journey';
import { STAGES, roadHeading, roadX } from '../src/world/route';
describe('Pacific Run campaign',()=>{
  let storage:Map<string,string>;
  beforeEach(()=>{storage=new Map();vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)});});
  it('holds the timer through countdown and pause',()=>{const j=new Journey();j.start(0,'tour');j.update(2,0,0);expect(j.phase).toBe('countdown');expect(j.elapsed).toBe(0);j.update(1.1,0,0);expect(j.phase).toBe('driving');j.phase='paused';j.update(10,450,0);expect(j.elapsed).toBe(0);expect(j.checkpoint).toBe(0);});
  it('requires the four ordered on-road checkpoints',()=>{const j=new Journey();j.start(0,'tour');j.update(4,0,0);j.update(1,900,0);expect(j.checkpoint).toBe(0);j.update(1,450,20);expect(j.checkpoint).toBe(0);for(const s of [450,900,1350,1800])j.update(10,s,0);expect(j.phase).toBe('results');expect(j.success).toBe(true);expect(j.medal).toBe(3);expect(readSave().medals[0]).toBe(3);});
  it('fails on timeout and permits retry without stale state',()=>{const j=new Journey();j.start(1,'tour');j.update(4,1850,0);j.update(109,2000,0);expect(j.success).toBe(false);expect(j.phase).toBe('results');j.start(1,'tour');expect(j.elapsed).toBe(0);expect(j.checkpoint).toBe(0);expect(j.phase).toBe('countdown');});
  it('does not time out free driving',()=>{const j=new Journey();j.start(0,'free');j.update(4,0,0);j.update(500,1300,0);expect(j.phase).toBe('driving');});
  it('preserves the best result across slower completed runs',()=>{const j=new Journey();j.start(0,'tour');j.elapsed=60;j.finish(true);j.start(0,'tour');j.elapsed=88;j.finish(true);expect(j.save.best[0]).toBe(60);expect(j.save.medals[0]).toBe(2);});
  it('recovers malformed and blocked storage',()=>{storage.set('pacific-run-v1','{bad');expect(readSave().medals).toEqual([0,0,0]);storage.set('pacific-run-v1',JSON.stringify({medals:[99,-1,'x'],best:[-1,'x',8],color:1,volume:8}));const s=readSave();expect(s.medals).toEqual([3,0,0]);expect(s.best).toEqual([0,0,8]);expect(s.volume).toBe(1);vi.stubGlobal('localStorage',{getItem:()=>{throw Error('blocked');}});expect(readSave().medals).toEqual([0,0,0]);});
  it('keeps the road tangent aligned with the car heading',()=>{for(let s=0;s<6000;s+=20){const slope=(roadX(s+.01)-roadX(s-.01))/.02;expect(roadHeading(s)).toBeCloseTo(-Math.atan(slope),6);}for(const stage of STAGES)expect(stage.end-stage.start).toBeGreaterThan(1000);});
});

it('rejects locked or malformed persisted chapter selections',()=>{
  for(const selectedStage of [2,-1,1.5,'1',99]){
    vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify({medals:[0,0,0],best:[0,0,0],selectedStage})});
    expect(readSave().selectedStage).toBe(0);
  }
  vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify({medals:[3,0,0],best:[55,0,0]})});
  expect(readSave().selectedStage).toBe(1);
});
