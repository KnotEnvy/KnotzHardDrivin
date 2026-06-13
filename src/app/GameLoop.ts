import { MAX_FRAME_DELTA, MAX_SUB_STEPS } from '../config/constants';
import { computeFixedSteps } from './fixedStep';

export interface GameLoopOptions {
  /** Seconds per fixed physics step. */
  fixedStep: number;
  /** Advance the simulation by exactly `fixedStep` seconds. */
  update: (fixedDelta: number) => void;
  /**
   * Draw a frame. `alpha` in [0,1) is how far we are between the previous and
   * current physics state — use it to interpolate rendered transforms.
   */
  render: (alpha: number) => void;
  /** Optional per-frame hook for stats (fps, timings). */
  onFrame?: (frameDelta: number) => void;
}

/**
 * Fixed-timestep game loop driven by requestAnimationFrame.
 *
 * Physics is stepped a whole number of times at a constant rate; rendering
 * happens once per animation frame with an interpolation factor. This keeps the
 * simulation deterministic regardless of display refresh (60 / 120 / 144 Hz).
 */
export class GameLoop {
  private readonly opts: GameLoopOptions;
  private accumulator = 0;
  private lastTime = 0;
  private rafId = 0;
  private running = false;

  constructor(opts: GameLoopOptions) {
    this.opts = opts;
  }

  get isRunning(): boolean {
    return this.running;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.accumulator = 0;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private readonly tick = (now: number): void => {
    if (!this.running) return;

    let frameDelta = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (frameDelta > MAX_FRAME_DELTA) frameDelta = MAX_FRAME_DELTA;

    this.accumulator += frameDelta;
    const { steps, remainder } = computeFixedSteps(
      this.accumulator,
      this.opts.fixedStep,
      MAX_SUB_STEPS,
    );
    for (let i = 0; i < steps; i++) {
      this.opts.update(this.opts.fixedStep);
    }
    this.accumulator = remainder;

    const alpha = this.accumulator / this.opts.fixedStep;
    this.opts.render(alpha);
    this.opts.onFrame?.(frameDelta);

    this.rafId = requestAnimationFrame(this.tick);
  };
}
