import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const output='artifacts/world-life',movieMetadata=JSON.parse(await fs.readFile(`${output}/motion.json`,'utf8')),expectedDuration=movieMetadata.movie?.duration??movieMetadata.duration;
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],pacing=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:4200',{waitUntil:'networkidle',timeout:60000});await page.waitForFunction(()=>window.__app,undefined,{timeout:90000});await page.evaluate(()=>window.__app.loop.stop());
 const safety=await page.evaluate(async()=>{
  const a=window.__app,T=await import('/node_modules/three/build/three.module.js'),r=await import('/src/world/route.ts'),life=a.coast.life,minimum={dog:Infinity,deer:Infinity,cyclist:Infinity,gull:Infinity};let finite=true,steps=0;
  for(const anchor of [237,990,1977,2180,2390,2980,3280,3490,3717,4700,5457]){
   const focus=new T.Vector3(r.roadX(anchor)+3.1,1,-anchor);
   for(let j=0;j<300;j++){
    life.update(100+steps*.1,focus,true);steps++;
    for(const actor of life.inspect().filter(x=>x.visible)){
     finite&&=actor.position.every(Number.isFinite);
     if(['dog','deer','cyclist'].includes(actor.kind))minimum[actor.kind]=Math.min(minimum[actor.kind],Math.abs(r.roadOffset(actor.position[0],actor.position[2])));
     if(actor.kind==='gull')minimum.gull=Math.min(minimum.gull,actor.position[1]);
    }
   }
  }
  return{actors:life.inspect().length,counts:life.inspect().reduce((m,x)=>(m[x.kind]=(m[x.kind]??0)+1,m),{}),minimum,finite,steps};
 });
 if(!safety.finite||safety.actors!==48||safety.minimum.dog<10||safety.minimum.deer<13||safety.minimum.cyclist<10||safety.minimum.gull<5.49)throw Error(`Unsafe placement: ${JSON.stringify(safety)}`);
 await page.evaluate(()=>{const a=window.__app;a.journey.start(0,'free');a.spawn(237);a.journey.phase='driving';a.input.clear();a.hornHeld=false;a.lastHorn=-Infinity;a.renderer.skyTime=500;a.render(1);a.coast.life.update(500,a.position,false);});
 await page.keyboard.press('h');
 const horn=await page.evaluate(()=>{const a=window.__app,dog=a.coast.life.actors.find(x=>x.kind==='dog');a.update(1/60);a.coast.life.update(500,a.position,true);return{input:a.input.state.horn,attention:dog.attention};});
 if(!horn.input||horn.attention<.99)throw Error('Actual keyboard horn did not greet the dog');
 const pause=await page.evaluate(async()=>{
  const a=window.__app;a.journey.pause();a.lastFrame=0;a.render(1);
  const snapshot=()=>JSON.stringify({time:a.renderer.atmosphereTime,actors:a.coast.life.actors.map(x=>({p:x.root.position.toArray(),r:x.root.rotation.toArray(),attention:x.attention,j:[...x.joints.values()].map(j=>j.node.rotation.toArray())}))});
  const first=snapshot();for(let i=0;i<4;i++){await new Promise(r=>setTimeout(r,65));a.render(1);}return{frozen:first===snapshot()};
 });if(!pause.frozen)throw Error('Paused world life changed pose or attention');
 // Same-host A/B with no video recording; alternate order to reduce warm-up bias.
 for(const [s,states]of [[237,[false,true]],[990,[true,false]],[2180,[false,true]]])for(const visible of states){
  await page.evaluate(({s,visible})=>{const a=window.__app;a.setQuality('high');a.journey.start(0,'free');a.spawn(s);a.journey.phase='driving';a.input.clear();a.cameraSnap=true;a.coast.life.group.visible=visible;a.frameTimes=[];a.wasDriving=false;a.lastFrame=performance.now();a.loop.start();},{s,visible});
  await page.waitForFunction(()=>window.__app.frameTimes.length>=20,undefined,{timeout:60000});await page.evaluate(()=>{window.__app.frameTimes=[]});await page.waitForTimeout(2500);
  pacing.push(await page.evaluate(({s,visible})=>{const a=window.__app;a.loop.stop();const f=[...a.frameTimes].sort((x,y)=>x-y);return{s,lifeVisible:visible,frames:f.length,averageMs:f.reduce((a,b)=>a+b,0)/f.length,p95Ms:f[Math.floor(f.length*.95)]};},{s,visible}));
 }
 await page.evaluate(()=>{window.__app.coast.life.group.visible=true;window.__app.loop.stop();});
 await fs.writeFile(`${output}/verification-game.json`,JSON.stringify({errors,safety,horn,pause,pacing},null,2));
 await page.goto('http://127.0.0.1:4200/artifacts/world-life/world-gallery.html',{waitUntil:'networkidle'});await page.evaluate(()=>document.querySelectorAll('img').forEach(x=>x.loading='eager'));
 await page.waitForFunction(()=>[...document.images].every(x=>x.complete&&x.naturalWidth>0));const media=await page.evaluate(()=>{const v=document.querySelector('video');return{ready:v.readyState,error:v.error?.message,mp4:v.canPlayType('video/mp4; codecs="avc1.42E01E"'),webm:v.canPlayType('video/webm; codecs="vp9"')};});console.log(JSON.stringify({media}));await page.waitForFunction(()=>document.querySelector('video').readyState>=1);
 const gallery=await page.evaluate(()=>({images:document.images.length,videoDuration:document.querySelector('video').duration,width:innerWidth,scroll:document.documentElement.scrollWidth}));
 if(gallery.images!==15||gallery.scroll>gallery.width||Math.abs(gallery.videoDuration-expectedDuration)>.3)throw Error(`Gallery incomplete: ${JSON.stringify(gallery)}`);
 await page.evaluate(()=>document.querySelector('video').play());await page.waitForTimeout(350);gallery.playback=await page.evaluate(()=>{const v=document.querySelector('video'),ok=!v.paused&&v.currentTime>.1;v.pause();return ok;});if(!gallery.playback)throw Error('Showcase video does not play');await page.screenshot({path:`${output}/gallery-desktop.png`});await page.setViewportSize({width:390,height:844});
 const phone=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));if(phone.scroll>phone.width)throw Error('Gallery overflows on phone');await page.screenshot({path:`${output}/gallery-phone.png`});
 await fs.writeFile(`${output}/verification.json`,JSON.stringify({errors,safety,horn,pause,pacing,gallery,phone,note:'Short headless D3D11 samples at High, 1280x800, no video. A/B hides only WorldLife geometry; updates still run.'},null,2));
 if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({errors,safety,horn,pause,pacing,gallery,phone}));
}finally{await browser.close();}
