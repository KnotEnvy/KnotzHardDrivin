/** Small, pure, allocation-free math helpers. Unit-tested in tests/. */

/** Clamp `v` into the inclusive range [min, max]. */
export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Linear interpolation from `a` to `b` by `t` (t is not clamped). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Move `current` toward `target` by at most `maxDelta` (always non-negative).
 * Reaches `target` exactly without overshooting — ideal for steering lerp.
 */
export function moveToward(current: number, target: number, maxDelta: number): number {
  const d = target - current;
  if (Math.abs(d) <= maxDelta) return target;
  return current + Math.sign(d) * maxDelta;
}

/** Clamp a value's magnitude to `max` (max assumed >= 0), preserving sign. */
export function clampMagnitude(v: number, max: number): number {
  if (v > max) return max;
  if (v < -max) return -max;
  return v;
}
