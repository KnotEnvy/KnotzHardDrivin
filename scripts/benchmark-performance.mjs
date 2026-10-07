import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const label=process.argv[2]??'current',url=process.env.PERFORMANCE_URL??'http://127.0.0.1:4200',output='artifacts/performance/'+label;
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
const errors=[],samples=[];
try {
 const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));const started=Date.now();
 await page.goto(url,{waitUntil:'load',timeout:60000});
 await page.waitForFunction(()=>window.__app,undefined,{timeout:120000});
 const startupMs=Date.now()-started;await page.evaluate(()=>window.__app.loop.stop());
 for(const quality of ['high','balanced','auto','performance'])for(const s of [720,2490,5230]) {
  await page.evaluate(({quality,s})=>{
   const a=window.__app;a.loop.stop();a.setQuality(quality);a.journey.start(0,'free');a.spawn(s);
   a.journey.phase='driving';a.input.clear();a.renderer.skyTime=72;a.cameraSnap=true;
   a.frameTimes=[];a.wasDriving=false;a.lastFrame=performance.now();a.renderer.gl.info.autoReset=false;a.loop.start();
  },{quality,s});
  await page.waitForFunction(()=>window.__app.frameTimes.length>=90,undefined,{timeout:60000});
  await page.evaluate(()=>{const a=window.__app;a.frameTimes=[];a.renderer.gl.info.reset();a.benchmarkCaptures=a.coast.ocean.inspect().captures;});
  await page.waitForTimeout(4000);
  samples.push(await page.evaluate(({quality,s})=>{
   const a=window.__app;a.loop.stop();const frames=[...a.frameTimes].sort((x,y)=>x-y),info=a.renderer.gl.info;
   const context=a.renderer.gl.getContext(),debug=context.getExtension('WEBGL_debug_renderer_info');
   return {quality,s,frames:frames.length,meanMs:frames.reduce((x,y)=>x+y,0)/frames.length,p95Ms:frames[Math.floor(frames.length*.95)],drawCallsPerFrame:info.render.calls/(frames.length+1),trianglesPerFrame:info.render.triangles/(frames.length+1),geometries:info.memory.geometries,textures:info.memory.textures,programs:info.programs.length,buffer:[a.renderer.domElement.width,a.renderer.domElement.height],waterCaptures:a.coast.ocean.inspect().captures-a.benchmarkCaptures,maxMs:frames.at(-1),stallsOver250ms:frames.filter(ms=>ms>250).length,gpu:debug?context.getParameter(debug.UNMASKED_RENDERER_WEBGL):context.getParameter(context.RENDERER)};
  },{quality,s}));
  await page.screenshot({path:output+'/'+quality+'-'+s+'.png'});
 }
 await page.evaluate(()=>window.__app.renderer.gl.info.autoReset=true);
 const functional=await page.evaluate(async()=>{
   const a=window.__app;a.loop.stop();a.setQuality('auto');
   for(let i=0;i<400;i++)a.adaptiveResolution.sample(30);
   a.resizeGraphics();const adaptiveScale=a.adaptiveResolution.scale;
   const scaledWidth=a.renderer.domElement.width;
   a.setQuality('high');a.lastFrame=0;a.render(1);
   const map=a.renderer.sun.shadow.map;
   a.resizeGraphics();const shadowRetained=map===a.renderer.sun.shadow.map;
   const lifeAnimated=a.coast.life.group.matrixAutoUpdate;
   a.journey.phase='driving';a.running=true;
   Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
   document.dispatchEvent(new Event('visibilitychange'));
   const hiddenStopped=!a.loop.isRunning&&a.journey.phase==='paused';
   Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});
   document.dispatchEvent(new Event('visibilitychange'));
   const visibleRestarted=a.loop.isRunning;a.loop.stop();
   return {adaptiveScale,scaledWidth,shadowRetained,lifeAnimated,hiddenStopped,visibleRestarted};
 });
 await page.setViewportSize({width:3840,height:2160});
 const resize=await page.evaluate(()=>{const a=window.__app;a.setQuality('performance');return{buffer:[a.renderer.domElement.width,a.renderer.domElement.height],shadowSize:a.renderer.sun.shadow.mapSize.x,waterSize:a.coast.ocean.inspect().reflectionSize,postFX:Boolean(a.postfx),aspect:a.renderer.camera.aspect};});
 if(functional.adaptiveScale!==.6||!functional.shadowRetained||!functional.lifeAnimated||!functional.hiddenStopped||!functional.visibleRestarted||resize.buffer[0]*resize.buffer[1]>921600||resize.postFX)throw Error('Performance lifecycle/resize verification failed');

 const result={label,url,startupMs,viewport:[1280,800],errors,samples,functional,resize,note:'Same-host headless D3D11, stationary car, 90-frame warmup + 4s sample; no claim of low-end hardware coverage.'};
 await fs.writeFile(output+'/benchmark.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 if(errors.length||samples.some(s=>!Number.isFinite(s.meanMs)||s.frames<10))throw Error('Invalid performance sample');
} finally {await browser.close();}
