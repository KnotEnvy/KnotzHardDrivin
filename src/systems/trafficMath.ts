/** Pure driving geometry and longitudinal traffic control, in metres and seconds. */
export interface Footprint { x:number; z:number; yaw:number; halfWidth:number; halfLength:number; }
export function overlapCars(a:Footprint,b:Footprint):boolean {
  const dx=b.x-a.x,dz=b.z-a.z;
  for(const angle of [a.yaw,b.yaw])for(const turn of [0,Math.PI/2]){
    const axis=angle+turn,x=Math.cos(axis),z=-Math.sin(axis);
    const radius=(c:Footprint)=>c.halfWidth*Math.abs(x*Math.cos(c.yaw)-z*Math.sin(c.yaw))+c.halfLength*Math.abs(-x*Math.sin(c.yaw)-z*Math.cos(c.yaw));
    if(Math.abs(dx*x+dz*z)>radius(a)+radius(b))return false;
  }
  return true;
}
export interface TrafficState { s:number; lane:number; speed:number; cruise:number; }
/** Evaluate from one snapshot so ordering does not bias the following decisions. */
export function advanceTraffic(cars:readonly TrafficState[],dt:number,player?:{s:number;lane:number;speed:number}):TrafficState[]{
  return cars.map((car,i)=>{
    const direction=Math.sign(car.cruise),cruise=Math.abs(car.cruise);
    let target=cruise,gap=Infinity,leadSpeed=0;
    const consider=(s:number,lane:number,speed:number)=>{
      const ahead=(s-car.s)*direction;
      if(Math.abs(lane-car.lane)<1.9&&ahead>=0&&ahead<gap){gap=ahead;leadSpeed=Math.max(0,speed*direction);}
    };
    cars.forEach((other,j)=>{if(i!==j)consider(other.s,other.lane,other.speed);});
    if(player)consider(player.s,player.lane,player.speed);
    if(gap<Infinity){
      const room=Math.max(0,gap-7);
      target=Math.min(cruise,Math.sqrt(leadSpeed*leadSpeed+2*5*room),leadSpeed+room/1.3);
      if(gap<7||(leadSpeed<.1&&target<.2))target=0;
    }
    const current=Math.abs(car.speed);
    const speed=Math.max(0,current+Math.max(-7*dt,Math.min(2.5*dt,target-current)));
    // Last-resort distance cap prevents numerical overlap without teleporting the car forward.
    const travel=Math.min(speed*dt,Math.max(0,gap-5.4));
    return {...car,s:car.s+direction*travel,speed:direction*(travel/dt)};
  });
}

export interface PassEncounter { close:boolean; contact:boolean; rewarded:boolean; }
export function updatePassEncounter(state:PassEncounter,along:number,side:number,overlap:boolean,forwardSpeed:number,level=true):boolean {
  if(overlap){state.contact=true;state.close=false;}
  if(state.contact||state.rewarded)return false;
  if(!level||side>=8||along>12)state.close=false;
  if(level&&Math.abs(along)<4&&side>1.9&&side<3.7&&forwardSpeed>20)state.close=true;
  if(state.close&&along < -7&&level&&side<8){state.rewarded=true;return true;}
  return false;
}
