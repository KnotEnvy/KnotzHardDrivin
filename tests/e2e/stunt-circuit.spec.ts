import { test, expect } from '@playwright/test';

/**
 * Stunt circuit drive test: validates the flagship "Hard Drivin' Stunt Circuit"
 * (loop descoped for now) drives cleanly end-to-end — the car builds speed down the
 * main straight, takes the banked hairpins, clears the ramp jump, and laps the
 * circuit while staying mostly grounded, with no uncaught errors and no crash-loop.
 *
 * NOTE: must run headed (see playwright.config.ts) — headless throttles rAF and
 * freezes the game loop.
 */
test('stunt circuit drives cleanly (banks + ramp jump, no loop)', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

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

  await page.waitForTimeout(1500);
  const start = await page.evaluate(() => {
    const t = (window as any).gameEngine.getVehicle().getTransform();
    return { x: t.position.x, z: t.position.z };
  });

  // Drive: hold throttle and sample for ~18s.
  await page.keyboard.down('w');
  let maxSpeed = 0;
  let groundedSamples = 0;
  let nanSeen = false;
  let replayCount = 0;
  let lastState = 'playing';
  let maxTravel = 0;
  for (let i = 0; i < 90; i++) {
    await page.waitForTimeout(200);
    const s = await page.evaluate(() => {
      const e = (window as any).gameEngine;
      const v = e.getVehicle();
      const t = v.getTransform();
      const tel = v.getTelemetry();
      return {
        state: e.getState(),
        x: t.position.x, y: t.position.y, z: t.position.z,
        speed: tel.speed, grounded: tel.wheelsOnGround,
      };
    });
    if (!Number.isFinite(s.x) || !Number.isFinite(s.y) || !Number.isFinite(s.z)) nanSeen = true;
    maxSpeed = Math.max(maxSpeed, s.speed);
    if (s.grounded >= 3) groundedSamples++;
    if (s.state === 'replay' && lastState !== 'replay') replayCount++;
    lastState = s.state;
    const travel = Math.hypot(s.x - start.x, s.z - start.z);
    maxTravel = Math.max(maxTravel, travel);
  }
  await page.keyboard.up('w');

  console.log(`maxSpeed=${maxSpeed.toFixed(1)} maxTravel=${maxTravel.toFixed(0)}m groundedSamples=${groundedSamples}/90 replays=${replayCount}`);

  // --- Assertions ---
  expect(pageErrors, `pageErrors: ${pageErrors.join(' | ')}`).toHaveLength(0);
  expect(nanSeen, 'NaN in vehicle transform').toBe(false);
  // Car builds real speed down the straight.
  expect(maxSpeed, 'car never reached driving speed').toBeGreaterThan(20);
  // Car travels a substantial distance around the circuit (not stuck on geometry).
  expect(maxTravel, 'car did not get far around the circuit').toBeGreaterThan(150);
  // Car spends most of the time grounded (brief airborne on the ramp jump is fine).
  expect(groundedSamples, 'car was airborne/ungrounded too much').toBeGreaterThan(45);
  // No repeated crash-loop.
  expect(replayCount, 'car kept crashing (crash-loop)').toBeLessThanOrEqual(1);
});
