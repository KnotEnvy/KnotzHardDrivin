/**
 * PerformanceMonitor - Tracks and reports game performance metrics
 *
 * Responsibilities:
 * - Track FPS (frames per second) with rolling average
 * - Monitor frame time (milliseconds per frame)
 * - Track memory usage (when available)
 * - Detect performance issues (frame drops, stutters)
 * - Provide performance statistics for debugging and optimization
 *
 * Performance impact: Negligible (~0.01ms per frame)
 *
 * Usage:
 * ```typescript
 * const monitor = new PerformanceMonitor();
 * // In game loop:
 * monitor.recordFrame(deltaTime);
 * // Get stats:
 * const fps = monitor.getAverageFPS();
 * const frameTime = monitor.getAverageFrameTime();
 * ```
 */
export class PerformanceMonitor {
  // Rolling window for performance metrics (last 100 frames)
  private readonly windowSize = 100;

  // Performance data arrays
  private fpsHistory: number[] = [];
  private frameTimeHistory: number[] = []; // in milliseconds

  // Frame drop tracking
  private totalFrames = 0;
  private droppedFrames = 0; // Frames below 50fps (20ms)
  private readonly frameDropThreshold = 20; // ms (50fps)

  // Memory tracking
  private memoryUsage: number[] = [];
  private readonly memoryCheckInterval = 60; // Check every 60 frames (~1 second)
  private framesSinceMemoryCheck = 0;

  // Peak tracking
  private peakFrameTime = 0;
  private peakMemoryUsage = 0;

  // Session statistics
  private sessionStartTime = performance.now();

  // RAF tracking for FPS display cleanup
  private rafId: number | null = null;

  /**
   * Records a frame's performance metrics
   *
   * @param deltaTime - Time elapsed since last frame (in seconds)
   */
  recordFrame(deltaTime: number): void {
    // Calculate FPS
    const fps = deltaTime > 0 ? 1 / deltaTime : 60;

    // Convert to milliseconds for frame time
    const frameTimeMs = deltaTime * 1000;

    // Add to history
    this.fpsHistory.push(fps);
    this.frameTimeHistory.push(frameTimeMs);

    // Keep only last N frames
    if (this.fpsHistory.length > this.windowSize) {
      this.fpsHistory.shift();
      this.frameTimeHistory.shift();
    }

    // Track peak frame time
    if (frameTimeMs > this.peakFrameTime) {
      this.peakFrameTime = frameTimeMs;
    }

    // Track frame drops
    this.totalFrames++;
    if (frameTimeMs > this.frameDropThreshold) {
      this.droppedFrames++;
    }

    // Periodically check memory usage
    this.framesSinceMemoryCheck++;
    if (this.framesSinceMemoryCheck >= this.memoryCheckInterval) {
      this.recordMemoryUsage();
      this.framesSinceMemoryCheck = 0;
    }
  }

  /**
   * Records current memory usage (if available)
   * Uses performance.memory API (Chrome/Edge only)
   */
  private recordMemoryUsage(): void {
    // Check if performance.memory is available (Chrome/Edge only)
    const perfMemory = (performance as any).memory;
    if (perfMemory) {
      // usedJSHeapSize is in bytes, convert to MB
      const memoryMB = perfMemory.usedJSHeapSize / (1024 * 1024);
      this.memoryUsage.push(memoryMB);

      // Keep only last 100 measurements
      if (this.memoryUsage.length > 100) {
        this.memoryUsage.shift();
      }

      // Track peak memory
      if (memoryMB > this.peakMemoryUsage) {
        this.peakMemoryUsage = memoryMB;
      }
    }
  }

  /**
   * Gets the average FPS over the rolling window
   *
   * @returns Average FPS, or 0 if no data
   */
  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return sum / this.fpsHistory.length;
  }

  /**
   * Gets the average frame time over the rolling window
   *
   * @returns Average frame time in milliseconds, or 0 if no data
   */
  getAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return 0;
    const sum = this.frameTimeHistory.reduce((a, b) => a + b, 0);
    return sum / this.frameTimeHistory.length;
  }

  /**
   * Gets the current (most recent) FPS
   *
   * @returns Current FPS, or 0 if no data
   */
  getCurrentFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    return this.fpsHistory[this.fpsHistory.length - 1];
  }

  /**
   * Gets the current (most recent) frame time
   *
   * @returns Current frame time in milliseconds, or 0 if no data
   */
  getCurrentFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return 0;
    return this.frameTimeHistory[this.frameTimeHistory.length - 1];
  }

  /**
   * Gets the peak frame time recorded
   *
   * @returns Peak frame time in milliseconds
   */
  getPeakFrameTime(): number {
    return this.peakFrameTime;
  }

  /**
   * Gets the percentage of frames that were dropped (below 50fps)
   *
   * @returns Percentage of dropped frames (0-100)
   */
  getDroppedFramePercentage(): number {
    if (this.totalFrames === 0) return 0;
    return (this.droppedFrames / this.totalFrames) * 100;
  }

  /**
   * Gets the total number of frames recorded
   *
   * @returns Total frame count
   */
  getTotalFrames(): number {
    return this.totalFrames;
  }

  /**
   * Gets the average memory usage (if available)
   *
   * @returns Average memory usage in MB, or null if not available
   */
  getAverageMemoryUsage(): number | null {
    if (this.memoryUsage.length === 0) return null;
    const sum = this.memoryUsage.reduce((a, b) => a + b, 0);
    return sum / this.memoryUsage.length;
  }

  /**
   * Gets the current memory usage (if available)
   *
   * @returns Current memory usage in MB, or null if not available
   */
  getCurrentMemoryUsage(): number | null {
    if (this.memoryUsage.length === 0) return null;
    return this.memoryUsage[this.memoryUsage.length - 1];
  }

  /**
   * Gets the peak memory usage recorded (if available)
   *
   * @returns Peak memory usage in MB, or null if not available
   */
  getPeakMemoryUsage(): number | null {
    return this.peakMemoryUsage > 0 ? this.peakMemoryUsage : null;
  }

  /**
   * Gets the session duration in seconds
   *
   * @returns Session duration in seconds
   */
  getSessionDuration(): number {
    return (performance.now() - this.sessionStartTime) / 1000;
  }

  /**
   * Checks if performance is within acceptable ranges
   *
   * @returns Object with performance status flags
   */
  getPerformanceStatus(): {
    isGood: boolean;
    isMarginal: boolean;
    isPoor: boolean;
    averageFPS: number;
    averageFrameTime: number;
    droppedFramePercentage: number;
  } {
    const avgFPS = this.getAverageFPS();
    const avgFrameTime = this.getAverageFrameTime();
    const droppedPercentage = this.getDroppedFramePercentage();

    // Performance thresholds
    const isGood = avgFPS >= 55 && droppedPercentage < 5;
    const isMarginal = avgFPS >= 40 && avgFPS < 55;
    const isPoor = avgFPS < 40 || droppedPercentage > 20;

    return {
      isGood,
      isMarginal,
      isPoor,
      averageFPS: avgFPS,
      averageFrameTime: avgFrameTime,
      droppedFramePercentage: droppedPercentage,
    };
  }

  /**
   * Gets a comprehensive performance report as a formatted string
   *
   * @returns Multi-line string with performance statistics
   */
  getPerformanceReport(): string {
    const status = this.getPerformanceStatus();
    const sessionTime = this.getSessionDuration();
    const memoryAvg = this.getAverageMemoryUsage();
    const memoryPeak = this.getPeakMemoryUsage();

    const lines = [
      '=== Performance Report ===',
      `Session Duration: ${sessionTime.toFixed(1)}s`,
      `Total Frames: ${this.totalFrames}`,
      '',
      `Average FPS: ${status.averageFPS.toFixed(1)}`,
      `Average Frame Time: ${status.averageFrameTime.toFixed(2)}ms`,
      `Peak Frame Time: ${this.peakFrameTime.toFixed(2)}ms`,
      `Dropped Frames: ${this.droppedFrames} (${status.droppedFramePercentage.toFixed(1)}%)`,
      '',
      `Performance Status: ${status.isGood ? 'GOOD' : status.isMarginal ? 'MARGINAL' : 'POOR'}`,
    ];

    // Add memory stats if available
    if (memoryAvg !== null) {
      lines.push('');
      lines.push(`Average Memory: ${memoryAvg.toFixed(1)} MB`);
      if (memoryPeak !== null) {
        lines.push(`Peak Memory: ${memoryPeak.toFixed(1)} MB`);
      }
    }

    lines.push('========================');

    return lines.join('\n');
  }

  /**
   * Logs the performance report to console
   */
  logPerformanceReport(): void {
    console.log(this.getPerformanceReport());
  }

  /**
   * Resets all performance metrics
   */
  reset(): void {
    this.fpsHistory = [];
    this.frameTimeHistory = [];
    this.memoryUsage = [];
    this.totalFrames = 0;
    this.droppedFrames = 0;
    this.framesSinceMemoryCheck = 0;
    this.peakFrameTime = 0;
    this.peakMemoryUsage = 0;
    this.sessionStartTime = performance.now();
  }

  /**
   * Creates a simple FPS display element that can be added to the DOM
   * Useful for real-time performance monitoring during development
   *
   * @returns HTMLDivElement with live FPS display
   */
  createFPSDisplay(): HTMLDivElement {
    // Stop existing RAF loop if present
    this.stopFPSDisplay();

    const fpsDisplay = document.createElement('div');
    fpsDisplay.id = 'fps-display';
    fpsDisplay.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: #0f0;
      font-family: monospace;
      font-size: 14px;
      padding: 10px;
      border-radius: 4px;
      z-index: 10000;
      min-width: 200px;
    `;

    // Update display every frame
    const updateDisplay = () => {
      const fps = this.getCurrentFPS();
      const frameTime = this.getCurrentFrameTime();
      const avgFPS = this.getAverageFPS();
      const memory = this.getCurrentMemoryUsage();

      // Color code based on performance
      let color = '#0f0'; // Green
      if (fps < 55) color = '#ff0'; // Yellow
      if (fps < 40) color = '#f00'; // Red
      fpsDisplay.style.color = color;

      let html = `
        FPS: ${fps.toFixed(1)} (avg: ${avgFPS.toFixed(1)})<br>
        Frame: ${frameTime.toFixed(2)}ms<br>
        Frames: ${this.totalFrames}
      `;

      if (memory !== null) {
        html += `<br>Memory: ${memory.toFixed(1)} MB`;
      }

      fpsDisplay.innerHTML = html;

      // Store RAF ID for cleanup
      this.rafId = requestAnimationFrame(updateDisplay);
    };

    updateDisplay();
    return fpsDisplay;
  }

  /**
   * Stops the FPS display RAF loop to prevent memory leaks
   * Call this when removing the FPS display or cleaning up
   */
  stopFPSDisplay(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
