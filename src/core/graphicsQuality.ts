export type GraphicsQuality = 'auto' | 'high' | 'balanced' | 'performance';
export function graphicsQuality(value:string):GraphicsQuality {
  return value==='auto'||value==='high'||value==='performance'?value:'balanced';
}
export function graphicsProfile(quality:GraphicsQuality) {
  return {
    maxRatio:quality==='high'?1.5:quality==='performance'?.75:1,
    maxPixels:quality==='high'?4_000_000:quality==='performance'?921_600:2_073_600,
    shadowSize:quality==='high'?2048:quality==='performance'?512:1024,
    postFX:quality==='high'||quality==='auto',
  };
}
/** A pixel budget also protects 4K/ultrawide displays at devicePixelRatio 1. */
export function renderPixelRatio(width:number,height:number,deviceRatio:number,quality:GraphicsQuality,scale=1):number {
  const profile=graphicsProfile(quality);
  return Math.min(Math.max(.1,deviceRatio),profile.maxRatio,Math.sqrt(profile.maxPixels/Math.max(1,width*height)))*scale;
}
/** Sustained pacing, with slow recovery, avoids reacting to single shader/GC stalls.
 * Only feed active driving frames; menus, tab switches and loading are excluded.
 */
export class AdaptiveResolution {
  scale=1;
  private elapsed=0;
  private frames=0;
  private healthySeconds=0;
  reset(){this.scale=1;this.resetSampling();}
  resetSampling(){this.elapsed=0;this.frames=0;this.healthySeconds=0;}
  sample(ms:number):boolean {
    if(!Number.isFinite(ms)||ms<=0||ms>250){this.resetSampling();return false;}
    this.elapsed+=ms;this.frames++;
    if(this.elapsed<2000||this.frames<30)return false;
    const mean=this.elapsed/this.frames,seconds=this.elapsed/1000;
    this.elapsed=0;this.frames=0;
    const before=this.scale;
    if(mean>22){this.scale=Math.max(.6,Math.round((this.scale-.1)*10)/10);this.healthySeconds=0;}
    else if(mean<18){this.healthySeconds+=seconds;if(this.healthySeconds>=8){this.scale=Math.min(1,Math.round((this.scale+.1)*10)/10);this.healthySeconds=0;}}
    else this.healthySeconds=0;
    return before!==this.scale;
  }
}
