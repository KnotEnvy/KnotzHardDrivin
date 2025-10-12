import { test } from '@playwright/test';

test('Check if vehicle is grounded on port 4202', async ({ page }) => {
  await page.goto('http://localhost:4202');
  await page.waitForTimeout(3000);

  const vehicleData = await page.evaluate(() => {
    const engine = (window as any).gameEngine;
    if (!engine) return { error: 'No engine' };

    const vehicle = engine.getVehicle();
    if (!vehicle) return { error: 'No vehicle' };

    const transform = vehicle.getTransform();
    const telemetry = vehicle.getTelemetry();
    const wheels = vehicle.getWheelStates();

    return {
      position: {
        x: transform.position.x.toFixed(2),
        y: transform.position.y.toFixed(2),
        z: transform.position.z.toFixed(2),
      },
      wheelsOnGround: telemetry.wheelsOnGround,
      speed: telemetry.speed.toFixed(2),
      gForce: telemetry.gForce.toFixed(2),
      isAirborne: telemetry.isAirborne,
      wheelDetails: wheels.map((w: any, i: number) => ({
        index: i,
        grounded: w.isGrounded,
        suspensionLength: w.suspensionLength?.toFixed(2),
      })),
    };
  });

  console.log('\n=== VEHICLE STATUS (Port 4202) ===');
  console.log(JSON.stringify(vehicleData, null, 2));

  if (vehicleData.wheelsOnGround === 4) {
    console.log('\n✅ SUCCESS: Vehicle is properly grounded (4/4 wheels on track)');
  } else {
    console.log(`\n✗ FAILURE: Vehicle has ${vehicleData.wheelsOnGround}/4 wheels grounded`);
    console.log(`Vehicle Y position: ${vehicleData.position.y}m`);
  }
});
