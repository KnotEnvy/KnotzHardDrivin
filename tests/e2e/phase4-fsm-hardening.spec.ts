import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 4 — gameplay-loop hardening on the flagship stunt circuit.
 *
 * Validates the full FSM end-to-end on the banked/ramped track:
 *   - driving the banks produces no invalid state transitions, no uncaught
 *     errors, and keeps the vehicle + chase camera transforms finite (no
 *     gimbal/up-vector blow-up);
 *   - the race-finish path (PLAYING -> RESULTS) builds the results screen cleanly;
 *   - crash -> REPLAY -> respawn re-arms crash detection so the settling car does
 *     NOT immediately re-crash, AND a *second* crash still triggers a replay
 *     (regression guard for the broken game clock that previously froze the
 *     crash-replay cooldown after the first replay — only one replay per race).
 *
 * NOTE: must run headed (see playwright.config.ts) — headless throttles rAF and
 * freezes the rAF-driven game loop.
 */

interface Captured {
  pageErrors: string[];
  consoleErrors: string[];
  invalidTransitions: string[];
}

/** Boots the game, selects the stunt circuit, and enters PLAYING. */
async function startStuntRace(page: Page): Promise<Captured> {
  const cap: Captured = { pageErrors: [], consoleErrors: [], invalidTransitions: [] };
  page.on('pageerror', (err) => cap.pageErrors.push(err.message));
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') cap.consoleErrors.push(text);
    if (/invalid (state )?transition/i.test(text)) cap.invalidTransitions.push(text);
  });

  await page.goto('/');
  await page.waitForFunction(() => {
    const e = (window as any).gameEngine;
    return !!e && (e.getState() === 'attract' || e.getState() === 'menu');
  }, null, { timeout: 30_000 });

  await page.evaluate(() => { (window as any).__careerSystem.setCurrentTrack('stunt'); });
  await page.evaluate(() => {
    const e = (window as any).gameEngine;
    if (e.getState() === 'attract') e.setState('menu');
    e.setState('playing');
  });
  await page.waitForFunction(() => {
    const e = (window as any).gameEngine;
    return !!(e && e.getVehicle && e.getVehicle());
  }, null, { timeout: 20_000 });

  const trackId = await page.evaluate(() => (window as any).__careerSystem.getCurrentTrack()?.id);
  expect(trackId, 'stunt track should be current').toBe('stunt');
  return cap;
}

/** Reads vehicle + chase-camera state in one round-trip. */
function snapshot(page: Page) {
  return page.evaluate(() => {
    const e = (window as any).gameEngine;
    const v = e.getVehicle();
    const cam = e.getCameraSystem().camera;
    const t = v ? v.getTransform() : null;
    const tel = v ? v.getTelemetry() : null;
    return {
      state: e.getState() as string,
      pos: t ? { x: t.position.x, y: t.position.y, z: t.position.z } : null,
      grounded: tel ? (tel.wheelsOnGround as number) : 0,
      camPos: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
    };
  });
}

/** Teleports the vehicle high above its current spot so it free-falls into a hard landing. */
async function dropFromHeight(page: Page) {
  await page.evaluate(() => {
    const e = (window as any).gameEngine;
    const v = e.getVehicle();
    if (!v) return;
    const t = v.getTransform();
    // reset() honors the given position (plus ride-height), zeroes velocity, and
    // un-grounds the wheels -> a clean free-fall onto the road below.
    v.reset({ x: t.position.x, y: 60, z: t.position.z }, { x: 0, y: 0, z: 0, w: 1 });
  });
}

test('FSM loop is glitch-free on the banked circuit (drive + results)', async ({ page }) => {
  const cap = await startStuntRace(page);
  await page.waitForTimeout(1500); // let the car settle on the start line

  await page.keyboard.down('w');
  let nanSeen = false;
  let camWild = false;
  let maxTravel = 0;
  const start = await snapshot(page);

  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(200);
    const s = await snapshot(page);
    const finite = s.pos
      && [s.pos.x, s.pos.y, s.pos.z, s.camPos.x, s.camPos.y, s.camPos.z].every(Number.isFinite);
    if (!finite) nanSeen = true;
    if (s.pos) {
      // The chase camera should track within a sane distance of the car through
      // the banks; a gimbal/up-vector blow-up would fling it far away.
      const camDist = Math.hypot(s.camPos.x - s.pos.x, s.camPos.y - s.pos.y, s.camPos.z - s.pos.z);
      if (camDist > 60) camWild = true;
      if (start.pos) {
        maxTravel = Math.max(maxTravel, Math.hypot(s.pos.x - start.pos.x, s.pos.z - start.pos.z));
      }
    }
  }
  await page.keyboard.up('w');

  expect(nanSeen, 'NaN in vehicle/camera transform').toBe(false);
  expect(camWild, 'chase camera flew away from the car (gimbal/up-vector blow-up)').toBe(false);
  expect(maxTravel, 'car did not traverse the circuit').toBeGreaterThan(100);

  // Race-finish path: PLAYING -> RESULTS must build the results screen without throwing.
  await page.evaluate(() => { (window as any).gameEngine.setState('results'); });
  await page.waitForTimeout(500);
  const finalState = await page.evaluate(() => (window as any).gameEngine.getState());
  expect(finalState, 'should have reached RESULTS').toBe('results');

  expect(cap.invalidTransitions, `invalid transitions: ${cap.invalidTransitions.join(' | ')}`).toHaveLength(0);
  expect(cap.pageErrors, `pageErrors: ${cap.pageErrors.join(' | ')}`).toHaveLength(0);
});

test('crash -> replay -> respawn re-arms detection; a second crash still replays', async ({ page }) => {
  const cap = await startStuntRace(page);

  // Drive briefly: clears the post-spawn settle grace and gives the recorder frames.
  await page.waitForTimeout(1500);
  await page.keyboard.down('w');
  await page.waitForTimeout(1500);
  await page.keyboard.up('w');

  // --- Crash #1 ---
  await dropFromHeight(page);
  await page.waitForFunction(() => (window as any).gameEngine.getState() === 'replay',
    null, { timeout: 20_000 });
  // Replay plays out, then the vehicle respawns and returns to PLAYING.
  await page.waitForFunction(() => (window as any).gameEngine.getState() === 'playing',
    null, { timeout: 40_000 });

  // Respawn must settle grounded WITHOUT immediately re-crashing (no crash-loop).
  let groundedAfterRespawn = false;
  let secondReplayDuringSettle = false;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(200);
    const s = await snapshot(page);
    if (s.state === 'replay') { secondReplayDuringSettle = true; break; }
    if (s.grounded >= 3) { groundedAfterRespawn = true; break; }
  }
  expect(secondReplayDuringSettle, 'respawn immediately re-crashed (crash-loop)').toBe(false);
  expect(groundedAfterRespawn, 'car never settled grounded after respawn').toBe(true);

  // Let the 2s replay cooldown lapse in real time (the fixed clock now advances).
  await page.waitForTimeout(2500);

  // --- Crash #2 --- must ALSO trigger a replay. Before the clock fix the cooldown
  // never expired, so the second crash was permanently suppressed.
  await dropFromHeight(page);
  let secondReplay = false;
  try {
    await page.waitForFunction(() => (window as any).gameEngine.getState() === 'replay',
      null, { timeout: 20_000 });
    secondReplay = true;
  } catch {
    secondReplay = false;
  }
  expect(secondReplay, 'second crash did not trigger a replay (cooldown stuck)').toBe(true);

  expect(cap.invalidTransitions, `invalid transitions: ${cap.invalidTransitions.join(' | ')}`).toHaveLength(0);
  expect(cap.pageErrors, `pageErrors: ${cap.pageErrors.join(' | ')}`).toHaveLength(0);
});
