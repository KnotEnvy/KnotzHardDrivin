import * as T from 'three';
let texture:T.CanvasTexture|undefined;
/** Cheap contact shadow also grounds the car when dynamic shadows are disabled. */
export function contactShadow():T.Mesh {
  if(!texture){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;const c=canvas.getContext('2d')!;c.scale(1,2);const g=c.createRadialGradient(64,64,12,64,64,62);g.addColorStop(0,'rgba(0,0,0,.65)');g.addColorStop(.55,'rgba(0,0,0,.4)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,128,128);texture=new T.CanvasTexture(canvas);}
  const m=new T.Mesh(new T.PlaneGeometry(3.6,6.0),new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));m.rotation.x=-Math.PI/2;m.position.y=.065;return m;
}
