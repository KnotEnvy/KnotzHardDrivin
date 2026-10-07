import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Journey, readSave } from '../src/systems/Journey';
import { EXPEDITION } from '../src/world/route';
import { readGhost, saveGhost, type GhostFrame } from '../src/systems/ghostData';
let storage:Map<string,string>;
beforeEach(()=>{storage=new Map();vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)});});
describe('uninterrupted Grand Tour',()=>{
  it('rejects a final-gate crossing after the deadline but accepts the exact deadline',()=>{
    for(const mode of ['tour','expedition'] as const){
      const late=new Journey();late.start(0,mode);late.phase='driving';late.checkpoint=late.gateCount-1;late.elapsed=late.route.limit-.01;
      late.update(.02,late.route.end,0);expect(late.success).toBe(false);expect(late.phase).toBe('results');
      const exact=new Journey();exact.start(0,mode);exact.phase='driving';exact.checkpoint=exact.gateCount-1;exact.elapsed=exact.route.limit-1;
      exact.update(1,exact.route.end,0);expect(exact.success).toBe(true);
    }
  });
  it('needs all twelve ordered gates and retains separate progression',()=>{
    const j=new Journey();j.start(2,'expedition');j.update(4,6,0);
    j.update(1,EXPEDITION.end,0);expect(j.checkpoint).toBe(0);
    for(let i=1;i<=12;i++){j.update(13,EXPEDITION.end*i/12,0);if(i<12)expect(j.phase).toBe('driving');}
    expect(j.success).toBe(true);expect(j.checkpoint).toBe(12);expect(j.medal).toBe(3);
    expect(readSave().expeditionMedal).toBe(3);expect(readSave().medals).toEqual([0,0,0]);
    expect(j.recordingSlot).toBe(3);expect(j.bestTime).toBe(157);
  });
  it('does not replace a better medal or time with a slower Grand Tour',()=>{
    const j=new Journey();j.start(0,'expedition');j.elapsed=170;j.finish(true);
    j.start(0,'expedition');j.elapsed=220;j.finish(true);
    expect(j.save.expeditionBest).toBe(170);expect(j.save.expeditionMedal).toBe(3);
    j.start(1,'tour');j.elapsed=64;j.finish(true);expect(j.save.best[1]).toBe(64);expect(j.save.expeditionBest).toBe(170);
  });
  it('times out and resets cleanly on retry',()=>{
    const j=new Journey();j.start(0,'expedition');j.update(4,6,0);j.update(241,600,0);
    expect(j.success).toBe(false);expect(j.phase).toBe('results');expect(j.bestTime).toBe(0);
    j.start(0,'expedition');expect(j.elapsed).toBe(0);expect(j.checkpoint).toBe(0);
  });
  it('migrates old saves and rejects invalid tour records',()=>{
    storage.set('pacific-run-v1',JSON.stringify({medals:[3,2,1],best:[55,70,80]}));
    expect(readSave().expeditionBest).toBe(0);expect(readSave().medals).toEqual([3,2,1]);
    storage.set('pacific-run-v1',JSON.stringify({medals:[],best:[],expeditionBest:-1,expeditionMedal:88}));
    expect(readSave().expeditionBest).toBe(0);expect(readSave().expeditionMedal).toBe(3);
  });
  it('stores and reloads a full four-minute ghost separately from chapters',()=>{
    const frames:GhostFrame[]=Array.from({length:2400},(_,i)=>[i/10,0,1,-i*2,0]);
    expect(saveGhost(3,{version:1,duration:240,frames})).toBe(true);
    expect(readGhost(3)?.frames).toHaveLength(2400);expect(readGhost(0)).toBeNull();
  });
  it('reports persistence failure without losing session progress',()=>{
    vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{throw Error('full');}});
    const j=new Journey();j.start(0,'expedition');j.elapsed=175;j.finish(true);
    expect(j.saveFailed).toBe(true);expect(j.success).toBe(true);expect(j.bestTime).toBe(175);
  });
});
