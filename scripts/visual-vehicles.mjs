import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const output='artifacts/juice/vehicles-v2';await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
try {
 const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:4200',{waitUntil:'networkidle',timeout:60000});await page.waitForFunction(()=>!!window.__app,undefined,{timeout:90000});
 await page.evaluate(()=>window.__app.loop.stop());await page.addStyleTag({content:'#app > :not(canvas){display:none!important}'});
 const only=process.argv[2];
 const models=['vela-gt','traffic-sedan','traffic-wagon','traffic-compact','traffic-pickup','traffic-camper'].filter(name=>!only||name===only),report=only?JSON.parse(await fs.readFile(`${output}/models.json`,'utf8')).filter(m=>m.name!==only):[];
 for(const name of models){
  const bounds=await page.evaluate(async name=>{
   const {LIGHTING}=await import('/src/config/lighting.config.ts');const T=await import('/node_modules/three/build/three.module.js'),{GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
   const a=window.__app,model=(await new GLTFLoader().loadAsync(`/assets/${name}.glb`)).scene;
   if(name==='vela-gt'){const {createWheel}=await import('/src/entities/CarModel.ts');for(const x of [-.85,.85])for(const z of [-1.45,1.45]){const w=createWheel();w.position.set(x,-.30,z);model.add(w);}}
   const b=new T.Box3().setFromObject(model,true),size=b.getSize(new T.Vector3()),center=b.getCenter(new T.Vector3());
   if(name.startsWith('traffic-')){const {TRAFFIC_SIZE}=await import('/src/entities/TrafficModels.ts');const f=TRAFFIC_SIZE[name.slice(8)];if(Math.max(Math.abs(b.min.x),Math.abs(b.max.x))>f.width+.001||Math.max(Math.abs(b.min.z),Math.abs(b.max.z))>f.length+.001||b.min.y<-.685||b.max.y>2*f.height-.679)throw new Error(`${name}: exceeds collision bounds: ${JSON.stringify({min:b.min,max:b.max,f})}`);}
   const metrics={name,min:b.min.toArray(),max:b.max.toArray(),triangles:0,materials:[]};
   model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;metrics.triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;metrics.materials.push(...(Array.isArray(o.material)?o.material:[o.material]).map(m=>m.name));}});
   metrics.materials=[...new Set(metrics.materials)];
   model.position.sub(center);model.position.y+=size.y/2;
   const scene=new T.Scene();scene.background=new T.Color(0x18252a);scene.environment=a.renderer.scene.environment;scene.environmentIntensity=LIGHTING.studio.reflections;scene.add(model);
   scene.add(new T.HemisphereLight(0xb3d3e5,0x413525,LIGHTING.studio.skyFill));
   const key=new T.DirectionalLight(0xffe0bd,LIGHTING.studio.key);key.position.set(-8,16,-14);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-8;key.shadow.camera.right=8;key.shadow.camera.top=8;key.shadow.camera.bottom=-8;key.shadow.camera.far=60;key.shadow.normalBias=.025;key.shadow.intensity=.70;scene.add(key);
   const fill=new T.DirectionalLight(0x9bcbdc,LIGHTING.studio.fill);fill.position.set(10,7,9);scene.add(fill);
   const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:0x293638,roughness:.9}));floor.rotation.x=-Math.PI/2;floor.position.y=-.012;floor.receiveShadow=true;scene.add(floor);
   const camera=new T.PerspectiveCamera(38,1.4,.1,300),extent=Math.max(size.x,size.z,size.y*1.1);
   window.vehicleStudio={T,scene,camera,model,size,extent};return metrics;
  },name);report.push(bounds);
  for(const angle of ['front','side','rear']){
   await page.evaluate(angle=>{const {scene,camera,size,extent}=window.vehicleStudio;
    if(angle==='side')camera.position.set(extent*1.6,size.y*.47+extent*.10,0);
    else camera.position.set((angle==='front'?1:-1)*extent*.88,size.y*.6+extent*.28,(angle==='front'?-1:1)*extent*1.15);
    camera.lookAt(0,size.y*.45,0);window.__app.renderer.gl.render(scene,camera);
   },angle);
   await page.screenshot({path:`${output}/${name}-${angle}.png`,timeout:60000});
   if(angle==='front')await page.screenshot({path:`artifacts/juice/model-details/${name}.png`,timeout:60000});
  }
 }
 await fs.writeFile(`${output}/models.json`,JSON.stringify(report,null,2));await fs.writeFile(`${output}/errors.json`,JSON.stringify(errors,null,2));console.log(JSON.stringify({output,errors,report}));
}finally{await browser.close();}
