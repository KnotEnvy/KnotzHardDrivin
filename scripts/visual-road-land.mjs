import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const stage=process.argv[2]??'after',output=`artifacts/road-land/${stage}`;await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
try{
 const page=await browser.newPage({viewport:{width:1400,height:900}}),errors=[],views=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:4200',{waitUntil:'networkidle',timeout:60000});await page.waitForFunction(()=>window.__app,undefined,{timeout:120000});await page.evaluate(()=>{window.__app.loop.stop();document.querySelector('#hud').style.visibility='hidden';});
 const shots=[['coast-drive',720,'drive'],['forest-drive',2490,'drive'],['headlands-drive',5230,'drive'],['asphalt',885,'asphalt'],['forest-floor',2600,'ground'],['coastal-bluff',1330,'bluff'],['headland-slope',5200,'slope'],['station-approach',237,'drive']];
 for(const quality of ['high','balanced'])for(const [name,s,kind]of shots){
  views.push(await page.evaluate(async({name,s,kind,quality,first})=>{
   const a=window.__app,T=await import('/node_modules/three/build/three.module.js'),r=await import('/src/world/route.ts');if(first)a.setQuality(quality);a.journey.start(0,'free');a.spawn(s);a.journey.phase='driving';a.renderer.skyTime=72;a.cameraSnap=true;a.render(1);
   const camera=a.renderer.camera,focus=new T.Vector3(r.roadX(s)+3,1,-s);camera.fov=58;
   if(kind==='asphalt'){camera.position.set(r.roadX(s)+.7,.65,-s+6);camera.lookAt(r.roadX(s+5)+.5,.03,-s-5);camera.fov=58;}
   if(kind==='ground'){const y=a.coast.surfaceHeight(19,s);camera.position.set(r.roadX(s)+11,y+2.1,-s+6);camera.lookAt(r.roadX(s+5)+21,a.coast.surfaceHeight(21,s+5)+.2,-s-5);camera.fov=54;focus.copy(camera.position);}
   if(kind==='bluff'){camera.position.set(r.roadX(s)-28,13,-s+27);camera.lookAt(r.roadX(s+30)-44,-3,-s-30);camera.fov=54;focus.copy(camera.position);}
   if(kind==='slope'){camera.position.set(r.roadX(s)+7,4,-s+15);camera.lookAt(r.roadX(s+20)+53,a.coast.surfaceHeight(53,s+20)+3,-s-20);camera.fov=54;focus.copy(camera.position);}
   camera.updateProjectionMatrix();a.renderer.updateAtmosphere(0,focus);a.coast.update(72,0,a.renderer.lightDirection,focus,true);if(quality==='balanced')a.renderer.render();else a.postfx.render();
   return{name,s,kind,quality,camera:camera.position.toArray(),time:a.renderer.atmosphereTime};
  },{name,s,kind,quality,first:name==='coast-drive'}));await page.screenshot({path:`${output}/${quality}-${name}.png`});
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{const a=window.__app;a.setQuality('balanced');a.spawn(720);a.cameraSnap=true;a.lastFrame=0;a.render(1);document.querySelector('#hud').style.visibility='visible';a.ui.update(0,720,a.position.x,100,false);});await page.screenshot({path:`${output}/phone-drive.png`});
 await page.setViewportSize({width:1400,height:900});await page.evaluate(()=>{document.querySelector('#hud').style.visibility='hidden';});
 const models=[];
 if(stage!=='before')for(const kind of ['outcrop','fern','scrub']){
  models.push(await page.evaluate(async kind=>{
   const a=window.__app,T=await import('/node_modules/three/build/three.module.js'),{GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js'),{LIGHTING}=await import('/src/config/lighting.config.ts');
   const model=(await new GLTFLoader().loadAsync(`/assets/pacific-${kind}.glb`)).scene,b=new T.Box3().setFromObject(model,true),size=b.getSize(new T.Vector3()),center=b.getCenter(new T.Vector3());model.position.sub(center);model.position.y+=size.y/2;
   const scene=new T.Scene();scene.background=new T.Color(0x17282a);scene.environment=a.renderer.scene.environment;scene.environmentIntensity=LIGHTING.studio.reflections;scene.add(model,new T.HemisphereLight(0xb3d3e5,0x413525,LIGHTING.studio.skyFill));
   const sun=new T.DirectionalLight(0xffe0bd,LIGHTING.studio.key);sun.position.set(-8,16,-14);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-6;sun.shadow.camera.right=6;sun.shadow.camera.top=6;sun.shadow.camera.bottom=-6;sun.shadow.normalBias=.025;scene.add(sun);
   const fill=new T.DirectionalLight(0x9bcbdc,LIGHTING.studio.fill);fill.position.set(10,7,9);scene.add(fill);const floor=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial({color:0x293638,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.position.y=-.015;scene.add(floor);
   let triangles=0;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
   const camera=new T.PerspectiveCamera(38,1400/900,.1,200),extent=Math.max(size.x,size.z,size.y*1.15);camera.position.set(extent*1.05,size.y*.8+extent*.5,-extent*1.6);camera.lookAt(0,size.y*.48,0);a.renderer.gl.render(scene,camera);return{kind,triangles,size:size.toArray()};
  },kind));await page.screenshot({path:`${output}/model-${kind}.png`});
 }
 await fs.writeFile(`${output}/evidence.json`,JSON.stringify({stage,errors,views,models},null,2));if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({stage,errors,views:views.length}));
}finally{await browser.close();}
