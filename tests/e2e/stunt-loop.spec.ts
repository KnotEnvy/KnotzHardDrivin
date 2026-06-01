import { test, expect } from '@playwright/test';

/**
 * Stunt Circuit loop validation test (Phase 3).
 *
 * Validates that a car can complete the full vertical loop on the flagship
 * "Hard Drivin' Stunt Circuit" track end-to-end:
 *
 *  1. Boot the game and select the stunt track via CareerProgressionSystem.
 *  2. Start the race and wait for the vehicle to spawn.
 *  3. Hold throttle through the 250 m run-up and the hairpin, then into the loop.
 *  4. Sample car telemetry over ~35 s (enough to reach and clear the loop).
 *  5. Assert:
 *       (a) No NaN in positions.
 *       (b) Car achieves meaningful speed (> 10 m/s) at some point.
 *       (c) Car is INVERTED at the loop apex (up.y < -0.5).
 *       (d) Car recovers upright (up.y > 0.5) with wheels grounded after the apex.
 *  6. No uncaught page errors.
 *
 * Track geometry recap:
 *   A-side: spawn → 250 m straight → 180° hairpin bank
 *   B-side: 150 m straight → loop (r=18 m) → ramp → landing → hairpin (closes circuit)
 *   Loop entry speed target: ≥ 30 m/s (apex speed ≈ 20 m/s > 13.3 m/s minimum)
 *
 * NOTE: Run headed — headless Chromium throttles rAF to ~1/s, freezing the loop.
 */
test('stunt circuit: car completes the full vertical loop', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  // -------------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------------
  await page.goto('/');

  await page.waitForFunction(() => {
    const e = (window as any).gameEngine;
    return !!e && (e.getState() === 'attract' || e.getState() === 'menu');
  }, null, { timeout: 30_000 });

  // -------------------------------------------------------------------------
  // Select the stunt track via the singleton exposed in main.ts
  // -------------------------------------------------------------------------
  const trackSet = await page.evaluate(() => {
    const career = (window as any).__careerSystem;
    if (!career) {
      console.error('[TEST] __careerSystem not available');
      return false;
    }
    const result = career.setCurrentTrack('stunt');
    const current = career.getCurrentTrack();
    console.log('[TEST] setCurrentTrack result:', result, 'current:', current?.id);
    return result;
  });
  console.log('Track selection result:', trackSet);

  // -------------------------------------------------------------------------
  // Start race
  // -------------------------------------------------------------------------
  await page.evaluate(() => {
    const e = (window as any).gameEngine;
    if (e.getState() === 'attract') e.setState('menu');
    e.setState('playing');
  });

  // Wait for the vehicle to appear (track load + physics init is async)
  await page.waitForFunction(() => {
    const e = (window as any).gameEngine;
    return !!(e && e.getVehicle && e.getVehicle());
  }, null, { timeout: 30_000 });

  // Let physics settle (~2 s — slightly longer for the banked oval or stunt track geometry)
  await page.waitForTimeout(2000);

  // -------------------------------------------------------------------------
  // Confirm we're in PLAYING state and the stunt track is loaded
  // -------------------------------------------------------------------------
  const initialState = await page.evaluate(() => {
    const e = (window as any).gameEngine;
    const v = e.getVehicle();
    const t = v?.getTransform();
    const tel = v?.getTelemetry();
    return {
      state:    e.getState(),
      trackId:  (window as any).__careerSystem?.getCurrentTrack()?.id,
      posY:     t?.position.y,
      posZ:     t?.position.z,
      grounded: tel?.wheelsOnGround,
    };
  });
  console.log('Initial state:', JSON.stringify(initialState));
  expect(initialState.trackId, 'stunt track should be current').toBe('stunt');

  // -------------------------------------------------------------------------
  // Drive: hold throttle and sample every 500 ms for up to 40 s.
  //
  // The loop is ~19-22 s into the run. We sample for 40 s total to handle:
  //   - 1-2 crash/replay cycles (each replay is ~3-5 s)
  //   - Natural variation in lap time
  //
  // During CRASHED/REPLAY the car is moved by the replay system. We still
  // record samples for all states so we can detect inversion whenever it
  // happens (the car passes through the loop even if it was briefly crashed
  // before getting there on a second attempt).
  // -------------------------------------------------------------------------
  await page.keyboard.down('w');

  interface Sample {
    t: number;
    state: string;
    upY: number;
    posX: number;
    posY: number;
    posZ: number;
    speed: number;
    grounded: number;
  }

  const samples: Sample[] = [];
  const SAMPLE_INTERVAL_MS = 500;
  const TOTAL_DURATION_MS  = 40_000;
  const stepCount = TOTAL_DURATION_MS / SAMPLE_INTERVAL_MS;

  for (let i = 0; i < stepCount; i++) {
    await page.waitForTimeout(SAMPLE_INTERVAL_MS);

    const s = await page.evaluate((idx: number) => {
      const e = (window as any).gameEngine;
      const v = e.getVehicle();
      if (!v) return null;
      const t   = v.getTransform();
      const tel = v.getTelemetry();
      return {
        t:        idx * 0.5,
        state:    e.getState(),
        upY:      t.up.y,
        posX:     t.position.x,
        posY:     t.position.y,
        posZ:     t.position.z,
        speed:    tel.speed,
        grounded: tel.wheelsOnGround,
      };
    }, i);

    if (s) {
      samples.push(s as Sample);
      // Log every 2 s and any interesting moments
      if (i % 4 === 0 || (s as Sample).upY < 0.5 || (s as Sample).grounded < 4) {
        console.log(
          `t=${s.t.toFixed(1)}s [${s.state}]` +
          `  up.y=${s.upY.toFixed(3)}` +
          `  pos=(${s.posX.toFixed(1)},${s.posY.toFixed(1)},${s.posZ.toFixed(1)})` +
          `  speed=${s.speed.toFixed(1)} m/s  gnd=${s.grounded}`
        );
      }
    }
  }

  await page.keyboard.up('w');

  // -------------------------------------------------------------------------
  // Analysis
  // -------------------------------------------------------------------------

  // 1. NaN check — physics blowup
  const nanSamples = samples.filter(s =>
    !Number.isFinite(s.upY) || !Number.isFinite(s.posX) || !Number.isFinite(s.posZ)
  );
  expect(nanSamples, `NaN in ${nanSamples.length} samples`).toHaveLength(0);

  // 2. Car must reach meaningful speed at some point
  const maxSpeed = Math.max(...samples.map(s => s.speed));
  console.log(`Max speed reached: ${maxSpeed.toFixed(1)} m/s`);
  expect(maxSpeed, 'car never exceeded 10 m/s').toBeGreaterThan(10);

  // 3. Inverted apex: up.y < -0.5 proves the car passed the loop top
  const invertedSamples = samples.filter(s => s.upY < -0.5);
  console.log(`Inverted samples: ${invertedSamples.length}`);
  if (invertedSamples.length > 0) {
    const apex = invertedSamples.reduce((a, b) => a.upY < b.upY ? a : b);
    console.log(
      `Deepest inversion: t=${apex.t.toFixed(1)}s  up.y=${apex.upY.toFixed(3)}` +
      `  pos=(${apex.posX.toFixed(1)},${apex.posY.toFixed(1)},${apex.posZ.toFixed(1)})` +
      `  speed=${apex.speed.toFixed(1)} m/s`
    );
  }
  expect(
    invertedSamples.length,
    'car never inverted — loop was not completed (up.y never < -0.5)'
  ).toBeGreaterThan(0);

  // 4. Post-loop recovery: after first inversion the car must return upright
  //    (up.y > 0.5) with ≥ 2 wheels grounded
  const firstInvertIdx = samples.findIndex(s => s.upY < -0.5);
  const postInvert = samples.slice(firstInvertIdx + 1);
  const recovered  = postInvert.filter(s => s.upY > 0.5 && s.grounded >= 2);
  console.log(`Post-inversion recovery samples: ${recovered.length}`);
  if (recovered.length > 0) {
    const rec = recovered[0];
    console.log(
      `First recovery: t=${rec.t.toFixed(1)}s  up.y=${rec.upY.toFixed(3)}` +
      `  grounded=${rec.grounded}  speed=${rec.speed.toFixed(1)} m/s`
    );
  }
  expect(
    recovered.length,
    'car inverted but never recovered upright with wheels grounded'
  ).toBeGreaterThan(0);

  // 5. Position progression over the full run
  const playingSamples = samples.filter(s => s.state === 'playing');
  if (playingSamples.length >= 2) {
    const first = playingSamples[0];
    const last  = playingSamples[playingSamples.length - 1];
    const travel = Math.sqrt(
      Math.pow(last.posX - first.posX, 2) +
      Math.pow(last.posZ - first.posZ, 2)
    );
    console.log(`XZ travel while PLAYING: ${travel.toFixed(1)} m`);
    expect(travel, 'car barely moved during PLAYING state').toBeGreaterThan(30);
  }

  // 6. No uncaught runtime errors
  expect(pageErrors, `pageErrors: ${pageErrors.join(' | ')}`).toHaveLength(0);

  console.log('=== LOOP TEST PASSED ===');
  console.log(`  Max speed:        ${maxSpeed.toFixed(1)} m/s`);
  console.log(`  Inverted samples: ${invertedSamples.length}`);
  console.log(`  Recovery samples: ${recovered.length}`);
});
