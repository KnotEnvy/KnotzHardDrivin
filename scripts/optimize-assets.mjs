import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
/** Lossless distribution-only packing: retain every vertex, material and image byte.
 * Share repeated embedded images via standard relative glTF image URIs.
 */
export async function optimizeAssets(root) {
 const assets=path.resolve(root,'assets');
 if(path.resolve(root)===path.resolve('public'))throw Error('Optimize built output only; source assets must remain intact.');
 const directory=path.join(assets,'shared');await fs.mkdir(directory,{recursive:true});
 const files=(await fs.readdir(assets)).filter(f=>f.endsWith('.glb')).sort();
 const images=new Map(),models=[];let sourceBytes=0,modelBytes=0;
 for(const name of files) {
  const file=path.join(assets,name),original=await fs.readFile(file);
  if(original.readUInt32LE(0)!==0x46546c67||original.readUInt32LE(4)!==2||original.readUInt32LE(8)!==original.length)throw Error('Invalid GLB '+name);
  const jsonLength=original.readUInt32LE(12),json=JSON.parse(original.subarray(20,20+jsonLength).toString('utf8'));
  const embedded=(json.images??[]).filter(i=>i.bufferView!==undefined);
  sourceBytes+=original.length;
  if(!embedded.length){modelBytes+=original.length;continue;}
  if(json.buffers.length!==1||json.buffers[0].uri||json.extensionsRequired?.length)throw Error('Unsupported buffer layout/extensions: '+name);
  const binHeader=20+jsonLength;
  if(original.readUInt32LE(binHeader+4)!==0x004e4942)throw Error('Missing BIN '+name);
  const bin=original.subarray(binHeader+8,binHeader+8+original.readUInt32LE(binHeader));
  const imageViews=new Set();
  for(const image of embedded) {
   const view=json.bufferViews[image.bufferView],start=view.byteOffset??0,bytes=bin.subarray(start,start+view.byteLength);
   if(view.buffer!==0||bytes.length!==view.byteLength)throw Error('Invalid image range '+name);
   const extension=image.mimeType==='image/png'?'png':image.mimeType==='image/jpeg'?'jpg':null;
   if(!extension)throw Error('Unsupported image type '+name);
   const digest=createHash('sha256').update(bytes).digest('hex'),filename=digest+'.'+extension;
   if(!images.has(filename)){images.set(filename,bytes.length);await fs.writeFile(path.join(directory,filename),bytes);}
   imageViews.add(image.bufferView);delete image.bufferView;image.uri='shared/'+filename;
  }
  const references=[];
  const walk=value=>{
   if(!value||typeof value!=='object')return;
   for(const [key,child]of Object.entries(value)) {
    if(key==='bufferView'&&Number.isInteger(child))references.push([value,key,child]);
    else walk(child);
   }
  };walk(json);
  const used=new Set(references.map(x=>x[2]));
  const remap=new Map(),views=[],chunks=[];let offset=0;
  for(const [index,view]of json.bufferViews.entries()) {
   if(imageViews.has(index)&&!used.has(index))continue;
   if(view.buffer!==0)throw Error('Unsupported buffer '+name);
   const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad;}
   const start=view.byteOffset??0,bytes=bin.subarray(start,start+view.byteLength);
   if(bytes.length!==view.byteLength)throw Error('Invalid buffer range '+name);
   remap.set(index,views.length);views.push({...view,byteOffset:offset});chunks.push(bytes);offset+=bytes.length;
  }
  for(const [object,key,index]of references){if(!remap.has(index))throw Error('Dangling view '+name);object[key]=remap.get(index);}
  json.bufferViews=views;json.buffers[0].byteLength=offset;
  const data=Buffer.concat(chunks),jsonData=Buffer.from(JSON.stringify(json)),jsonPad=(4-jsonData.length%4)%4,binPad=(4-data.length%4)%4;
  const header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+jsonData.length+jsonPad+data.length+binPad,8);
  jh.writeUInt32LE(jsonData.length+jsonPad,0);jh.writeUInt32LE(0x4e4f534a,4);
  bh.writeUInt32LE(data.length+binPad,0);bh.writeUInt32LE(0x004e4942,4);
  const optimized=Buffer.concat([header,jh,jsonData,Buffer.alloc(jsonPad,32),bh,data,Buffer.alloc(binPad)]);
  await fs.writeFile(file,optimized);modelBytes+=optimized.length;models.push({name,before:original.length,after:optimized.length,images:embedded.length});
 }
 const sharedImageBytes=[...images.values()].reduce((a,b)=>a+b,0),report={sourceBytes,modelBytes,sharedImageBytes,totalBytes:modelBytes+sharedImageBytes,savedBytes:sourceBytes-modelBytes-sharedImageBytes,sharedImages:images.size,models};
 await fs.writeFile(path.resolve(root,'asset-optimization.json'),JSON.stringify(report,null,2));
 console.log('Lossless asset sharing: '+(report.savedBytes/1e6).toFixed(2)+' MB saved; '+images.size+' unique images.');
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url)))await optimizeAssets(process.argv[2]??'dist');
