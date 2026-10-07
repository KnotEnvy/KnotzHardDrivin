import * as T from 'three';
import { createCar } from '../entities/CarModel';
import { readGhost, saveGhost, sampleGhost, type GhostFrame, type GhostRun } from './ghostData';

export class Ghost {
  private mesh=createCar(0x80e8e1);
  private previous:GhostRun|null=null;
  private frames:GhostFrame[]=[];
  private stage=0;
  private next=0;
  enabled=true;
  private recording=true;
  constructor(scene:T.Scene){
    const material=new T.MeshBasicMaterial({color:0x80e8e1,transparent:true,opacity:.19,depthWrite:false});
    this.mesh.traverse(o=>{if(o instanceof T.Mesh){o.material=material;o.castShadow=false;o.receiveShadow=false;}});
    this.mesh.visible=false;scene.add(this.mesh);
  }
  start(stage:number,recording=true){this.recording=recording;this.stage=stage;this.previous=readGhost(stage);this.frames=[];this.next=0;this.hide();}
  get hasBest(){return Boolean(this.previous);}
  hide(){this.mesh.visible=false;}
  record(time:number,position:T.Vector3,forward:T.Vector3){
    if(!this.recording||time<this.next||this.frames.length>=3000)return;
    this.frames.push([time,position.x,position.y,position.z,Math.atan2(-forward.x,-forward.z)]);
    this.next=time+.1;
  }
  finish(duration:number){this.hide();if(!this.recording||this.frames.length<2)return true;if(this.previous&&this.previous.duration<=duration)return true;return saveGhost(this.stage,{version:1,duration,frames:this.frames});}
  render(time:number,position:T.Vector3){
    const f=this.previous&&this.enabled?sampleGhost(this.previous,time):null;
    this.mesh.visible=Boolean(f);if(!f)return;
    this.mesh.position.set(f[1],f[2],f[3]);this.mesh.rotation.y=f[4];
    // Fade out nearby overlap, keeping the player's car and road legible.
    this.mesh.visible=this.mesh.position.distanceTo(position)>5;
  }
}
