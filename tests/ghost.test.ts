import { beforeEach, describe, expect, it } from 'vitest';
import { readGhost, saveGhost, sampleGhost, type GhostRun } from '../src/systems/ghostData';
const run:GhostRun={version:1,duration:.2,frames:[[0,0,1,0,3.1],[.2,2,1,-4,-3.1]]};
beforeEach(()=>{const data=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)}});});
describe('saved pace ghost',()=>{
  it('interpolates position and takes shortest heading through pi',()=>{const f=sampleGhost(run,.1)!;expect(f.slice(1,4)).toEqual([1,1,-2]);expect(Math.abs(f[4])).toBeCloseTo(Math.PI);expect(sampleGhost(run,.3)).toBeNull();});
  it('retains only a faster recording for each stage',()=>{expect(saveGhost(0,run)).toBe(true);expect(saveGhost(0,{...run,duration:1})).toBe(false);expect(readGhost(0)?.duration).toBe(.2);expect(readGhost(1)).toBeNull();});
  it('rejects malformed and non-monotonic storage',()=>{localStorage.setItem('pacific-ghost-v1-0',JSON.stringify({...run,frames:[[.2,0,1,0,0],[.1,0,1,0,0]]}));expect(readGhost(0)).toBeNull();localStorage.setItem('pacific-ghost-v1-0','{bad');expect(readGhost(0)).toBeNull();});
  it('does not animate across recovery penalties',()=>{const penalty:GhostRun={version:1,duration:4,frames:[[0,0,1,0,0],[3,50,1,-100,1],[4,55,1,-120,1]]};expect(sampleGhost(penalty,1)?.slice(1)).toEqual([0,1,0,0]);});
  it('tolerates blocked storage',()=>{Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('blocked');}});expect(readGhost(0)).toBeNull();expect(saveGhost(0,run)).toBe(false);});
});
