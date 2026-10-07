import {describe,it,expect} from 'vitest';
import {shoreOffset,shoreTexture,oceanGeometry} from '../src/world/OceanProfile';
import {terrainSurfaceHeight,SEA_LEVEL} from '../src/world/TerrainProfile';
import {roadX} from '../src/world/route';
describe('Ocean and authored terrain integration',()=>{
 it('places the surf at the actual waterline throughout the route',()=>{
  for(let s=0;s<=6100;s+=37){const off=shoreOffset(s);expect(off).toBeLessThan(-30);expect(off).toBeGreaterThan(-100);expect(Math.abs(terrainSurfaceHeight(off,s)-SEA_LEVEL)).toBeLessThan(.001);}
  const texture=shoreTexture(),data=texture.image.data as Uint8Array;
  for(const i of [0,142,416,777,1023]){const s=i/1023*6150,x=(data[i*4]*256+data[i*4+1])/65535*1024-512;expect(Math.abs(x-(roadX(s)+shoreOffset(s)))).toBeLessThan(.009);}
  texture.dispose();
 });
 it('faces the sky after rotation and covers all coastal viewing locations',()=>{
  const geometry=oceanGeometry(),p=geometry.attributes.position,n=geometry.attributes.normal;geometry.computeBoundingBox();
  expect(geometry.boundingBox!.min.y).toBeLessThan(-6000);expect(geometry.boundingBox!.max.y).toBeGreaterThan(12000);
  for(let i=0;i<p.count;i++){expect(Number.isFinite(p.getX(i))).toBe(true);expect(n.getZ(i)).toBeGreaterThan(.99);}
  expect(geometry.index!.count/3).toBeLessThan(65000);geometry.dispose();
 });
});
