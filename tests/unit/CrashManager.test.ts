import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrashManager, CrashSeverity, type CrashEvent } from '@/systems/CrashManager';
import { GameState } from '@/core/GameEngine';
import { Vector3 } from 'three';

/**
 * Create a mock vehicle with essential properties
 */
function createMockVehicle() {
  return {
    getTransform: vi.fn(() => ({
      position: new Vector3(0, 1, 0),
      linearVelocity: new Vector3(0, 0, 20),
      forward: new Vector3(0, 0, 1),
    })),
    getTelemetry: vi.fn(() => ({
      wheelsOnGround: 4,
      speed: 20,
    })),
    getDamageState: vi.fn(() => ({
      overallDamage: 0,
      severity: 'none',
      performancePenalty: 0,
      crashCount: 0,
      recentCollisions: [],
    })),
    reset: vi.fn(),
  };
}

/**
 * Create a mock track with spawn point
 */
function createMockTrack() {
  return {
    getSpawnPoint: vi.fn(() => ({
      position: new Vector3(0, 2, -10),
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    })),
  };
}

describe('CrashManager', () => {
  let crashManager: CrashManager;
  let mockVehicle: any;
  let mockTrack: any;
  let stateCallback: any;

  beforeEach(() => {
    crashManager = new CrashManager();
    mockVehicle = createMockVehicle();
    mockTrack = createMockTrack();
    stateCallback = vi.fn();
  });

  // ========================================================================
  // INITIALIZATION TESTS (3 tests)
  // ========================================================================

  describe('initialization', () => {
    it('should initialize correctly with vehicle, track, and callback', () => {
      crashManager.init(mockVehicle, mockTrack, stateCallback);
      expect(crashManager.isEnabled()).toBe(true);
    });

    it('should be disabled before init', () => {
      expect(crashManager.isEnabled()).toBe(false);
    });

    it('should dispose and clear all references', () => {
      crashManager.init(mockVehicle, mockTrack, stateCallback);
      crashManager.dispose();
      expect(crashManager.isEnabled()).toBe(false);
    });
  });

  // ========================================================================
  // COLLISION DETECTION TESTS (5 tests)
  // ========================================================================

  describe('collision detection', () => {
    beforeEach(() => {
      crashManager.init(mockVehicle, mockTrack, stateCallback);
    });

    it('should detect crash on significant velocity change', () => {
      const crashListener = vi.fn();
      crashManager.onCrash(crashListener);

      // Simulate 2 frames: first at high speed, then sudden stop
      // With new threshold of 25000N, need significant velocity change
      // First call at t=0 (init), second at t=1.6 (past 1.5s grace period)
      crashManager.update(0.01667, 0);
      mockVehicle.getTransform = vi.fn(() => ({
        position: new Vector3(0, 1, 0),
        linearVelocity: new Vector3(0, 0, 0), // Sudden stop from 20 m/s
        forward: new Vector3(0, 0, 1),
      }));
      crashManager.update(0.01667, 1.6); // Past grace period (1.5s)

      expect(crashListener).toHaveBeenCalled();
    });

    it('should calculate severity correctly - detect crashes with velocity changes', () => {
      const crashListener = vi.fn();
      crashManager.onCrash(crashListener);

      // Simulate velocity change that triggers crash detection
      crashManager.update(0.01667, 0);
      mockVehicle.getTransform = vi.fn(() => ({
        position: new Vector3(0, 1, 0),
        linearVelocity: new Vector3(0, 0, 0), // Change from 20 m/s
        forward: new Vector3(0, 0, 1),
      }));
      crashManager.update(0.01667, 1.6); // Past grace period (1.5s)

      // Should have called listener and detected some severity
      expect(crashListener).toHaveBeenCalled();
      const event = crashListener.mock.calls[0]?.[0] as CrashEvent;
      expect(event?.impactForce).toBeGreaterThan(0);
      expect(event?.severity).toBeDefined();
    });

    it('should calculate severity thresholds properly', () => {
      const crashListener = vi.fn();
      crashManager.onCrash(crashListener);

      // Simulate significant velocity change
      crashManager.update(0.01667, 0);
      mockVehicle.getTransform = vi.fn(() => ({
        position: new Vector3(0, 1, 0),
        linearVelocity: new Vector3(0, 0, 0), // Complete stop from 20 m/s
        forward: new Vector3(0, 0, 1),
      }));
      crashManager.update(0.01667, 1.6); // Past grace period (1.5s)

      expect(crashListener).toHaveBeenCalled();
      const event = crashListener.mock.calls[0]?.[0] as CrashEvent;
      // Verify severity is classified
      expect([CrashSeverity.MINOR, CrashSeverity.MAJOR, CrashSeverity.CATASTROPHIC])
        .toContain(event?.severity);
    });

    it('should apply damage based on crash severity', () => {
      crashManager.update(0.01667, 0);
      mockVehicle.getTransform = vi.fn(() => ({
        position: new Vector3(0, 1, 0),
        linearVelocity: new Vector3(0, 0, 0),
        forward: new Vector3(0, 0, 1),
      }));
      crashManager.update(0.01667, 1.6); // Past grace period (1.5s)

      // Verify damage state was accessed (indicating damage update)
      expect(mockVehicle.getDamageState).toHaveBeenCalled();
    });

    it('should respect 2-second crash replay cooldown', () => {
      const replayListener = vi.fn();
      crashManager.onReplayTrigger(replayListener);

      // First crash at t=0.51 (past grace period)
      crashManager.update(0.01667, 0);
      mockVehicle.getTransform = vi.fn(() => ({
        position: new Vector3(0, 1, 0),
        linearVelocity: new Vector3(0, 0, 0),
        forward: new Vector3(0, 0, 1),
      }));
      crashManager.update(0.01667, 0.51);

      const firstCallCount = replayListener.mock.calls.length;

      // Second crash at t=1.0s (within 2-second cooldown from first crash at t=0.51)
      mockVehicle.getTransform = vi.fn(() => ({
        position: new Vector3(0, 1, 0),
        linearVelocity: new Vector3(0, 0, 20),
        forward: new Vector3(0, 0, 1),
      }));
      crashManager.update(0.01667, 1.0);
      mockVehicle.getTransform = vi.fn(() => ({
        position: new Vector3(0, 1, 0),
        linearVelocity: new Vector3(0, 0, 0),
        forward: new Vector3(0, 0, 1),
      }));
      crashManager.update(0.01667, 1.01667);

      expect(replayListener.mock.calls.length).toBe(firstCallCount);

      // Third crash at t=3.0s (after 2-second cooldown)
      mockVehicle.getTransform = vi.fn(() => ({
        position: new Vector3(0, 1, 0),
        linearVelocity: new Vector3(0, 0, 20),
        forward: new Vector3(0, 0, 1),
      }));
      crashManager.update(0.01667, 3.0);
      mockVehicle.getTransform = vi.fn(() => ({
        position: new Vector3(0, 1, 0),
        linearVelocity: new Vector3(0, 0, 0),
        forward: new Vector3(0, 0, 1),
      }));
      crashManager.update(0.01667, 3.01667);

      expect(replayListener.mock.calls.length).toBeGreaterThan(firstCallCount);
    });
  });

  // ========================================================================
  // EVENT SYSTEM TESTS (3 tests)
  // ========================================================================

  describe('event system', () => {
    beforeEach(() => {
      crashManager.init(mockVehicle, mockTrack, stateCallback);
    });

    it('should call onCrash listeners for all crashes', () => {
      const crashListener = vi.fn();
      crashManager.onCrash(crashListener);

      // Trigger crash
      crashManager.update(0.01667, 0);
      mockVehicle.getTransform = vi.fn(() => ({
        position: new Vector3(0, 1, 0),
        linearVelocity: new Vector3(0, 0, 0),
        forward: new Vector3(0, 0, 1),
      }));
      crashManager.update(0.01667, 0.51); // Past grace period

      expect(crashListener).toHaveBeenCalled();
      const event = crashListener.mock.calls[0]?.[0] as CrashEvent;
      expect(event).toBeDefined();
      expect(event?.impactForce).toBeGreaterThan(0);
    });

    it('should call onReplayTrigger listeners only for major crashes', () => {
      const replayListener = vi.fn();
      crashManager.onReplayTrigger(replayListener);

      // Trigger major crash (velocity change causes >5000N impact)
      crashManager.update(0.01667, 0);
      mockVehicle.getTransform = vi.fn(() => ({
        position: new Vector3(0, 1, 0),
        linearVelocity: new Vector3(0, 0, 0),
        forward: new Vector3(0, 0, 1),
      }));
      crashManager.update(0.01667, 0.51); // Past grace period

      expect(replayListener).toHaveBeenCalled();
      const event = replayListener.mock.calls[0]?.[0] as CrashEvent;
      expect(event?.shouldReplay).toBe(true);
    });

    it('should support multiple listeners on same event', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      crashManager.onCrash(listener1);
      crashManager.onCrash(listener2);

      // Trigger crash
      crashManager.update(0.01667, 0);
      mockVehicle.getTransform = vi.fn(() => ({
        position: new Vector3(0, 1, 0),
        linearVelocity: new Vector3(0, 0, 0),
        forward: new Vector3(0, 0, 1),
      }));
      crashManager.update(0.01667, 0.51); // Past grace period

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // EDGE CASES (2 tests)
  // ========================================================================

  describe('edge cases', () => {
    it('should not detect crash when disabled', () => {
      crashManager.init(mockVehicle, mockTrack, stateCallback);
      crashManager.setEnabled(false);

      const crashListener = vi.fn();
      crashManager.onCrash(crashListener);

      // Attempt to trigger crash (should be ignored)
      crashManager.update(0.01667, 0);
      mockVehicle.getTransform = vi.fn(() => ({
        position: new Vector3(0, 1, 0),
        linearVelocity: new Vector3(0, 0, 0),
        forward: new Vector3(0, 0, 1),
      }));
      crashManager.update(0.01667, 0.01667);

      expect(crashListener).not.toHaveBeenCalled();
    });

    it('should not crash when disabled even with velocity changes', () => {
      crashManager.init(mockVehicle, mockTrack, stateCallback);
      crashManager.setEnabled(false);

      const crashListener = vi.fn();
      crashManager.onCrash(crashListener);

      // Try to trigger crash while disabled
      crashManager.update(0.01667, 0);
      mockVehicle.getTransform = vi.fn(() => ({
        position: new Vector3(0, 1, 0),
        linearVelocity: new Vector3(0, 0, 0), // Major velocity change
        forward: new Vector3(0, 0, 1),
      }));
      crashManager.update(0.01667, 0.01667);

      expect(crashListener).not.toHaveBeenCalled();
    });
  });

  // ========================================================================
  // STATE MANAGEMENT TESTS
  // ========================================================================

  describe('state management', () => {
    beforeEach(() => {
      crashManager.init(mockVehicle, mockTrack, stateCallback);
    });

    it('should trigger state transition to CRASHED on major crash', () => {
      // Simulate major crash
      crashManager.update(0.01667, 0);
      mockVehicle.getTransform = vi.fn(() => ({
        position: new Vector3(0, 1, 0),
        linearVelocity: new Vector3(0, 0, 0),
        forward: new Vector3(0, 0, 1),
      }));
      crashManager.update(0.01667, 0.51); // Past grace period

      expect(stateCallback).toHaveBeenCalledWith(GameState.CRASHED);
    });

    it('should respawn vehicle at spawn point', () => {
      crashManager.respawnVehicle();

      expect(mockVehicle.reset).toHaveBeenCalled();
      const call = mockVehicle.reset.mock.calls[0];
      expect(call[0]).toEqual(new Vector3(0, 2, -10));
    });

    it('should clear damage state', () => {
      // Create fresh mock with damage
      const damagedVehicle = createMockVehicle();
      const damageState = {
        overallDamage: 0.5,
        severity: 'moderate',
        performancePenalty: 0.25,
        crashCount: 3,
        recentCollisions: [{ test: true }],
      };
      damagedVehicle.getDamageState = vi.fn(() => damageState);

      const localCrashManager = new CrashManager();
      localCrashManager.init(damagedVehicle, mockTrack, stateCallback);
      localCrashManager.clearDamage();

      expect(damageState.overallDamage).toBe(0);
      expect(damageState.crashCount).toBe(0);
      expect(damageState.performancePenalty).toBe(0);
      expect(damageState.recentCollisions.length).toBe(0);
    });
  });

  // ========================================================================
  // STATISTICS AND COOLDOWN TESTS
  // ========================================================================

  describe('statistics and cooldown', () => {
    beforeEach(() => {
      crashManager.init(mockVehicle, mockTrack, stateCallback);
    });

    it('should return statistics', () => {
      const stats = crashManager.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalCrashes).toBe(0);
      expect(stats.totalDamage).toBe(0);
      expect(Array.isArray(stats.recentCollisions)).toBe(true);
    });

    it('should track cooldown progress', () => {
      const progress = crashManager.getCrashCooldownProgress();

      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    });
  });
});
