import { test, expect } from '@playwright/test';

test('Capture console output during game initialization', async ({ page }) => {
  const consoleMessages: { type: string; text: string }[] = [];
  const errors: string[] = [];

  // Capture all console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleMessages.push({ type, text });

    if (type === 'error') {
      errors.push(text);
    }
  });

  // Navigate to game
  await page.goto('http://localhost:4201');

  // Wait for initialization (or timeout)
  await page.waitForTimeout(5000);

  // Log all console messages
  console.log('\n=== CONSOLE OUTPUT ===');
  consoleMessages.forEach(({ type, text }) => {
    console.log(`[${type.toUpperCase()}] ${text}`);
  });

  console.log('\n=== ERRORS ===');
  if (errors.length === 0) {
    console.log('No errors detected');
  } else {
    errors.forEach(err => console.log(`ERROR: ${err}`));
  }

  // Check game engine state
  const gameState = await page.evaluate(() => {
    const engine = (window as any).gameEngine;
    if (!engine) return { error: 'No gameEngine found on window' };

    return {
      hasEngine: true,
      hasSceneManager: !!engine.getSceneManager,
      hasPhysicsWorld: !!engine.physicsWorld,
      hasVehicle: !!engine.getVehicle,
      hasTrack: !!engine.track,
      sceneChildCount: engine.getSceneManager?.()?.scene?.children?.length || 0,
    };
  });

  console.log('\n=== GAME STATE ===');
  console.log(JSON.stringify(gameState, null, 2));

  // Take screenshot
  await page.screenshot({ path: '__DOCS__/screenshots/console-capture.png' });
});
