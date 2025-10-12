import { test, expect } from '@playwright/test';

test('Debug vehicle raycasts', async ({ page }) => {
  await page.goto('http://localhost:4201');
  await page.waitForTimeout(3000);

  const raycastData = await page.evaluate(() => {
    const engine = (window as any).gameEngine;
    if (!engine) return { error: 'No engine' };

    const vehicle = engine.getVehicle();
    if (!vehicle) return { error: 'No vehicle' };

    // Access vehicle internal state (for debugging only)
    const vehicleAny = vehicle as any;
    const world = vehicleAny.world;
    const transform = vehicle.getTransform();
    const wheels = vehicle.getWheelStates();

    // Perform a manual test raycast from vehicle position downward
    const testRay = {
      origin: {
        x: transform.position.x,
        y: transform.position.y,
        z: transform.position.z
      },
      dir: { x: 0, y: -1, z: 0 }
    };

    const testHit = world.castRay(testRay, 50.0, true);

    return {
      vehiclePosition: {
        x: transform.position.x.toFixed(2),
        y: transform.position.y.toFixed(2),
        z: transform.position.z.toFixed(2),
      },
      wheelStates: wheels.map((w: any, i: number) => ({
        index: i,
        isGrounded: w.isGrounded,
        suspensionLength: w.suspensionLength?.toFixed(2),
        contactPoint: w.contactPoint ? {
          x: w.contactPoint.x.toFixed(2),
          y: w.contactPoint.y.toFixed(2),
          z: w.contactPoint.z.toFixed(2),
        } : null,
      })),
      testRaycast: {
        origin: testRay.origin,
        hit: testHit ? {
          timeOfImpact: testHit.timeOfImpact.toFixed(2),
          normal: testHit.normal ? {
            x: testHit.normal.x.toFixed(2),
            y: testHit.normal.y.toFixed(2),
            z: testHit.normal.z.toFixed(2),
          } : null,
        } : null,
      },
      physicsWorld: {
        colliderCount: world.colliders.len(),
        rigidBodyCount: world.bodies.len(),
      },
    };
  });

  console.log('\n=== RAYCAST DEBUG ===');
  console.log(JSON.stringify(raycastData, null, 2));

  if (raycastData.testRaycast?.hit) {
    console.log('\n✓ Manual raycast HIT the track');
    console.log(`  Distance: ${raycastData.testRaycast.hit.timeOfImpact}m`);
  } else {
    console.log('\n✗ Manual raycast MISSED - vehicle will fall!');
  }

  console.log(`\nPhysics world has ${raycastData.physicsWorld.colliderCount} colliders`);
});
