/** Stateful greetings use proximity hysteresis, with a separate horn cooldown. */
export class LifeEncounter {
 private armed=true;
 private lastGreeting=-Infinity;
 private lastHorn=-Infinity;
 private lastReaction=-Infinity;
 constructor(readonly seed:number){}
 update(time:number,distance:number,active:boolean):number{
  if(distance>75)this.armed=true;
  if(active&&distance<45&&this.armed&&time-this.lastGreeting>20){this.lastGreeting=time;this.lastReaction=time;this.armed=false;}
  return this.attention(time);
 }
 horn(time:number,distance:number):boolean{
  if(distance>65||time-this.lastHorn<4)return false;
  this.lastHorn=time;this.lastReaction=time;return true;
 }
 attention(time:number):number{return Math.max(0,1-Math.max(0,time-this.lastReaction)/8);}
 cycle(time:number,period=26):number{return ((time+this.seed*7.13)%period+period)%period;}
}
