/**
 * Pure fixed-timestep accounting — no engine/DOM dependencies, so it is trivial
 * to unit test. Given the time accumulated since the last physics update,
 * decides how many fixed steps to run and how much time is left over (which
 * becomes the interpolation alpha for rendering).
 */

export interface FixedStepResult {
  /** Number of fixed steps to simulate this frame. */
  steps: number;
  /** Leftover accumulated time (< fixedStep unless steps were capped). */
  remainder: number;
}

/**
 * @param accumulator  Accumulated unsimulated time (s).
 * @param fixedStep    Seconds per physics step (must be > 0).
 * @param maxSteps     Hard cap on steps per frame (anti spiral-of-death).
 */
export function computeFixedSteps(
  accumulator: number,
  fixedStep: number,
  maxSteps: number,
): FixedStepResult {
  if (fixedStep <= 0) {
    throw new Error(`fixedStep must be > 0, got ${fixedStep}`);
  }
  if (accumulator <= 0) {
    return { steps: 0, remainder: Math.max(0, accumulator) };
  }

  let steps = Math.floor(accumulator / fixedStep);
  let remainder = accumulator - steps * fixedStep;

  if (steps > maxSteps) {
    // We fell too far behind. Run the cap and drop the backlog rather than
    // trying (and failing) to catch up, which would compound the stall.
    steps = maxSteps;
    remainder = 0;
  }

  return { steps, remainder };
}
