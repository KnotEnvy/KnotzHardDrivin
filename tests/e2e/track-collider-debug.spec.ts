import { test } from '@playwright/test';

test('Debug track collider properties', async ({ page }) => {
  await page.goto('http://localhost:4201');
  await page.waitForTimeout(3000);

  const colliderInfo = await page.evaluate(() => {
    const engine = (window as any).gameEngine;
    if (!engine) return { error: 'No engine' };

    const track = engine.track;
    const vehicle = engine.getVehicle();

    // Access internal collider objects
    const trackAny = track as any;
    const vehicleAny = vehicle as any;
    const world = vehicleAny.world;

    // Get all colliders and rigid bodies
    const allRigidBodies: any[] = [];
    for (let i = 0; i < world.bodies.len(); i++) {
      const body = world.bodies.get(i);
      if (body) {
        const trans = body.translation();
        allRigidBodies.push({
          index: i,
          translation: { x: trans.x.toFixed(2), y: trans.y.toFixed(2), z: trans.z.toFixed(2) },
          isFixed: body.isFixed(),
          isDynamic: body.isDynamic(),
          numColliders: body.numColliders(),
        });
      }
    }

    const allColliders: any[] = [];
    for (let i = 0; i < world.colliders.len(); i++) {
      const collider = world.colliders.get(i);
      if (collider) {
        allColliders.push({
          index: i,
          shapeType: collider.shape?.type || 'unknown',
          isSensor: collider.isSensor(),
          friction: collider.friction(),
          restitution: collider.restitution(),
          parentHandle: collider.parent()?.handle || null,
        });
      }
    }

    // Perform raycast from above track to below
    const testRay = {
      origin: { x: 0, y: 10, z: 0 },
      dir: { x: 0, y: -1, z: 0 }
    };

    const hitAll = world.castRay(testRay, 20.0, true);

    // Try raycast excluding vehicle collider
    const vehicleColliderHandle = vehicleAny.collider.handle;
    const hitExcludingVehicle = world.castRay(testRay, 20.0, true, undefined, undefined, vehicleAny.collider);

    return {
      rigidBodies: allRigidBodies,
      colliders: allColliders,
      raycastFromAbove: {
        hitAll: hitAll ? {
          toi: hitAll.timeOfImpact.toFixed(2),
          colliderHandle: hitAll.collider?.handle,
        } : null,
        hitExcludingVehicle: hitExcludingVehicle ? {
          toi: hitExcludingVehicle.timeOfImpact.toFixed(2),
          colliderHandle: hitExcludingVehicle.collider?.handle,
        } : null,
      },
      trackColliderHandle: trackAny.collider?.handle,
      vehicleColliderHandle: vehicleAny.collider?.handle,
    };
  });

  console.log('\n=== TRACK COLLIDER DEBUG ===');
  console.log(JSON.stringify(colliderInfo, null, 2));

  console.log('\n=== ANALYSIS ===');
  console.log(`Total rigid bodies: ${colliderInfo.rigidBodies.length}`);
  console.log(`Total colliders: ${colliderInfo.colliders.length}`);

  if (colliderInfo.raycastFromAbove.hitAll) {
    console.log(`\n✓ Raycast from above HIT something at distance ${colliderInfo.raycastFromAbove.hitAll.toi}m`);
    console.log(`  Collider handle: ${colliderInfo.raycastFromAbove.hitAll.colliderHandle}`);
  } else {
    console.log('\n✗ Raycast from above MISSED everything!');
  }

  if (colliderInfo.raycastFromAbove.hitExcludingVehicle) {
    console.log(`✓ Raycast excluding vehicle HIT at ${colliderInfo.raycastFromAbove.hitExcludingVehicle.toi}m`);
    console.log(`  This should be the track collider!`);
  } else {
    console.log('✗ Raycast excluding vehicle MISSED - track collider not detectable!');
  }
});
