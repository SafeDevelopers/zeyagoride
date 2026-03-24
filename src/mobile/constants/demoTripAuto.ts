/** Staggered delays (ms) after `driver_assigned` for demo-only auto progression (mock + optional real API). */
export const DEMO_AUTO_TRIP_PROGRESS_DELAYS_MS = {
  toDriverArrived: 3500,
  toInProgress: 4000,
  toCompleted: 4500,
} as const;
