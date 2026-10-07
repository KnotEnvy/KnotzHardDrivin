export type GhostFrame = [time:number,x:number,y:number,z:number,yaw:number];
export interface GhostRun { version:1; duration:number; frames:GhostFrame[]; }
const key=(stage:number)=>`pacific-ghost-v1-${stage}`;
/** Bounded and validated independently of medal storage, so bad recordings cannot break boot. */
export function readGhost(stage:number):GhostRun|null {
  try {
    const run=JSON.parse(localStorage.getItem(key(stage))??'null');
    if(run?.version!==1||!Number.isFinite(run.duration)||run.duration<=0||run.duration>300||!Array.isArray(run.frames)||run.frames.length<2||run.frames.length>3000)return null;
    let previous=-1;
    for(const f of run.frames){
      if(!Array.isArray(f)||f.length!==5||!f.every(Number.isFinite)||f[0]<=previous||f[0]<0||f[0]>run.duration+.2||Math.abs(f[1])>2500||Math.abs(f[2])>20||Math.abs(f[3])>6500||Math.abs(f[4])>Math.PI+.01)return null;
      previous=f[0];
    }
    return run;
  }catch{return null;}
}
export function saveGhost(stage:number,run:GhostRun):boolean {
  try{const old=readGhost(stage);if(old&&old.duration<=run.duration)return false;localStorage.setItem(key(stage),JSON.stringify(run));return true;}catch{return false;}
}
export function sampleGhost(run:GhostRun,time:number):GhostFrame|null {
  const frames=run.frames;if(time<frames[0][0]||time>frames[frames.length-1][0])return null;
  let low=0,high=frames.length-1;
  while(high-low>1){const mid=(low+high)>>1;if(frames[mid][0]<=time)low=mid;else high=mid;}
  const a=frames[low],b=frames[high],t=(time-a[0])/(b[0]-a[0]);
  if(time===b[0])return [...b];
  if(b[0]-a[0]>.3)return [...a]; // Recovery penalties create a discontinuity, never a glide through scenery.
  const angle=Math.atan2(Math.sin(b[4]-a[4]),Math.cos(b[4]-a[4]));
  return [time,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t,a[3]+(b[3]-a[3])*t,a[4]+angle*t];
}
