import { test, expect } from '@playwright/test';

/**
 * Foundation smoke test (Phases 1+2 + ride-height): boot the real bundle, start a
 * race, and confirm the car generates, spawns ON the track (settles grounded, not
 * embedded/ejected), and drives forward under throttle while staying grounded —
 * with no uncaught runtime errors.
 *
 * NOTE: must run headed (see playwright.config.ts). The headless chromium_headless_shell
 * throttles requestAnimationFrame to ~1/sec, which freezes the rAF-driven game loop.
 */
test('foundation: track generates and the car drives on it', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto('/');

  // Wait for the engine to finish LOADING and reach ATTRACT (or MENU).
  await page.waitForFunction(() => {
    const e = (window as any).gameEngine;
    return !!e && (e.getState() === 'attract' || e.getState() === 'menu');
  }, null, { timeout: 30_000 });

  // Drive the state machine into PLAYING (ATTRACT -> MENU -> PLAYING).
  await page.evaluate(() => {
    const e = (window as any).gameEngine;
    if (e.getState() === 'attract') e.setState('menu');
    e.setState('playing');
  });

  // initializeRace() is async (track load + generation). Poll for the vehicle.
  await page.waitForFunction(() => {
    const e = (window as any).gameEngine;
    return !!(e && e.getVehicle && e.getVehicle());
  }, null, { timeout: 20_000 });

  // Let it settle onto the track (~2s).
  await page.waitForTimeout(2000);
  const settled = await page.evaluate(() => {
    const v = (window as any).gameEngine.getVehicle();
    const t = v.getTransform();
    const tel = v.getTelemetry();
    return { y: t.position.y, z: t.position.z, speed: tel.speed, grounded: tel.wheelsOnGround };
  });

  // Apply throttle (hold W) for ~2.5s and measure forward progress.
  const beforeZ = settled.z;
  await page.keyboard.down('w');
  await page.waitForTimeout(2500);
  const driving = await page.evaluate(() => {
    const v = (window as any).gameEngine.getVehicle();
    const t = v.getTransform();
    const tel = v.getTelemetry();
    return { y: t.position.y, z: t.position.z, speed: tel.speed, grounded: tel.wheelsOnGround };
  });
  await page.keyboard.up('w');

  console.log('SETTLED:', JSON.stringify(settled), 'DRIVING:', JSON.stringify(driving));

  // --- Assertions ---
  // No uncaught exceptions (e.g. a throw or NaN during track generation).
  expect(pageErrors, `pageErrors: ${pageErrors.join(' | ')}`).toHaveLength(0);

  // Car settled on the track surface: finite, sane height, mostly grounded, ~stationary.
  expect(Number.isFinite(settled.y)).toBe(true);
  expect(settled.y).toBeGreaterThan(-5);
  expect(settled.y).toBeLessThan(50);
  expect(settled.grounded).toBeGreaterThanOrEqual(3);
  expect(settled.speed).toBeLessThan(3);

  // Throttle produces forward motion while staying grounded (the grip fix works).
  expect(driving.speed).toBeGreaterThan(3);
  expect(driving.grounded).toBeGreaterThanOrEqual(3);
  expect(Math.abs(driving.z - beforeZ)).toBeGreaterThan(2);
});
