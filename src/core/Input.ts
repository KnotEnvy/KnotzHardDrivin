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
}

const GAMEPAD_DEADZONE = 0.15;

function applyDeadzone(v: number): number {
  return Math.abs(v) < GAMEPAD_DEADZONE ? 0 : v;
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
  private readonly target: Window;
  private attached = false;

  constructor(target: Window = window) {
    this.target = target;
  }

  attach(): void {
    if (this.attached) return;
    this.target.addEventListener('keydown', this.onKeyDown);
    this.target.addEventListener('keyup', this.onKeyUp);
    this.attached = true;
  }

  detach(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.keys.clear();
    this.attached = false;
  }

  /** Recompute `state` from current key set + connected gamepad. */
  update(): void {
    const s = this.state;
    s.throttle = this.held('KeyW', 'ArrowUp') ? 1 : 0;
    s.brake = this.held('KeyS', 'ArrowDown') ? 1 : 0;
    s.steer = (this.held('KeyD', 'ArrowRight') ? 1 : 0) - (this.held('KeyA', 'ArrowLeft') ? 1 : 0);
    s.handbrake = this.held('Space');
    s.reset = this.held('KeyR');
    s.pause = this.held('Escape');

    this.foldInGamepad(s);
  }

  private foldInGamepad(s: InputState): void {
    const pads = navigator.getGamepads?.() ?? [];
    const pad = pads.find((p): p is Gamepad => p != null);
    if (!pad) return;

    // Standard mapping: RT = throttle, LT = brake, left stick X = steer.
    const rt = pad.buttons[7]?.value ?? 0;
    const lt = pad.buttons[6]?.value ?? 0;
    const steer = applyDeadzone(pad.axes[0] ?? 0);

    if (rt > 0) s.throttle = Math.max(s.throttle, rt);
    if (lt > 0) s.brake = Math.max(s.brake, lt);
    if (steer !== 0) s.steer = steer;
    if (pad.buttons[0]?.pressed) s.handbrake = true; // A
    if (pad.buttons[1]?.pressed) s.reset = true; // B
    if (pad.buttons[9]?.pressed) s.pause = true; // Start
  }

  private held(...codes: string[]): boolean {
    for (const c of codes) if (this.keys.has(c)) return true;
    return false;
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };
}
