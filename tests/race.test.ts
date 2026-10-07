import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { RaceController, type RaceSnapshot, type Checkpoint } from '../src/systems/Race';
import { RaceConfig } from '../src/config/race.config';

/**
 * Pure, deterministic tests for the race/lap controller. Geometry is irrelevant
 * to the controller (it only cares about proximity + forward direction), so we
 * use a simple square loop of four gates and teleport the car through them.
 */

const STEP = 1 / 60;

function gates(): Checkpoint[] {
  return [
    { position: new THREE.Vector3(0, 0, 0), forward: new THREE.Vector3(1, 0, 0) }, // 0 = start
    { position: new THREE.Vector3(100, 0, 0), forward: new THREE.Vector3(0, 0, 1) },
    { position: new THREE.Vector3(100, 0, 100), forward: new THREE.Vector3(-1, 0, 0) },
    { position: new THREE.Vector3(0, 0, 100), forward: new THREE.Vector3(0, 0, -1) },
  ];
}

function emptySnapshot(): RaceSnapshot {
  return {
    phase: 'countdown',
    lap: 1,
    totalLaps: 0,
    countdown: 0,
    currentLapTime: 0,
    lastLapTime: 0,
    bestLapTime: Infinity,
    flash: '',
    flashId: 0,
  };
}

const ZERO = new THREE.Vector3();

function finishCountdown(r: RaceController): void {
  const steps = Math.ceil(RaceConfig.countdownSeconds / STEP) + 2;
  for (let i = 0; i < steps; i++) r.update(STEP, ZERO, ZERO);
}

/** Drive forward through a gate (counts). */
function passForward(r: RaceController, g: Checkpoint): void {
  r.update(STEP, g.position, g.forward.clone().multiplyScalar(10));
}

/** Approach a gate going the wrong way (must NOT count). */
function passReverse(r: RaceController, g: Checkpoint): void {
  r.update(STEP, g.position, g.forward.clone().multiplyScalar(-10));
}

function doLap(r: RaceController, gs: Checkpoint[]): void {
  passForward(r, gs[1]);
  passForward(r, gs[2]);
  passForward(r, gs[3]);
  passForward(r, gs[0]);
}

describe('RaceController', () => {
  it('locks controls during the countdown, then unlocks for racing', () => {
    const r = new RaceController(gates());
    expect(r.controlsLocked).toBe(true);
    finishCountdown(r);
    expect(r.controlsLocked).toBe(false);

    const s = emptySnapshot();
    r.snapshot(s);
    expect(s.phase).toBe('racing');
  });

  it('counts a lap only after the gates are taken in order', () => {
    const gs = gates();
    const r = new RaceController(gs);
    finishCountdown(r);

    const s = emptySnapshot();

    // Sitting on the start line (gate 0) before doing the loop does nothing.
    passForward(r, gs[0]);
    r.snapshot(s);
    expect(s.lap).toBe(1);

    doLap(r, gs);
    r.snapshot(s);
    expect(s.lap).toBe(2);
    expect(s.lastLapTime).toBeGreaterThan(0);
    expect(s.bestLapTime).toBeLessThan(Infinity);
  });

  it('ignores reverse / wrong-way gate crossings', () => {
    const gs = gates();
    const r = new RaceController(gs);
    finishCountdown(r);

    // Run the whole loop backwards — no progress should be made.
    passReverse(r, gs[3]);
    passReverse(r, gs[2]);
    passReverse(r, gs[1]);
    passReverse(r, gs[0]);

    const s = emptySnapshot();
    r.snapshot(s);
    expect(s.lap).toBe(1);
    expect(s.lastLapTime).toBe(0);

    // A proper forward lap still completes afterwards.
    doLap(r, gs);
    r.snapshot(s);
    expect(s.lap).toBe(2);
  });

  it('keeps the best lap as the minimum of completed laps', () => {
    const gs = gates();
    const r = new RaceController(gs);
    finishCountdown(r);

    doLap(r, gs); // fast lap (4 steps)
    const s = emptySnapshot();
    r.snapshot(s);
    const firstBest = s.bestLapTime;

    // A slower second lap: idle a while before completing it.
    passForward(r, gs[1]);
    for (let i = 0; i < 30; i++) r.update(STEP, gs[1].position, ZERO);
    passForward(r, gs[2]);
    passForward(r, gs[3]);
    passForward(r, gs[0]);

    r.snapshot(s);
    expect(s.lastLapTime).toBeGreaterThan(firstBest);
    expect(s.bestLapTime).toBeCloseTo(firstBest, 5); // best unchanged by slower lap
  });

  it('finishes after the configured number of laps', () => {
    const gs = gates();
    const r = new RaceController(gs);
    finishCountdown(r);

    for (let i = 0; i < RaceConfig.totalLaps; i++) doLap(r, gs);

    const s = emptySnapshot();
    r.snapshot(s);
    expect(s.phase).toBe('finished');
    expect(s.lap).toBe(RaceConfig.totalLaps);
  });

  it('reset returns to a fresh countdown', () => {
    const gs = gates();
    const r = new RaceController(gs);
    finishCountdown(r);
    doLap(r, gs);

    r.reset();
    expect(r.controlsLocked).toBe(true);

    const s = emptySnapshot();
    r.snapshot(s);
    expect(s.phase).toBe('countdown');
    expect(s.lap).toBe(1);
    expect(s.bestLapTime).toBe(Infinity);
  });
});
