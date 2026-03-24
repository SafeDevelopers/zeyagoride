import type {
  AcceptRideResponse,
  DeclineRideResponse,
  DriverIncomingOffer,
  GetRideResponse,
  GetTripResponse,
  ListDriverRequestsResponse,
  RideStatus,
  RideSummary,
  TripSummary,
} from '../../types/api';
import { SIMULATED_INCOMING_REQUEST } from '../../driver/driverService';
import { RIDE_EVENT } from '../../contracts/backendContract';
import { clearRideEventDedupForRide, emitMockRideEvent } from '../rides/rideEvents';
import {
  applyPostAcceptElapsed,
  cloneRideSummary,
  toAssignedRide,
} from '../rides/rideLifecycle';
import { DEMO_AUTO_TRIP_PROGRESS } from '../../config/env';
import { DEMO_AUTO_TRIP_PROGRESS_DELAYS_MS } from '../../constants/demoTripAuto';

const rides = new Map<string, RideSummary>();
/** requestId -> offer row */
const offers = new Map<
  string,
  { requestId: string; rideId: string | null; pickup: string; destination: string; earning: string }
>();
const rideIdToRequestId = new Map<string, string>();
/** When driver accepted (driver-side trip start). */
const rideAcceptedAt = new Map<string, number>();
const trips = new Map<string, { tripId: string; rideId: string; startedAt: number }>();

function applyTimeProgress(ride: RideSummary): RideSummary {
  const id = ride.id;
  const t = rideAcceptedAt.get(id);
  if (!t) return cloneRideSummary(ride);
  return applyPostAcceptElapsed(ride, Date.now() - t);
}

export function mockRegisterRideAfterRequest(ride: RideSummary): void {
  rides.set(ride.id, cloneRideSummary(ride));
  const requestId = `req-${ride.id}`;
  offers.set(requestId, {
    requestId,
    rideId: ride.id,
    pickup: ride.pickup,
    destination: ride.destination,
    earning: 'ETB 180.00',
  });
  rideIdToRequestId.set(ride.id, requestId);
}

export function mockCancelRideById(rideId: string): void {
  const snapshot = rides.get(rideId);
  if (snapshot) {
    emitMockRideEvent({ type: RIDE_EVENT.CANCELLED, rideId, ride: cloneRideSummary(snapshot) });
  }
  clearRideEventDedupForRide(rideId);
  const reqId = rideIdToRequestId.get(rideId);
  if (reqId) {
    offers.delete(reqId);
    rideIdToRequestId.delete(rideId);
  }
  rideAcceptedAt.delete(rideId);
  rides.delete(rideId);
  for (const [tid, tr] of trips) {
    if (tr.rideId === rideId) {
      trips.delete(tid);
    }
  }
}

export function mockGetRide(rideId: string): GetRideResponse | null {
  const base = rides.get(rideId);
  if (!base) return null;
  const progressed = applyTimeProgress(base);
  rides.set(rideId, progressed);
  return { ride: progressed };
}

export function mockListDriverIncomingRequests(): ListDriverRequestsResponse {
  const out: ListDriverRequestsResponse['requests'] = [];
  for (const offer of offers.values()) {
    if (!offer.rideId) {
      out.push({
        id: offer.requestId,
        pickup: offer.pickup,
        destination: offer.destination,
        earning: offer.earning,
      });
      continue;
    }
    const r = rides.get(offer.rideId);
    if (r?.status === 'matching') {
      out.push({
        id: offer.requestId,
        pickup: offer.pickup,
        destination: offer.destination,
        earning: offer.earning,
      });
    }
  }
  return { requests: out };
}

export function mockAcceptRequest(requestId: string): AcceptRideResponse {
  const offer = offers.get(requestId);
  if (!offer) {
    throw new Error('unknown_request');
  }
  const tripId = `trip-${requestId}`;
  const now = new Date().toISOString();

  if (offer.rideId) {
    const r = rides.get(offer.rideId);
    if (!r) throw new Error('missing_ride');
    rideAcceptedAt.set(offer.rideId, Date.now());
    const updated = toAssignedRide(r, { driverId: 'mock-driver-1' });
    rides.set(offer.rideId, updated);
    offers.delete(requestId);
    rideIdToRequestId.delete(offer.rideId);
    trips.set(tripId, { tripId, rideId: offer.rideId, startedAt: Date.now() });
    scheduleMockDemoAutoProgress(tripId);
    return {
      tripId,
      ride: applyTimeProgress(updated),
    };
  }

  // Standalone simulated offer — no rider ride
  const synthetic = toAssignedRide(
    {
      id: requestId,
      riderId: 'mock-rider',
      driverId: null,
      status: 'matching',
      pickup: offer.pickup,
      destination: offer.destination,
      pickupAddress: offer.pickup,
      destinationAddress: offer.destination,
      pickupCoords: null,
      destinationCoords: null,
      stops: [],
      vehicleType: 'economy',
      profileType: 'personal',
      createdAt: now,
      updatedAt: now,
    },
    { driverId: 'mock-driver-1' },
  );
  rides.set(synthetic.id, synthetic);
  rideAcceptedAt.set(synthetic.id, Date.now());
  offers.delete(requestId);
  trips.set(tripId, { tripId, rideId: synthetic.id, startedAt: Date.now() });
  scheduleMockDemoAutoProgress(tripId);
  return { tripId, ride: applyTimeProgress(synthetic) };
}

export function mockDeclineRequest(requestId: string): DeclineRideResponse {
  const offer = offers.get(requestId);
  if (offer?.rideId) {
    const r = rides.get(offer.rideId);
    if (r) {
      rides.set(offer.rideId, {
        ...cloneRideSummary(r),
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      });
    }
    rideIdToRequestId.delete(offer.rideId);
  }
  offers.delete(requestId);
  return { declined: true };
}

/** Timed demo phases for single-window mock API (same `rideId` / `tripId` as real flow). */
function scheduleMockDemoAutoProgress(tripId: string): void {
  if (!DEMO_AUTO_TRIP_PROGRESS) return;
  const { toDriverArrived, toInProgress, toCompleted } = DEMO_AUTO_TRIP_PROGRESS_DELAYS_MS;
  const t1 = toDriverArrived;
  const t2 = t1 + toInProgress;
  const t3 = t2 + toCompleted;
  setTimeout(() => {
    try {
      mockTripAdvance(tripId, 'driver_arrived');
    } catch {
      /* trip gone */
    }
  }, t1);
  setTimeout(() => {
    try {
      mockTripAdvance(tripId, 'in_progress');
    } catch {
      /* trip gone */
    }
  }, t2);
  setTimeout(() => {
    try {
      mockTripAdvance(tripId, 'completed');
    } catch {
      /* trip gone */
    }
  }, t3);
}

/** Stops time-based demo progression and sets an explicit API status (same rideId rider polls). */
export function mockTripAdvance(tripId: string, status: RideStatus): GetTripResponse {
  const tr = trips.get(tripId);
  if (!tr) {
    throw new Error('trip_not_found');
  }
  const ride = rides.get(tr.rideId);
  if (!ride) {
    throw new Error('missing_ride');
  }
  rideAcceptedAt.delete(tr.rideId);
  const updated: RideSummary = {
    ...cloneRideSummary(ride),
    status,
    updatedAt: new Date().toISOString(),
  };
  rides.set(tr.rideId, updated);
  const trip: TripSummary = { tripId, ride: updated };
  return { trip };
}

export function mockGetTrip(tripId: string): GetTripResponse | null {
  const tr = trips.get(tripId);
  if (!tr) return null;
  const ride = rides.get(tr.rideId);
  if (!ride) return null;
  const progressed = applyTimeProgress(ride);
  rides.set(tr.rideId, progressed);
  const trip: TripSummary = { tripId, ride: progressed };
  return { trip: trip };
}

export function mockInjectSimulatedOffer(): DriverIncomingOffer {
  const { id, pickup, destination, earning } = SIMULATED_INCOMING_REQUEST;
  offers.set(id, {
    requestId: id,
    rideId: null,
    pickup,
    destination,
    earning,
  });
  return { id, pickup, destination, earning };
}

export function clearMockRideRegistry(): void {
  rides.clear();
  offers.clear();
  rideIdToRequestId.clear();
  rideAcceptedAt.clear();
  trips.clear();
}
