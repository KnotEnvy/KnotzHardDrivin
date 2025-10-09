import { Vector3, Quaternion, Matrix4 } from 'three';

/**
 * ObjectPool - Generic object pooling utility for performance optimization
 *
 * Reduces garbage collection pressure by reusing objects instead of creating new ones.
 * Essential for high-frequency allocations like particles, projectiles, or temporary calculations.
 *
 * Performance Impact:
 * - Eliminates per-frame allocations (saves ~0.1-1ms per frame depending on pool usage)
 * - Reduces GC pauses (can save 5-50ms during collection cycles)
 * - Memory usage stays constant (predictable performance)
 *
 * Usage Example:
 * ```typescript
 * // Create pool for Vector3 objects
 * const vectorPool = new ObjectPool<THREE.Vector3>(
 *   () => new THREE.Vector3(),           // Factory function
 *   (v) => v.set(0, 0, 0),              // Reset function
 *   50                                   // Initial size
 * );
 *
 * // In game loop (hot path):
 * const tempVec = vectorPool.acquire();  // Get from pool (no allocation!)
 * tempVec.set(x, y, z);
 * // ... use vector ...
 * vectorPool.release(tempVec);           // Return to pool for reuse
 * ```
 *
 * @template T - The type of objects to pool
 */
export class ObjectPool<T> {
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  private factory: () => T;
  private reset: (obj: T) => void;
  private readonly maxSize: number;
  private readonly minSize: number;
  private totalCreated = 0;
  private totalAcquired = 0;
  private totalReleased = 0;
  private peakInUse = 0;

  /**
   * Creates a new object pool
   *
   * @param factory - Function that creates a new object of type T
   * @param reset - Function that resets an object to its initial state
   * @param initialSize - Number of objects to pre-allocate (default: 10)
   * @param maxSize - Maximum pool size before objects are discarded (default: 1000)
   */
  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    initialSize: number = 10,
    maxSize: number = 1000
  ) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
    this.minSize = initialSize;

    // Pre-allocate initial objects to avoid allocations during gameplay
    for (let i = 0; i < initialSize; i++) {
      const obj = this.factory();
      this.available.push(obj);
      this.totalCreated++;
    }

    console.log(`ObjectPool created: ${initialSize} objects pre-allocated (type: ${this.getTypeName()})`);
  }

  /**
   * Acquire an object from the pool
   *
   * If the pool is empty, creates a new object.
   * The object is marked as "in use" until released.
   *
   * @returns An object ready to use
   */
  acquire(): T {
    let obj = this.available.pop();

    // Pool exhausted - create new object
    if (!obj) {
      obj = this.factory();
      this.totalCreated++;

      // Warn if pool size is growing significantly
      if (this.totalCreated > this.maxSize) {
        console.warn(
          `ObjectPool exceeded max size (${this.maxSize}). ` +
          `Consider increasing initial size or releasing objects sooner.`
        );
      }
    }

    this.inUse.add(obj);
    this.totalAcquired++;

    // Track peak usage for diagnostics
    if (this.inUse.size > this.peakInUse) {
      this.peakInUse = this.inUse.size;
    }

    return obj;
  }

  /**
   * Release an object back to the pool for reuse
   *
   * The object is reset to its initial state and returned to the available pool.
   * If the pool exceeds maxSize, the object is discarded (eligible for GC).
   *
   * @param obj - The object to release
   * @returns true if object was returned to pool, false if discarded
   */
  release(obj: T): boolean {
    // Check if object was actually acquired from this pool
    if (!this.inUse.delete(obj)) {
      console.warn('Attempted to release an object that was not acquired from this pool');
      return false;
    }

    this.totalReleased++;

    // If pool is at max capacity, discard the object (let it be GC'd)
    if (this.available.length >= this.maxSize) {
      return false;
    }

    // Reset object to clean state
    this.reset(obj);

    // Return to available pool
    this.available.push(obj);
    return true;
  }

  /**
   * Release multiple objects at once
   *
   * @param objects - Array of objects to release
   */
  releaseAll(objects: T[]): void {
    for (const obj of objects) {
      this.release(obj);
    }
  }

  /**
   * Get the number of available objects in the pool
   */
  getAvailableCount(): number {
    return this.available.length;
  }

  /**
   * Get the number of objects currently in use
   */
  getInUseCount(): number {
    return this.inUse.size;
  }

  /**
   * Get the total number of objects created by this pool
   */
  getTotalCreated(): number {
    return this.totalCreated;
  }

  /**
   * Get pool statistics for performance monitoring
   *
   * @returns Object with pool statistics
   */
  getStats(): {
    available: number;
    inUse: number;
    totalCreated: number;
    totalAcquired: number;
    totalReleased: number;
    peakInUse: number;
    utilizationRate: number; // Percentage of time objects are in use
  } {
    const utilizationRate = this.totalAcquired > 0
      ? (this.totalReleased / this.totalAcquired) * 100
      : 0;

    return {
      available: this.available.length,
      inUse: this.inUse.size,
      totalCreated: this.totalCreated,
      totalAcquired: this.totalAcquired,
      totalReleased: this.totalReleased,
      peakInUse: this.peakInUse,
      utilizationRate,
    };
  }

  /**
   * Log pool statistics to console for debugging
   */
  logStats(): void {
    const stats = this.getStats();
    console.log('=== Object Pool Stats ===');
    console.log(`Type: ${this.getTypeName()}`);
    console.log(`Available: ${stats.available}`);
    console.log(`In Use: ${stats.inUse}`);
    console.log(`Total Created: ${stats.totalCreated}`);
    console.log(`Peak In Use: ${stats.peakInUse}`);
    console.log(`Utilization Rate: ${stats.utilizationRate.toFixed(1)}%`);
    console.log('========================');
  }

  /**
   * Pre-warm the pool by creating objects up to the specified count
   * Useful to avoid allocations during critical gameplay moments
   *
   * @param count - Number of objects to ensure are available
   */
  prewarm(count: number): void {
    const needed = count - this.available.length;
    if (needed <= 0) return;

    for (let i = 0; i < needed; i++) {
      const obj = this.factory();
      this.available.push(obj);
      this.totalCreated++;
    }

    console.log(`ObjectPool prewarmed: ${needed} objects created (total available: ${this.available.length})`);
  }

  /**
   * Shrink the pool to the minimum size
   * Useful for memory management during non-critical moments
   */
  shrink(): void {
    const excessCount = this.available.length - this.minSize;
    if (excessCount <= 0) return;

    // Remove excess objects (they'll be garbage collected)
    this.available.splice(this.minSize);

    console.log(`ObjectPool shrunk: ${excessCount} objects removed (available: ${this.available.length})`);
  }

  /**
   * Clear all objects from the pool
   * Warning: Only call when no objects are in use!
   */
  clear(): void {
    if (this.inUse.size > 0) {
      console.warn(
        `ObjectPool.clear() called with ${this.inUse.size} objects still in use. ` +
        `This may cause issues if those objects are later released.`
      );
    }

    this.available = [];
    this.inUse.clear();
    this.totalCreated = 0;
    this.totalAcquired = 0;
    this.totalReleased = 0;
    this.peakInUse = 0;

    console.log('ObjectPool cleared');
  }

  /**
   * Dispose of the pool and all its objects
   * Call this when the pool is no longer needed
   */
  dispose(): void {
    this.clear();
    console.log('ObjectPool disposed');
  }

  /**
   * Get a human-readable type name for logging
   * Attempts to extract type from factory function
   */
  private getTypeName(): string {
    try {
      const sample = this.available[0] || this.factory();
      return sample?.constructor?.name || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }
}

/**
 * Pre-configured pool for THREE.Vector3 objects
 * Common use case for 3D games
 */
export function createVector3Pool(initialSize: number = 50): ObjectPool<Vector3> {
  return new ObjectPool<Vector3>(
    () => new Vector3(),
    (v) => v.set(0, 0, 0),
    initialSize
  );
}

/**
 * Pre-configured pool for THREE.Quaternion objects
 * Common use case for rotations
 */
export function createQuaternionPool(initialSize: number = 50): ObjectPool<Quaternion> {
  return new ObjectPool<Quaternion>(
    () => new Quaternion(),
    (q) => q.identity(),
    initialSize
  );
}

/**
 * Pre-configured pool for THREE.Matrix4 objects
 * Common use case for transformations
 */
export function createMatrix4Pool(initialSize: number = 20): ObjectPool<Matrix4> {
  return new ObjectPool<Matrix4>(
    () => new Matrix4(),
    (m) => m.identity(),
    initialSize
  );
}

/**
 * Pre-configured pool for array objects
 * Useful for temporary data structures
 */
export function createArrayPool<T>(initialSize: number = 20): ObjectPool<T[]> {
  return new ObjectPool<T[]>(
    () => [],
    (arr) => { arr.length = 0; }, // Clear array
    initialSize
  );
}
