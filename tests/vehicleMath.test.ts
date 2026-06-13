import { describe, it, expect } from 'vitest';
import { clamp, lerp, moveToward, clampMagnitude } from '../src/util/math';

describe('clamp', () => {
  it('passes values inside the range through', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('clamps below and above', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe('lerp', () => {
  it('interpolates endpoints and midpoint', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
});

describe('moveToward', () => {
  it('steps toward the target without overshooting', () => {
    expect(moveToward(0, 1, 0.3)).toBeCloseTo(0.3, 10);
    expect(moveToward(0, 1, 5)).toBe(1);
    expect(moveToward(0, -1, 0.25)).toBeCloseTo(-0.25, 10);
  });
  it('returns the target when already within reach', () => {
    expect(moveToward(0.9, 1, 0.5)).toBe(1);
  });
});

describe('clampMagnitude', () => {
  it('limits magnitude while keeping sign', () => {
    expect(clampMagnitude(5, 3)).toBe(3);
    expect(clampMagnitude(-5, 3)).toBe(-3);
    expect(clampMagnitude(2, 3)).toBe(2);
  });
});
