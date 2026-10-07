import fs from 'node:fs/promises';
const files=['pacific-outcrop','pacific-outcrop-lod','pacific-fern','pacific-scrub','pacific-dog','pacific-deer','pacific-gull','pacific-visitor','pacific-cyclist','pacific-kite','pacific-picnic','pacific-palm','pacific-palm-lod','pacific-overlook','traffic-sedan-lod','traffic-wagon-lod','traffic-compact-lod','traffic-pickup-lod','traffic-camper-lod','traffic-sedan','traffic-wagon','traffic-compact','traffic-pickup','traffic-camper','vela-gt','last-light-station','horizon-lodge','pacific-point','pacific-redwood','pacific-redwood-lod','pacific-redwood-wide','pacific-redwood-wide-lod'];
const result=[];
for(const name of files){
 const buffer=await fs.readFile(`public/assets/${name}.glb`);
 if(buffer.readUInt32LE(0)!==0x46546c67||buffer.readUInt32LE(4)!==2||buffer.readUInt32LE(8)!==buffer.length)throw new Error(`${name}: invalid GLB header`);
 const size=buffer.readUInt32LE(12),gltf=JSON.parse(buffer.subarray(20,20+size).toString('utf8'));
 const primitives=gltf.meshes.flatMap(m=>m.primitives),vertices=primitives.reduce((n,p)=>n+gltf.accessors[p.attributes.POSITION].count,0);
 const triangles=primitives.reduce((n,p)=>n+(p.indices===undefined?gltf.accessors[p.attributes.POSITION].count:gltf.accessors[p.indices].count)/3,0);
 for(const p of primitives){const a=gltf.accessors[p.attributes.POSITION];if(!a.min?.every(Number.isFinite)||!a.max?.every(Number.isFinite))throw new Error(`${name}: missing or invalid bounds`);}
 for(const image of gltf.images??[])if(image.uri&&!image.uri.startsWith('data:'))throw new Error(`${name}: unpacked image ${image.uri}`);
 if(name.includes('redwood')&&!gltf.images?.length)throw new Error(`${name}: no packed needle atlas`);
 result.push({name,bytes:buffer.length,primitives:primitives.length,vertices,triangles,packedImages:gltf.images?.length??0});
}
await fs.mkdir('artifacts/juice',{recursive:true});await fs.writeFile('artifacts/juice/asset-audit.json',JSON.stringify(result,null,2));console.log(result);
