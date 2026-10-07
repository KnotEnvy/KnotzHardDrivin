import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const output='artifacts/water',metadata=JSON.parse(await fs.readFile(`${output}/motion.json`,'utf8'));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:4200/artifacts/water/water-gallery.html',{waitUntil:'networkidle'});await page.evaluate(()=>document.querySelectorAll('img').forEach(x=>x.loading='eager'));
 await page.waitForFunction(()=>[...document.images].every(x=>x.complete&&x.naturalWidth>0));await page.waitForFunction(()=>document.querySelector('video').readyState>=1);
 const critics=JSON.parse(await fs.readFile(`${output}/critics.json`,'utf8'));const rows=await page.locator('table tbody tr').allTextContents();if(rows.length!==3||critics.judges.some((x,i)=>!rows[i].includes(x.label)||!rows[i].includes(x.overall.toFixed(1))||!rows[i].includes(x.water.toFixed(1))))throw Error('Critic grades are missing from the gallery');
 const gallery=await page.evaluate(()=>({images:document.images.length,critics:document.querySelectorAll('table tbody tr').length,videoDuration:document.querySelector('video').duration,width:innerWidth,scroll:document.documentElement.scrollWidth}));
 if(gallery.images!==17||gallery.scroll>gallery.width||Math.abs(gallery.videoDuration-metadata.movie.duration)>.3)throw Error(`Gallery incomplete: ${JSON.stringify(gallery)}`);
 await page.evaluate(()=>document.querySelector('video').play());await page.waitForTimeout(500);gallery.playback=await page.evaluate(()=>{const v=document.querySelector('video'),ok=!v.paused&&v.currentTime>.1;v.pause();return ok;});if(!gallery.playback)throw Error('Showcase does not play');
 const range=page.locator('input[type=range]').first();await range.focus();await page.keyboard.press('End');const split=await range.evaluate(e=>getComputedStyle(e.closest('.card').querySelector('.compare')).getPropertyValue('--split').trim());if(split!=='100%')throw Error('Water comparison keyboard control failed');await page.keyboard.press('Home');
 await page.getByRole('button',{name:'Balanced',exact:true}).click();await page.waitForFunction(()=>[...document.images].every(x=>x.complete&&x.naturalWidth>0));if(!(await page.locator('.compare .after').first().getAttribute('src')).includes('balanced-'))throw Error('Water preset comparison failed');await page.getByRole('button',{name:'High',exact:true}).click();await page.waitForFunction(()=>[...document.images].every(x=>x.complete&&x.naturalWidth>0));gallery.comparison=true;
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${output}/gallery-desktop.png`});await page.setViewportSize({width:390,height:844});const phone=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));if(phone.scroll>phone.width)throw Error('Gallery overflows on phone');await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${output}/gallery-phone.png`});await page.locator('table').scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/gallery-phone-critics.png`});
 if(errors.length)throw Error(errors.join('\n'));
 const report={errors,gallery,phone,movie:metadata.movie};await fs.writeFile(`${output}/gallery-verification.json`,JSON.stringify(report,null,2));
 const verified=JSON.parse(await fs.readFile(`${output}/verification.json`,'utf8'));verified.gallery=gallery;verified.phone=phone;verified.movie=metadata.movie;await fs.writeFile(`${output}/verification.json`,JSON.stringify(verified,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
