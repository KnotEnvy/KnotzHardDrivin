import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const label=process.argv[2]||'lighting-after',output=`artifacts/juice/${label}`;await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
try{
 const page=await browser.newPage({viewport:{width:1400,height:900}}),errors=[],report=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:4200',{waitUntil:'networkidle',timeout:60000});await page.waitForFunction(()=>!!window.__app,undefined,{timeout:90000});await page.evaluate(()=>window.__app.loop.stop());
 const shots=[['garage',12],['coast',90],['forest',2450],['sunset',5500],['paint',12]];
 for(const quality of ['high','balanced'])for(const [name,s]of shots){
  const settings=await page.evaluate(async({quality,name,s})=>{
   const a=window.__app;a.setQuality(quality);a.journey.start(0,'free');a.spawn(s);a.traffic.reset(s);a.cameraMode=0;a.cameraSnap=true;a.renderer.camera.fov=name==="garage"?44:58;a.lastFrame=performance.now()-60;a.journey.phase=name==='garage'?'menu':'driving';a.coast.setGates(0,false);
   for(let i=0;i<80;i++){a.vehicle.fixedUpdate(1/60,{throttle:0,brake:0,steer:0,handbrake:true,reset:false,pause:false});a.physics.step(1/60);}
   a.renderer.skyTime=30;a.render(1);a.ui.update(0,s,a.position.x,100,false);document.getElementById('hud').style.visibility=name==='garage'?'visible':'hidden';
   if(name==='paint'){
    const p=a.vehicle.mesh.position;a.renderer.camera.position.copy(p).add(new (p.constructor)(4.8,2.1,-5.6));a.renderer.camera.lookAt(p);a.renderer.camera.fov=42;a.renderer.camera.updateProjectionMatrix();a.renderer.updateSun(p);if(a.postfx)a.postfx.render();else a.renderer.render();
   }
   const hemi=a.renderer.scene.children.find(o=>o.isHemisphereLight);
   return{quality,name,s,exposure:a.renderer.gl.toneMappingExposure,sun:a.renderer.sun.intensity,hemi:hemi.intensity,environment:a.renderer.scene.environmentIntensity,time:a.renderer.atmosphereTime,camera:a.renderer.camera.position.toArray(),sky:a.renderer.backdrop.position.toArray()};
  },{quality,name,s});report.push(settings);await page.screenshot({path:`${output}/${quality}-${name}.png`,timeout:60000});
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{const a=window.__app;a.menu();a.setQuality('balanced');a.renderer.skyTime=30;a.render(1);a.ui.update(0,0,a.position.x,100,false);document.getElementById('hud').style.visibility='visible';});await page.screenshot({path:`${output}/mobile-garage.png`});
 // Show that the restrained illumination still changes as clouds move.
 const weather=[];await page.setViewportSize({width:1400,height:900});
 for(const time of [30,150]){
  weather.push(await page.evaluate(time=>{const a=window.__app;a.journey.start(0,'free');a.spawn(90);a.journey.phase='driving';a.cameraSnap=true;a.renderer.skyTime=time;a.render(1);document.getElementById('hud').style.visibility='hidden';return{time:a.renderer.atmosphereTime,sun:a.renderer.sun.intensity,direction:a.renderer.lightDirection.toArray()};},time));
  await page.screenshot({path:`${output}/weather-${time}.png`});
 }
 await fs.writeFile(`${output}/evidence.json`,JSON.stringify({errors,report,weather},null,2));console.log(JSON.stringify({output,errors,report,weather}));
}finally{await browser.close();}
