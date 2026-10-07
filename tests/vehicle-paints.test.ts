import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { trafficModel } from '../src/entities/TrafficModels';
import { trafficPaint, VEHICLE_PAINTS } from '../src/entities/VehiclePaints';

describe('painted vehicle clones',()=>{
 it('isolates body and two-tone paints while sharing geometry and trim',()=>{
  const enamel=new T.MeshStandardMaterial({color:0x789797});enamel.name='Traffic enamel';
  const accent=new T.MeshStandardMaterial({color:0xeee8d8});accent.name='Traffic accent';
  const trim=new T.MeshStandardMaterial({color:0x121212});trim.name='Traffic polymer';
  const geometry=new T.BoxGeometry();
  const template=new T.Group();template.add(new T.Mesh(geometry,[enamel,accent,trim]));
  const a=trafficModel([template,template],0xb62a27),b=trafficModel([template,template],0x34556a);
  const mesh=(lod:T.LOD,level=0)=>lod.levels[level].object.children[0] as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial[]>;
  expect(mesh(a).geometry).toBe(geometry);expect(mesh(b).geometry).toBe(geometry);
  expect(mesh(a).material[0].color.getHex()).toBe(0xb62a27);expect(mesh(b).material[0].color.getHex()).toBe(0x34556a);
  expect(mesh(a,1).material[0].color.getHex()).toBe(0xb62a27);
  expect(mesh(a).material[1].color.equals(new T.Color(0xb62a27).lerp(new T.Color(0xf5efe0),.75))).toBe(true);
  expect(mesh(a).material[2]).toBe(trim);expect(mesh(b).material[2]).toBe(trim);
  mesh(a).material[0].color.setHex(0xff00ff);
  expect(mesh(b).material[0].color.getHex()).toBe(0x34556a);expect(enamel.color.getHex()).toBe(0x789797);
  expect(accent.color.getHex()).toBe(0xeee8d8);
 });
 it('gives every vehicle family multiple paints across the existing fleet',()=>{
  for(let family=0;family<5;family++){
   const colors=[];for(let i=family;i<18;i+=5)colors.push(trafficPaint(i));
   expect(new Set(colors).size).toBe(colors.length);
   expect(colors.every(color=>VEHICLE_PAINTS.some(p=>p.color===color))).toBe(true);
  }
 });
});
