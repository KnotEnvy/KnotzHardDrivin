import { test, expect } from '@playwright/test';

test('Inspect scene contents and vehicle state', async ({ page }) => {
  await page.goto('http://localhost:4201');
  await page.waitForTimeout(3000);

  const sceneData = await page.evaluate(() => {
    const engine = (window as any).gameEngine;
    if (!engine) return { error: 'No engine' };

    const scene = engine.getSceneManager().scene;
    const vehicle = engine.getVehicle();

    // Inspect all scene children
    const children = scene.children.map((child: any) => ({
      type: child.type,
      name: child.name || 'unnamed',
      geometryType: child.geometry?.type || 'none',
      position: child.position ? {
        x: child.position.x.toFixed(2),
        y: child.position.y.toFixed(2),
        z: child.position.z.toFixed(2)
      } : null,
      visible: child.visible,
      isTestCube: child.name === 'testCube' || (child.geometry?.type === 'BoxGeometry' && child.name !== 'vehicle-body'),
    }));

    // Get vehicle telemetry
    const telemetry = vehicle ? vehicle.getTelemetry() : null;
    const transform = vehicle ? vehicle.getTransform() : null;

    return {
      sceneChildCount: scene.children.length,
      children,
      vehicleTelemetry: telemetry ? {
        wheelsOnGround: telemetry.wheelsOnGround,
        speed: telemetry.speed.toFixed(2),
        gForce: telemetry.gForce.toFixed(2),
        isAirborne: telemetry.isAirborne,
        rpm: telemetry.rpm.toFixed(0),
        gear: telemetry.gear,
      } : null,
      vehicleTransform: transform ? {
        position: {
          x: transform.position.x.toFixed(2),
          y: transform.position.y.toFixed(2),
          z: transform.position.z.toFixed(2),
        },
        velocity: {
          x: transform.linearVelocity.x.toFixed(2),
          y: transform.linearVelocity.y.toFixed(2),
          z: transform.linearVelocity.z.toFixed(2),
        }
      } : null,
    };
  });

  console.log('\n=== SCENE INSPECTION ===');
  console.log(JSON.stringify(sceneData, null, 2));

  // Take screenshot
  await page.screenshot({
    path: '__DOCS__/screenshots/scene-inspection.png',
    fullPage: false
  });
});
