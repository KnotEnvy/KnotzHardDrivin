import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const stage=process.argv[2]??'after',output=`artifacts/water/${stage}`;await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
try{
 const page=await browser.newPage({viewport:{width:1400,height:900}}),errors=[],views=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:4200',{waitUntil:'networkidle',timeout:60000});await page.waitForFunction(()=>window.__app,undefined,{timeout:120000});await page.evaluate(()=>{window.__app.loop.stop();document.querySelector('#hud').style.visibility='hidden';});
 const shots=[['coast-drive',720,'drive'],['forest-drive',2490,'drive'],['headlands-drive',5230,'drive'],['water-close',860,'water'],['shoreline',1330,'bluff'],['ocean-wide',680,'ocean'],['station-approach',237,'drive'],['headland-shore',5200,'shore']];
 for(const quality of ['high','balanced'])for(const [name,s,kind]of shots){
  views.push(await page.evaluate(async({name,s,kind,quality,first})=>{
   const a=window.__app,T=await import('/node_modules/three/build/three.module.js'),r=await import('/src/world/route.ts');if(first)a.setQuality(quality);a.journey.start(0,'free');a.spawn(s);a.journey.phase='driving';a.renderer.skyTime=72;a.cameraSnap=true;a.render(1);
   const camera=a.renderer.camera,focus=new T.Vector3(r.roadX(s)+3,1,-s);camera.fov=58;
   if(kind==='water'){camera.position.set(r.roadX(s)-110,-4.6,-s+24);camera.lookAt(r.roadX(s)-215,-6.2,-s-60);camera.fov=54;focus.copy(camera.position);}
   if(kind==='bluff'){camera.position.set(r.roadX(s)-28,13,-s+27);camera.lookAt(r.roadX(s+30)-44,-3,-s-30);camera.fov=54;focus.copy(camera.position);}
   if(kind==='ocean'){camera.position.set(r.roadX(s)-30,8,-s+20);camera.lookAt(r.roadX(s)-260,-4.5,-s-75);camera.fov=56;focus.copy(camera.position);}
   if(kind==='shore'){camera.position.set(r.roadX(s)-24,10,-s+20);camera.lookAt(r.roadX(s+35)-78,-5,-s-35);camera.fov=54;focus.copy(camera.position);}
   camera.updateProjectionMatrix();a.renderer.updateAtmosphere(0,focus);a.coast.update(72,0,a.renderer.lightDirection,focus,true);if(a.coast.ocean)a.coast.ocean.refresh();if(quality==='balanced')a.renderer.render();else a.postfx.render();
   return{name,s,kind,quality,camera:camera.position.toArray(),time:a.renderer.atmosphereTime};
  },{name,s,kind,quality,first:name==='coast-drive'}));await page.screenshot({path:`${output}/${quality}-${name}.png`});
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{const a=window.__app;a.setQuality('balanced');a.spawn(720);a.cameraSnap=true;a.lastFrame=0;a.render(1);document.querySelector('#hud').style.visibility='visible';a.ui.update(0,720,a.position.x,100,false);});await page.screenshot({path:`${output}/phone-drive.png`});
 await page.setViewportSize({width:1400,height:900});await page.evaluate(()=>{document.querySelector('#hud').style.visibility='hidden';});
 await fs.writeFile(`${output}/evidence.json`,JSON.stringify({stage,errors,views},null,2));if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({stage,errors,views:views.length}));
}finally{await browser.close();}
