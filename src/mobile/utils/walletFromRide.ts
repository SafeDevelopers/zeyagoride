import type { RideSummary } from '../types/api';
import type { WalletTransaction } from '../types/mobile';
import { formatDistanceLabel, formatDurationLabel } from '../services/mapbox/routeService';

/** Build a wallet row from a completed ride; copies estimate fields from the ride (no recompute). */
export function buildWalletTransactionFromRide(
  ride: RideSummary,
  driverName: string,
): WalletTransaction {
  const fareAmount = ride.fareEstimate?.amount ?? 120;
  const baseFare = Math.round(fareAmount * 0.3);
  const distanceFare = Math.round(fareAmount * 0.55);
  const tax = Math.max(0, fareAmount - baseFare - distanceFare);
  const distanceLabel =
    ride.distanceMeters != null && ride.distanceMeters > 0
      ? formatDistanceLabel(ride.distanceMeters)
      : '—';
  const durationLabel =
    ride.durationSeconds != null && ride.durationSeconds > 0
      ? formatDurationLabel(ride.durationSeconds)
      : '—';

  return {
    id: Date.now(),
    type: 'ride',
    amount: -fareAmount,
    date: new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
    title: `Ride to ${ride.destination.split(',')[0]?.trim() || 'destination'}`,
    pickup: ride.pickup,
    destination: ride.destination,
    driver: driverName,
    distance: distanceLabel,
    duration: durationLabel,
    baseFare,
    distanceFare,
    tax,
    distanceMeters: ride.distanceMeters,
    durationSeconds: ride.durationSeconds,
    fareEstimate: ride.fareEstimate,
  };
}

/** Prefer normalized meters when present; otherwise legacy string label. */
export function walletTransactionDistanceLabel(t: WalletTransaction): string {
  if (typeof t.distanceMeters === 'number' && t.distanceMeters > 0) {
    return formatDistanceLabel(t.distanceMeters);
  }
  return t.distance ?? '—';
}

/** Prefer normalized seconds when present; otherwise legacy string label. */
export function walletTransactionDurationLabel(t: WalletTransaction): string {
  if (typeof t.durationSeconds === 'number' && t.durationSeconds > 0) {
    return formatDurationLabel(t.durationSeconds);
  }
  return t.duration ?? '—';
}
