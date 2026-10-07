import * as THREE from 'three';
import { RaceConfig as R } from '../config/race.config';

export type RacePhase = 'countdown' | 'racing' | 'finished';

/** An ordered gate the car must drive through, in track direction. */
export interface Checkpoint {
  readonly position: THREE.Vector3;
  readonly forward: THREE.Vector3;
}

/** A flat, allocation-free view of race state for the HUD to read each frame. */
export interface RaceSnapshot {
  phase: RacePhase;
  lap: number;
  totalLaps: number;
  countdown: number;
  currentLapTime: number;
  lastLapTime: number;
  bestLapTime: number;
  /** Transient banner text ('', '3', 'GO!', 'LAP 2', 'FINISH!'). */
  flash: string;
  /** Increments whenever `flash` changes, so the HUD can re-trigger its anim. */
  flashId: number;
}

/**
 * Deterministic race controller. Runs inside the fixed-step update so lap times
 * are frame-rate independent. The car advances through `checkpoints` in order;
 * reaching gate 0 again completes a lap. Out-of-order / reverse motion simply
 * doesn't advance the gate, so laps can't be cheated.
 */
export class RaceController {
  private readonly gates: Checkpoint[];

  private phase: RacePhase = 'countdown';
  private countdownRemaining = R.countdownSeconds;
  private clock = 0; // seconds since the current lap started (racing only)
  private lap = 1;
  private nextGate = 1;
  private lastLap = 0;
  private best = Infinity;
  private flash = '';
  private flashId = 0;
  private lastCountLabel = '';

  constructor(checkpoints: Checkpoint[]) {
    this.gates = checkpoints;
  }

  /** True while the start countdown is holding the player still. */
  get controlsLocked(): boolean {
    return this.phase === 'countdown';
  }

  /** Re-grid: back to countdown with a fresh clock (call alongside respawn). */
  reset(): void {
    this.phase = 'countdown';
    this.countdownRemaining = R.countdownSeconds;
    this.clock = 0;
    this.lap = 1;
    this.nextGate = 1;
    this.lastLap = 0;
    this.best = Infinity;
    this.lastCountLabel = '';
    this.setFlash('');
  }

  update(dt: number, carPos: THREE.Vector3, carVel: THREE.Vector3): void {
    if (this.phase === 'countdown') {
      this.countdownRemaining -= dt;
      const label = this.countdownRemaining > 0 ? String(Math.ceil(this.countdownRemaining)) : 'GO!';
      if (label !== this.lastCountLabel) {
        this.setFlash(label);
        this.lastCountLabel = label;
      }
      if (this.countdownRemaining <= 0) {
        this.phase = 'racing';
        this.clock = 0;
      }
      return;
    }
    if (this.phase === 'finished') return;

    this.clock += dt;

    const gate = this.gates[this.nextGate];
    const dx = carPos.x - gate.position.x;
    const dz = carPos.z - gate.position.z;
    const within = dx * dx + dz * dz <= R.captureRadius * R.captureRadius;
    const forwardDot = carVel.x * gate.forward.x + carVel.z * gate.forward.z;

    if (within && forwardDot > R.minForwardSpeed) {
      if (this.nextGate === 0) {
        // Crossed the start/finish having hit every gate → lap complete.
        this.lastLap = this.clock;
        if (this.clock < this.best) this.best = this.clock;
        if (this.lap >= R.totalLaps) {
          this.phase = 'finished';
          this.setFlash('FINISH!');
        } else {
          this.lap += 1;
          this.clock = 0;
          this.setFlash(`LAP ${this.lap}`);
        }
        this.nextGate = 1;
      } else {
        this.nextGate = (this.nextGate + 1) % this.gates.length;
      }
    }
  }

  /** Fill `out` with the current state (no allocation). */
  snapshot(out: RaceSnapshot): void {
    out.phase = this.phase;
    out.lap = this.lap;
    out.totalLaps = R.totalLaps;
    out.countdown = Math.max(0, Math.ceil(this.countdownRemaining));
    out.currentLapTime = this.phase === 'racing' ? this.clock : this.phase === 'finished' ? this.lastLap : 0;
    out.lastLapTime = this.lastLap;
    out.bestLapTime = this.best;
    out.flash = this.flash;
    out.flashId = this.flashId;
  }

  private setFlash(s: string): void {
    this.flash = s;
    this.flashId++;
  }
}
