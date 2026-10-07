import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const output='artifacts/juice/vehicle-colors';await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
try{
 const only=process.argv[2],kinds=['sedan','wagon','compact','pickup','camper'];
 const page=await browser.newPage({viewport:{width:840,height:600}}),errors=[],report=only?JSON.parse(await fs.readFile(`${output}/paints.json`,'utf8')).filter(p=>p.kind!==only):[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:4200',{waitUntil:'networkidle',timeout:60000});await page.waitForFunction(()=>!!window.__app,undefined,{timeout:90000});
 await page.evaluate(()=>window.__app.loop.stop());await page.addStyleTag({content:'#app > :not(canvas){display:none!important}'});
 const paints=await page.evaluate(async()=>{
  const {LIGHTING}=await import('/src/config/lighting.config.ts');const T=await import('/node_modules/three/build/three.module.js'),models=await import('/src/entities/TrafficModels.ts'),{VEHICLE_PAINTS}=await import('/src/entities/VehiclePaints.ts');
  const templates=await models.loadTrafficModels(),scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1.4,.1,100);
  scene.background=new T.Color(0x18252a);scene.environment=window.__app.renderer.scene.environment;scene.environmentIntensity=LIGHTING.studio.reflections;
  scene.add(new T.HemisphereLight(0xb3d3e5,0x413525,LIGHTING.studio.skyFill));const key=new T.DirectionalLight(0xffe0bd,LIGHTING.studio.key);key.position.set(-8,16,-14);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-8;key.shadow.camera.right=8;key.shadow.camera.top=8;key.shadow.camera.bottom=-8;key.shadow.camera.far=60;key.shadow.normalBias=.025;key.shadow.intensity=.7;scene.add(key);
  const fill=new T.DirectionalLight(0x9bcbdc,LIGHTING.studio.fill);fill.position.set(10,7,9);scene.add(fill);
  const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:0x293638,roughness:.9}));floor.rotation.x=-Math.PI/2;floor.position.y=-.012;floor.receiveShadow=true;scene.add(floor);
  window.colorStudio={T,models,templates,scene,camera,current:null};return VEHICLE_PAINTS;
 });
 for(let family=0;family<5;family++)for(let i=0;i<5;i++){
  if(only&&kinds[family]!==only)continue;
  const paint=paints[(family*2+i*3)%paints.length];
  const metrics=await page.evaluate(({family,paint})=>{
   const s=window.colorStudio,{T,scene,camera}=s;if(s.current){scene.remove(s.current);s.current.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.name.startsWith('Traffic enamel')||m.name.startsWith('Traffic accent'))m.dispose();});}
   const car=s.models.trafficModel(s.templates[family],paint.color),bounds=new T.Box3().setFromObject(car,true),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
   const observed=[];car.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.name.startsWith('Traffic enamel'))observed.push(m.color.getHex());});
   if(observed.length!==2||observed.some(c=>c!==paint.color))throw Error('Clone paint did not reach both model detail levels');
   car.position.sub(center);car.position.y+=size.y/2;scene.add(car);s.current=car;
   const extent=Math.max(size.x,size.z,size.y*1.1);camera.position.set(extent*.88,size.y*.6+extent*.28,-extent*1.15);camera.lookAt(0,size.y*.45,0);car.update(camera);window.__app.renderer.gl.render(scene,camera);
   return {kind:s.models.TRAFFIC_KINDS[family],name:paint.name,color:paint.color,observed};
  },{family,paint});
  metrics.file=`traffic-${metrics.kind}-${paint.name.toLowerCase().replaceAll(' ','-')}.png`;report.push(metrics);await page.screenshot({path:`${output}/${metrics.file}`,timeout:60000});
 }
 await fs.writeFile(`${output}/paints.json`,JSON.stringify(report,null,2));await fs.writeFile(`${output}/errors.json`,JSON.stringify(errors,null,2));console.log(JSON.stringify({output,variants:report.length,errors}));
}finally{await browser.close();}
