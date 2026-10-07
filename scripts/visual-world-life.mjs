import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const output='artifacts/world-life';await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
try{
 const page=await browser.newPage({viewport:{width:1400,height:900}}),errors=[],models=[],scenes=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:4200',{waitUntil:'networkidle',timeout:60000});await page.waitForFunction(()=>window.__app,undefined,{timeout:90000});await page.evaluate(()=>window.__app.loop.stop());await page.addStyleTag({content:'#hud{visibility:hidden!important}'});
 for(const kind of ['dog','gull','visitor','cyclist','deer','kite','picnic']){
  models.push(await page.evaluate(async kind=>{
   const T=await import('/node_modules/three/build/three.module.js'),{GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js'),{LIGHTING}=await import('/src/config/lighting.config.ts');
   const a=window.__app,model=(await new GLTFLoader().loadAsync(`/assets/pacific-${kind}.glb`)).scene,b=new T.Box3().setFromObject(model,true),size=b.getSize(new T.Vector3()),center=b.getCenter(new T.Vector3());model.position.sub(center);model.position.y+=size.y/2;
   const scene=new T.Scene();scene.background=new T.Color(0x18252a);scene.environment=a.renderer.scene.environment;scene.environmentIntensity=LIGHTING.studio.reflections;scene.add(model);
   scene.add(new T.HemisphereLight(0xb3d3e5,0x413525,LIGHTING.studio.skyFill));const light=new T.DirectionalLight(0xffe0bd,LIGHTING.studio.key);light.position.set(-8,16,-14);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-6;light.shadow.camera.right=6;light.shadow.camera.top=6;light.shadow.camera.bottom=-6;light.shadow.normalBias=.025;scene.add(light);
   const fill=new T.DirectionalLight(0x9bcbdc,LIGHTING.studio.fill);fill.position.set(10,7,9);scene.add(fill);const floor=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial({color:0x293638,roughness:.9}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.position.y=-.015;scene.add(floor);
   let triangles=0;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3}});
   const camera=new T.PerspectiveCamera(38,1400/900,.1,200),extent=Math.max(size.x,size.z,size.y*1.15);camera.position.set(extent*1.12,size.y*.7+extent*.40,-extent*1.6);camera.lookAt(0,size.y*.5,0);a.renderer.gl.render(scene,camera);
   return{kind,triangles,min:b.min.toArray(),max:b.max.toArray(),head:model.getObjectByName('Head')?.position.toArray(),wing:model.getObjectByName('WingL')?.position.toArray()};
  },kind));await page.screenshot({path:`${output}/model-${kind}.png`});
 }
 const stops=[['station',237],['gulls',170],['beach',660],['cyclist',990],['redwoods',2180],['lodge',1120],['headlands',5470],['sunset-kites',5650]];
 for(const [name,s]of stops){
  scenes.push(await page.evaluate(async({name,s})=>{
   const a=window.__app,T=await import('/node_modules/three/build/three.module.js'),r=await import('/src/world/route.ts');a.setQuality('high');a.journey.start(0,'free');a.spawn(s-20);a.journey.phase='driving';a.cameraSnap=true;a.renderer.skyTime=40;a.render(1);
   const wanted=a.coast.life.actors.filter(x=>Math.abs(x.s-s)<90&&x.kind!== 'gull'&&x.kind!== 'kite').sort((x,y)=>Math.abs(x.s-s)-Math.abs(y.s-s))[0];
   let target=wanted?.root.position.clone()??new T.Vector3(r.roadX(s)-10,7,-s);
   if(name==='gulls')target=new T.Vector3(r.roadX(s)-12,11,-s);
   if(name.includes('kite')||name==='beach')target=new T.Vector3(r.roadX(s)-23,8,-s);
   if(name==='station'||name==='headlands')target.add(new T.Vector3(0,1.0,0));
   const camera=a.renderer.camera;camera.position.set(r.roadX(s-17)+4,3.6,-s+17);camera.lookAt(target);camera.fov=name==='gulls'?58:44;camera.updateProjectionMatrix();a.renderer.updateAtmosphere(0,a.position);a.coast.update(a.renderer.atmosphereTime,0,a.renderer.lightDirection,a.position,true);a.postfx.render();
   return {name,s,visible:a.coast.life.inspect().filter(x=>x.visible),calls:a.renderer.gl.info.render.calls};
  },{name,s}));await page.screenshot({path:`${output}/${name}.png`});
 }
 const interaction=await page.evaluate(()=>{const a=window.__app;const dog=a.coast.life.actors.find(x=>x.kind==='dog');const p=dog.root.position.clone();a.coast.life.update(80,p,false);const before=dog.attention;const reactions=a.coast.life.honk(p);a.coast.life.update(80.1,p,true);const after=dog.attention;const h=dog.joints.get('Head');return{before,after,reactions,headRotation:h.node.rotation.toArray()};});
 if(interaction.after<.95||interaction.reactions===0)throw Error('Nearby horn did not trigger the dog greeting');
 const poses=await page.evaluate(()=>{const a=window.__app,life=a.coast.life;life.update(90,a.position,false);const first=life.actors.map(x=>({id:x.id,p:x.root.position.toArray(),j:[...x.joints].map(([name,j])=>[name,j.node.rotation.toArray()])}));life.update(93,a.position,false);return{first,second:life.actors.map(x=>({id:x.id,p:x.root.position.toArray(),j:[...x.joints].map(([name,j])=>[name,j.node.rotation.toArray()])}))};});
 if(JSON.stringify(poses.first)===JSON.stringify(poses.second))throw Error('World did not animate');
 await fs.writeFile(`${output}/evidence.json`,JSON.stringify({errors,models,scenes,interaction,poses},null,2));console.log(JSON.stringify({output,errors,models,interaction}));
}finally{await browser.close();}
