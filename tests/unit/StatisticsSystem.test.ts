import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  StatisticsSystem,
  GameStatistics,
} from '../../src/systems/StatisticsSystem';

describe('StatisticsSystem', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset singleton instance
    StatisticsSystem.resetInstance();
  });

  afterEach(() => {
    // Cleanup after each test
    localStorage.clear();
    StatisticsSystem.resetInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = StatisticsSystem.getInstance();
      const instance2 = StatisticsSystem.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create new instance after resetInstance', () => {
      const instance1 = StatisticsSystem.getInstance();
      StatisticsSystem.resetInstance();
      const instance2 = StatisticsSystem.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Initial State', () => {
    it('should initialize with zero stats', () => {
      const stats = StatisticsSystem.getInstance();
      const current = stats.getStats();

      expect(current.totalRaces).toBe(0);
      expect(current.totalCrashes).toBe(0);
      expect(current.totalDistance).toBe(0);
      expect(current.bestLapTime).toBe(Infinity);
      expect(current.averageSpeed).toBe(0);
      expect(current.topSpeed).toBe(0);
      expect(current.timePlayedTotal).toBe(0);
    });
  });

  describe('recordRaceComplete', () => {
    it('should increment total races', () => {
      const stats = StatisticsSystem.getInstance();

      stats.recordRaceComplete(45000, 0, 1000);
      expect(stats.getTotalRaces()).toBe(1);

      stats.recordRaceComplete(50000, 0, 1000);
      expect(stats.getTotalRaces()).toBe(2);
    });

    it('should accumulate crash count', () => {
      const stats = StatisticsSystem.getInstance();

      stats.recordRaceComplete(45000, 2, 1000);
      expect(stats.getTotalCrashes()).toBe(2);

      stats.recordRaceComplete(50000, 3, 1000);
      expect(stats.getTotalCrashes()).toBe(5);
    });

    it('should accumulate distance', () => {
      const stats = StatisticsSystem.getInstance();

      stats.recordRaceComplete(45000, 0, 1000);
      expect(stats.getTotalDistance()).toBe(1000);

      stats.recordRaceComplete(50000, 0, 1500);
      expect(stats.getTotalDistance()).toBe(2500);
    });

    it('should track best lap time', () => {
      const stats = StatisticsSystem.getInstance();

      stats.recordRaceComplete(50000, 0, 1000);
      expect(stats.getBestLapTime()).toBe(50000);

      stats.recordRaceComplete(45000, 0, 1000);
      expect(stats.getBestLapTime()).toBe(45000);

      stats.recordRaceComplete(55000, 0, 1000);
      expect(stats.getBestLapTime()).toBe(45000);
    });

    it('should reject invalid lap time', () => {
      const stats = StatisticsSystem.getInstance();

      stats.recordRaceComplete(-100, 0, 1000);
      expect(stats.getTotalRaces()).toBe(0);
    });

    it('should reject negative crash count', () => {
      const stats = StatisticsSystem.getInstance();

      stats.recordRaceComplete(45000, -1, 1000);
      expect(stats.getTotalRaces()).toBe(0);
    });

    it('should reject negative distance', () => {
      const stats = StatisticsSystem.getInstance();

      stats.recordRaceComplete(45000, 0, -100);
      expect(stats.getTotalRaces()).toBe(0);
    });

    it('should accept zero crashes and zero distance', () => {
      const stats = StatisticsSystem.getInstance();

      stats.recordRaceComplete(45000, 0, 0);
      expect(stats.getTotalRaces()).toBe(1);
      expect(stats.getTotalCrashes()).toBe(0);
      expect(stats.getTotalDistance()).toBe(0);
    });
  });

  describe('recordSpeed', () => {
    it('should update top speed', () => {
      const stats = StatisticsSystem.getInstance();

      stats.recordSpeed(10);
      expect(stats.getTopSpeed()).toBe(10);

      stats.recordSpeed(15);
      expect(stats.getTopSpeed()).toBe(15);

      stats.recordSpeed(12);
      expect(stats.getTopSpeed()).toBe(15);
    });

    it('should update average speed using exponential smoothing', () => {
      const stats = StatisticsSystem.getInstance();
      const alpha = 0.01;

      stats.recordSpeed(10);
      let avgSpeed = stats.getAverageSpeed();
      expect(avgSpeed).toBeCloseTo(10 * alpha, 5);

      stats.recordSpeed(20);
      avgSpeed = stats.getAverageSpeed();
      // oldAvg * (1 - alpha) + newSpeed * alpha
      const expected = (10 * alpha) * (1 - alpha) + 20 * alpha;
      expect(avgSpeed).toBeCloseTo(expected, 5);
    });

    it('should reject negative speed', () => {
      const stats = StatisticsSystem.getInstance();

      stats.recordSpeed(-10);
      expect(stats.getTopSpeed()).toBe(0);
    });

    it('should handle zero speed', () => {
      const stats = StatisticsSystem.getInstance();

      stats.recordSpeed(0);
      expect(stats.getTopSpeed()).toBe(0);
      expect(stats.getAverageSpeed()).toBe(0);
    });

    it('should converge average speed over many samples', () => {
      const stats = StatisticsSystem.getInstance();
      const alpha = 0.01;

      // Record same speed many times
      for (let i = 0; i < 1000; i++) {
        stats.recordSpeed(25);
      }

      const avgSpeed = stats.getAverageSpeed();
      // Should converge close to 25
      expect(avgSpeed).toBeGreaterThan(24);
      expect(avgSpeed).toBeLessThanOrEqual(25);
    });
  });

  describe('recordPlayTime', () => {
    it('should accumulate play time', () => {
      const stats = StatisticsSystem.getInstance();

      stats.recordPlayTime(0.016); // ~1 frame at 60fps
      expect(stats.getTotalPlayTime()).toBeCloseTo(0.016, 5);

      stats.recordPlayTime(0.016);
      expect(stats.getTotalPlayTime()).toBeCloseTo(0.032, 5);
    });

    it('should handle large time values', () => {
      const stats = StatisticsSystem.getInstance();

      stats.recordPlayTime(3600); // 1 hour
      expect(stats.getTotalPlayTime()).toBeCloseTo(3600, 5);
    });

    it('should reject negative delta time', () => {
      const stats = StatisticsSystem.getInstance();

      stats.recordPlayTime(-1);
      expect(stats.getTotalPlayTime()).toBe(0);
    });

    it('should handle zero delta time', () => {
      const stats = StatisticsSystem.getInstance();

      stats.recordPlayTime(0);
      expect(stats.getTotalPlayTime()).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return copy of statistics', () => {
      const stats = StatisticsSystem.getInstance();
      stats.recordRaceComplete(45000, 2, 1000);

      const current1 = stats.getStats();
      const current2 = stats.getStats();

      expect(current1).toEqual(current2);
      expect(current1).not.toBe(current2);
    });

    it('should not allow modification of returned stats', () => {
      const stats = StatisticsSystem.getInstance();
      stats.recordRaceComplete(45000, 2, 1000);

      const current = stats.getStats();
      current.totalRaces = 999;

      const current2 = stats.getStats();
      expect(current2.totalRaces).toBe(1);
    });
  });

  describe('Aggregate Statistics', () => {
    it('should calculate average crashes per race', () => {
      const stats = StatisticsSystem.getInstance();

      stats.recordRaceComplete(45000, 2, 1000);
      stats.recordRaceComplete(50000, 4, 1000);

      expect(stats.getAverageCrashesPerRace()).toBeCloseTo(3, 5);
    });

    it('should return zero crashes per race when no races', () => {
      const stats = StatisticsSystem.getInstance();

      expect(stats.getAverageCrashesPerRace()).toBe(0);
    });

    it('should calculate average distance per race', () => {
      const stats = StatisticsSystem.getInstance();

      stats.recordRaceComplete(45000, 0, 1000);
      stats.recordRaceComplete(50000, 0, 2000);

      expect(stats.getAverageDistance()).toBeCloseTo(1500, 5);
    });

    it('should return zero average distance when no races', () => {
      const stats = StatisticsSystem.getInstance();

      expect(stats.getAverageDistance()).toBe(0);
    });
  });

  describe('localStorage Persistence', () => {
    it('should save statistics to localStorage', () => {
      const stats1 = StatisticsSystem.getInstance();
      stats1.recordRaceComplete(45000, 2, 1000);

      const stored = localStorage.getItem('harddriving_stats');
      expect(stored).toBeDefined();
      expect(stored).toContain('45000');
    });

    it('should load statistics from localStorage on creation', () => {
      const stats1 = StatisticsSystem.getInstance();
      stats1.recordRaceComplete(45000, 2, 1000);

      // Simulate page reload
      StatisticsSystem.resetInstance();
      const stats2 = StatisticsSystem.getInstance();

      expect(stats2.getTotalRaces()).toBe(1);
      expect(stats2.getTotalCrashes()).toBe(2);
      expect(stats2.getTotalDistance()).toBe(1000);
      expect(stats2.getBestLapTime()).toBe(45000);
    });

    it('should persist multiple race records', () => {
      const stats1 = StatisticsSystem.getInstance();
      stats1.recordRaceComplete(45000, 1, 1000);
      stats1.recordRaceComplete(50000, 2, 1200);
      stats1.recordRaceComplete(40000, 0, 1100);

      StatisticsSystem.resetInstance();
      const stats2 = StatisticsSystem.getInstance();

      expect(stats2.getTotalRaces()).toBe(3);
      expect(stats2.getTotalCrashes()).toBe(3);
      expect(stats2.getTotalDistance()).toBe(3300);
      expect(stats2.getBestLapTime()).toBe(40000);
    });

    it('should handle corrupted JSON gracefully', () => {
      localStorage.setItem('harddriving_stats', 'invalid json {');

      const stats = StatisticsSystem.getInstance();
      expect(stats.getTotalRaces()).toBe(0);
    });

    it('should handle missing data gracefully', () => {
      localStorage.removeItem('harddriving_stats');

      const stats = StatisticsSystem.getInstance();
      expect(stats.getTotalRaces()).toBe(0);
    });

    it('should validate numeric fields on load', () => {
      // Corrupt data with invalid types
      localStorage.setItem(
        'harddriving_stats',
        JSON.stringify({
          version: 1,
          totalRaces: 'not a number',
          totalCrashes: 'not a number',
          totalDistance: 'not a number',
          bestLapTime: 'not a number',
          averageSpeed: 'not a number',
          topSpeed: 'not a number',
          timePlayedTotal: 'not a number',
        })
      );

      const stats = StatisticsSystem.getInstance();
      // Should have defaults
      expect(stats.getTotalRaces()).toBe(0);
      expect(stats.getTotalCrashes()).toBe(0);
    });

    it('should reject negative values on load', () => {
      localStorage.setItem(
        'harddriving_stats',
        JSON.stringify({
          version: 1,
          totalRaces: -1,
          totalCrashes: -1,
          totalDistance: -1,
          bestLapTime: Infinity,
          averageSpeed: -1,
          topSpeed: -1,
          timePlayedTotal: -1,
        })
      );

      const stats = StatisticsSystem.getInstance();
      // Should not load corrupted data
      expect(stats.getTotalRaces()).toBe(0);
    });
  });

  describe('resetStats', () => {
    it('should clear all statistics', () => {
      const stats = StatisticsSystem.getInstance();
      stats.recordRaceComplete(45000, 2, 1000);
      stats.recordSpeed(25);
      stats.recordPlayTime(60);

      stats.resetStats();

      expect(stats.getTotalRaces()).toBe(0);
      expect(stats.getTotalCrashes()).toBe(0);
      expect(stats.getTotalDistance()).toBe(0);
      expect(stats.getBestLapTime()).toBe(Infinity);
      expect(stats.getAverageSpeed()).toBe(0);
      expect(stats.getTopSpeed()).toBe(0);
      expect(stats.getTotalPlayTime()).toBe(0);
    });

    it('should persist reset to localStorage', () => {
      const stats1 = StatisticsSystem.getInstance();
      stats1.recordRaceComplete(45000, 2, 1000);
      stats1.resetStats();

      StatisticsSystem.resetInstance();
      const stats2 = StatisticsSystem.getInstance();

      expect(stats2.getTotalRaces()).toBe(0);
    });
  });

  describe('dispose', () => {
    it('should save statistics on dispose', () => {
      const stats = StatisticsSystem.getInstance();
      stats.recordRaceComplete(45000, 2, 1000);

      // Should have already been saved, but dispose should ensure it
      stats.dispose();

      StatisticsSystem.resetInstance();
      const stats2 = StatisticsSystem.getInstance();

      expect(stats2.getTotalRaces()).toBe(1);
    });
  });

  describe('Complex Scenarios', () => {
    it('should track statistics over multiple races with varying conditions', () => {
      const stats = StatisticsSystem.getInstance();

      // Race 1: Good race
      stats.recordRaceComplete(45000, 0, 2000);
      stats.recordSpeed(30);
      stats.recordPlayTime(45);

      // Race 2: Crash-heavy race
      stats.recordRaceComplete(60000, 5, 1500);
      stats.recordSpeed(20);
      stats.recordPlayTime(60);

      // Race 3: Excellent race
      stats.recordRaceComplete(40000, 1, 2100);
      stats.recordSpeed(35);
      stats.recordPlayTime(40);

      expect(stats.getTotalRaces()).toBe(3);
      expect(stats.getTotalCrashes()).toBe(6);
      expect(stats.getTotalDistance()).toBe(5600);
      expect(stats.getBestLapTime()).toBe(40000);
      expect(stats.getTotalPlayTime()).toBeCloseTo(145, 5);
    });

    it('should maintain speed averaging across many samples', () => {
      const stats = StatisticsSystem.getInstance();

      // Simulate driving with varying speeds
      const speeds = [10, 15, 20, 25, 30, 25, 20, 15, 10];
      speeds.forEach(speed => {
        stats.recordSpeed(speed);
      });

      const avgSpeed = stats.getAverageSpeed();
      const topSpeed = stats.getTopSpeed();

      expect(topSpeed).toBe(30);
      expect(avgSpeed).toBeGreaterThan(0);
      expect(avgSpeed).toBeLessThanOrEqual(30);
    });

    it('should handle rapid successive operations', () => {
      const stats = StatisticsSystem.getInstance();

      for (let i = 0; i < 100; i++) {
        stats.recordSpeed(Math.random() * 50);
        stats.recordPlayTime(0.016);
      }

      stats.recordRaceComplete(45000, 2, 1000);

      expect(stats.getTotalPlayTime()).toBeCloseTo(100 * 0.016, 3);
      expect(stats.getTotalRaces()).toBe(1);
    });

    it('should maintain data consistency across session boundaries', () => {
      const stats1 = StatisticsSystem.getInstance();

      // Session 1
      stats1.recordRaceComplete(45000, 2, 1000);

      // Session 2 (simulated by reset)
      StatisticsSystem.resetInstance();
      const stats2 = StatisticsSystem.getInstance();

      // Continue with more data
      stats2.recordRaceComplete(50000, 1, 1200);

      // Verify accumulated data
      expect(stats2.getTotalRaces()).toBe(2);
      expect(stats2.getTotalCrashes()).toBe(3);
      expect(stats2.getTotalDistance()).toBe(2200);
      expect(stats2.getBestLapTime()).toBe(45000);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very high speed values', () => {
      const stats = StatisticsSystem.getInstance();

      stats.recordSpeed(500); // 500 m/s (absurdly high)
      expect(stats.getTopSpeed()).toBe(500);
    });

    it('should handle fractional time values', () => {
      const stats = StatisticsSystem.getInstance();

      stats.recordPlayTime(0.0001); // 0.1 milliseconds
      expect(stats.getTotalPlayTime()).toBeCloseTo(0.0001, 8);
    });

    it('should handle large race distances', () => {
      const stats = StatisticsSystem.getInstance();

      stats.recordRaceComplete(45000, 0, 1000000); // 1000 km
      expect(stats.getTotalDistance()).toBe(1000000);
    });

    it('should preserve precision for lap times', () => {
      const stats = StatisticsSystem.getInstance();

      stats.recordRaceComplete(45123.456, 0, 1000);
      expect(stats.getBestLapTime()).toBeCloseTo(45123.456, 2);
    });
  });
});
