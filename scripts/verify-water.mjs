import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const output='artifacts/water';const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],pacing=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:4200',{waitUntil:'networkidle',timeout:60000});await page.waitForFunction(()=>window.__app,undefined,{timeout:120000});await page.evaluate(()=>window.__app.loop.stop());
 const geometry=await page.evaluate(async()=>{
  const a=window.__app,r=await import('/src/world/route.ts'),profile=await import('/src/world/OceanProfile.ts'),terrain=await import('/src/world/TerrainProfile.ts');
  const shore=[];for(const s of [0,237,860,1330,2490,5230,6010]){const off=profile.shoreOffset(s);shore.push({s,off,error:Math.abs(terrain.terrainSurfaceHeight(off,s)-terrain.SEA_LEVEL)});}
  return{shore,ocean:a.coast.ocean.inspect(),lifeActors:a.coast.life.inspect().length,landscape:a.coast.landscape.inspect()};
 });
 if(geometry.shore.some(x=>x.error>.001)||geometry.ocean.contactFoam!==130||geometry.lifeActors!==48)throw Error('Water integration failed');
 const presets=[];
 for(const quality of ['balanced','high','balanced','high','balanced','high']){await page.evaluate(quality=>{const a=window.__app;a.setQuality(quality);a.cameraSnap=true;a.coast.ocean.refresh();a.lastFrame=0;a.render(1);},quality);presets.push(await page.evaluate(()=>({ocean:window.__app.coast.ocean.inspect(),textures:window.__app.renderer.gl.info.memory.textures})));}
 if(presets.some((x,i)=>x.ocean.reflectionSize!==(i%2?512:256))||Math.abs(presets[3].textures-presets[5].textures)>2)throw Error('Water preset targets leak or have the wrong size: '+JSON.stringify(presets));
 for(const quality of ['high','balanced']){
  await page.evaluate(quality=>window.__app.setQuality(quality),quality);
  for(const s of [720,2490,5230]){
   await page.evaluate(s=>{const a=window.__app;a.journey.start(0,'free');a.spawn(s);a.traffic.reset(s);a.journey.phase='driving';a.input.clear();a.cameraSnap=true;a.frameTimes=[];a.wasDriving=false;a.lastFrame=performance.now();a.loop.start();},s);
   await page.waitForFunction(()=>window.__app.frameTimes.length>=20,undefined,{timeout:60000});const captureStart=await page.evaluate(()=>{window.__app.frameTimes=[];return window.__app.coast.ocean.inspect().captures});await page.waitForTimeout(2500);
   pacing.push(await page.evaluate(({s,quality,captureStart})=>{const a=window.__app;a.loop.stop();const times=[...a.frameTimes].sort((x,y)=>x-y);return{s,quality,captures:a.coast.ocean.inspect().captures-captureStart,frames:times.length,averageMs:times.reduce((x,y)=>x+y,0)/times.length,p95Ms:times[Math.floor(times.length*.95)]};},{s,quality,captureStart}));
  }
 }
 const pause=await page.evaluate(async()=>{const a=window.__app;a.journey.pause();a.lastFrame=0;a.render(1);const first=a.coast.ocean.inspect().time;await new Promise(r=>setTimeout(r,140));a.render(1);return{frozen:first===a.coast.ocean.inspect().time};});if(!pause.frozen)throw Error('Ocean advanced while paused');
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{const a=window.__app;a.journey.phase='driving';a.spawn(720);a.cameraSnap=true;a.render(1);a.ui.update(0,720,a.position.x,100,false)});await page.screenshot({path:`${output}/verification-phone.png`});
 const disposal=await page.evaluate(()=>{const a=window.__app,o=a.coast.ocean;let targets=0,normals=0;o.mesh.getRenderTarget().addEventListener('dispose',()=>targets++);o.normal.addEventListener('dispose',()=>normals++);o.dispose();return{targets,normals,removed:!o.group.parent};});if(disposal.targets!==1||disposal.normals!==1||!disposal.removed)throw Error('Ocean resources were not released');
 await fs.writeFile(`${output}/verification.json`,JSON.stringify({errors,geometry,presets,pacing,pause,disposal,note:'Six short 1280x800 headless D3D11 samples, each warmed for at least 20 frames. No video recording or parallel builds/tests.'},null,2));if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({errors,geometry,presets,pacing,pause,disposal}));
}finally{await browser.close();}
