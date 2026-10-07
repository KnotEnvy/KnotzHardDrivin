import {describe,it,expect} from 'vitest';
import {LOD,Group,Mesh,BoxGeometry,MeshBasicMaterial,Vector3} from 'three';
import {AdaptiveResolution,renderPixelRatio} from '../src/core/graphicsQuality';
import {setDistanceDetail} from '../src/world/distanceDetail';
import {freezeStaticTransforms} from '../src/world/staticTransforms';
describe('graphics budgets and adaptation',()=>{
  it('bounds total pixels on 4K and keeps the High presentation at 1080p',()=>{
    const ratio=renderPixelRatio(3840,2160,2,'balanced');
    expect(3840*2160*ratio*ratio).toBeLessThanOrEqual(2_073_601);
    expect(renderPixelRatio(1920,1080,1,'high')).toBe(1);
    expect(renderPixelRatio(1280,800,2,'performance')).toBe(.75);
  });
  it('requires sustained load, stops at a floor, and recovers slowly',()=>{
    const adaptive=new AdaptiveResolution();
    adaptive.sample(100);expect(adaptive.scale).toBe(1);
    for(let i=0;i<400;i++)adaptive.sample(30);
    expect(adaptive.scale).toBe(.6);
    for(let i=0;i<200;i++)adaptive.sample(16);
    expect(adaptive.scale).toBe(.6);
    for(let i=0;i<350;i++)adaptive.sample(16);
    expect(adaptive.scale).toBe(.7);
    adaptive.sample(300);expect(adaptive.scale).toBe(.7);
    adaptive.reset();expect(adaptive.scale).toBe(1);
  });
});
describe('static world transforms',()=>{
  it('preserves nested placement and leaves excluded actors movable',()=>{
    const scene=new Group(),root=new Group(),building=new Group(),actor=new Group();
    root.position.set(100,0,-200);building.position.set(3,2,5);actor.position.set(7,1,9);
    const mesh=new Mesh(new BoxGeometry(),new MeshBasicMaterial());mesh.position.set(1,0,0);
    scene.add(root);root.add(building,actor);building.add(mesh);
    const before=mesh.getWorldPosition(new Vector3()).clone();
    expect(freezeStaticTransforms(root,new Set([actor]))).toBe(3);
    actor.position.x+=4;scene.updateMatrixWorld(true);
    expect(mesh.getWorldPosition(new Vector3()).equals(before)).toBe(true);
    expect(actor.getWorldPosition(new Vector3()).x).toBe(111);
    expect(actor.matrixAutoUpdate).toBe(true);
    mesh.geometry.dispose();(mesh.material as MeshBasicMaterial).dispose();
  });
});

it('restores authored LOD distances after repeated preset changes',()=>{
  const root=new Group(),lod=new LOD();lod.addLevel(new Group(),0);lod.addLevel(new Group(),200);lod.addLevel(new Group(),1500);root.add(lod);
  setDistanceDetail(root,.7);setDistanceDetail(root,.7);
  expect(lod.levels.map(level=>level.distance)).toEqual([0,140,1050]);
  setDistanceDetail(root,1);expect(lod.levels.map(level=>level.distance)).toEqual([0,200,1500]);
});

it('preserves all saved quality choices and recovers unknown choices',async()=>{
 const {readSave}=await import('../src/systems/Journey');
 for(const quality of ['auto','high','balanced','performance','invalid']){
  const storage={getItem:()=>JSON.stringify({medals:[0,0,0],best:[0,0,0],quality})};
  const previous=globalThis.localStorage;Object.defineProperty(globalThis,'localStorage',{configurable:true,value:storage});
  try{expect(readSave().quality).toBe(quality==='invalid'?'balanced':quality);}finally{Object.defineProperty(globalThis,'localStorage',{configurable:true,value:previous});}
 }
});
