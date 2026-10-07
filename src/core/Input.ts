/**
 * Normalised driving input, aggregated from keyboard, gamepad and (later) touch.
 * Values are device-agnostic so gameplay code never branches on input source.
 */
export interface InputState {
  /** Forward throttle, 0..1. */
  throttle: number;
  /** Brake / reverse, 0..1. */
  brake: number;
  /** Steering, -1 (left) .. 1 (right). */
  steer: number;
  /** Handbrake held. */
  handbrake: boolean;
  /** Reset-to-track requested this frame. */
  reset: boolean;
  /** Pause requested this frame. */
  pause: boolean;
  boost?: boolean;
  camera?: boolean;
  cruise?: boolean;
  horn?: boolean;
}

const GAMEPAD_DEADZONE = 0.15;

function applyDeadzone(v: number): number {
  if(!Number.isFinite(v))return 0;
  const magnitude=Math.min(1,Math.abs(v));
  return magnitude<=GAMEPAD_DEADZONE?0:Math.sign(v)*(magnitude-GAMEPAD_DEADZONE)/(1-GAMEPAD_DEADZONE);
}

/**
 * Polls input sources and exposes a single immutable-ish snapshot via `state`.
 * Call `update()` once per frame (it folds in gamepad axes, which are polled).
 */
export class Input {
  readonly state: InputState = {
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    reset: false,
    pause: false,
  };

  private readonly keys = new Set<string>();
  private readonly pressed = new Set<string>();
  private readonly target: Window;
  private blockedButtons=new Set<number>();
  private attached = false;
  private lastPadIndex:number|null=null;
  gamepadDisconnected=false;

  constructor(target: Window = window) {
    this.target = target;
  }

  attach(): void {
    if (this.attached) return;
    this.target.addEventListener('keydown', this.onKeyDown);
    this.target.addEventListener('keyup', this.onKeyUp);
    this.target.addEventListener('blur', this.clear);
    this.attached = true;
  }

  detach(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.clear);
    this.clear();
    this.attached = false;
  }

  /** Recompute `state` from current key set + connected gamepad. */
  update(): void {
    const s = this.state;
    s.throttle = this.held('KeyW', 'ArrowUp') ? 1 : 0;
    s.brake = this.held('KeyS', 'ArrowDown') ? 1 : 0;
    s.steer = (this.held('KeyD', 'ArrowRight') ? 1 : 0) - (this.held('KeyA', 'ArrowLeft') ? 1 : 0);
    s.handbrake = this.held('Space');
    s.reset = this.held('KeyR') || this.pressed.has('KeyR');
    s.pause = this.held('Escape') || this.pressed.has('Escape');
    s.boost = this.held('ShiftLeft','ShiftRight');
    s.camera = this.held('KeyC') || this.pressed.has('KeyC');
    s.cruise = this.held('KeyE') || this.pressed.has('KeyE');
    s.horn = this.held('KeyH') || this.pressed.has('KeyH');

    this.foldInGamepad(s);
    this.pressed.clear();
  }

  private foldInGamepad(s: InputState): void {
    const pads = navigator.getGamepads?.() ?? [];
    const pad = pads.find((p): p is Gamepad => p != null);
    const index=pad?(pad.index??0):null;
    this.gamepadDisconnected=this.lastPadIndex!==null&&index!==this.lastPadIndex;
    this.lastPadIndex=index;
    if (!pad) return;

    const pressed=(index:number)=>{
      if(this.blockedButtons.has(index)){if(!pad.buttons[index]?.pressed)this.blockedButtons.delete(index);return false;}
      return Boolean(pad.buttons[index]?.pressed);
    };
    // Standard mapping: RT = throttle, LT = brake, left stick X = steer.
    const rt = pad.buttons[7]?.value ?? 0;
    const lt = pad.buttons[6]?.value ?? 0;
    const steer = applyDeadzone(pad.axes[0] ?? 0);

    if (rt > 0) s.throttle = Math.max(s.throttle, rt);
    if (lt > 0) s.brake = Math.max(s.brake, lt);
    if (steer !== 0) s.steer = steer;
    if (pressed(0)) s.handbrake = true; // A
    if (pressed(1)) s.reset = true; // B
    if (pressed(5)) s.boost = true;
    if (pressed(3)) s.camera = true;
    if (pressed(12)) s.cruise = true;
    if (pressed(2)) s.horn = true; // X
    if (pressed(9)) s.pause = true; // Start
  }

  readonly clear = (): void => {
    this.keys.clear();this.pressed.clear();
    const pad=(navigator.getGamepads?.()??[]).find(p=>p!=null);
    pad?.buttons.forEach((button,index)=>{if(button.pressed)this.blockedButtons.add(index);});
  };
  setKey(code: string, pressed: boolean): void { if (pressed) { if(!this.keys.has(code))this.pressed.add(code);this.keys.add(code); } else this.keys.delete(code); }
  isHeld(code: string): boolean { return this.keys.has(code); }

  private held(...codes: string[]): boolean {
    for (const c of codes) if (this.keys.has(c)) return true;
    return false;
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    if (e.target instanceof HTMLButtonElement && ['Space','Enter'].includes(e.code)) return;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    if(!e.repeat)this.pressed.add(e.code);
    this.keys.add(e.code);
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };
}
