/**
 * Race-rules tuning for circuit tracks (laps + timing). Checkpoints are sampled
 * from the track centreline; the car must pass them in order, which both counts
 * laps and guards against reverse-driving / corner-cutting exploits.
 */
export const RaceConfig = {
  /** Ordered checkpoint gates around the loop (index 0 = start/finish). */
  checkpoints: 24,
  /** A gate counts when the car is within this radius of it (m). */
  captureRadius: 16,
  /** ...and moving along the gate's forward direction faster than this (m/s). */
  minForwardSpeed: 1.5,
  /** Laps to complete a race. */
  totalLaps: 3,
  /** Pre-race countdown before controls unlock (s). */
  countdownSeconds: 3,
} as const;

export type RaceConfigT = typeof RaceConfig;
