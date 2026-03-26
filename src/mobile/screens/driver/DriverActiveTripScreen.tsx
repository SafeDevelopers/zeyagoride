import { useMemo } from 'react';
import { Navigation, MessageSquare, PhoneCall, ExternalLink } from '../lucideIcons';
import { useMobileApp } from '../../context/MobileAppContext';
import { driverRideService } from '../../services/api';
import { appSettingsService } from '../../services/api/appSettingsService';
import type { LatLng, RideSummary } from '../../types/api';
import {
  driverNavAfterTripStart,
  nonEmptyTripStops,
  toArrivedRide,
  toCompletedRide,
  toInProgressRide,
} from '../../services/rides/rideLifecycle';

function openExternalTurnByTurn(target: LatLng): void {
  const { latitude, longitude } = target;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latitude},${longitude}`)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function navTargetCoords(
  navStep: string | null,
  ride: RideSummary | null,
  tripStops: ReturnType<typeof nonEmptyTripStops>,
  navStopLegIndex: number | null,
): LatLng | null {
  if (!ride || !navStep) return null;
  if (navStep === 'to_pickup') return ride.pickupCoords;
  if (navStep === 'to_destination') return ride.destinationCoords;
  if (navStep === 'to_stop' && navStopLegIndex !== null) {
    const c = tripStops[navStopLegIndex]?.coords;
    return c ?? null;
  }
  return null;
}

export function DriverActiveTripScreen() {
  const {
    setMode,
    setShowRating,
    setRideStatus,
    setShowChat,
    isNavigating,
    setIsNavigating,
    navStep,
    setNavStep,
    navStopLegIndex,
    setNavStopLegIndex,
    currentRide,
    setCurrentRide,
    activeTripId,
    requireRideSafetyPin,
    setRequireRideSafetyPin,
    isPinVerified,
    setEnteredPin,
    setShowPinVerification,
  } = useMobileApp();

  const tripStops = useMemo(() => nonEmptyTripStops(currentRide), [currentRide]);

  const externalNavTarget = useMemo(
    () => navTargetCoords(navStep, currentRide, tripStops, navStopLegIndex),
    [navStep, currentRide, tripStops, navStopLegIndex],
  );

  /** Explicit navigation target for the main sheet (ride-share style), separate from trip-progress CTA. */
  const navigationTargetHint = useMemo(() => {
    if (navStep === 'to_pickup') return 'Navigate to pickup';
    if (navStep === 'to_destination') return 'Navigate to drop-off';
    if (navStep === 'to_stop' && navStopLegIndex !== null) {
      const label = tripStops[navStopLegIndex]?.address?.trim();
      const short = label && label.length > 40 ? `${label.slice(0, 37)}…` : label;
      return short ? `Navigate to stop: ${short}` : `Navigate to stop ${navStopLegIndex + 1}`;
    }
    if (navStep === 'at_pickup') return 'At pickup — start trip when the rider is ready';
    if (navStep === 'at_stop' && navStopLegIndex !== null) {
      if (navStopLegIndex < tripStops.length - 1) return 'At stop — continue to next stop';
      return 'At stop — continue to drop-off';
    }
    return null;
  }, [navStep, navStopLegIndex, tripStops]);

  const stripTitle = useMemo(() => {
    if (navStep === 'to_pickup') return 'Navigate to pickup';
    if (navStep === 'at_pickup') {
      return tripStops.length > 0 ? 'Pickup reached · next stop' : 'Pickup reached · drop-off next';
    }
    if (navStep === 'to_stop' && navStopLegIndex !== null) {
      const label = tripStops[navStopLegIndex]?.address?.trim();
      return label ? `To stop — ${label}` : `Navigate to stop ${navStopLegIndex + 1}`;
    }
    if (navStep === 'at_stop' && navStopLegIndex !== null) {
      const label = tripStops[navStopLegIndex]?.address?.trim();
      return label ? `At stop — ${label}` : `At stop ${navStopLegIndex + 1}`;
    }
    if (navStep === 'to_destination') return 'Navigate to drop-off';
    return 'Trip';
  }, [navStep, navStopLegIndex, tripStops]);

  const primaryLabel =
    navStep === 'to_pickup'
      ? 'Arrive at pickup'
      : navStep === 'at_pickup'
        ? tripStops.length > 0
          ? 'Start trip to next stop'
          : 'Start trip to drop-off'
        : navStep === 'to_stop'
          ? 'Arrive at stop'
          : navStep === 'at_stop'
            ? navStopLegIndex !== null && navStopLegIndex < tripStops.length - 1
              ? 'Continue to next stop'
              : 'Continue to drop-off'
            : navStep === 'to_destination'
              ? 'Complete drop-off'
              : 'Next';

  return (
    <>
      {isNavigating && (
        <>
          <div className="pointer-events-auto absolute left-0 right-0 top-0 z-30 flex items-center justify-between gap-2 bg-velox-primary px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] text-white shadow-md">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Navigation size={18} className="shrink-0 text-sky-300" />
              <span className="min-w-0 truncate text-sm font-bold">{stripTitle}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {externalNavTarget && (
                <button
                  type="button"
                  onClick={() => openExternalTurnByTurn(externalNavTarget)}
                  className="flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1 text-[11px] font-bold text-white transition-colors hover:bg-white/25"
                  aria-label="Open turn-by-turn directions in Google Maps"
                >
                  <ExternalLink size={14} className="shrink-0" />
                  Open Maps
                </button>
              )}
              <span className="text-sm opacity-80">ETA 5 min</span>
            </div>
          </div>

          <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-30 w-full p-4 pt-2">
            <div className="velox-glass-bottom rounded-t-[1.75rem] p-6 shadow-[0_-16px_48px_rgba(45,27,66,0.2)]">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-12 w-12 shrink-0 rounded-full bg-slate-100 p-1">
                    <img
                      src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                      alt="Rider"
                      className="h-full w-full rounded-full"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">Felix M.</p>
                    <p className="text-xs text-slate-500">4.9 Rating</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowChat(true)}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-900"
                  >
                    <MessageSquare size={18} />
                  </button>
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-green-600"
                  >
                    <PhoneCall size={18} />
                  </button>
                </div>
              </div>

              {navigationTargetHint ? (
                <p className="mb-3 text-center text-[13px] font-bold leading-snug text-velox-primary">
                  {navigationTargetHint}
                </p>
              ) : null}

              <button
                type="button"
                onClick={async () => {
                  const syncRide = (r: RideSummary | null) => {
                    if (r) setCurrentRide(r);
                  };
                  try {
                    if (navStep === 'to_pickup') {
                      if (activeTripId) {
                        const res = await driverRideService.tripArrive(activeTripId);
                        syncRide(res.trip.ride);
                      } else if (currentRide) {
                        syncRide(toArrivedRide(currentRide));
                      }
                      setNavStep('at_pickup');
                      setRideStatus('arrived');
                    } else if (navStep === 'at_pickup') {
                      let pinRequired = requireRideSafetyPin;
                      try {
                        const settings = await appSettingsService.getSettings();
                        pinRequired = settings.requireRideSafetyPin;
                        setRequireRideSafetyPin(pinRequired);
                      } catch {
                        /* keep cached safe default */
                      }
                      if (pinRequired && !isPinVerified) {
                        setEnteredPin(['', '', '', '']);
                        setShowPinVerification(true);
                        return;
                      }
                      let nextRide: RideSummary | null = currentRide;
                      if (activeTripId) {
                        const res = await driverRideService.tripStart(activeTripId);
                        syncRide(res.trip.ride);
                        nextRide = res.trip.ride;
                      } else if (currentRide) {
                        nextRide = toInProgressRide(currentRide);
                        syncRide(nextRide);
                      }
                      const next = driverNavAfterTripStart(nextRide);
                      setNavStep(next.step);
                      setNavStopLegIndex(next.stopIndex);
                      setRideStatus('ongoing');
                    } else if (navStep === 'to_stop') {
                      setNavStep('at_stop');
                    } else if (navStep === 'at_stop' && navStopLegIndex !== null) {
                      if (navStopLegIndex < tripStops.length - 1) {
                        setNavStopLegIndex(navStopLegIndex + 1);
                        setNavStep('to_stop');
                      } else {
                        setNavStep('to_destination');
                        setNavStopLegIndex(null);
                      }
                    } else if (navStep === 'to_destination') {
                      if (activeTripId) {
                        const res = await driverRideService.tripComplete(activeTripId, {
                          paymentMethod: 'cash',
                        });
                        syncRide(res.trip.ride);
                      } else if (currentRide) {
                        syncRide(toCompletedRide(currentRide));
                      }
                      setIsNavigating(false);
                      setNavStep(null);
                      setNavStopLegIndex(null);
                      setMode('driver');
                      setRideStatus('completed');
                      setShowRating(true);
                    }
                  } catch {
                    if (navStep === 'to_pickup' && currentRide) {
                      setCurrentRide(toArrivedRide(currentRide));
                      setNavStep('at_pickup');
                      setRideStatus('arrived');
                    } else if (navStep === 'at_pickup' && currentRide) {
                      const nextRide = toInProgressRide(currentRide);
                      setCurrentRide(nextRide);
                      const next = driverNavAfterTripStart(nextRide);
                      setNavStep(next.step);
                      setNavStopLegIndex(next.stopIndex);
                      setRideStatus('ongoing');
                    } else if (navStep === 'to_stop') {
                      setNavStep('at_stop');
                    } else if (navStep === 'at_stop' && navStopLegIndex !== null) {
                      if (navStopLegIndex < tripStops.length - 1) {
                        setNavStopLegIndex(navStopLegIndex + 1);
                        setNavStep('to_stop');
                      } else {
                        setNavStep('to_destination');
                        setNavStopLegIndex(null);
                      }
                    } else if (navStep === 'to_destination' && currentRide) {
                      setCurrentRide(toCompletedRide(currentRide));
                      setIsNavigating(false);
                      setNavStep(null);
                      setNavStopLegIndex(null);
                      setMode('driver');
                      setRideStatus('completed');
                      setShowRating(true);
                    }
                  }
                }}
                className="min-h-12 w-full rounded-xl bg-velox-primary py-3.5 text-sm font-bold text-white shadow-[0_8px_28px_rgba(75,44,109,0.35)]"
              >
                {primaryLabel}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
