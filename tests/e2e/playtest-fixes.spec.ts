import { test, expect } from '@playwright/test';

// Regression tests for two playtest bugs:
//  1. Stunt track road climbed to ~45 m in the air (ramp leaked pitch into the long
//     banks). After the ramp-exit-leveling fix the track must be ~flat.
//  2. Steering was reversed (press left -> turned right).
// NOTE: must run headed (headless throttles rAF and freezes the game loop).

async function startRace(page: any, trackId: string | null) {
  await page.goto('/');
  await page.waitForFunction(() => {
    const e = (window as any).gameEngine;
    return !!e && (e.getState() === 'attract' || e.getState() === 'menu');
  }, null, { timeout: 30_000 });
  if (trackId) {
    await page.evaluate((id: string) => { (window as any).__careerSystem.setCurrentTrack(id); }, trackId);
  }
  await page.evaluate(() => {
    const e = (window as any).gameEngine;
    if (e.getState() === 'attract') e.setState('menu');
    e.setState('playing');
  });
  await page.waitForFunction(() => {
    const e = (window as any).gameEngine;
    return !!(e && e.getVehicle && e.getVehicle());
  }, null, { timeout: 20_000 });
  await page.waitForTimeout(1500);
}

test('stunt track road sits near the ground (no 45 m climb)', async ({ page }) => {
  await startRace(page, 'stunt');
  const b = await page.evaluate(() => {
    const bb = (window as any).gameEngine.getTrack().getBounds();
    return { minY: bb.min.y, maxY: bb.max.y };
  });
  console.log('STUNT Y range:', JSON.stringify(b));
  // Ramp peak (~6) + wall (1.5) + spawn elevation — comfortably under 12 m.
  expect(b.maxY, 'stunt road still climbs into the air').toBeLessThan(12);
});

test('steering left turns the car left', async ({ page }) => {
  await startRace(page, null); // oval, flat, facing +Z at spawn
  const before = await page.evaluate(() => {
    const t = (window as any).gameEngine.getVehicle().getTransform();
    return { x: t.position.x, z: t.position.z };
  });

  // Build a little speed, then hold throttle + LEFT (A) for ~2.5s.
  await page.keyboard.down('w');
  await page.waitForTimeout(800);
  await page.keyboard.down('a');
  await page.waitForTimeout(2500);
  const after = await page.evaluate(() => {
    const t = (window as any).gameEngine.getVehicle().getTransform();
    return { x: t.position.x, z: t.position.z, fwdX: t.forward.x };
  });
  await page.keyboard.up('a');
  await page.keyboard.up('w');

  console.log('STEER LEFT before:', JSON.stringify(before), 'after:', JSON.stringify(after));
  // The chase camera looks toward +Z (it sits behind the car), so world +X is
  // screen-LEFT. Pressing LEFT must curve the car toward +X / positive forward.x.
  expect(after.x, 'car did not move screen-left when steering left').toBeGreaterThan(before.x + 1);
  expect(after.fwdX, 'car heading did not rotate left').toBeGreaterThan(0.05);
});
