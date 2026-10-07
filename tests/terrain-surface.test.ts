import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {terrainHeight,terrainSurfaceHeight} from '../src/world/TerrainProfile';
import {roadX,ROADSIDE_SITES} from '../src/world/route';
describe('Rendered terrain and road clearance',()=>{
 it('keeps terrain below the pavement throughout the usable road',()=>{
  for(let s=0;s<=6000;s+=20)for(const off of [-6.5,-3.1,0,3.1,6.5])expect(terrainSurfaceHeight(off,s)).toBeLessThan(.025);
 });
 it('preserves level forecourts around every authored station and lodge',()=>{
  for(const site of ROADSIDE_SITES){const level=terrainHeight(28,site.s);for(const off of [22,28,40])expect(terrainHeight(off,site.s)).toBeCloseTo(level,8);expect(terrainSurfaceHeight(28,site.s)).toBeCloseTo(level,8);}
 });
 it('matches a raycast against the actual sampled triangles on both sides of each diagonal',()=>{
  for(const [s0,off0,off1]of [[1265,20,22],[2480,28,30],[5240,-34,-26]]){
   const p:number[]=[];for(const s of [s0,s0+5])for(const off of [off0,off1])p.push(roadX(s)+off,terrainHeight(off,s),-s);
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex([0,1,2,1,3,2]);const m=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));m.updateMatrixWorld();
   for(const [fraction,along]of [[.2,.3],[.8,.6]]){const s=s0+along*5,off=off0+fraction*(off1-off0),ray=new T.Raycaster(new T.Vector3(roadX(s)+off,300,-s),new T.Vector3(0,-1,0));const hit=ray.intersectObject(m)[0];expect(hit).toBeDefined();expect(terrainSurfaceHeight(off,s)).toBeCloseTo(hit.point.y,4);}
   g.dispose();(m.material as T.Material).dispose();
  }
 });
});
