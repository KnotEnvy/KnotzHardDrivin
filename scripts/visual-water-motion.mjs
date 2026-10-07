import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const output='artifacts/water';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
let context;
try{
 context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:`${output}/recording`,size:{width:1280,height:800}}});
 const page=await context.newPage(),errors=[],clips=[],pacing=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:4200',{waitUntil:'networkidle',timeout:60000});await page.waitForFunction(()=>window.__app,undefined,{timeout:90000});await page.evaluate(()=>{window.__app.loop.stop();document.querySelector('#hud').style.visibility='hidden'});
 const videoStarted=Date.now();
 for(const [name,s,kind]of [['Gentle Pacific swell',860,'water'],['Surf along the beach',1330,'shore']]){
  const clipStart=Date.now();
  const report=await page.evaluate(async({name,s,kind})=>{
   const a=window.__app,T=await import('/node_modules/three/build/three.module.js'),r=await import('/src/world/route.ts');a.setQuality('high');a.journey.start(0,'free');a.spawn(s);a.journey.phase='driving';a.cameraSnap=true;a.renderer.skyTime=72;a.render(1);
   const camera=a.renderer.camera,focus=new T.Vector3(r.roadX(s)-70,0,-s);
   if(kind==='water'){camera.position.set(r.roadX(s)-110,-4.6,-s+24);camera.lookAt(r.roadX(s)-215,-6.2,-s-60);camera.fov=54;}
   else{camera.position.set(r.roadX(s)-28,13,-s+27);camera.lookAt(r.roadX(s+30)-44,-3,-s-30);camera.fov=54;}
   camera.updateProjectionMatrix();a.coast.ocean.refresh();
   let previous=performance.now(),elapsed=0,frames=0;
   await new Promise(resolve=>{function frame(now){const dt=Math.max(0,Math.min(.06,(now-previous)/1000));previous=now;elapsed+=dt;frames++;a.renderer.updateAtmosphere(dt,focus);a.coast.update(a.renderer.atmosphereTime,0,a.renderer.lightDirection,focus,true);a.postfx.render();if(elapsed<6)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
   return{name,s,kind,frames,elapsed,ocean:a.coast.ocean.inspect()};
  },{name,s,kind});
  clips.push({...report,start:clipStart,end:Date.now()});await page.screenshot({path:`${output}/motion-${kind}.png`});
 }
 const clipStart=Date.now();await page.evaluate(()=>{const a=window.__app;a.journey.start(0,'free');a.spawn(660);a.traffic.reset(660);a.journey.phase='driving';a.input.clear();a.input.setKey('KeyW',true);a.cameraSnap=true;a.lastFrame=performance.now();a.loop.start();});await page.waitForTimeout(6000);
 const drive=await page.evaluate(()=>{const a=window.__app;a.loop.stop();a.input.clear();return{name:'Along the coastal road',kind:'drive',s:-a.position.z,ocean:a.coast.ocean.inspect()};});if(drive.s<675)throw Error('Water showcase drive did not advance');clips.push({...drive,start:clipStart,end:Date.now()});await page.screenshot({path:`${output}/motion-drive.png`});
 const raw=await page.video().path();await context.close();context=undefined;
 await fs.writeFile(`${output}/motion.json`,JSON.stringify({errors,clips,raw,videoStarted,videoEnd:Date.now(),note:'Actual in-engine animation and an App/Rapier drive; recording overhead is excluded from the separate pacing checks.'},null,2));if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({errors,clips,raw}));
}finally{await context?.close();await browser.close();}
