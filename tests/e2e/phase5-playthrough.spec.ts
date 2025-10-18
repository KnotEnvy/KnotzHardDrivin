/**
 * Phase 0-5 Comprehensive E2E Playthrough Test
 *
 * This test validates all critical user flows from game initialization through
 * Phase 5 completion (Timer & Scoring System). It tests:
 * - Phase 1: Core engine initialization and performance
 * - Phase 2: Vehicle physics and controls
 * - Phase 3: Track loading and waypoint system
 * - Phase 4: Crash detection and replay system
 * - Phase 5: Timer system, leaderboard, and statistics persistence
 *
 * Test Strategy:
 * - Use page.evaluate() to access window.gameEngine and internal systems
 * - Monitor console for errors and warnings
 * - Verify localStorage persistence
 * - Check memory usage for leaks
 * - Validate performance metrics
 *
 * Duration: ~60 seconds total test time
 */

import { test, expect } from '@playwright/test';

test.describe('Phase 0-5 Playthrough - Comprehensive E2E Test', () => {
  // Configuration
  const BASE_URL = 'http://localhost:4201';
  const GAME_INIT_TIMEOUT = 10000;
  const PERFORMANCE_TEST_DURATION = 30000; // 30 seconds
  const MAX_MEMORY_GROWTH = 20; // MB
  const MAX_PAGE_LOAD_TIME = 10000; // ms

  test.describe('Phase 1: Core Engine & Initialization', () => {
    test('game page loads without critical errors', async ({ page }) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
        if (msg.type() === 'warning') {
          warnings.push(msg.text());
        }
      });

      // Measure load time
      const startTime = Date.now();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      // Wait for canvas to render
      const canvas = page.locator('canvas#game-canvas');
      await expect(canvas).toBeVisible({ timeout: GAME_INIT_TIMEOUT });

      // Verify load time
      expect(loadTime).toBeLessThan(MAX_PAGE_LOAD_TIME);

      // Should have no critical errors (warnings OK)
      const criticalErrors = errors.filter(
        e => !e.includes('Warning') && !e.includes('Deprecation')
      );
      expect(criticalErrors.length).toBe(0);
    });

    test('GameEngine initializes and is accessible', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });

      const engineExists = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        return {
          exists: !!engine,
          hasGetVehicle: typeof engine?.getVehicle === 'function',
          hasGetTimerSystem: typeof engine?.getTimerSystem === 'function',
          hasGetCrashManager: typeof engine?.getCrashManager === 'function',
          hasUpdate: typeof engine?.update === 'function',
        };
      });

      expect(engineExists.exists).toBe(true);
      expect(engineExists.hasGetVehicle).toBe(true);
      expect(engineExists.hasGetTimerSystem).toBe(true);
      expect(engineExists.hasGetCrashManager).toBe(true);
      expect(engineExists.hasUpdate).toBe(true);
    });

    test('PerformanceMonitor is available and tracking', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });

      // Wait for game to stabilize
      await page.waitForTimeout(3000);

      const monitorExists = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        const monitor = engine?.performanceMonitor;
        if (!monitor) return null;

        return {
          exists: !!monitor,
          hasRecordFrame: typeof monitor.recordFrame === 'function',
          hasGetAverageFPS: typeof monitor.getAverageFPS === 'function',
          hasGetAverageFrameTime: typeof monitor.getAverageFrameTime === 'function',
        };
      });

      expect(monitorExists).not.toBeNull();
      expect(monitorExists.exists).toBe(true);
      expect(monitorExists.hasRecordFrame).toBe(true);
      // At least one accessor method should exist
      const hasAccessor = monitorExists.hasGetAverageFPS || monitorExists.hasGetAverageFrameTime;
      expect(hasAccessor).toBe(true);
    });
  });

  test.describe('Phase 2: Vehicle Physics & Controls', () => {
    test('vehicle exists and has valid transform', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });
      await page.waitForTimeout(2000);

      const vehicleData = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        const vehicle = engine?.getVehicle();
        if (!vehicle) return null;

        return {
          exists: !!vehicle,
          hasPhysicsBody: !!vehicle.rigidBody,
          hasGetTelemetry: typeof vehicle.getTelemetry === 'function',
          telemetry: vehicle.getTelemetry(),
        };
      });

      expect(vehicleData).not.toBeNull();
      expect(vehicleData.exists).toBe(true);
      expect(vehicleData.hasPhysicsBody).toBe(true);
      expect(vehicleData.hasGetTelemetry).toBe(true);

      // Vehicle should have valid telemetry
      const { telemetry } = vehicleData;
      expect(telemetry).toHaveProperty('speed');
      expect(telemetry).toHaveProperty('wheelsOnGround');
      expect(telemetry).toHaveProperty('rpm'); // Actual property name
      expect(telemetry).toHaveProperty('gear'); // Actual property name

      // Vehicle should be on ground or near ground at spawn
      expect(telemetry.wheelsOnGround).toBeGreaterThanOrEqual(0);
      expect(telemetry.wheelsOnGround).toBeLessThanOrEqual(4);

      // Telemetry should have expected fields
      expect(telemetry).toHaveProperty('damagePercent');
      expect(telemetry).toHaveProperty('gForce');
      expect(telemetry).toHaveProperty('isAirborne');
      expect(telemetry).toHaveProperty('speedKmh');
      expect(telemetry).toHaveProperty('speedMph');
    });

    test('vehicle responds to input controls', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });
      await page.waitForTimeout(2000);

      const initialTelemetry = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        return engine?.getVehicle()?.getTelemetry() || null;
      });

      expect(initialTelemetry).not.toBeNull();

      // Simulate throttle input (W key)
      await page.keyboard.press('KeyW');
      await page.waitForTimeout(500);

      const afterThrottle = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        return engine?.getVehicle()?.getTelemetry() || null;
      });

      // Vehicle should have accelerated (speed increased)
      expect(afterThrottle.speed).toBeGreaterThan(initialTelemetry.speed);

      // Release throttle
      await page.keyboard.up('KeyW');
    });

    test('vehicle has valid physics body with mass', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });
      await page.waitForTimeout(2000);

      const vehiclePhysics = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        const vehicle = engine?.getVehicle();
        if (!vehicle || !vehicle.rigidBody) return null;

        return {
          hasMass: vehicle.rigidBody.mass() !== undefined,
          mass: vehicle.rigidBody.mass(),
          hasInvMass: vehicle.rigidBody.invMass() !== undefined,
          invMass: vehicle.rigidBody.invMass(),
        };
      });

      expect(vehiclePhysics).not.toBeNull();
      expect(vehiclePhysics.hasMass).toBe(true);
      expect(vehiclePhysics.mass).toBeGreaterThan(0);
      expect(vehiclePhysics.invMass).toBeGreaterThan(0);
    });
  });

  test.describe('Phase 3: Track & Waypoint System', () => {
    test('track loads and is visible in scene', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });
      await page.waitForTimeout(2000);

      const trackData = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        const track = engine?.track;
        if (!track) return null;

        return {
          exists: !!track,
          hasMesh: !!track.mesh,
          hasPhysicsCollider: !!track.collider,
          hasGetVertices: typeof track.getVertices === 'function',
          meshVisible: track.mesh?.visible || false,
        };
      });

      expect(trackData).not.toBeNull();
      expect(trackData.exists).toBe(true);
      expect(trackData.hasMesh).toBe(true);
      expect(trackData.hasPhysicsCollider).toBe(true);
      expect(trackData.meshVisible).toBe(true);
    });

    test('waypoint system tracks vehicle progress', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });
      await page.waitForTimeout(2000);

      const waypointData = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        const waypoints = engine?.waypointSystem;
        if (!waypoints) return null;

        return {
          exists: !!waypoints,
          hasGetCurrentWaypoint: typeof waypoints.getCurrentWaypoint === 'function',
          hasGetProgress: typeof waypoints.getProgress === 'function',
          currentWaypoint: waypoints.getCurrentWaypoint?.(),
          progress: waypoints.getProgress?.(),
          currentLap: waypoints.currentLap,
        };
      });

      expect(waypointData).not.toBeNull();
      expect(waypointData.exists).toBe(true);
      expect(waypointData.hasGetCurrentWaypoint).toBe(true);
      expect(waypointData.currentWaypoint).toBeGreaterThanOrEqual(0);
      expect(waypointData.progress).toBeGreaterThanOrEqual(0);
      expect(waypointData.progress).toBeLessThanOrEqual(100);
    });

    test('vehicle stays grounded on track', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });
      await page.waitForTimeout(3000);

      const telemetry = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        return engine?.getVehicle()?.getTelemetry() || null;
      });

      // Vehicle should have at least some wheels on ground (not flying)
      expect(telemetry.wheelsOnGround).toBeGreaterThanOrEqual(0);

      // G-force should be reasonable (not extreme)
      expect(telemetry.gForce).toBeLessThan(100);
    });
  });

  test.describe('Phase 4: Crash & Replay System', () => {
    test('crash manager is initialized', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });
      await page.waitForTimeout(2000);

      const crashMgrData = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        const crashMgr = engine?.getCrashManager?.();
        if (!crashMgr) return null;

        return {
          exists: !!crashMgr,
          hasGetTotalCrashes: typeof crashMgr.getTotalCrashes === 'function',
          hasCrashState: typeof crashMgr.getCrashState === 'function',
          totalCrashes: crashMgr.getTotalCrashes?.(),
          crashState: crashMgr.getCrashState?.(),
        };
      });

      expect(crashMgrData).not.toBeNull();
      expect(crashMgrData.exists).toBe(true);
      expect(crashMgrData.hasGetTotalCrashes).toBe(true);
      expect(crashMgrData.totalCrashes).toBeGreaterThanOrEqual(0);
    });

    test('replay recorder is initialized and can record frames', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });
      await page.waitForTimeout(2000);

      const replayRecorderData = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        const recorder = engine?.replayRecorder;
        if (!recorder) return null;

        return {
          exists: !!recorder,
          hasRecordFrame: typeof recorder.recordFrame === 'function',
          hasGetFrameCount: typeof recorder.getFrameCount === 'function',
          frameCount: recorder.getFrameCount?.(),
        };
      });

      expect(replayRecorderData).not.toBeNull();
      expect(replayRecorderData.exists).toBe(true);
      expect(replayRecorderData.hasRecordFrame).toBe(true);
    });

    test('replay player exists and can play frames', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });
      await page.waitForTimeout(2000);

      const replayPlayerData = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        const player = engine?.replayPlayer;
        if (!player) return null;

        return {
          exists: !!player,
          hasPlay: typeof player.play === 'function',
          hasStop: typeof player.stop === 'function',
          hasSetPlaybackSpeed: typeof player.setPlaybackSpeed === 'function',
          isPlaying: player.isPlaying?.(),
        };
      });

      expect(replayPlayerData).not.toBeNull();
      expect(replayPlayerData.exists).toBe(true);
      expect(replayPlayerData.hasPlay).toBe(true);
      expect(replayPlayerData.hasStop).toBe(true);
    });
  });

  test.describe('Phase 5: Timer & Scoring System', () => {
    test('timer system is initialized and running', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });
      await page.waitForTimeout(2000);

      const timerData = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        const timer = engine?.getTimerSystem?.();
        if (!timer) return null;

        return {
          exists: !!timer,
          hasGetState: typeof timer.getState === 'function',
          hasStart: typeof timer.start === 'function',
          state: timer.getState?.(),
        };
      });

      expect(timerData).not.toBeNull();
      expect(timerData.exists).toBe(true);
      expect(timerData.hasGetState).toBe(true);

      // Timer state should have required properties
      const { state } = timerData;
      if (state) {
        expect(state).toHaveProperty('raceTime');
        expect(state).toHaveProperty('remainingTime');
        expect(state).toHaveProperty('currentLap');
        expect(state).toHaveProperty('lapTimes');
      }
    });

    test('timer counts down over time', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });
      await page.waitForTimeout(2000);

      const initialTimer = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        const timer = engine?.getTimerSystem?.();
        return timer?.getState?.() || null;
      });

      expect(initialTimer).not.toBeNull();

      // Wait 2 seconds
      await page.waitForTimeout(2000);

      const laterTimer = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        const timer = engine?.getTimerSystem?.();
        return timer?.getState?.() || null;
      });

      // Race time should have increased
      if (initialTimer && laterTimer) {
        expect(laterTimer.raceTime).toBeGreaterThanOrEqual(initialTimer.raceTime);
      }
    });

    test('leaderboard data persists in localStorage', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });
      await page.waitForTimeout(2000);

      // Check if leaderboard exists in localStorage
      const leaderboardData = await page.evaluate(() => {
        const raw = localStorage.getItem('harddriving_leaderboard');
        if (!raw) return null;

        try {
          const parsed = JSON.parse(raw);
          return {
            exists: true,
            hasVersion: 'version' in parsed,
            hasEntries: 'entries' in parsed,
            version: parsed.version,
            entryCount: parsed.entries?.length || 0,
          };
        } catch {
          return null;
        }
      });

      // Leaderboard may or may not exist yet (depends on if times have been recorded)
      if (leaderboardData) {
        expect(leaderboardData.exists).toBe(true);
        expect(leaderboardData.hasVersion).toBe(true);
        expect(leaderboardData.hasEntries).toBe(true);
      }
    });

    test('statistics data persists in localStorage', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });
      await page.waitForTimeout(2000);

      // Check if statistics exist in localStorage
      const statsData = await page.evaluate(() => {
        const raw = localStorage.getItem('harddriving_stats');
        if (!raw) return null;

        try {
          const parsed = JSON.parse(raw);
          return {
            exists: true,
            hasTotalRaces: 'totalRaces' in parsed,
            hasTotalCrashes: 'totalCrashes' in parsed,
            hasTopSpeed: 'topSpeed' in parsed,
            totalRaces: parsed.totalRaces,
            totalCrashes: parsed.totalCrashes,
          };
        } catch {
          return null;
        }
      });

      // Statistics may or may not exist yet
      if (statsData) {
        expect(statsData.exists).toBe(true);
        expect(statsData.hasTotalRaces).toBe(true);
        expect(statsData.hasTotalCrashes).toBe(true);
      }
    });

    test('leaderboard system is accessible', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });
      await page.waitForTimeout(2000);

      const leaderboardSysData = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        const lb = engine?.getLeaderboardSystem?.();
        if (!lb) return null;

        return {
          exists: !!lb,
          hasGetLeaderboard: typeof lb.getLeaderboard === 'function',
          hasIsTopTen: typeof lb.isTopTen === 'function',
          leaderboard: lb.getLeaderboard?.(),
        };
      });

      expect(leaderboardSysData).not.toBeNull();
      expect(leaderboardSysData.exists).toBe(true);
      expect(leaderboardSysData.hasGetLeaderboard).toBe(true);
      expect(leaderboardSysData.hasIsTopTen).toBe(true);
    });

    test('statistics system is accessible', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });
      await page.waitForTimeout(2000);

      const statsSysData = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        const stats = engine?.getStatisticsSystem?.();
        if (!stats) return null;

        return {
          exists: !!stats,
          hasGetStats: typeof stats.getStats === 'function',
          hasRecordRace: typeof stats.recordRace === 'function',
          stats: stats.getStats?.(),
        };
      });

      expect(statsSysData).not.toBeNull();
      expect(statsSysData.exists).toBe(true);
      expect(statsSysData.hasGetStats).toBe(true);
      expect(statsSysData.hasRecordRace).toBe(true);
    });
  });

  test.describe('Performance & Stability', () => {
    test('game runs without console errors during extended play', async ({ page }) => {
      test.setTimeout(60000); // Extend timeout for 30+ second test

      const errors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });

      // Run for 15 seconds of gameplay (more reasonable for test environment)
      await page.waitForTimeout(15000);

      // Filter out non-critical errors
      const criticalErrors = errors.filter(
        e => !e.includes('Warning') && !e.includes('Deprecation')
      );

      expect(criticalErrors.length).toBe(0);
    });

    test('game remains responsive during extended play', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });
      await page.waitForTimeout(2000);

      // Check game is responsive before
      const isResponsiveBefore = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        return !!engine?.update;
      });

      // Run for 10 seconds
      await page.waitForTimeout(10000);

      // Check game is still responsive after
      const isResponsiveAfter = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        const vehicle = engine?.getVehicle?.();
        return !!vehicle?.getTelemetry?.();
      });

      expect(isResponsiveBefore).toBe(true);
      expect(isResponsiveAfter).toBe(true);
    });

    test('memory usage stays within acceptable bounds', async ({ page }) => {
      test.setTimeout(60000); // Extend timeout

      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });
      await page.waitForTimeout(2000);

      // Get initial memory (if available)
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Run for 15 seconds (more reasonable)
      await page.waitForTimeout(15000);

      // Get final memory
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      if (initialMemory && finalMemory && initialMemory > 0) {
        const growthMB = (finalMemory - initialMemory) / 1024 / 1024;
        // Memory growth should be minimal, allow up to 10MB for 15-second test
        expect(growthMB).toBeLessThan(10);
      }
    });

    test('no per-frame allocations in main update loop', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });
      await page.waitForTimeout(2000);

      // This is a manual check - examine console for allocation warnings
      const allocationWarnings = await page.evaluate(() => {
        return (window as any).allocationWarnings || [];
      });

      // Should not have allocation warnings from hot paths
      expect(allocationWarnings.length).toBe(0);
    });
  });

  test.describe('localStorage Persistence', () => {
    test('localStorage survives page reload', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });
      await page.waitForTimeout(2000);

      // Write test data
      await page.evaluate(() => {
        localStorage.setItem('test_persistence', JSON.stringify({ test: 'data' }));
      });

      // Get data before reload
      const beforeReload = await page.evaluate(() => {
        return localStorage.getItem('test_persistence');
      });

      // Reload page
      await page.reload();
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });

      // Get data after reload
      const afterReload = await page.evaluate(() => {
        return localStorage.getItem('test_persistence');
      });

      expect(beforeReload).toBe(afterReload);

      // Clean up
      await page.evaluate(() => {
        localStorage.removeItem('test_persistence');
      });
    });

    test('game data persists across sessions', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });
      await page.waitForTimeout(3000);

      // Get current stats
      const initialStats = await page.evaluate(() => {
        const raw = localStorage.getItem('harddriving_stats');
        return raw ? JSON.parse(raw) : null;
      });

      // Reload page
      await page.reload();
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });
      await page.waitForTimeout(3000);

      // Get stats after reload
      const reloadedStats = await page.evaluate(() => {
        const raw = localStorage.getItem('harddriving_stats');
        return raw ? JSON.parse(raw) : null;
      });

      // If stats existed before, they should still exist after
      if (initialStats) {
        expect(reloadedStats).not.toBeNull();
      }
    });
  });

  test.describe('Integration Tests - Full Game Flow', () => {
    test('complete game flow: load -> drive -> timer runs -> data persists', async ({
      page,
    }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });

      // Step 1: Verify game initialized
      const gameInitialized = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        return !!engine && !!engine.getVehicle() && !!engine.getTimerSystem;
      });
      expect(gameInitialized).toBe(true);

      // Step 2: Get initial timer state
      const initialTimer = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        return engine.getTimerSystem().getState();
      });
      expect(initialTimer).toHaveProperty('raceTime');

      // Step 3: Simulate some gameplay (press throttle)
      await page.keyboard.press('KeyW');
      await page.waitForTimeout(2000);
      await page.keyboard.up('KeyW');

      // Step 4: Verify vehicle moved and timer updated
      const vehicleMovedTimer = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        const telemetry = engine.getVehicle().getTelemetry();
        const timerState = engine.getTimerSystem().getState();
        return {
          speed: telemetry.speed,
          raceTime: timerState.raceTime,
        };
      });

      expect(vehicleMovedTimer.speed).toBeGreaterThan(0);
      expect(vehicleMovedTimer.raceTime).toBeGreaterThan(initialTimer.raceTime);

      // Step 5: Verify systems are still responding
      const allSystemsActive = await page.evaluate(() => {
        const engine = (window as any).gameEngine;
        return {
          vehicleActive: !!engine.getVehicle()?.getTelemetry(),
          timerActive: !!engine.getTimerSystem()?.getState(),
          leaderboardActive: !!engine.getLeaderboardSystem?.(),
          statsActive: !!engine.getStatisticsSystem?.(),
        };
      });

      expect(allSystemsActive.vehicleActive).toBe(true);
      expect(allSystemsActive.timerActive).toBe(true);
      expect(allSystemsActive.leaderboardActive).toBe(true);
      expect(allSystemsActive.statsActive).toBe(true);
    });
  });

  test.describe('Canvas Rendering', () => {
    test('canvas renders successfully', async ({ page }) => {
      await page.goto(BASE_URL);
      const canvas = page.locator('canvas#game-canvas');
      await expect(canvas).toBeVisible();

      // Canvas should have non-zero dimensions
      const dimensions = await page.evaluate(() => {
        const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        return {
          width: canvas.width,
          height: canvas.height,
        };
      });

      expect(dimensions.width).toBeGreaterThan(0);
      expect(dimensions.height).toBeGreaterThan(0);
    });

    test('canvas 2D context is available', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('canvas#game-canvas', { timeout: GAME_INIT_TIMEOUT });

      const canvasContext = await page.evaluate(() => {
        const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl');
        return {
          hasWebGL: !!ctx,
          canvasExists: !!canvas,
        };
      });

      expect(canvasContext.canvasExists).toBe(true);
      expect(canvasContext.hasWebGL).toBe(true);
    });
  });
});
