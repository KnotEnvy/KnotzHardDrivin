/**
 * Global engine constants.
 *
 * Physics runs on a fixed timestep so simulation is deterministic and
 * frame-rate independent; rendering runs as fast as the display allows and
 * interpolates between the two most recent physics states.
 */

/** Physics tick rate (Hz). */
export const PHYSICS_HZ = 60;

/** Seconds per physics step. */
export const FIXED_TIMESTEP = 1 / PHYSICS_HZ;

/**
 * Maximum physics steps simulated per rendered frame. Caps catch-up work after
 * a stall (tab backgrounded, GC pause) so we never enter a "spiral of death".
 */
export const MAX_SUB_STEPS = 5;

/** Largest frame delta we accept; anything bigger is clamped (s). */
export const MAX_FRAME_DELTA = 0.25;

/** Gravity (m/s²). */
export const GRAVITY_Y = -9.81;

/** Cap device pixel ratio to protect fill-rate on high-DPI mobile screens. */
export const MAX_PIXEL_RATIO = 2;
