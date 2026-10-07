/** Controller navigation of ordinary DOM controls. Driving never uses this focus layer. */
export class MenuNavigation {
  private confirmHeld=false;
  private backHeld=false;
  private direction=0;
  private repeatAt=0;
  constructor(private scope:()=>HTMLElement|null,private back:()=>void){}
  private controls(root:HTMLElement){
    return Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')).filter(element=>{
      let node:HTMLElement|null=element;
      while(node){if(node.hidden||node.inert||node.classList.contains('hidden')||getComputedStyle(node).display==='none')return false;if(node===root)break;node=node.parentElement;}
      return true;
    }).sort((a,b)=>a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1);
  }
  move(direction:number,horizontal=false){
    const root=this.scope();if(!root)return;
    const controls=this.controls(root),current=document.activeElement;
    if(!controls.length)return;
    if(horizontal&&current instanceof HTMLInputElement&&current.type==='range'){
      current.value=String(Math.min(Number(current.max||100),Math.max(Number(current.min||0),Number(current.value)+direction*Number(current.step||1))));
      current.dispatchEvent(new Event('input',{bubbles:true}));return;
    }
    if(horizontal&&current instanceof HTMLSelectElement){
      current.selectedIndex=Math.max(0,Math.min(current.options.length-1,current.selectedIndex+direction));current.dispatchEvent(new Event('change',{bubbles:true}));return;
    }
    const index=controls.indexOf(current as HTMLElement);
    controls[index<0?0:(index+direction+controls.length)%controls.length].focus();
  }
  update(now=performance.now()){
    const pad=(navigator.getGamepads?.()??[]).find(p=>p!=null);
    const confirm=Boolean(pad?.buttons[0]?.pressed),back=Boolean(pad?.buttons[1]?.pressed);
    const root=this.scope();
    if(root&&pad){
      const vertical=(pad.buttons[13]?.pressed||Number(pad.axes[1])>.55?1:0)-(pad.buttons[12]?.pressed||Number(pad.axes[1])<-.55?1:0);
      const horizontal=(pad.buttons[15]?.pressed||Number(pad.axes[0])>.55?1:0)-(pad.buttons[14]?.pressed||Number(pad.axes[0])<-.55?1:0);
      const direction=vertical||horizontal;
      if(direction&&(direction!==this.direction||now>=this.repeatAt)){this.move(direction,vertical===0);this.repeatAt=now+(direction!==this.direction?350:140);}
      this.direction=direction;
      if(confirm&&!this.confirmHeld){const controls=this.controls(root);const focused=controls.includes(document.activeElement as HTMLElement)?document.activeElement as HTMLElement:controls[0];focused?.focus();focused?.click();}
      if(back&&!this.backHeld)this.back();
    }else this.direction=0;
    this.confirmHeld=confirm;this.backHeld=back;
  }
}
