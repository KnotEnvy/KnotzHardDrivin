import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const output='artifacts/juice/model-details';await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
try{
const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('http://127.0.0.1:4200',{waitUntil:'networkidle',timeout:60000});await page.waitForFunction(()=>!!window.__app,undefined,{timeout:90000});
await page.evaluate(()=>window.__app.loop.stop());await page.addStyleTag({content:'#app > :not(canvas){display:none!important}'});
const names=['vela-gt','traffic-sedan','traffic-wagon','traffic-compact','traffic-pickup','traffic-camper','last-light-station','horizon-lodge','pacific-point','pacific-palm','pacific-redwood','pacific-overlook'];
const bounds=[];
for(const name of names){
 bounds.push(await page.evaluate(async name=>{
  const {LIGHTING}=await import('/src/config/lighting.config.ts');const T=await import('/node_modules/three/build/three.module.js');const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
  const a=window.__app,scene=new T.Scene();scene.background=new T.Color(0x18252a);scene.environment=a.renderer.scene.environment;scene.environmentIntensity=LIGHTING.studio.reflections;
  const model=(await new GLTFLoader().loadAsync(`/assets/${name}.glb`)).scene;
  if(name==='vela-gt'){
   const {createWheel}=await import('/src/entities/CarModel.ts');for(const x of [-.85,.85])for(const z of [-1.45,1.45]){const w=createWheel();w.position.set(x,-.3,z);model.add(w);}
  }
  const b=new T.Box3().setFromObject(model,true),size=b.getSize(new T.Vector3()),center=b.getCenter(new T.Vector3());
  const original={name,min:b.min.toArray(),max:b.max.toArray()};
  if(name.startsWith('traffic-')){
    const {TRAFFIC_SIZE}=await import('/src/entities/TrafficModels.ts');const footprint=TRAFFIC_SIZE[name.slice(8)];
    if(Math.max(Math.abs(b.min.x),Math.abs(b.max.x))>footprint.width+.001||Math.max(Math.abs(b.min.z),Math.abs(b.max.z))>footprint.length+.001||b.min.y<-.685||b.max.y>2*footprint.height-.679)throw new Error(`${name}: model exceeds collision bounds`);
  }model.position.sub(center);model.position.y+=size.y/2;scene.add(model);
  const hemi=new T.HemisphereLight(0xb3d3e5,0x413525,LIGHTING.studio.skyFill);scene.add(hemi);
  const light=new T.DirectionalLight(0xffe0bd,LIGHTING.studio.key);light.position.set(-8,16,-14);scene.add(light);
  const fill=new T.DirectionalLight(0x9bcbdc,LIGHTING.studio.fill);fill.position.set(10,7,9);scene.add(fill);
  const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:0x293638,roughness:.88}));floor.rotation.x=-Math.PI/2;floor.position.y=-.02;scene.add(floor);
  const camera=new T.PerspectiveCamera(38,1.4,.1,300);const extent=Math.max(size.x,size.z,size.y*1.1);
  camera.position.set(extent*.88,size.y*.6+extent*.28,(name.includes('lodge')||name.includes('station')?1:-1)*extent*1.15);camera.lookAt(0,size.y*.45,0);
  a.renderer.gl.render(scene,camera);return original;
 },name));
 await page.screenshot({path:`${output}/${name}.png`,timeout:60000});
}
await page.evaluate(async()=>{
 const a=window.__app,T=await import('/node_modules/three/build/three.module.js');a.journey.start(0,'free');a.journey.phase='driving';a.spawn(90);a.vehicle.syncMesh(1);
 a.renderer.camera.position.copy(a.vehicle.mesh.position).add(new T.Vector3(0,4,0));a.renderer.camera.lookAt(a.vehicle.mesh.position.clone().add(new T.Vector3(-20,20,-30)));a.renderer.camera.fov=70;a.renderer.camera.updateProjectionMatrix();a.renderer.gl.render(a.renderer.scene,a.renderer.camera);
});await page.screenshot({path:`${output}/sky-start.png`});
const trafficCheck=await page.evaluate(async()=>{
 const a=window.__app,T=await import('/node_modules/three/build/three.module.js'),r=await import('/src/world/route.ts');a.traffic.reset(100);let minDot=1;
 for(let f=0;f<120;f++){
  a.traffic.update(1/60,new T.Vector3(r.roadX(100),.7,-100),20);
  for(const alpha of [0,.25,.75,1]){
   a.traffic.syncMeshes(alpha);
   for(const d of a.traffic.drivers){const yaw=r.roadHeading(d.s)+(d.cruise<0?Math.PI:0);const facing=new T.Vector3(0,0,-1).applyQuaternion(d.mesh.quaternion);minDot=Math.min(minDot,facing.dot(new T.Vector3(-Math.sin(yaw),0,-Math.cos(yaw))));}
  }
 }
 return {minDot,variants:[...new Set(a.traffic.drivers.map(d=>d.kind))]};
});
if(trafficCheck.minDot<.999)throw new Error('Loaded traffic changed facing direction');
const lighting=await page.evaluate(()=>{const a=window.__app;const before={time:a.renderer.atmosphereTime,sun:a.renderer.lightDirection.toArray(),intensity:a.renderer.sun.intensity};for(let i=0;i<1200;i++)a.renderer.updateAtmosphere(.1,a.position);a.coast.update(a.renderer.atmosphereTime,0);a.renderer.gl.render(a.renderer.scene,a.renderer.camera);return {before,after:{time:a.renderer.atmosphereTime,sun:a.renderer.lightDirection.toArray(),intensity:a.renderer.sun.intensity}};});
await page.screenshot({path:`${output}/sky-later.png`});
await fs.writeFile(`${output}/traffic.json`,JSON.stringify(trafficCheck,null,2));
await fs.writeFile(`${output}/bounds.json`,JSON.stringify(bounds,null,2));await fs.writeFile(`${output}/lighting.json`,JSON.stringify(lighting,null,2));await fs.writeFile(`${output}/errors.json`,JSON.stringify(errors,null,2));console.log(JSON.stringify({output,errors,lighting,trafficCheck}));
}finally{await browser.close();}
