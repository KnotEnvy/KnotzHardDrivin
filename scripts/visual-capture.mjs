import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const label=process.argv[2]||'pass3';
const output=`artifacts/juice/${label}`;await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
try {
const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('http://127.0.0.1:4200',{waitUntil:'networkidle',timeout:60000});await page.waitForFunction(()=>!!window.__app,undefined,{timeout:120000});
await page.evaluate(()=>{const a=window.__app;a.loop.stop();a.setQuality('high');a.renderer.gl.info.autoReset=false;a.renderer.gl.info.reset();a.render(1);});
await page.screenshot({path:`${output}/garage.png`,timeout:60000});
const shots=[['coast',90,0],['lighthouse',125,0],['station',195,0],['forest',2450,0],['sunset',5500,0],['hood',130,1]];
const metrics=[];
for(const [name,s,mode]of shots){
 await page.evaluate(({s,mode})=>{const a=window.__app;a.journey.start(0,'free');a.spawn(s);a.cameraMode=mode;a.cameraSnap=true;a.journey.phase='driving';a.coast.setGates(0,false);a.traffic.reset(s);for(let i=0;i<80;i++){a.vehicle.fixedUpdate(1/60,{throttle:0,brake:0,steer:0,handbrake:true,reset:false,pause:false});a.physics.step(1/60);}a.renderer.gl.info.reset();a.render(1);a.ui.update(0,s,a.position.x,100,false);},{s,mode});
 await page.screenshot({path:`${output}/${name}.png`,timeout:60000});
 metrics.push(await page.evaluate(()=>({calls:window.__app.renderer.gl.info.render.calls,triangles:window.__app.renderer.gl.info.render.triangles})));
}
// Authentic render, with a closer inspection camera to reveal model construction.
for(const front of [false,true]){
 await page.evaluate(front=>{const a=window.__app;a.spawn(12);a.vehicle.syncMesh(1);const p=a.vehicle.mesh.position;a.renderer.camera.position.copy(p).add(new (p.constructor)(front?4.8:4.5,2.1,front?-5.6:5.6));a.renderer.camera.lookAt(p);a.renderer.camera.fov=42;a.renderer.camera.updateProjectionMatrix();a.renderer.updateSun(p);a.postfx.render();},front);
 await page.locator('#hud').evaluate(e=>e.style.visibility='hidden');
 await page.screenshot({path:`${output}/hero-${front?'front':'rear'}.png`,timeout:60000});
}
for(const [name,s]of [['station-detail',250],['lodge-detail',1120]]){
 await page.evaluate(async ({s})=>{const a=window.__app,r=await import('/src/world/route.ts');a.renderer.camera.position.set(r.roadX(s)+9,6,-s+23);a.renderer.camera.lookAt(r.roadX(s)+28,3.5,-s);a.renderer.camera.fov=50;a.renderer.camera.updateProjectionMatrix();a.renderer.updateSun(new (a.position.constructor)(r.roadX(s)+20,2,-s));a.postfx.render();},{s});
 await page.screenshot({path:`${output}/${name}.png`});
}
await page.setViewportSize({width:390,height:844});
await page.evaluate(()=>{const a=window.__app;a.menu();a.setQuality('balanced');a.render(1);a.ui.update(0,0,a.position.x,100,false);});
await page.locator('#hud').evaluate(e=>e.style.visibility='visible');
await page.screenshot({path:`${output}/mobile-garage.png`});
await fs.writeFile(`${output}/metrics.json`,JSON.stringify(metrics,null,2));await fs.writeFile(`${output}/errors.json`,JSON.stringify(errors,null,2));
console.log(JSON.stringify({output,errors,metrics}));
}finally{await browser.close();}
