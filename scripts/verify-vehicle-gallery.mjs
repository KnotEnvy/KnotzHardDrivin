import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const output='artifacts/juice/vehicles-v2';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
try{
 const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:4200/artifacts/juice/detail-gallery.html',{waitUntil:'networkidle'});
 if(await page.locator('.vehicle').count()!==6||await page.locator('.paints .card').count()!==25)throw Error('Vehicle or paint studies missing');
 const galleryImages=await page.locator('.vehicle .current').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0));if(!galleryImages)throw Error('Missing model image');
 for(const angle of ['side','rear','front']){
  await page.locator(`.vehicle [data-angle="${angle}"]`).evaluateAll(buttons=>buttons.forEach(b=>b.click()));
  await page.waitForFunction(angle=>[...document.querySelectorAll('.vehicle .current')].every(i=>i.src.includes(`-${angle}.png`)&&i.complete&&i.naturalWidth>0),angle);
  if(await page.locator(`.vehicle [data-angle="${angle}"][aria-pressed="true"]`).count()!==6)throw Error('View selector state incorrect');
 }
 await page.locator('.grid').first().screenshot({path:`${output}/collection.png`,timeout:60000});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${output}/gallery-mobile.png`});
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Gallery overflows narrow screen');
 await page.setViewportSize({width:1400,height:1000});await page.goto('http://127.0.0.1:4200',{waitUntil:'networkidle',timeout:60000});await page.waitForFunction(()=>!!window.__app,undefined,{timeout:90000});
 await page.evaluate(()=>window.__app.loop.stop());
 const button=page.getByRole('button',{name:'Coastal clay paint',exact:true});await button.click();
 const checkPaint=()=>page.evaluate(()=>{
  const a=window.__app;a.loop.stop();a.render(1);const paints=[];a.vehicle.mesh.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.name==='Vela coachwork')paints.push(m.color.getHex());});
  const saved=JSON.parse(localStorage.getItem('pacific-run-v1'));if(paints.length===0||paints.some(c=>c!==0xa77b5b)||saved.color!==0xa77b5b)throw Error('Selected garage paint did not reach loaded body or save');return{savedColor:saved.color,bodyPaints:paints};
 });
 const selected=await checkPaint();await page.screenshot({path:`${output}/garage-clay.png`});
 await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__app,undefined,{timeout:90000});const restored=await checkPaint();
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{window.__app.render(1);window.__app.ui.update(0,0,0,100,false);});
 const layout=await page.evaluate(()=>{
  const buttons=[...document.querySelectorAll('[data-color]')].map(b=>{const r=b.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom};});
  const label=document.querySelector('.car-label').getBoundingClientRect(),routes=document.querySelector('.route-select').getBoundingClientRect();
  return{buttons,labelBottom:label.bottom,routeTop:routes.top,width:innerWidth,scrollWidth:document.documentElement.scrollWidth};
 });
 if(layout.buttons.length!==10||layout.scrollWidth>layout.width||layout.labelBottom>layout.routeTop)throw Error(`Garage palette layout invalid: ${JSON.stringify(layout)}`);
 for(const choice of await page.locator('[data-color]').all()){
  await choice.click();const rect=await choice.boundingBox();if(!rect||rect.x<0||rect.x+rect.width>390)throw Error('Mobile paint cannot be reached');
 }
 await page.screenshot({path:`${output}/garage-clay-mobile.png`});
 await fs.writeFile(`${output}/gallery-check.json`,JSON.stringify({errors,galleryImages,views:3,paintStudies:25,selected,restored,layout},null,2));console.log(JSON.stringify({output,errors,selected,restored,layout}));
}finally{await browser.close();}
