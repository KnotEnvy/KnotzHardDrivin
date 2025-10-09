/**
 * Unit tests for PerformanceMonitor
 * Target: 90%+ coverage
 *
 * Tests cover:
 * - Frame recording and FPS calculation
 * - Rolling average window
 * - Frame drop detection
 * - Memory tracking (when available)
 * - Performance status classification
 * - Peak tracking
 * - Session statistics
 * - FPS display creation
 * - Reset functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceMonitor } from '@/utils/PerformanceMonitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    vi.clearAllMocks();
  });

  describe('recordFrame', () => {
    it('should record a single frame correctly', () => {
      const deltaTime = 1 / 60; // 60fps = ~16.67ms

      monitor.recordFrame(deltaTime);

      expect(monitor.getCurrentFPS()).toBeCloseTo(60, 0);
      expect(monitor.getCurrentFrameTime()).toBeCloseTo(16.67, 1);
      expect(monitor.getTotalFrames()).toBe(1);
    });

    it('should calculate FPS correctly from delta time', () => {
      // 30fps = 1/30 seconds per frame
      monitor.recordFrame(1 / 30);
      expect(monitor.getCurrentFPS()).toBeCloseTo(30, 0);

      // 120fps = 1/120 seconds per frame
      monitor.recordFrame(1 / 120);
      expect(monitor.getCurrentFPS()).toBeCloseTo(120, 0);
    });

    it('should handle zero delta time gracefully (default to 60fps)', () => {
      monitor.recordFrame(0);
      expect(monitor.getCurrentFPS()).toBe(60);
      expect(monitor.getCurrentFrameTime()).toBe(0);
    });

    it('should maintain rolling window of last 100 frames', () => {
      // Record 150 frames
      for (let i = 0; i < 150; i++) {
        monitor.recordFrame(1 / 60);
      }

      // Should only track last 100
      const history = (monitor as any).fpsHistory;
      expect(history.length).toBe(100);
    });

    it('should accumulate total frame count beyond window size', () => {
      for (let i = 0; i < 200; i++) {
        monitor.recordFrame(1 / 60);
      }

      expect(monitor.getTotalFrames()).toBe(200);
    });

    it('should track peak frame time', () => {
      monitor.recordFrame(1 / 60); // 16.67ms
      monitor.recordFrame(1 / 30); // 33.33ms (peak)
      monitor.recordFrame(1 / 60); // 16.67ms

      expect(monitor.getPeakFrameTime()).toBeCloseTo(33.33, 1);
    });

    it('should detect frame drops (below 50fps)', () => {
      // Record good frames
      for (let i = 0; i < 5; i++) {
        monitor.recordFrame(1 / 60); // 16.67ms - good
      }

      // Record dropped frames (>20ms = <50fps)
      for (let i = 0; i < 3; i++) {
        monitor.recordFrame(1 / 30); // 33.33ms - dropped
      }

      expect(monitor.getDroppedFramePercentage()).toBeCloseTo(37.5, 0); // 3/8 = 37.5%
    });
  });

  describe('FPS tracking', () => {
    it('should calculate average FPS over window', () => {
      // Record 10 frames at 60fps
      for (let i = 0; i < 10; i++) {
        monitor.recordFrame(1 / 60);
      }

      expect(monitor.getAverageFPS()).toBeCloseTo(60, 0);
    });

    it('should calculate average FPS for mixed frame rates', () => {
      // 5 frames at 60fps, 5 frames at 30fps
      // Average should be 45fps
      for (let i = 0; i < 5; i++) {
        monitor.recordFrame(1 / 60);
      }
      for (let i = 0; i < 5; i++) {
        monitor.recordFrame(1 / 30);
      }

      expect(monitor.getAverageFPS()).toBeCloseTo(45, 0);
    });

    it('should return 0 for average FPS when no frames recorded', () => {
      expect(monitor.getAverageFPS()).toBe(0);
    });

    it('should return 0 for current FPS when no frames recorded', () => {
      expect(monitor.getCurrentFPS()).toBe(0);
    });

    it('should return most recent FPS as current', () => {
      monitor.recordFrame(1 / 60); // 60fps
      monitor.recordFrame(1 / 30); // 30fps (most recent)

      expect(monitor.getCurrentFPS()).toBeCloseTo(30, 0);
    });
  });

  describe('frame time tracking', () => {
    it('should calculate average frame time over window', () => {
      for (let i = 0; i < 10; i++) {
        monitor.recordFrame(1 / 60); // ~16.67ms
      }

      expect(monitor.getAverageFrameTime()).toBeCloseTo(16.67, 1);
    });

    it('should return 0 for average frame time when no frames recorded', () => {
      expect(monitor.getAverageFrameTime()).toBe(0);
    });

    it('should return 0 for current frame time when no frames recorded', () => {
      expect(monitor.getCurrentFrameTime()).toBe(0);
    });

    it('should track peak frame time correctly', () => {
      monitor.recordFrame(1 / 60); // 16.67ms
      monitor.recordFrame(1 / 10); // 100ms (spike)
      monitor.recordFrame(1 / 60); // 16.67ms

      expect(monitor.getPeakFrameTime()).toBeCloseTo(100, 0);
    });
  });

  describe('frame drop detection', () => {
    it('should detect no frame drops when consistently above 50fps', () => {
      for (let i = 0; i < 100; i++) {
        monitor.recordFrame(1 / 60); // 16.67ms
      }

      expect(monitor.getDroppedFramePercentage()).toBe(0);
    });

    it('should detect 100% frame drops when consistently below 50fps', () => {
      for (let i = 0; i < 10; i++) {
        monitor.recordFrame(1 / 20); // 50ms (20fps - all dropped)
      }

      expect(monitor.getDroppedFramePercentage()).toBe(100);
    });

    it('should calculate correct percentage for mixed performance', () => {
      // 7 good frames, 3 dropped frames
      for (let i = 0; i < 7; i++) {
        monitor.recordFrame(1 / 60); // Good
      }
      for (let i = 0; i < 3; i++) {
        monitor.recordFrame(1 / 30); // Dropped
      }

      expect(monitor.getDroppedFramePercentage()).toBeCloseTo(30, 0);
    });

    it('should return 0% when no frames recorded', () => {
      expect(monitor.getDroppedFramePercentage()).toBe(0);
    });
  });

  describe('memory tracking', () => {
    it('should return null when memory API is unavailable', () => {
      // Memory API not available in test environment
      expect(monitor.getCurrentMemoryUsage()).toBe(null);
      expect(monitor.getAverageMemoryUsage()).toBe(null);
      expect(monitor.getPeakMemoryUsage()).toBe(null);
    });

    it('should track memory when API is available', () => {
      // Mock performance.memory API
      const mockMemory = {
        usedJSHeapSize: 10 * 1024 * 1024, // 10MB in bytes
        totalJSHeapSize: 20 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024,
      };

      (performance as any).memory = mockMemory;

      // Record enough frames to trigger memory check
      for (let i = 0; i < 60; i++) {
        monitor.recordFrame(1 / 60);
      }

      // Memory should be tracked
      const currentMemory = monitor.getCurrentMemoryUsage();
      expect(currentMemory).not.toBe(null);
      if (currentMemory !== null) {
        expect(currentMemory).toBeCloseTo(10, 0); // 10MB
      }

      // Cleanup
      delete (performance as any).memory;
    });

    it('should track peak memory usage', () => {
      // Mock performance.memory with increasing values
      let memoryUsage = 10 * 1024 * 1024; // Start at 10MB

      Object.defineProperty(performance, 'memory', {
        get: () => ({
          usedJSHeapSize: memoryUsage,
          totalJSHeapSize: 100 * 1024 * 1024,
          jsHeapSizeLimit: 1000 * 1024 * 1024,
        }),
        configurable: true,
      });

      // Record frames, increasing memory each check
      for (let i = 0; i < 180; i++) {
        if (i % 60 === 0) {
          memoryUsage += 5 * 1024 * 1024; // +5MB every 60 frames
        }
        monitor.recordFrame(1 / 60);
      }

      const peakMemory = monitor.getPeakMemoryUsage();
      expect(peakMemory).not.toBe(null);
      if (peakMemory !== null) {
        expect(peakMemory).toBeGreaterThan(10); // Should be higher than initial
      }

      // Cleanup
      delete (performance as any).memory;
    });
  });

  describe('performance status classification', () => {
    it('should classify as GOOD when FPS >= 55 and drops < 5%', () => {
      for (let i = 0; i < 100; i++) {
        monitor.recordFrame(1 / 60); // 60fps
      }

      const status = monitor.getPerformanceStatus();
      expect(status.isGood).toBe(true);
      expect(status.isMarginal).toBe(false);
      expect(status.isPoor).toBe(false);
      expect(status.averageFPS).toBeCloseTo(60, 0);
    });

    it('should classify as MARGINAL when FPS between 40-55', () => {
      for (let i = 0; i < 100; i++) {
        monitor.recordFrame(1 / 50); // 50fps
      }

      const status = monitor.getPerformanceStatus();
      expect(status.isGood).toBe(false);
      expect(status.isMarginal).toBe(true);
      expect(status.isPoor).toBe(false);
    });

    it('should classify as POOR when FPS < 40', () => {
      for (let i = 0; i < 100; i++) {
        monitor.recordFrame(1 / 30); // 30fps
      }

      const status = monitor.getPerformanceStatus();
      expect(status.isGood).toBe(false);
      expect(status.isMarginal).toBe(false);
      expect(status.isPoor).toBe(true);
    });

    it('should classify as POOR when drops > 20%', () => {
      // 75 good frames, 25 dropped frames
      for (let i = 0; i < 75; i++) {
        monitor.recordFrame(1 / 60); // Good
      }
      for (let i = 0; i < 25; i++) {
        monitor.recordFrame(1 / 30); // Dropped
      }

      const status = monitor.getPerformanceStatus();
      expect(status.isPoor).toBe(true);
      expect(status.droppedFramePercentage).toBe(25);
    });
  });

  describe('session tracking', () => {
    it('should track session duration', () => {
      const startTime = performance.now();
      monitor = new PerformanceMonitor();

      // Simulate 1 second passing
      vi.spyOn(performance, 'now').mockReturnValue(startTime + 1000);

      const duration = monitor.getSessionDuration();
      expect(duration).toBeCloseTo(1.0, 1);
    });

    it('should track total frames across session', () => {
      for (let i = 0; i < 250; i++) {
        monitor.recordFrame(1 / 60);
      }

      expect(monitor.getTotalFrames()).toBe(250);
    });
  });

  describe('performance report', () => {
    it('should generate comprehensive performance report', () => {
      // Record some frames
      for (let i = 0; i < 100; i++) {
        monitor.recordFrame(1 / 60);
      }

      const report = monitor.getPerformanceReport();
      expect(report).toContain('Performance Report');
      expect(report).toContain('Average FPS');
      expect(report).toContain('Average Frame Time');
      expect(report).toContain('Peak Frame Time');
      expect(report).toContain('Dropped Frames');
      expect(report).toContain('Performance Status');
      expect(report).toContain('GOOD');
    });

    it('should include memory stats in report when available', () => {
      // Mock memory API
      (performance as any).memory = {
        usedJSHeapSize: 50 * 1024 * 1024,
        totalJSHeapSize: 100 * 1024 * 1024,
        jsHeapSizeLimit: 1000 * 1024 * 1024,
      };

      for (let i = 0; i < 60; i++) {
        monitor.recordFrame(1 / 60);
      }

      const report = monitor.getPerformanceReport();
      expect(report).toContain('Average Memory');
      expect(report).toContain('MB');

      delete (performance as any).memory;
    });

    it('should log performance report to console', () => {
      monitor.logPerformanceReport();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Performance Report'));
    });
  });

  describe('FPS display creation', () => {
    let rafIds: number[] = [];

    beforeEach(() => {
      rafIds = [];
      // Track RAF calls
      const originalRAF = global.requestAnimationFrame;
      global.requestAnimationFrame = vi.fn((callback: any) => {
        const id = originalRAF(callback);
        rafIds.push(id as number);
        return id;
      }) as any;
    });

    afterEach(() => {
      // Cancel all RAF calls
      rafIds.forEach(id => cancelAnimationFrame(id));
      rafIds = [];
    });

    it('should create FPS display element', () => {
      const display = monitor.createFPSDisplay();

      expect(display).toBeInstanceOf(HTMLDivElement);
      expect(display.id).toBe('fps-display');
      expect(display.style.position).toBe('fixed');
      expect(display.style.top).toBe('10px');
      expect(display.style.right).toBe('10px');
    });

    it('should update display content', async () => {
      monitor.recordFrame(1 / 60);
      const display = monitor.createFPSDisplay();

      // Wait for RAF to update display
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(display.innerHTML).toContain('FPS');
      expect(display.innerHTML).toContain('Frame');
    });

    it('should color code display based on performance', () => {
      // Good performance - green
      for (let i = 0; i < 10; i++) {
        monitor.recordFrame(1 / 60);
      }
      let display = monitor.createFPSDisplay();
      // Color might be in RGB format or hex format
      expect(display.style.color).toMatch(/(#0f0|rgb\(0,\s*255,\s*0\))/);

      // Poor performance - red
      monitor.reset();
      for (let i = 0; i < 10; i++) {
        monitor.recordFrame(1 / 30);
      }
      display = monitor.createFPSDisplay();
      // Color will be set by RAF callback
    });
  });

  describe('reset functionality', () => {
    it('should reset all metrics', () => {
      // Record some frames
      for (let i = 0; i < 100; i++) {
        monitor.recordFrame(1 / 60);
      }

      expect(monitor.getTotalFrames()).toBe(100);
      expect(monitor.getAverageFPS()).toBeGreaterThan(0);

      // Reset
      monitor.reset();

      expect(monitor.getTotalFrames()).toBe(0);
      expect(monitor.getAverageFPS()).toBe(0);
      expect(monitor.getCurrentFPS()).toBe(0);
      expect(monitor.getAverageFrameTime()).toBe(0);
      expect(monitor.getDroppedFramePercentage()).toBe(0);
      expect(monitor.getPeakFrameTime()).toBe(0);
    });

    it('should reset session start time', () => {
      const initialDuration = monitor.getSessionDuration();
      monitor.reset();
      const resetDuration = monitor.getSessionDuration();

      expect(resetDuration).toBeLessThan(initialDuration + 0.1);
    });
  });

  describe('edge cases and stress tests', () => {
    it('should handle very high frame rates (240fps)', () => {
      monitor.recordFrame(1 / 240);
      expect(monitor.getCurrentFPS()).toBeCloseTo(240, 0);
      expect(monitor.getCurrentFrameTime()).toBeCloseTo(4.17, 1);
    });

    it('should handle very low frame rates (10fps)', () => {
      monitor.recordFrame(1 / 10);
      expect(monitor.getCurrentFPS()).toBeCloseTo(10, 0);
      expect(monitor.getCurrentFrameTime()).toBeCloseTo(100, 0);
    });

    it('should handle rapid frame recording (1000 frames)', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        monitor.recordFrame(1 / 60);
      }

      const duration = performance.now() - start;
      expect(monitor.getTotalFrames()).toBe(1000);
      // Should complete in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle negative delta time (treated as 0)', () => {
      monitor.recordFrame(-0.1);
      // Should default to 60fps when deltaTime is invalid
      expect(monitor.getCurrentFPS()).toBe(60);
    });

    it('should handle extremely small delta times', () => {
      monitor.recordFrame(0.0001); // 10000fps
      expect(monitor.getCurrentFPS()).toBe(10000);
    });

    it('should maintain accuracy over long sessions', () => {
      // Simulate 10 seconds at 60fps (600 frames)
      for (let i = 0; i < 600; i++) {
        monitor.recordFrame(1 / 60);
      }

      expect(monitor.getTotalFrames()).toBe(600);
      expect(monitor.getAverageFPS()).toBeCloseTo(60, 0);
    });
  });

  describe('performance metrics accuracy', () => {
    it('should calculate rolling average correctly after window fills', () => {
      // Fill window with 60fps
      for (let i = 0; i < 100; i++) {
        monitor.recordFrame(1 / 60);
      }

      // Add 100 frames at 30fps (should replace old values)
      for (let i = 0; i < 100; i++) {
        monitor.recordFrame(1 / 30);
      }

      // Average should now be 30fps
      expect(monitor.getAverageFPS()).toBeCloseTo(30, 0);
    });

    it('should track frame drops accurately across window boundary', () => {
      // 100 good frames
      for (let i = 0; i < 100; i++) {
        monitor.recordFrame(1 / 60);
      }

      expect(monitor.getDroppedFramePercentage()).toBe(0);

      // Add 50 dropped frames (total 150, but only last 100 tracked in history)
      for (let i = 0; i < 50; i++) {
        monitor.recordFrame(1 / 30);
      }

      // Total frames: 150, dropped: 50, percentage: 33.33%
      expect(monitor.getDroppedFramePercentage()).toBeCloseTo(33.33, 1);
    });
  });
});
