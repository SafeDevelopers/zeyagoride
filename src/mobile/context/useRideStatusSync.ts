import { useEffect, useRef } from 'react';
import { useMobileApp } from './MobileAppContext';
import { riderRideService, driverRideService } from '../services/api';
import { clearMockRideRegistry } from '../services/api/mockRideRegistry';
import { useIntervalWhen } from '../hooks/usePolling';
import type { RideSummary } from '../types/api';
import {
  DRIVER_REQUEST_EVENT,
  emitMockDriverRequestEvent,
  publishRideSnapshotTransition,
} from '../services/rides/rideEvents';
import { mapApiRideStatusToUi, maxRiderUiPhase } from '../utils/rideUiPhase';

const RIDER_POLL_MS = 2500;
const DRIVER_LIST_POLL_MS = 2800;
const DRIVER_TRIP_POLL_MS = 3000;

/**
 * Centralized ride/trip polling and auth-step cleanup (no UI layout changes).
 */
export function useRideStatusSync(): void {
  const {
    mode,
    step,
    currentRide,
    setCurrentRide,
    rideStatus,
    setRideStatus,
    setIncomingRequest,
    isOnline,
    isNavigating,
    activeTripId,
    setActiveTripId,
    setIsNavigating,
    setNavStep,
    setNavStopLegIndex,
  } = useMobileApp();

  const rideIdRef = useRef<string | undefined>(undefined);
  rideIdRef.current = currentRide?.id;

  const rideStatusRef = useRef(rideStatus);
  rideStatusRef.current = rideStatus;

  const lastPolledRideRef = useRef<RideSummary | null>(null);
  const lastDriverIncomingRequestIdRef = useRef<string | undefined>(undefined);

  const riderPollEnabled =
    mode === 'rider' &&
    step === 'home' &&
    !!currentRide?.id &&
    rideStatus !== 'idle' &&
    rideStatus !== 'completed';

  useEffect(() => {
    if (step !== 'welcome') return;
    clearMockRideRegistry();
    lastPolledRideRef.current = null;
    lastDriverIncomingRequestIdRef.current = undefined;
    setCurrentRide(null);
    setRideStatus('idle');
    setIncomingRequest(null);
    setActiveTripId(null);
    setIsNavigating(false);
    setNavStep('to_pickup');
    setNavStopLegIndex(null);
  }, [
    step,
    setCurrentRide,
    setRideStatus,
    setIncomingRequest,
    setActiveTripId,
    setIsNavigating,
    setNavStep,
    setNavStopLegIndex,
  ]);

  useIntervalWhen(
    async () => {
      const id = rideIdRef.current;
      if (!id) return;
      try {
        const { ride } = await riderRideService.getRide(id);
        const prevSnap = lastPolledRideRef.current;
        const prevForTransition =
          prevSnap && prevSnap.id === ride.id ? prevSnap : null;
        publishRideSnapshotTransition(prevForTransition, ride);
        if (ride.status === 'cancelled') {
          lastPolledRideRef.current = null;
          setCurrentRide(null);
          setRideStatus('idle');
          return;
        }
        lastPolledRideRef.current = ride;
        setCurrentRide(ride);
        const mapped = mapApiRideStatusToUi(ride.status);
        setRideStatus((prev) => maxRiderUiPhase(prev, mapped));
      } catch {
        // Avoid snapping back to vehicle selection: real API may 404 briefly before the ride is
        // queryable; transient errors should not reset an active trip. Keep UI until a successful poll.
        const phase = rideStatusRef.current;
        if (
          rideIdRef.current &&
          phase !== 'idle' &&
          phase !== 'completed'
        ) {
          return;
        }
        lastPolledRideRef.current = null;
        setCurrentRide(null);
        setRideStatus('idle');
      }
    },
    RIDER_POLL_MS,
    riderPollEnabled,
  );

  const driverListPollEnabled =
    mode === 'driver' && step === 'home' && isOnline && !isNavigating;

  useIntervalWhen(
    async () => {
      const { requests } = await driverRideService.listIncomingRequests();
      const first = requests[0];
      const prevReqId = lastDriverIncomingRequestIdRef.current;
      if (first) {
        if (first.id !== prevReqId) {
          if (prevReqId) {
            emitMockDriverRequestEvent({
              type: DRIVER_REQUEST_EVENT.EXPIRED,
              requestId: prevReqId,
            });
          }
          emitMockDriverRequestEvent({
            type: DRIVER_REQUEST_EVENT.INCOMING,
            requestId: first.id,
            pickup: first.pickup,
            destination: first.destination,
            earning: first.earning,
          });
          lastDriverIncomingRequestIdRef.current = first.id;
        }
      } else if (prevReqId) {
        emitMockDriverRequestEvent({
          type: DRIVER_REQUEST_EVENT.EXPIRED,
          requestId: prevReqId,
        });
        lastDriverIncomingRequestIdRef.current = undefined;
      }
      setIncomingRequest((prev) => {
        if (!first) return null;
        if (prev?.id === first.id) return prev;
        return {
          id: first.id,
          pickup: first.pickup,
          destination: first.destination,
          earning: first.earning,
        };
      });
    },
    DRIVER_LIST_POLL_MS,
    driverListPollEnabled,
  );

  const driverTripPollEnabled = mode === 'driver' && !!activeTripId && isNavigating;

  useIntervalWhen(
    async () => {
      if (!activeTripId) return;
      try {
        const tripRes = await driverRideService.getTrip(activeTripId);
        setCurrentRide(tripRes.trip.ride);
      } catch {
        /* trip may end server-side later */
      }
    },
    DRIVER_TRIP_POLL_MS,
    driverTripPollEnabled,
  );
}
