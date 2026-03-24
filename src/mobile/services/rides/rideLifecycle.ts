import type { RideStatus, RideSummary } from '../../types/api';
import type { DriverNavStep } from '../../types/mobile';

/** Ride lifecycle transitions live here; normalized events are emitted from `rideEvents` + polling (`useRideStatusSync`). */

/** True when a stop string should be sent on the wire (not blank / demo placeholder). */
export function isValidStopAddressString(address: string): boolean {
  const t = address.trim();
  if (!t) return false;
  if (t.toLowerCase() === 'new stop') return false;
  return true;
}

/** Stops with real addresses (excludes empty slots / junk placeholders). */
export function nonEmptyTripStops(ride: RideSummary | null | undefined): RideSummary['stops'] {
  return (ride?.stops ?? []).filter((s) => isValidStopAddressString(s.address));
}

/** After leaving pickup (trip started), next nav target: first intermediate stop or final destination. */
export function driverNavAfterTripStart(ride: RideSummary | null): {
  step: DriverNavStep;
  stopIndex: number | null;
} {
  const stops = nonEmptyTripStops(ride);
  if (stops.length > 0) return { step: 'to_stop', stopIndex: 0 };
  return { step: 'to_destination', stopIndex: null };
}

/** Wall-clock phases after driver accepts (ms) — mock/demo progression. */
export const POST_ACCEPT_MS = {
  driver_assigned: 30_000,
  driver_arrived: 60_000,
  in_progress: 120_000,
} as const;

/** Deep-clone stops and fare; shallow-copy the rest (preserves coords, estimates, schedule). */
export function cloneRideSummary(ride: RideSummary): RideSummary {
  return {
    ...ride,
    stops: ride.stops.map((s) => ({ ...s, coords: s.coords ? { ...s.coords } : null })),
    fareEstimate: ride.fareEstimate ? { ...ride.fareEstimate } : undefined,
  };
}

function touch(ride: RideSummary): RideSummary {
  return { ...ride, updatedAt: new Date().toISOString() };
}

/** Initial server record after a ride request payload is accepted (pending). */
export function toRequestCreatedRide(ride: RideSummary): RideSummary {
  return touch({ ...cloneRideSummary(ride), status: 'pending' });
}

/** Matching / searching for a driver. */
export function toMatchingRide(ride: RideSummary): RideSummary {
  return touch({ ...cloneRideSummary(ride), status: 'matching' });
}

/** Driver assigned — optional `driverId` defaults to mock driver when missing. */
export function toAssignedRide(
  ride: RideSummary,
  opts?: { driverId?: string | null },
): RideSummary {
  const r = cloneRideSummary(ride);
  const driverId =
    opts?.driverId !== undefined ? opts.driverId : r.driverId ?? 'mock-driver-1';
  return touch({ ...r, status: 'driver_assigned', driverId });
}

export function toArrivedRide(ride: RideSummary): RideSummary {
  return touch({ ...cloneRideSummary(ride), status: 'driver_arrived' });
}

export function toInProgressRide(ride: RideSummary): RideSummary {
  return touch({ ...cloneRideSummary(ride), status: 'in_progress' });
}

export function toCompletedRide(ride: RideSummary): RideSummary {
  return touch({ ...cloneRideSummary(ride), status: 'completed' });
}

export function toCancelledRide(ride: RideSummary): RideSummary {
  return touch({ ...cloneRideSummary(ride), status: 'cancelled' });
}

/** Which API phase the mock ride should be in based on elapsed time since driver accepted. */
export function computeDemoPhaseAfterAccept(elapsedMs: number): RideStatus {
  if (elapsedMs < POST_ACCEPT_MS.driver_assigned) return 'driver_assigned';
  if (elapsedMs < POST_ACCEPT_MS.driver_arrived) return 'driver_arrived';
  if (elapsedMs < POST_ACCEPT_MS.in_progress) return 'in_progress';
  return 'completed';
}

/** Apply demo time-based progression after accept using the lifecycle helpers (preserves all normalized fields). */
export function applyPostAcceptElapsed(ride: RideSummary, elapsedMs: number): RideSummary {
  const phase = computeDemoPhaseAfterAccept(elapsedMs);
  switch (phase) {
    case 'driver_assigned':
      return toAssignedRide(ride);
    case 'driver_arrived':
      return toArrivedRide(ride);
    case 'in_progress':
      return toInProgressRide(ride);
    case 'completed':
      return toCompletedRide(ride);
    default:
      return cloneRideSummary(ride);
  }
}
