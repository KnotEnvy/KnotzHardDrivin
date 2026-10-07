import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const output='artifacts/world-life',metadata=JSON.parse(await fs.readFile(`${output}/motion.json`,'utf8'));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:4200/artifacts/world-life/world-gallery.html',{waitUntil:'networkidle'});await page.evaluate(()=>document.querySelectorAll('img').forEach(x=>x.loading='eager'));
 await page.waitForFunction(()=>[...document.images].every(x=>x.complete&&x.naturalWidth>0));await page.waitForFunction(()=>document.querySelector('video').readyState>=1);
 const gallery=await page.evaluate(()=>({images:document.images.length,videoDuration:document.querySelector('video').duration,width:innerWidth,scroll:document.documentElement.scrollWidth}));
 if(gallery.images!==15||gallery.scroll>gallery.width||Math.abs(gallery.videoDuration-metadata.movie.duration)>.3)throw Error(`Gallery incomplete: ${JSON.stringify(gallery)}`);
 await page.evaluate(()=>document.querySelector('video').play());await page.waitForTimeout(500);gallery.playback=await page.evaluate(()=>{const v=document.querySelector('video'),ok=!v.paused&&v.currentTime>.1;v.pause();return ok;});if(!gallery.playback)throw Error('Showcase does not play');
 await page.screenshot({path:`${output}/gallery-desktop.png`});await page.setViewportSize({width:390,height:844});const phone=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));if(phone.scroll>phone.width)throw Error('Gallery overflows on phone');await page.screenshot({path:`${output}/gallery-phone.png`});
 if(errors.length)throw Error(errors.join('\n'));
 const report={errors,gallery,phone,movie:metadata.movie};await fs.writeFile(`${output}/gallery-verification.json`,JSON.stringify(report,null,2));
 const verified=JSON.parse(await fs.readFile(`${output}/verification.json`,'utf8'));verified.gallery=gallery;verified.phone=phone;verified.movie=metadata.movie;await fs.writeFile(`${output}/verification.json`,JSON.stringify(verified,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
