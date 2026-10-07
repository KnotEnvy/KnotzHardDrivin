import {beforeEach,describe,it,expect,vi} from 'vitest';
import {Scene,Vector3} from 'three';
import {Journey,readSave} from '../src/systems/Journey';
import {readRecovery,writeRecovery,type RecoveryPoint} from '../src/systems/runRecovery';
import {Ghost} from '../src/systems/Ghost';
import {readGhost,saveGhost} from '../src/systems/ghostData';
let storage:Map<string,string>;
beforeEach(()=>{storage=new Map();vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)});});
const saved:RecoveryPoint={version:1,mode:'tour',stage:0,checkpoint:2,elapsed:42,nearMisses:3,collisions:1};
describe('interrupted drive recovery',()=>{
  it.each(['tour','expedition'] as const)('reloads a %s checkpoint and keeps ordered progression and elapsed time',mode=>{
    const j=new Journey();j.start(0,mode);j.update(3,6,0);const spacing=(j.route.end-j.route.start)/j.gateCount;
    j.update(20,spacing,0);j.nearMisses=2;j.collisions=1;j.update(18,spacing*2,0);
    const reloaded=new Journey();expect(reloaded.pendingRun?.checkpoint).toBe(2);expect(reloaded.continueRun()).toBe(true);
    expect(reloaded.phase).toBe('countdown');expect(reloaded.elapsed).toBe(41);expect(reloaded.recoveryPosition).toBe(spacing*2+6);
    expect(reloaded.nearMisses).toBe(2);expect(reloaded.collisions).toBe(1);expect(reloaded.resumed).toBe(true);
    reloaded.update(3,reloaded.recoveryPosition,0);expect(reloaded.elapsed).toBe(41);
    reloaded.update(1,spacing*4,0);expect(reloaded.checkpoint).toBe(2);
    reloaded.update(1,spacing*3,0);expect(reloaded.checkpoint).toBe(3);
  });
  it('captures elapsed time on pause and keeps the pending timed drive through free driving',()=>{
    writeRecovery(saved);const j=new Journey();j.continueRun();j.update(3,906,0);j.update(4,1000,0);j.pause();
    expect(new Journey().pendingRun?.elapsed).toBe(49);expect(j.phase).toBe('paused');
    j.start(0,'free');j.update(3,6,0);j.update(30,600,0);j.pause();expect(new Journey().pendingRun?.elapsed).toBe(49);
  });
  it.each([true,false])('clears the recovery record when a drive finishes (success=%s)',success=>{
    writeRecovery(saved);const j=new Journey();j.continueRun();j.elapsed=65;j.finish(success);
    expect(j.pendingRun).toBeNull();expect(new Journey().pendingRun).toBeNull();
  });
  it('replaces the old run on explicit restart and remembers the next chapter',()=>{
    writeRecovery(saved);const j=new Journey();j.continueRun();j.finish(true);j.start(1,'tour');
    expect(readSave().selectedStage).toBe(1);expect(new Journey().pendingRun?.stage).toBe(1);expect(j.resumed).toBe(false);
    expect(j.elapsed).toBe(0);expect(j.checkpoint).toBe(0);
  });
  it('preserves in-session continuation and exposes a blocked-storage failure',()=>{
    const j=new Journey();vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{throw Error('blocked');}});
    j.start(0,'tour');j.update(3,6,0);j.update(20,450,0);j.pause();
    expect(j.recoverySaveFailed).toBe(true);expect(j.pendingRun?.checkpoint).toBe(1);expect(j.continueRun()).toBe(true);
    expect(j.elapsed).toBe(23);expect(j.success).toBe(false);
  });
  it('charges recovery time even if that leaves too little time to finish',()=>{
    writeRecovery({...saved,elapsed:99});const j=new Journey();j.continueRun();j.update(3,906,0);j.update(.01,906,0);
    expect(j.phase).toBe('results');expect(j.success).toBe(false);expect(j.pendingRun).toBeNull();
  });
  it('rejects corrupt, locked, expired and structurally invalid records',()=>{
    const invalid=[{version:2},{mode:'free'},{stage:1},{stage:-1},{stage:1.5},{checkpoint:-1},{checkpoint:4},{checkpoint:.5},{elapsed:-1},{elapsed:100},{elapsed:'42'},{nearMisses:-1},{collisions:1.5},{mode:'expedition',stage:2}];
    for(const change of invalid){storage.set('pacific-session-v1',JSON.stringify({...saved,...change}));expect(readRecovery([0,0,0])).toBeNull();}
    storage.set('pacific-session-v1','{bad');expect(readRecovery([0,0,0])).toBeNull();
    vi.stubGlobal('localStorage',{getItem:()=>{throw Error('blocked');}});expect(readRecovery([0,0,0])).toBeNull();
  });
  it('does not overwrite a complete pace ghost with a faster partial resumed run',()=>{
    const original={version:1 as const,duration:60,frames:[[0,0,1,0,0],[60,0,1,-1800,0]] as [number,number,number,number,number][]};
    saveGhost(0,original);const ghost=new Ghost(new Scene());ghost.start(0,false);
    expect(ghost.hasBest).toBe(true);ghost.record(40,new Vector3(0,1,-1200),new Vector3(0,0,-1));ghost.record(50,new Vector3(0,1,-1800),new Vector3(0,0,-1));
    expect(ghost.finish(50)).toBe(true);expect(readGhost(0)).toEqual(original);
    ghost.start(0);ghost.record(0,new Vector3(0,1,0),new Vector3(0,0,-1));ghost.record(55,new Vector3(0,1,-1800),new Vector3(0,0,-1));ghost.finish(55);expect(readGhost(0)?.duration).toBe(55);
  });
});
