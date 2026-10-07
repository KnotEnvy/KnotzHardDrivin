import { EXPEDITION, STAGES } from '../world/route';
export interface RecoveryPoint {
  version: 1; mode: 'tour'|'expedition'; stage: number; checkpoint: number;
  elapsed: number; nearMisses: number; collisions: number;
}
const key='pacific-session-v1';
export function readRecovery(medals:number[]):RecoveryPoint|null {
  try {
    const v=JSON.parse(localStorage.getItem(key)??'null');
    if(!v||v.version!==1||!['tour','expedition'].includes(v.mode)||!Number.isInteger(v.stage)||v.stage<0||v.stage>=STAGES.length)return null;
    if(v.mode==='expedition'&&v.stage!==0)return null;
    if(v.mode==='tour'&&v.stage>0&&!medals.slice(0,v.stage).every(n=>n>0))return null;
    const route=v.mode==='expedition'?EXPEDITION:STAGES[v.stage],gates=v.mode==='expedition'?12:4;
    if(!Number.isInteger(v.checkpoint)||v.checkpoint<0||v.checkpoint>=gates||!Number.isFinite(v.elapsed)||v.elapsed<0||v.elapsed>=route.limit)return null;
    if(![v.nearMisses,v.collisions].every(n=>Number.isInteger(n)&&n>=0&&n<=100000))return null;
    return {version:1,mode:v.mode,stage:v.stage,checkpoint:v.checkpoint,elapsed:v.elapsed,nearMisses:v.nearMisses,collisions:v.collisions};
  }catch{return null;}
}
export function writeRecovery(point:RecoveryPoint|null):boolean {
  try{localStorage.setItem(key,JSON.stringify(point));return true;}catch{return false;}
}
