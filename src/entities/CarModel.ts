import * as T from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function createWheel(radius=.36):T.Group {
  const wheel=new T.Group();
  const rubber=new T.MeshStandardMaterial({color:0x111619,roughness:.88});
  const alloy=new T.MeshStandardMaterial({color:0xb7c3c5,metalness:.96,roughness:.21});
  const graphite=new T.MeshStandardMaterial({color:0x202a2c,metalness:.72,roughness:.36});
  const disc=new T.MeshStandardMaterial({color:0x5e6869,metalness:.86,roughness:.46});
  const profile=[new T.Vector2(radius*.66,-.15),new T.Vector2(radius*.89,-.15),new T.Vector2(radius*.98,-.115),new T.Vector2(radius,-.07),new T.Vector2(radius,.07),new T.Vector2(radius*.98,.115),new T.Vector2(radius*.89,.15),new T.Vector2(radius*.66,.15)];
  const tire=new T.Mesh(new T.LatheGeometry(profile,40),rubber);tire.rotation.z=Math.PI/2;wheel.add(tire);
  for(const side of [-1,1]){
    const rotor=new T.Mesh(new T.CylinderGeometry(radius*.60,radius*.60,.02,32),disc);rotor.rotation.z=Math.PI/2;rotor.position.x=side*.12;wheel.add(rotor);
    for(const r of [radius*.68,radius*.72,radius*.90]){
      const ring=new T.Mesh(new T.TorusGeometry(r,r>radius*.8?.004:.013,6,40),r>radius*.8?graphite:alloy);ring.rotation.y=Math.PI/2;ring.position.x=side*.153;wheel.add(ring);
    }
    for(let i=0;i<5;i++)for(const pair of [-1,1]){
      const a=i*Math.PI*2/5+pair*.07;
      const spoke=new T.Mesh(new RoundedBoxGeometry(.027,radius*.59,.026,1,.005),alloy);spoke.rotation.x=a+pair*.13;spoke.position.set(side*.16,Math.cos(a)*radius*.36,Math.sin(a)*radius*.36);wheel.add(spoke);
    }
    const hub=new T.Mesh(new T.CylinderGeometry(.062,.062,.025,16),graphite);hub.rotation.z=Math.PI/2;hub.position.x=side*.163;wheel.add(hub);
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const bolt=new T.Mesh(new T.SphereGeometry(.009,6,4),alloy);bolt.position.set(side*.179,Math.cos(a)*.039,Math.sin(a)*.039);wheel.add(bolt);}
    // Drilled rotor holes and circumferential sidewall lines catch close-up light.
    for(let i=0;i<16;i++){const a=i*Math.PI*2/16;const hole=new T.Mesh(new T.CircleGeometry(.010,6),rubber);hole.rotation.y=side*Math.PI/2;hole.position.set(side*.134,Math.cos(a)*radius*.5,Math.sin(a)*radius*.5);wheel.add(hole);}
  }
  // Narrow circumferential grooves and angled tread blocks, batched with rubber.
  for(const x of [-.065,0,.065]){
    const groove=new T.Mesh(new T.TorusGeometry(radius-.001,.005,4,48),graphite);groove.rotation.y=Math.PI/2;groove.position.x=x;wheel.add(groove);
  }
  for(let i=0;i<64;i++)for(const side of [-1,1]){
    const a=i*Math.PI*2/64;
    const tread=new T.Mesh(new T.BoxGeometry(.086,.012,.010),graphite);
    tread.position.set(side*.097,Math.cos(a)*radius,Math.sin(a)*radius);tread.rotation.x=a;tread.rotation.z=side*.20;wheel.add(tread);
  }
  const buckets=new Map<T.Material,T.BufferGeometry[]>();wheel.updateMatrixWorld(true);
  wheel.traverse(o=>{if(!(o instanceof T.Mesh)||Array.isArray(o.material))return;let g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}g.deleteAttribute('uv');const a=buckets.get(o.material)??[];a.push(g);buckets.set(o.material,a);o.geometry.dispose();});
  wheel.clear();for(const [material,parts]of buckets){const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());if(g){const m=new T.Mesh(g,material);m.castShadow=true;wheel.add(m);}}
  return wheel;
}

/** Original wide-shouldered grand touring coupe, forward is -Z. */
export function createCar(color=0xf1a344,wheels=true):T.Group {
  const car=new T.Group();
  const paint=new T.MeshPhysicalMaterial({color,metalness:.65,roughness:.24,clearcoat:1,clearcoatRoughness:.1});
  const dark=new T.MeshStandardMaterial({color:0x10171b,roughness:.5,metalness:.25});
  const glass=new T.MeshPhysicalMaterial({color:0x163744,metalness:.15,roughness:.08,clearcoat:1,transparent:true,opacity:.48,depthWrite:false});
  const chrome=new T.MeshStandardMaterial({color:0x9ba3a1,metalness:.95,roughness:.25});
  const headMat=new T.MeshStandardMaterial({color:0xffefc5,emissive:0xffdfaa,emissiveIntensity:3});
  const tailMat=new T.MeshStandardMaterial({color:0xc82313,emissive:0xff2208,emissiveIntensity:2.4});
  function box(w:number,h:number,d:number,x:number,y:number,z:number,mat:T.Material,r=.015){const m=new T.Mesh(new RoundedBoxGeometry(w,h,d,1,r),mat);m.position.set(x,y,z);car.add(m);return m;}
  const sections=[[-2.15,.76,.03],[-1.98,.91,.18],[-1.45,.98,.27],[-.82,.91,.29],[.4,.92,.28],[1.42,.99,.3],[1.99,.93,.2],[2.15,.78,.06]];
  // Interpolate the shoulder line, with actual open arches above each tire.
  const curve = new T.CatmullRomCurve3(sections.map(([z,w,h])=>new T.Vector3(w,h,z)),false,'catmullrom',.25);
  const smoothSections = curve.getPoints(wheels?24:96).map(v=>[v.z,v.x,v.y]);
  const p:number[]=[],idx:number[]=[];
  for(const [z,w,h]of smoothSections){
    const dz=Math.min(Math.abs(z+1.45),Math.abs(z-1.45));
    const bottom=dz<.44?-.30+Math.sqrt(.44*.44-dz*dz):-.27;
    for(const [x,y]of [[-w*.87,bottom],[w*.87,bottom],[w,Math.max(bottom,-.12)],[w,h-.09],[w*.89,h],[-w*.89,h],[-w,h-.09],[-w,Math.max(bottom,-.12)]])p.push(x,y,z);
  }
  for(let j=0;j<smoothSections.length-1;j++)for(let i=0;i<8;i++){const a=j*8+i,n=j*8+(i+1)%8,b=a+8,bn=n+8;idx.push(a,n,b,n,bn,b);}
  for(let i=1;i<7;i++){idx.push(0,i+1,i);const a=(smoothSections.length-1)*8;idx.push(a,a+i,a+i+1);}
  const bodyGeo=new T.BufferGeometry();bodyGeo.setAttribute('position',new T.Float32BufferAttribute(p,3));bodyGeo.setIndex(idx);bodyGeo.computeVertexNormals();car.add(new T.Mesh(bodyGeo,paint));
  // A long hood with a subtle central power bulge and panel edges.
  box(1.28,.04,1.22,0,.268,-1.26,paint,.018).rotation.x=-.025;
  for(const side of [-1,1]){
    box(.018,.012,1.28,side*.66,.285,-1.23,dark,.003);
    box(.028,.012,.44,side*.60,.303,1.45,dark,.003);
    box(.044,.11,2.2,side*.936,-.17,0,dark);
    box(.03,.038,.19,side*.935,.205,.37,chrome);
    box(.2,.11,.26,side*.99,.37,-.64,paint,.04);
    box(.61,.067,.047,side*.48,.105,-2.13,headMat);
    box(.71,.055,.04,side*.46,.125,2.125,tailMat);
    box(.022,.25,.021,side*.91,-.055,.8,dark,.003);
    // Dark wheel wells visually recess the tires into the fenders.
    for(const z of [-1.45,1.45]){const well=new T.Mesh(new T.CircleGeometry(.39,24),dark);well.rotation.y=side*Math.PI/2;well.position.set(side*.972,-.29,z);car.add(well);}
    const exhaust=new T.Mesh(new T.CylinderGeometry(.065,.065,.16,12),chrome);exhaust.rotation.x=Math.PI/2;exhaust.position.set(side*.65,-.24,2.13);car.add(exhaust);
  }
  const shape=new T.Shape();shape.moveTo(-1.02,.25);shape.lineTo(-.40,.73);shape.lineTo(.51,.73);shape.lineTo(1.20,.28);shape.closePath();
  const cabinGeo=new T.ExtrudeGeometry(shape,{depth:1.34,bevelEnabled:true,bevelSize:.028,bevelThickness:.028,bevelSegments:2,steps:1});cabinGeo.rotateY(-Math.PI/2);cabinGeo.translate(.67,0,0);car.add(new T.Mesh(cabinGeo,glass));
  box(1.39,.058,.99,0,.757,.06,paint,.025);
  for(const side of [-1,1]){
    box(.03,.4,.035,side*.699,.52,.15,dark,.004);
    const a=box(.045,.72,.045,side*.695,.50,-.71,paint,.005);a.rotation.x=.89;
    const c=box(.045,.75,.065,side*.695,.51,.88,paint,.005);c.rotation.x=-.99;
    box(.035,.035,2.05,side*.699,.275,.04,chrome,.004);
  }
  // Visible upholstered cabin: two bucket seats, console and dashboard.
  const leather=new T.MeshStandardMaterial({color:0x352b25,roughness:.94});
  for(const side of [-1,1]){
    box(.45,.13,.56,side*.36,.31,.23,leather,.06);
    box(.44,.40,.13,side*.36,.49,.48,leather,.06).rotation.x=-.14;
    box(.25,.15,.12,side*.36,.70,.50,leather,.04);
  }
  box(.17,.17,.73,0,.35,.10,dark,.03);
  box(1.25,.16,.27,0,.45,-.66,leather,.03);
  const steering=new T.Mesh(new T.TorusGeometry(.135,.017,8,32),dark);
  steering.position.set(-.36,.53,-.40);steering.rotation.x=-.30;car.add(steering);
  box(1.6,.10,.085,0,-.115,-2.09,dark);
  box(1.75,.12,.12,0,-.21,2.02,dark);
  box(1.73,.05,.22,0,.35,1.82,paint,.02);
  box(.3,.09,.02,0,-.06,2.147,new T.MeshStandardMaterial({color:0xe9ddbe}));
  if(wheels)for(const x of [-.86,.86])for(const z of [-1.45,1.45]){const tire=createWheel();tire.position.set(x,-.3,z);car.add(tire);}
  // Merge opaque details by material to keep traffic draw calls bounded.
  const buckets=new Map<T.Material,T.BufferGeometry[]>();car.updateMatrixWorld(true);
  car.traverse(o=>{if(!(o instanceof T.Mesh)||Array.isArray(o.material))return;const clone=o.geometry.clone().applyMatrix4(o.matrixWorld);const g=clone.index?clone.toNonIndexed():clone;if(g!==clone)clone.dispose();o.geometry.dispose();g.deleteAttribute('uv');const bucket=buckets.get(o.material)??[];bucket.push(g);buckets.set(o.material,bucket);});
  car.clear();for(const [material,geometries]of buckets){const geo=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!geo)continue;const m=new T.Mesh(geo,material);m.castShadow=true;m.receiveShadow=true;car.add(m);}
  return car;
}
