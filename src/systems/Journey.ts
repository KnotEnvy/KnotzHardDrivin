import { graphicsQuality } from '../core/graphicsQuality';
import { VEHICLE_PAINTS } from '../entities/VehiclePaints';
import { readRecovery, writeRecovery, type RecoveryPoint } from './runRecovery';
import { EXPEDITION, STAGES } from '../world/route';
export type Mode = 'tour' | 'free' | 'expedition';
export type Phase = 'menu' | 'countdown' | 'driving' | 'paused' | 'results';
export interface SaveData { medals: number[]; best: number[]; color: number; volume: number; quality: string; radio: boolean; ghost: boolean; expeditionBest: number; expeditionMedal: number; selectedStage: number; }
export function readSave(): SaveData {
  const fallback: SaveData = { medals: [0,0,0], best: [0,0,0], color: 0xf1a344, volume: 0.35, quality: 'balanced', radio: true, ghost: true, expeditionBest: 0, expeditionMedal: 0, selectedStage: 0 };
  try {
    const v = JSON.parse(localStorage.getItem('pacific-run-v1') ?? 'null');
    if (!v || !Array.isArray(v.medals) || !Array.isArray(v.best)) return fallback;
    const medals = [0,1,2].map(i => Number.isFinite(v.medals[i]) ? Math.max(0,Math.min(3,Math.floor(v.medals[i]))) : 0);
    const unlocked = medals[0] ? (medals[1] ? 2 : 1) : 0;
    const selectedStage = Number.isInteger(v.selectedStage) && v.selectedStage >= 0 && v.selectedStage <= unlocked ? v.selectedStage : unlocked;
    return { selectedStage, medals, best: [0,1,2].map(i => Number.isFinite(v.best[i]) && v.best[i] > 0 ? v.best[i] : 0), color: VEHICLE_PAINTS.some(paint=>paint.color===v.color) ? v.color : fallback.color, volume: Number.isFinite(v.volume) ? Math.max(0,Math.min(1,v.volume)) : 0.35, quality: graphicsQuality(v.quality), radio: v.radio !== false, ghost: v.ghost !== false, expeditionBest: Number.isFinite(v.expeditionBest) && v.expeditionBest > 0 ? v.expeditionBest : 0, expeditionMedal: Number.isFinite(v.expeditionMedal) ? Math.max(0,Math.min(3,Math.floor(v.expeditionMedal))) : 0 };
  } catch { return fallback; }
}
export function saveProgress(save: SaveData): boolean { try { localStorage.setItem('pacific-run-v1', JSON.stringify(save)); return true; } catch { return false; } }
export class Journey {
  phase: Phase = 'menu'; mode: Mode = 'tour'; stage = 0; elapsed = 0; countdown = 3; distance = 0; checkpoint = 0; nearMisses = 0; collisions = 0; medal = 0; success = false;
  saveFailed = false;
  readonly save = readSave();
  pendingRun:RecoveryPoint|null=readRecovery(this.save.medals);
  recoverySaveFailed=false;
  resumed=false;
  saveRun(){
    if(this.mode==='free'||!['driving','countdown','paused'].includes(this.phase))return;
    this.pendingRun={version:1,mode:this.mode,stage:this.stage,checkpoint:this.checkpoint,elapsed:this.elapsed,nearMisses:this.nearMisses,collisions:this.collisions};
    this.recoverySaveFailed=!writeRecovery(this.pendingRun);
  }
  pause(){if(this.phase==='driving'||this.phase==='countdown'){this.phase='paused';this.saveRun();}}
  continueRun(){
    const saved=this.pendingRun;if(!saved)return false;
    this.stage=saved.stage;this.mode=saved.mode;this.checkpoint=saved.checkpoint;this.elapsed=saved.elapsed+3;
    this.nearMisses=saved.nearMisses;this.collisions=saved.collisions;this.countdown=3;this.phase='countdown';
    this.resumed=true;this.success=false;this.medal=0;
    this.distance=this.checkpoint*(this.route.end-this.route.start)/this.gateCount;
    this.saveRun();return true;
  }
  get recoveryPosition(){return this.route.start+this.checkpoint*(this.route.end-this.route.start)/this.gateCount+6;}

  get route() { return this.mode==='expedition' ? EXPEDITION : STAGES[this.stage]; }
  get gateCount() { return this.mode==='expedition' ? 12 : 4; }
  get recordingSlot() { return this.mode==='expedition' ? STAGES.length : this.stage; }
  get bestTime() { return this.mode==='expedition' ? this.save.expeditionBest : this.save.best[this.stage]; }
  start(stage: number, mode: Mode) { this.stage = mode==='expedition'?0:stage; this.mode = mode; this.phase = 'countdown'; this.elapsed = 0; this.countdown = 3; this.distance = 0; this.checkpoint = 0; this.nearMisses=0; this.collisions=0; this.medal=0; this.success=false; this.saveFailed=false; this.resumed=false; if(mode==='tour'){this.save.selectedStage=stage;this.saveFailed=!saveProgress(this.save);} this.saveRun(); }
  update(dt: number, s: number, lateral: number) {
    if (this.phase === 'countdown') { this.countdown -= dt; if (this.countdown <= 0) this.phase = 'driving'; return; }
    if (this.phase !== 'driving') return;
    this.elapsed += dt;
    const stage = this.route;
    this.distance = Math.max(0, s - stage.start);
    if (this.mode === 'free') return;
    // Ordered gates: driving off-road cannot complete a stage or skip checkpoints.
    const next = stage.start + (this.checkpoint+1) * (stage.end-stage.start)/this.gateCount;
    if (s >= next && s < next+35 && Math.abs(lateral) < 9 && this.checkpoint < this.gateCount) { this.checkpoint++; if(this.checkpoint<this.gateCount)this.saveRun(); }
    if (this.checkpoint === this.gateCount) this.finish(this.elapsed <= stage.limit);
    else if (this.elapsed >= stage.limit) this.finish(false);
  }
  finish(success: boolean) {
    this.success = success; this.phase = 'results';
    if(this.mode!=='free'){this.pendingRun=null;this.recoverySaveFailed=!writeRecovery(null);}
    const stage = this.route;
    this.medal = success ? (this.elapsed <= stage.gold ? 3 : this.elapsed <= stage.silver ? 2 : 1) : 0;
    if (success && this.mode==='expedition') {
      this.save.expeditionMedal=Math.max(this.save.expeditionMedal,this.medal);
      this.save.expeditionBest=this.save.expeditionBest?Math.min(this.save.expeditionBest,this.elapsed):this.elapsed;
      this.saveFailed=!saveProgress(this.save);
    } else if (success) { this.save.medals[this.stage] = Math.max(this.save.medals[this.stage], this.medal); const old = this.save.best[this.stage]; this.save.best[this.stage] = old ? Math.min(old, this.elapsed) : this.elapsed; this.saveFailed=!saveProgress(this.save); }
  }
}
