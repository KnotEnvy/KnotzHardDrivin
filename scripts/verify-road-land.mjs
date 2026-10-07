import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const output='artifacts/road-land';const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],pacing=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:4200',{waitUntil:'networkidle',timeout:60000});await page.waitForFunction(()=>window.__app,undefined,{timeout:120000});await page.evaluate(()=>window.__app.loop.stop());
 const geometry=await page.evaluate(async()=>{
  const a=window.__app,T=await import('/node_modules/three/build/three.module.js'),r=await import('/src/world/route.ts'),sectors=a.coast.group.children.filter(x=>x.name.startsWith('Land sector ')),samples=[];
  for(const [s,off]of [[720,20.7],[250,28],[2490,27.6],[3002,-29.2],[5200,41.3],[6012,23.7]]){
   const mesh=sectors[Math.floor((s+150)/200)].levels[0].object;mesh.updateWorldMatrix(true,false);const ray=new T.Raycaster(new T.Vector3(r.roadX(s)+off,300,-s),new T.Vector3(0,-1,0)),hit=ray.intersectObject(mesh)[0],expected=a.coast.surfaceHeight(off,s);if(!hit)throw Error('Missing land under actor position');samples.push({s,off,expected,rendered:hit.point.y,error:Math.abs(hit.point.y-expected)});
  }
  const {SEA_LEVEL}=await import('/src/world/TerrainProfile.ts');const offshore=[];
  a.coast.landscape.group.updateWorldMatrix(true,true);
  for(const habitat of a.coast.landscape.group.children.filter(x=>x.name.startsWith('Sandstone habitat'))){
   const mesh=habitat.levels[0].object.children[0];mesh.geometry.computeBoundingBox();
   for(let i=0;i<mesh.count;i++){const matrix=new T.Matrix4();mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);const center=new T.Vector3().setFromMatrixPosition(matrix),off=center.x-r.roadX(-center.z);if(off< -60){const bounds=mesh.geometry.boundingBox.clone().applyMatrix4(matrix);offshore.push({bottom:bounds.min.y,top:bounds.max.y});}}
  }
  if(offshore.length!==130||offshore.some(x=>x.bottom>SEA_LEVEL-1.5||x.top<SEA_LEVEL+.15))throw Error('Offshore rocks do not meet the water');
  const materials=[];a.coast.group.traverse(o=>{if(o.isMesh){for(const material of Array.isArray(o.material)?o.material:[o.material])if(!materials.includes(material.name))materials.push(material.name)}});
  return{sectors:sectors.length,samples,offshore:{count:offshore.length,allSubmerged:true},landscape:a.coast.landscape.inspect(),lifeActors:a.coast.life.inspect().length,materials,terrainLevels:sectors[0].levels.map(x=>({distance:x.distance,triangles:x.object.geometry.index.count/3}))};
 });
 if(geometry.sectors!==32||geometry.samples.some(x=>x.error>.001)||geometry.lifeActors!==48||geometry.landscape.plants<700)throw Error(`Bad environment integration ${JSON.stringify(geometry)}`);
 for(const quality of ['high','balanced']){
  await page.evaluate(quality=>window.__app.setQuality(quality),quality);
  for(const s of [720,2490,5230]){
   await page.evaluate(s=>{const a=window.__app;a.journey.start(0,'free');a.spawn(s);a.traffic.reset(s);a.journey.phase='driving';a.input.clear();a.cameraSnap=true;a.frameTimes=[];a.wasDriving=false;a.lastFrame=performance.now();a.loop.start();},s);
   await page.waitForFunction(()=>window.__app.frameTimes.length>=20,undefined,{timeout:60000});await page.evaluate(()=>{window.__app.frameTimes=[]});await page.waitForTimeout(2500);
   pacing.push(await page.evaluate(({s,quality})=>{const a=window.__app;a.loop.stop();const times=[...a.frameTimes].sort((x,y)=>x-y);return{s,quality,frames:times.length,averageMs:times.reduce((x,y)=>x+y,0)/times.length,p95Ms:times[Math.floor(times.length*.95)]};},{s,quality}));
  }
 }
 const pause=await page.evaluate(async()=>{const a=window.__app;a.journey.pause();a.lastFrame=0;a.render(1);const first=a.coast.landscape.wind.value;await new Promise(r=>setTimeout(r,120));a.render(1);return{frozen:first===a.coast.landscape.wind.value};});if(!pause.frozen)throw Error('Landscape wind advanced while paused');
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{const a=window.__app;a.journey.phase='driving';a.spawn(720);a.cameraSnap=true;a.render(1);a.ui.update(0,720,a.position.x,100,false)});await page.screenshot({path:`${output}/verification-phone.png`});
 await page.goto('http://127.0.0.1:4200/artifacts/road-land/road-gallery.html',{waitUntil:'networkidle'});await page.waitForFunction(()=>[...document.images].every(x=>x.complete&&x.naturalWidth>0));
 const phone=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));if(phone.scroll>phone.width)throw Error('Phone gallery overflows');await page.screenshot({path:`${output}/gallery-phone.png`});
 await page.setViewportSize({width:1280,height:800});const range=page.locator('input[type=range]').first();await range.focus();await page.keyboard.press('End');const split=await range.evaluate(e=>getComputedStyle(e.closest('.card').querySelector('.compare')).getPropertyValue('--split').trim());if(split!=='100%')throw Error('Comparison slider is not operable');await page.keyboard.press('Home');
 await page.getByRole('button',{name:'Balanced',exact:true}).click();await page.waitForFunction(()=>[...document.images].every(x=>x.complete&&x.naturalWidth>0));const balanced=await page.locator('.compare .after').first().getAttribute('src');if(!balanced.includes('balanced-'))throw Error('Preset switch did not change images');await page.getByRole('button',{name:'High',exact:true}).click();await page.waitForFunction(()=>[...document.images].every(x=>x.complete&&x.naturalWidth>0));
 const gallery=await page.evaluate(()=>({images:document.images.length,width:innerWidth,scroll:document.documentElement.scrollWidth}));if(gallery.images!==20||gallery.scroll>gallery.width)throw Error('Gallery incomplete');await page.screenshot({path:`${output}/gallery-desktop.png`});
 await fs.writeFile(`${output}/verification.json`,JSON.stringify({errors,geometry,pacing,pause,gallery,phone,slider:split,preset:balanced,note:'Short headless D3D11 High/Balanced samples at 1280x800, warmed for at least 20 frames, no video recording.'},null,2));if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({errors,geometry,pacing,pause,gallery,phone}));
}finally{await browser.close();}
