import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import http from 'node:http';
import {chromium} from '@playwright/test';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function semantic(file) {
 const bytes=await fs.readFile(file),length=bytes.readUInt32LE(12);
 const json=JSON.parse(bytes.subarray(20,20+length).toString('utf8')),bin=bytes.subarray(28+length);
 const view=index=>{const v=json.bufferViews[index],start=v.byteOffset??0,{buffer,byteOffset,...metadata}=v;return {...metadata,hash:hash(bin.subarray(start,start+v.byteLength))};};
 for(const image of json.images??[]) {
  image.hash=image.bufferView!==undefined?view(image.bufferView).hash:hash(await fs.readFile(path.resolve(path.dirname(file),image.uri)));
  delete image.bufferView;delete image.uri;
 }
 const walk=value=>{
  if(!value||typeof value!=='object')return;
  for(const [key,child]of Object.entries(value)){if(key==='bufferView'&&Number.isInteger(child))value[key]=view(child);else walk(child);}
 };
 delete json.buffers;
 // Traverse only semantic data, not the buffer view array.
 for(const [key,value]of Object.entries(json))if(key!=='bufferViews')walk(value);
 delete json.bufferViews;
 const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
 return JSON.stringify(canonical(json));
}
const models=(await fs.readdir('public/assets')).filter(x=>x.endsWith('.glb'));
for(const model of models)if(await semantic('public/assets/'+model)!==await semantic('dist/assets/'+model))throw Error('Visual asset data changed: '+model);
console.log('Lossless verification: '+models.length+' models preserve image, geometry, material, node and animation data.');
await fs.mkdir('artifacts/performance',{recursive:true});
const base='/KnotzHardDrivin/',errors=[],requests=[];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.json':'application/json'};
const root=path.resolve('dist');
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(!url.pathname.startsWith(base)){res.writeHead(404).end();return;}
  const file=path.resolve(root,decodeURIComponent(url.pathname.slice(base.length))||'index.html');
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'public, max-age=600'}).end(data);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist',...(process.platform==='win32'?['--use-angle=d3d11']:['--use-angle=swiftshader','--enable-unsafe-swiftshader'])]});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 page.setDefaultTimeout(process.env.CI?120000:30000);
 page.setDefaultNavigationTimeout(process.env.CI?180000:120000);
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{requests.push({url:r.url(),status:r.status()});if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 const started=Date.now();await page.goto('http://127.0.0.1:'+server.address().port+base,{waitUntil:'domcontentloaded'});
 await page.locator('#boot.is-hidden').waitFor({state:'attached',timeout:process.env.CI?300000:120000});const startupMs=Date.now()-started;console.log('Production game started in '+startupMs+' ms.');
 await page.locator('#settings').click();const choices=await page.locator('#quality option').evaluateAll(options=>options.map(o=>o.value));
 for(const quality of ['high','balanced','auto','performance']){await page.locator('#quality').selectOption(quality);await page.waitForTimeout(200);}
 await page.locator('#done').click();await page.locator('#free').click();await page.locator('#driving').waitFor({state:'visible'});await page.keyboard.down('ArrowUp');await page.waitForTimeout(1800);await page.keyboard.up('ArrowUp');
 await page.locator('#pause').click();await page.locator('#resume').waitFor({state:'visible'});await page.screenshot({path:'artifacts/performance/pages-production.png'});
 const report={models:models.length,startupMs,choices,errors,requests:requests.length,sharedImageRequests:requests.filter(r=>r.url.includes('/shared/')).length,uniqueSharedImages:new Set(requests.filter(r=>r.url.includes('/shared/')).map(r=>r.url)).size,base,productionDebugHook:await page.evaluate(()=>Boolean(window.__app))};
 await fs.writeFile('artifacts/performance/production-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 if(errors.length||choices.length!==4||report.sharedImageRequests!==report.uniqueSharedImages)throw Error('Production browser verification failed');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
