import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const output='artifacts/world-life';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
let context;
try{
 context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:`${output}/recording`,size:{width:1280,height:800}}});
 const page=await context.newPage(),errors=[],clips=[],pacing=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:4200',{waitUntil:'networkidle',timeout:60000});await page.waitForFunction(()=>window.__app,undefined,{timeout:90000});await page.evaluate(()=>{window.__app.loop.stop();document.querySelector('#hud').style.visibility='hidden'});
 const start=Date.now();
 for(const [name,s,kind]of [['Station hello',237,'dog'],['Gulls overhead',175,'gull'],['Redwood clearing',2180,'deer'],['Beach afternoon',660,'kite'],['Touring cyclist',990,'cyclist']]){
  const report=await page.evaluate(async({name,s,kind})=>{
   const a=window.__app,T=await import('/node_modules/three/build/three.module.js'),r=await import('/src/world/route.ts');a.setQuality('high');a.journey.start(0,'free');a.spawn(s-15);a.journey.phase='driving';a.cameraSnap=true;a.renderer.skyTime=Math.max(40,a.renderer.skyTime);a.render(1);
   const actor=a.coast.life.actors.filter(x=>x.kind===kind).sort((x,y)=>Math.abs(x.s-s)-Math.abs(y.s-s))[0],camera=a.renderer.camera,target=actor.root.position.clone();
   if(kind==='kite')target.set(r.roadX(s)-23,8,-s);else target.y+=kind==='dog'?1:kind==='gull'?0:.9;
   const offset=kind==='dog'?new T.Vector3(-6,2,7):kind==='gull'?new T.Vector3(13,3,16):kind==='cyclist'?new T.Vector3(-6,1.4,7):kind==='deer'?new T.Vector3(-9,2.5,9):new T.Vector3(25,-4,24);
   camera.position.copy(target).add(offset);camera.lookAt(target);camera.fov=kind==='kite'?52:46;camera.updateProjectionMatrix();
   const focus=actor.root.position.clone();if(kind==='dog'||kind==='deer')a.coast.life.honk(focus);
   let previous=performance.now(),elapsed=0,frames=0;
   await new Promise(resolve=>{function frame(now){const dt=Math.max(0,Math.min(.06,(now-previous)/1000));previous=now;elapsed+=dt;frames++;a.renderer.updateAtmosphere(dt,focus);a.coast.update(a.renderer.atmosphereTime,0,a.renderer.lightDirection,focus,true);
if(kind==='cyclist'||kind==='gull'){const moving=actor.root.position.clone();moving.y+=kind==='cyclist'?.9:0;camera.position.copy(moving).add(offset);camera.lookAt(moving);camera.updateProjectionMatrix();}
a.postfx.render();if(elapsed<3.4)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
   return{name,kind,frames,elapsed,attention:actor.attention,calls:a.renderer.gl.info.render.calls};
  },{name,s,kind});clips.push(report);await page.screenshot({path:`${output}/motion-${kind}.png`});
 }
 const movieEnd=Date.now(),duration=(movieEnd-start)/1000;
 // Separate live game samples include normal App update/render and roadside population.
 for(const s of [237,990,2180]){
  await page.evaluate(s=>{const a=window.__app;a.journey.start(0,'free');a.spawn(s);a.journey.phase='driving';a.input.clear();a.frameTimes=[];a.wasDriving=false;a.lastFrame=performance.now();a.loop.start();},s);await page.waitForTimeout(2500);
  pacing.push(await page.evaluate(s=>{const a=window.__app;a.loop.stop();const f=[...a.frameTimes].sort((x,y)=>x-y);return{s,frames:f.length,averageMs:f.reduce((a,b)=>a+b,0)/f.length,p95Ms:f[Math.floor(f.length*.95)]};},s));
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{const a=window.__app;a.setQuality('balanced');a.journey.phase='driving';a.spawn(237);a.renderer.skyTime=100;a.cameraSnap=true;a.render(1);a.ui.update(0,237,a.position.x,100,false);document.querySelector('#hud').style.visibility='visible';});
 const button=page.getByRole('button',{name:'Honk and greet nearby wildlife'});await button.click();
 const mobile=await page.evaluate(()=>{const a=window.__app;a.update(1/60);a.render(1);const h=document.querySelector('.horn-trigger').getBoundingClientRect();return{horn:a.input.state.horn,rect:{x:h.x,y:h.y,w:h.width,h:h.height},width:innerWidth,height:innerHeight};});
 if(!mobile.horn)throw Error('Quick phone horn tap was lost before the simulation update');
 if(mobile.rect.x<0||mobile.rect.x+mobile.rect.w>390||mobile.rect.y+mobile.rect.h>844)throw Error('Phone horn is not reachable');
 await page.screenshot({path:`${output}/mobile-drive.png`});
 const raw=await page.video().path();await context.close();context=undefined;
 await fs.writeFile(`${output}/motion.json`,JSON.stringify({errors,clips,duration,tailDuration:(Date.now()-movieEnd)/1000,pacing,mobile,raw,note:'Cinematic captures use the actual renderer. Pacing samples use the normal App loop on this headless D3D11 host.'},null,2));console.log(JSON.stringify({output,errors,clips,duration,pacing,mobile,raw}));
}finally{await context?.close();await browser.close();}
