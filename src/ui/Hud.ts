import type { RacePhase } from '../systems/Race';

/** Everything the HUD needs for a frame. */
export interface HudModel {
  speedKmh: number;
  phase: RacePhase;
  lap: number;
  totalLaps: number;
  currentLapTime: number;
  lastLapTime: number;
  bestLapTime: number;
  flash: string;
  flashId: number;
}

function pad(n: number, width: number): string {
  return n.toString().padStart(width, '0');
}

/** Format seconds as m:ss.mmm (or a placeholder for empty/unset times). */
export function formatTime(s: number): string {
  if (!Number.isFinite(s) || s <= 0) return '-:--.---';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s * 1000) % 1000);
  return `${m}:${pad(sec, 2)}.${pad(ms, 3)}`;
}

/**
 * Heads-up display: lap + live lap timer up top, best/last bottom-left, a big
 * speed readout bottom-right, a centre flash banner for countdown/lap/finish,
 * and a controls hint. Pure DOM (cheap) — `update()` only writes changed text.
 */
export class Hud {
  private readonly lapValue: HTMLElement;
  private readonly timer: HTMLElement;
  private readonly best: HTMLElement;
  private readonly last: HTMLElement;
  private readonly speed: HTMLElement;
  private readonly flash: HTMLElement;

  private lastFlashId = -1;

  constructor(host: HTMLElement) {
    host.innerHTML = `
      <div class="hud__top">
        <div class="hud__chip"><span class="hud__label">LAP</span><span class="hud__lap" data-lap>1/3</span></div>
        <div class="hud__chip hud__chip--timer"><span class="hud__timer" data-timer>0:00.000</span></div>
      </div>
      <div class="hud__times">
        <div class="hud__row"><span class="hud__label">BEST</span><span data-best>-:--.---</span></div>
        <div class="hud__row"><span class="hud__label">LAST</span><span data-last>-:--.---</span></div>
      </div>
      <div class="hud__speedometer">
        <span class="hud__speed" data-speed>0</span><span class="hud__unit">km/h</span>
      </div>
      <div class="hud__hint">WASD / Arrows · Space handbrake · R re-grid</div>
      <div class="hud__flash" data-flash></div>
    `;

    this.lapValue = host.querySelector('[data-lap]')!;
    this.timer = host.querySelector('[data-timer]')!;
    this.best = host.querySelector('[data-best]')!;
    this.last = host.querySelector('[data-last]')!;
    this.speed = host.querySelector('[data-speed]')!;
    this.flash = host.querySelector('[data-flash]')!;
  }

  update(m: HudModel): void {
    this.speed.textContent = String(m.speedKmh);
    this.lapValue.textContent = `${Math.min(m.lap, m.totalLaps)}/${m.totalLaps}`;
    this.timer.textContent = formatTime(m.currentLapTime);
    this.best.textContent = formatTime(m.bestLapTime);
    this.last.textContent = formatTime(m.lastLapTime);

    if (m.flashId !== this.lastFlashId) {
      this.lastFlashId = m.flashId;
      this.showFlash(m.flash);
    }
  }

  private showFlash(text: string): void {
    if (!text) {
      this.flash.classList.remove('is-show');
      return;
    }
    this.flash.textContent = text;
    this.flash.classList.toggle('hud__flash--go', text === 'GO!' || text.startsWith('LAP'));
    this.flash.classList.toggle('hud__flash--finish', text === 'FINISH!');
    // Restart the CSS animation by forcing a reflow.
    this.flash.classList.remove('is-show');
    void this.flash.offsetWidth;
    this.flash.classList.add('is-show');
  }
}
