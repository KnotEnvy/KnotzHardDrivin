import * as T from 'three';
/** Drooping pinnate frond; paired curved leaflets form a full palm silhouette. */
export function frondGeometry():T.BufferGeometry {
  const p:number[]=[],ids:number[]=[];
  const triangle=(a:number[],b:number[],c:number[])=>{const i=p.length/3;p.push(...a,...b,...c);ids.push(i,i+1,i+2);};
  const y=(t:number)=>Math.sin(t*Math.PI)*.85-t*t*.95;
  for(let i=0;i<30;i++){
    const t=i/30,x=t*4.8,next=(i+1)/30;
    triangle([x,y(t),-.026],[x,y(t),.026],[next*4.8,y(next),0]);
    for(const side of [-1,1]){
      const span=(Math.sin(t*Math.PI)*.85+.2)*(1-t*.36);
      triangle([x-.14,y(t),0],[x+.14,y(t),0],[x+.48,y(t)-.15,side*span]);
      triangle([x+.14,y(t),0],[x+.63,y(t)-.29,side*span*.86],[x+.48,y(t)-.15,side*span]);
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ids);g.computeVertexNormals();return g;
}
