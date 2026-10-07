import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const label=process.argv[2]||'motion-initial',output=`artifacts/juice/${label}`;await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:4200',{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__app);
 await page.evaluate(()=>{const a=window.__app;a.loop.stop();a.setQuality('high');a.startJourney(0,'free');a.journey.phase='driving';a.input.update=()=>{};a.input.state={throttle:1,brake:0,steer:0,handbrake:false,reset:false,pause:false,boost:false};});
 const stats=[];
 for(let block=0;block<24;block++){
  stats.push(await page.evaluate(async block=>{const a=window.__app,r=await import('/src/world/route.ts');for(let i=0;i<20;i++){
   a.vehicle.getPosition(a.position);a.vehicle.getFlatForward(a.forward);const s=-a.position.z,look=12+a.vehicle.speed*.6;
   const desired=-Math.atan2(r.roadX(s+look)+3.1-a.position.x,look),yaw=Math.atan2(-a.forward.x,-a.forward.z),e=Math.atan2(Math.sin(desired-yaw),Math.cos(desired-yaw));
   a.input.state.steer=Math.max(-1,Math.min(1,-e*4));a.input.state.throttle=1;a.input.state.boost=block>=18&&block<22;a.input.state.handbrake=block>=22;
   a.update(1/60);
  }a.cameraSnap=true;a.render(1);return {s:-a.position.z,speed:a.vehicle.speed,boost:a.isBoosting,marks:a.effects.markCursor,liveParticles:a.effects.life.filter(v=>v>0).length};},block));
  if([17,20,23].includes(block))await page.screenshot({path:`${output}/${['drive','boost','drift'][[17,20,23].indexOf(block)]}.png`});
 }
 await page.evaluate(()=>{const a=window.__app;a.effects.impact(a.position);a.effects.update(.08,a.position,false,a.forward,a.vehicle.speed,false);a.render(1);});
 await page.screenshot({path:`${output}/sparks.png`});
 await page.evaluate(()=>{const a=window.__app;a.vehicle.setLights(true,false);a.render(1);});await page.screenshot({path:`${output}/brake.png`});
 // Live keyboard drive frame pacing, measured only on this headless hardware browser.
 await page.evaluate(()=>{const a=window.__app;a.startJourney(0,'free');a.journey.phase='driving';a.input.state={throttle:0,brake:0,steer:0,handbrake:false,reset:false,pause:false};a.frameTimes=[];a.loop.start();});
 await page.waitForTimeout(3500);
 const pacing=await page.evaluate(()=>{const a=window.__app;a.loop.stop();const frames=[...a.frameTimes].sort((a,b)=>a-b);return{frames:frames.length,averageMs:frames.reduce((a,b)=>a+b,0)/frames.length,p95Ms:frames[Math.floor(frames.length*.95)]};});
 await fs.writeFile(`${output}/evidence.json`,JSON.stringify({errors,stats,pacing,note:'Motion is scripted through App fixed-step updates and actual Rapier physics. Frame pacing uses this headless D3D11 browser; no supported-device certification.'},null,2));
 console.log(JSON.stringify({output,errors,pacing,last:stats.at(-1)}));
}finally{await browser.close();}
