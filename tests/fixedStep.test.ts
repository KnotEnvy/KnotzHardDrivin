import { describe, it, expect } from 'vitest';
import { computeFixedSteps } from '../src/app/fixedStep';

const STEP = 1 / 60;

describe('computeFixedSteps', () => {
  it('runs no steps when nothing has accumulated', () => {
    expect(computeFixedSteps(0, STEP, 5)).toEqual({ steps: 0, remainder: 0 });
  });

  it('runs a single step at exactly one timestep', () => {
    const { steps, remainder } = computeFixedSteps(STEP, STEP, 5);
    expect(steps).toBe(1);
    expect(remainder).toBeCloseTo(0, 10);
  });

  it('carries the sub-step remainder as interpolation alpha', () => {
    const { steps, remainder } = computeFixedSteps(STEP * 1.5, STEP, 5);
    expect(steps).toBe(1);
    expect(remainder).toBeCloseTo(STEP * 0.5, 10);
  });

  it('runs multiple steps when several timesteps have accumulated', () => {
    const { steps } = computeFixedSteps(STEP * 3, STEP, 5);
    expect(steps).toBe(3);
  });

  it('caps steps and drops the backlog to avoid a spiral of death', () => {
    const { steps, remainder } = computeFixedSteps(STEP * 100, STEP, 5);
    expect(steps).toBe(5);
    expect(remainder).toBe(0);
  });

  it('clamps negative accumulators to zero', () => {
    expect(computeFixedSteps(-1, STEP, 5)).toEqual({ steps: 0, remainder: 0 });
  });

  it('throws on a non-positive fixed step', () => {
    expect(() => computeFixedSteps(1, 0, 5)).toThrow();
    expect(() => computeFixedSteps(1, -STEP, 5)).toThrow();
  });
});
