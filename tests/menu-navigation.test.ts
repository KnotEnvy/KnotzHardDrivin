// @vitest-environment jsdom
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {MenuNavigation} from '../src/ui/MenuNavigation';
import {Input} from '../src/core/Input';
import {Journey} from '../src/systems/Journey';
import {Experience,type Actions} from '../src/ui/Experience';
let buttons:{pressed:boolean;value:number}[];
beforeEach(()=>{
  buttons=Array.from({length:17},()=>({pressed:false,value:0}));
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[{index:0,axes:[0,0],buttons}]});
  document.body.innerHTML='<main id="scope"><button id="one">One</button><button disabled>Locked</button><input type="range" id="volume" min="0" max="1" step=".1" value=".5"><select id="quality"><option>A</option><option>B</option></select><button id="last">Last</button></main>';
});
afterEach(()=>{Reflect.deleteProperty(navigator,'getGamepads');vi.restoreAllMocks();document.body.innerHTML='';});
describe('controller menu flow',()=>{
  it('navigates enabled controls with bounded key repeat',()=>{
    const nav=new MenuNavigation(()=>document.getElementById('scope'),()=>{});
    buttons[13].pressed=true;nav.update(0);expect(document.activeElement?.id).toBe('one');
    nav.update(100);expect(document.activeElement?.id).toBe('one');
    nav.update(351);expect(document.activeElement?.id).toBe('volume');
    buttons[13].pressed=false;nav.update(400);buttons[13].pressed=true;nav.update(401);expect(document.activeElement?.id).toBe('quality');
  });
  it('changes range and select values using left/right and dispatches settings events',()=>{
    const nav=new MenuNavigation(()=>document.getElementById('scope'),()=>{}),range=document.getElementById('volume') as HTMLInputElement;
    const changed=vi.fn();range.addEventListener('input',changed);range.focus();nav.move(1,true);expect(Number(range.value)).toBeCloseTo(.6);expect(changed).toHaveBeenCalledOnce();
    const select=document.getElementById('quality') as HTMLSelectElement;select.focus();nav.move(1,true);expect(select.selectedIndex).toBe(1);
  });
  it('activates once per press, including when the dialog changes',()=>{
    let count=0;const nav=new MenuNavigation(()=>document.getElementById('scope'),()=>{});
    document.getElementById('one')!.addEventListener('click',()=>{count++;document.getElementById('last')!.focus();});document.getElementById('last')!.addEventListener('click',()=>count++);
    buttons[0].pressed=true;nav.update(0);nav.update(50);expect(count).toBe(1);
    buttons[0].pressed=false;nav.update(60);buttons[0].pressed=true;nav.update(70);expect(count).toBe(2);
  });
  it('does not leak a held menu confirmation into the handbrake after resume',()=>{
    const input=new Input();buttons[0].pressed=true;input.clear();input.update();expect(input.state.handbrake).toBe(false);
    buttons[0].pressed=false;input.update();buttons[0].pressed=true;input.update();expect(input.state.handbrake).toBe(true);
  });
  it('opens a briefing from the garage and requires a fresh confirmation to start',()=>{
    document.body.innerHTML='<canvas id="game" tabindex="0"></canvas><div id="hud"></div>';vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
    const j=new Journey();localStorage.clear();const actions={start:vi.fn(),continueRun:vi.fn(),resume:vi.fn(),menu:vi.fn(),reset:vi.fn(),camera:vi.fn(),cruise:vi.fn(),paint:vi.fn(),quality:vi.fn(),key:vi.fn()} satisfies Actions;
    const ui=new Experience(j,actions);ui.update(0,0,0,100);document.getElementById('start')!.focus();buttons[0].pressed=true;ui.updateMenuInput();expect(document.getElementById('begin-drive')).not.toBeNull();ui.updateMenuInput();expect(actions.start).not.toHaveBeenCalled();
    buttons[0].pressed=false;ui.updateMenuInput();buttons[0].pressed=true;ui.updateMenuInput();expect(actions.start).toHaveBeenCalledWith(0,'tour');
    j.phase='paused';ui.update(0,0,0,100);document.getElementById('pause-settings')!.click();buttons[0].pressed=false;buttons[1].pressed=true;ui.updateMenuInput();expect(document.getElementById('resume')).not.toBeNull();expect(actions.resume).not.toHaveBeenCalled();
    buttons[1].pressed=false;ui.updateMenuInput();buttons[1].pressed=true;ui.updateMenuInput();expect(actions.resume).toHaveBeenCalledOnce();
  });
});
