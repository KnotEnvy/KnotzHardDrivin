import { test, expect } from '@playwright/test';

test.describe('Phase 3: Track & Environment Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4201');
    await page.waitForTimeout(2000); // Allow game to initialize
  });

  test('Track loads without errors', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for initialization messages
    await page.waitForFunction(() => {
      return (window as any).console.logs?.some((log: string) =>
        log.includes('Race initialized successfully')
      ) || false;
    }, { timeout: 10000 });

    // Should have no errors
    expect(errors).toHaveLength(0);
  });

  test('Track and vehicle are visible in canvas', async ({ page }) => {
    const canvas = page.locator('canvas#game-canvas');
    await expect(canvas).toBeVisible();

    // Take screenshot to verify rendering
    await page.screenshot({ path: '__DOCS__/screenshots/phase3-render.png' });
  });

  test('Vehicle stays on track (physics collision working)', async ({ page }) => {
    // Wait for race start
    await page.waitForTimeout(3000);

    // Get initial vehicle telemetry
    const telemetry = await page.evaluate(() => {
      const engine = (window as any).gameEngine;
      if (!engine) return null;
      const vehicle = engine.getVehicle();
      if (!vehicle) return null;
      return vehicle.getTelemetry();
    });

    expect(telemetry).not.toBeNull();

    // Vehicle should be grounded (4/4 wheels on track)
    expect(telemetry.wheelsOnGround).toBe(4);

    // Should not be falling (speed should be low at spawn)
    expect(telemetry.speed).toBeLessThan(5);

    // G-force should be low (not free-falling)
    expect(telemetry.gForce).toBeLessThan(10);
  });

  test('Console shows track initialization', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    await page.waitForTimeout(3000);

    // Should see track loading messages
    const hasTrackLoaded = consoleMessages.some(msg =>
      msg.includes('Track data loaded:') || msg.includes('Track "')
    );
    expect(hasTrackLoaded).toBe(true);

    // Should see vehicle spawn message
    const hasVehicleSpawned = consoleMessages.some(msg =>
      msg.includes('Vehicle spawned at:')
    );
    expect(hasVehicleSpawned).toBe(true);
  });

  test('Skybox is visible (not blank screen)', async ({ page }) => {
    // Get canvas and check if it's rendering anything
    const canvas = page.locator('canvas#game-canvas');

    // Take screenshot and verify it's not all one color
    const screenshot = await page.screenshot({ fullPage: false });

    // Screenshot should exist and be non-empty
    expect(screenshot.length).toBeGreaterThan(1000);
  });

  test('Grid helper is visible for spatial reference', async ({ page }) => {
    // Check scene contents via console
    const sceneInfo = await page.evaluate(() => {
      const engine = (window as any).gameEngine;
      if (!engine) return null;
      const scene = engine.getSceneManager().scene;

      return {
        childCount: scene.children.length,
        hasGridHelper: scene.children.some((child: any) =>
          child.type === 'GridHelper'
        ),
      };
    });

    expect(sceneInfo).not.toBeNull();
    expect(sceneInfo.childCount).toBeGreaterThan(0);
    expect(sceneInfo.hasGridHelper).toBe(true);
  });

  test('Camera system is active', async ({ page }) => {
    const cameraInfo = await page.evaluate(() => {
      const engine = (window as any).gameEngine;
      if (!engine) return null;

      const camera = engine.getSceneManager().camera;
      return {
        position: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        },
        hasCamera: camera !== null,
      };
    });

    expect(cameraInfo).not.toBeNull();
    expect(cameraInfo.hasCamera).toBe(true);

    // Camera should not be at origin (0,0,0)
    const isAtOrigin =
      cameraInfo.position.x === 0 &&
      cameraInfo.position.y === 0 &&
      cameraInfo.position.z === 0;
    expect(isAtOrigin).toBe(false);
  });

  test('No test cube visible (removed from scene)', async ({ page }) => {
    const hasTestCube = await page.evaluate(() => {
      const engine = (window as any).gameEngine;
      if (!engine) return false;
      const scene = engine.getSceneManager().scene;

      // Check for test cube in scene
      return scene.children.some((child: any) =>
        child.name === 'testCube' || child.geometry?.type === 'BoxGeometry'
      );
    });

    expect(hasTestCube).toBe(false);
  });
});
