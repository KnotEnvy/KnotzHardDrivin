// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Input } from '../src/core/Input';

describe('Driving input across browser event and simulation timing',()=>{
  let input:Input;
  const key=(type:'keydown'|'keyup',code:string,target:EventTarget=window,repeat=false)=>target.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true,repeat}));
  beforeEach(()=>{Object.defineProperty(navigator,'getGamepads',{configurable:true,value:vi.fn(()=>[])});input=new Input();input.attach();});
  afterEach(()=>{input?.detach();document.body.innerHTML='';Reflect.deleteProperty(navigator,'getGamepads');vi.restoreAllMocks();});

  it.each([['Escape','pause'],['KeyC','camera'],['KeyR','reset'],['KeyE','cruise'],['KeyH','horn']] as const)('preserves a quick %s tap until one update', (code,field)=>{
    key('keydown',code);key('keyup',code);input.update();expect(input.state[field]).toBe(true);
    input.update();expect(input.state[field]).toBe(false);
  });

  it('retains a quick touch horn tap for the next simulation update',()=>{
    input.setKey('KeyH',true);input.setKey('KeyH',false);input.update();expect(input.state.horn).toBe(true);
    input.update();expect(input.state.horn).toBe(false);
  });

  it('retains held driving controls and releases them without sticky throttle',()=>{
    for(const code of ['KeyW','ArrowRight','Space','ShiftLeft'])key('keydown',code);
    input.update();expect(input.state).toMatchObject({throttle:1,steer:1,handbrake:true,boost:true});
    input.update();expect(input.state.throttle).toBe(1);
    for(const code of ['KeyW','ArrowRight','Space','ShiftLeft'])key('keyup',code);
    input.update();expect(input.state).toMatchObject({throttle:0,steer:0,handbrake:false,boost:false});
  });

  it('maps analog gamepad driving, boost, camera, cruise and actions, then clears on disconnect',()=>{
    const buttons=Array.from({length:17},()=>({pressed:false,touched:false,value:0}));
    for(const i of [0,1,2,3,5,9,12])buttons[i]={pressed:true,touched:true,value:1};
    buttons[7].value=.7;buttons[6].value=.3;
    const pad={buttons,axes:[-.65]} as unknown as Gamepad;
    vi.mocked(navigator.getGamepads).mockReturnValue([null,pad]);input.update();
    expect(input.state).toMatchObject({throttle:.7,brake:.3,steer:expect.closeTo(-.5/.85,6),handbrake:true,reset:true,boost:true,camera:true,cruise:true,horn:true,pause:true});
    vi.mocked(navigator.getGamepads).mockReturnValue([]);input.update();
    expect(input.state).toMatchObject({throttle:0,brake:0,steer:0,handbrake:false,reset:false,boost:false,camera:false,cruise:false,horn:false,pause:false});
  });

  it('keeps stick response continuous at the deadzone and preserves full lock',()=>{
    for(const [axis,expected] of [[.15,0],[.15001,.00001/.85],[1,1],[-1,-1],[NaN,0]]){
      vi.mocked(navigator.getGamepads).mockReturnValue([{index:0,buttons:[],axes:[axis]} as unknown as Gamepad]);input.update();expect(input.state.steer).toBeCloseTo(expected,6);
    }
  });
  it('signals controller loss for exactly one update',()=>{
    vi.mocked(navigator.getGamepads).mockReturnValue([{index:0,buttons:[],axes:[0]} as unknown as Gamepad]);input.update();expect(input.gamepadDisconnected).toBe(false);
    vi.mocked(navigator.getGamepads).mockReturnValue([]);input.update();expect(input.gamepadDisconnected).toBe(true);
    input.update();expect(input.gamepadDisconnected).toBe(false);
  });
  it('allows keyboard steering through gamepad stick drift within the deadzone',()=>{
    vi.mocked(navigator.getGamepads).mockReturnValue([{buttons:[],axes:[.08]} as unknown as Gamepad]);
    key('keydown','KeyA');input.update();expect(input.state.steer).toBe(-1);
  });

  it('clears held keys and unconsumed action taps on window blur',()=>{
    key('keydown','KeyW');key('keydown','KeyC');key('keyup','KeyC');
    window.dispatchEvent(new Event('blur'));input.update();expect(input.state.throttle).toBe(0);expect(input.state.camera).toBe(false);
  });

  it('ignores form editing and preserves Space activation of a focused button',()=>{
    const field=document.createElement('input'),button=document.createElement('button');document.body.append(field,button);
    key('keydown','KeyW',field);key('keydown','Escape',field);
    const browserDefault=key('keydown','Space',button);input.update();
    expect(input.state.throttle).toBe(0);expect(input.state.pause).toBe(false);expect(input.state.handbrake).toBe(false);expect(browserDefault).toBe(true);
  });

  it('drops pending action taps when detached and reattached',()=>{
    key('keydown','Escape');key('keyup','Escape');input.detach();input.attach();input.update();
    expect(input.state.pause).toBe(false);
  });
});
