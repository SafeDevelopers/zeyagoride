import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ChevronRight,
  User,
  Car,
  Briefcase,
  Calendar,
  Users,
  Settings2,
  Zap,
  ChevronLeft,
  Plus,
  X,
} from '../lucideIcons';
import { PlaceSuggestions } from '../../components/maps/PlaceSuggestions';
import { useMobileApp } from '../../context/MobileAppContext';
import { isLiveGeocodingEnabled, resolvePlace } from '../../services/mapbox/geocodingService';
import type { PlaceSuggestion } from '../../types/places';
import type { LatLng } from '../../types/api';
import { riderRideService } from '../../services/api';
import { buildRequestRideRequest } from '../../services/api/adapters';
import {
  calculateFareEstimate,
  formatDistanceLabel,
  formatDurationLabel,
  getRouteEstimate,
} from '../../services/mapbox/routeService';
import type { FareEstimate, RouteEstimate } from '../../types/route';
import { isValidStopAddressString, toAssignedRide } from '../../services/rides/rideLifecycle';
import { IS_DEV_UI } from '../../utils/devUi';

const RIDER_REQUEST_DEBUG = import.meta.env.DEV;

export function RiderRequestScreen() {
  const {
    t,
    pickup,
    destination,
    destinationCommitted,
    setDestination,
    setDestinationCoords,
    setDestinationPlaceId,
    setDestinationCommitted,
    pickupCoords,
    setPickupCoords,
    setPickupPlaceId,
    destinationCoords,
    stops,
    setStops,
    stopCoords,
    stopPlaceIds,
    profileType,
    currentRide,
    setCurrentRide,
    rideStatus,
    setRideStatus,
    selectedVehicle,
    setSelectedVehicle,
    setShowScheduleRide,
    setShowRidePreferences,
    setShowZeyagoPass,
    ridePreferences,
    hasZeyagoPass,
    setProfileType,
    setShowBusinessSetup,
    businessEmail,
    vehicleTypes,
    setStopCoords,
    setStopPlaceIds,
    activePromo,
  } = useMobileApp();

  const rideStops = useMemo(
    () =>
      stops
        .map((address, i) => ({ address, coords: stopCoords[i] ?? null }))
        .filter((s) => isValidStopAddressString(s.address)),
    [stops, stopCoords],
  );

  const [routeEstimate, setRouteEstimate] = useState<RouteEstimate | null>(null);
  const [fareEstimate, setFareEstimate] = useState<FareEstimate | null>(null);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const requestSubmittingRef = useRef(false);
  /** Tracks primary pointer that pressed the Request Ride CTA (lost-click fallback via pointerup). */
  const requestRideCtaPointerIdRef = useRef<number | null>(null);
  const [stopSuggestionsIndex, setStopSuggestionsIndex] = useState<number | null>(null);
  const stopInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const stopTimerRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const blurStopTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const liveGeo = isLiveGeocodingEnabled();
  const currentRideId = currentRide?.id ?? null;
  const currentRideApiStatus = currentRide?.status ?? null;
  const hasSearchingRide =
    rideStatus === 'searching' ||
    currentRideApiStatus === 'pending' ||
    currentRideApiStatus === 'matching';
  const hasUnresolvedCurrentRide =
    currentRide != null &&
    currentRideApiStatus !== 'cancelled' &&
    rideStatus !== 'completed' &&
    rideStatus !== 'found' &&
    rideStatus !== 'arrived' &&
    rideStatus !== 'ongoing';
  const searchingViewVisible = hasSearchingRide || hasUnresolvedCurrentRide;
  const showVehicleSelectionSheet =
    Boolean(destination) &&
    destinationCommitted &&
    rideStatus === 'idle' &&
    !searchingViewVisible &&
    currentRide == null;

  useEffect(() => {
    if (!RIDER_REQUEST_DEBUG) return;
    console.log('[RiderRequestScreen] ride visibility', {
      rideStatus,
      currentRideId,
      currentRideApiStatus,
      destinationCommitted,
      destination: destination.trim(),
      hasSearchingRide,
      hasUnresolvedCurrentRide,
      searchingViewVisible,
      showVehicleSelectionSheet,
    });
  }, [
    rideStatus,
    currentRideId,
    currentRideApiStatus,
    destinationCommitted,
    destination,
    hasSearchingRide,
    hasUnresolvedCurrentRide,
    searchingViewVisible,
    showVehicleSelectionSheet,
  ]);

  const previousViewRef = useRef<{ searchingViewVisible: boolean; showVehicleSelectionSheet: boolean } | null>(
    null,
  );

  useEffect(() => {
    if (!RIDER_REQUEST_DEBUG) return;
    const prev = previousViewRef.current;
    if (prev?.searchingViewVisible && !searchingViewVisible && showVehicleSelectionSheet) {
      console.log('[RiderRequestScreen] searching -> request-sheet transition', {
        rideStatus,
        currentRideId,
        currentRideApiStatus,
        destinationCommitted,
        destination: destination.trim(),
        hasSearchingRide,
        hasUnresolvedCurrentRide,
        searchingViewVisible,
        showVehicleSelectionSheet,
      });
    }
    previousViewRef.current = { searchingViewVisible, showVehicleSelectionSheet };
  }, [
    rideStatus,
    currentRideId,
    currentRideApiStatus,
    destinationCommitted,
    destination,
    hasSearchingRide,
    hasUnresolvedCurrentRide,
    searchingViewVisible,
    showVehicleSelectionSheet,
  ]);

  const cancelStopBlurTimer = (index: number) => {
    const t = blurStopTimers.current.get(index);
    if (t) {
      clearTimeout(t);
      blurStopTimers.current.delete(index);
    }
  };

  const scheduleStopBlurClose = (index: number) => {
    cancelStopBlurTimer(index);
    blurStopTimers.current.set(
      index,
      setTimeout(() => {
        setStopSuggestionsIndex((cur) => (cur === index ? null : cur));
      }, 180),
    );
  };

  const applyStopSuggestion = (index: number, s: PlaceSuggestion, newStops: string[]) => {
    newStops[index] = s.address;
    setStops(newStops);
    setStopCoords((prev) => {
      const base = prev.length >= newStops.length ? prev : [...prev];
      while (base.length < newStops.length) base.push(null);
      base[index] = s.coords;
      return base.slice(0, newStops.length);
    });
    setStopPlaceIds((prev) => {
      const base = prev.length >= newStops.length ? prev : [...prev];
      while (base.length < newStops.length) base.push(null);
      base[index] = s.placeId;
      return base.slice(0, newStops.length);
    });
  };

  const scheduleStopResolve = (index: number, value: string, newStops: string[]) => {
    if (!value.trim()) {
      setStopCoords((prev) => {
        const base = prev.length >= newStops.length ? prev : [...prev];
        while (base.length < newStops.length) base.push(null);
        base[index] = null;
        return base.slice(0, newStops.length);
      });
      setStopPlaceIds((prev) => {
        const base = prev.length >= newStops.length ? prev : [...prev];
        while (base.length < newStops.length) base.push(null);
        base[index] = null;
        return base.slice(0, newStops.length);
      });
      return;
    }
    const run = () => {
      void resolvePlace(value).then((r) => {
        setStopCoords((prev) => {
          const base = prev.length >= newStops.length ? prev : [...prev];
          while (base.length < newStops.length) base.push(null);
          base[index] = r?.coords ?? null;
          return base.slice(0, newStops.length);
        });
        setStopPlaceIds((prev) => {
          const base = prev.length >= newStops.length ? prev : [...prev];
          while (base.length < newStops.length) base.push(null);
          base[index] = r?.placeId ?? null;
          return base.slice(0, newStops.length);
        });
      });
    };
    if (liveGeo) {
      const prev = stopTimerRef.current.get(index);
      if (prev) clearTimeout(prev);
      stopTimerRef.current.set(index, setTimeout(run, 350));
    } else {
      run();
    }
  };

  const removeStopAt = (index: number) => {
    cancelStopBlurTimer(index);
    setStops((prev) => prev.filter((_, j) => j !== index));
    setStopCoords((prev) => prev.filter((_, j) => j !== index));
    setStopPlaceIds((prev) => prev.filter((_, j) => j !== index));
    setStopSuggestionsIndex((cur) => {
      if (cur === null) return null;
      if (cur === index) return null;
      if (cur > index) return cur - 1;
      return cur;
    });
  };

  useEffect(() => {
    let cancelled = false;
    void getRouteEstimate({
      pickupCoords,
      destinationCoords,
      stops: rideStops,
      vehicleType: selectedVehicle,
    }).then((re) => {
      if (cancelled) return;
      setRouteEstimate(re);
      void calculateFareEstimate(re, selectedVehicle).then(setFareEstimate);
    });
    return () => {
      cancelled = true;
    };
  }, [pickupCoords, destinationCoords, rideStops, selectedVehicle]);

  const submitRequestRide = useCallback(async () => {
    if (RIDER_REQUEST_DEBUG) {
      console.log('[RiderRequestScreen] submitRequestRide() first line', {
        requestSubmittingRef: requestSubmittingRef.current,
        selectedVehicle,
        destinationCommitted,
        destination: destination.trim(),
        pickup: pickup.trim(),
        stops,
      });
    }
    if (requestSubmittingRef.current) {
      if (RIDER_REQUEST_DEBUG) {
        console.log('[RiderRequestScreen] submit early return: requestSubmittingRef already true');
      }
      return;
    }
    // Lock immediately so a second tap in the same gesture / strict re-entry cannot start a parallel submit.
    requestSubmittingRef.current = true;
    setRequestSubmitting(true);
    blurStopTimers.current.forEach((t) => clearTimeout(t));
    blurStopTimers.current.clear();
    setStopSuggestionsIndex(null);
    let submitStage:
      | 'start'
      | 'validation'
      | 'resolve_destination'
      | 'resolve_pickup'
      | 'resolve_stops'
      | 'route_estimate'
      | 'payload_build'
      | 'request_ride'
      | 'request_ride_success'
      | 'set_current_ride' = 'start';
    try {
      submitStage = 'validation';
      if (!selectedVehicle) {
        if (RIDER_REQUEST_DEBUG) {
          console.log('[RiderRequestScreen] submit early return: missing selected vehicle');
        }
        return;
      }
      if (!destination.trim()) {
        if (RIDER_REQUEST_DEBUG) {
          console.log('[RiderRequestScreen] submit early return: missing destination');
        }
        return;
      }
      if (!destinationCommitted) {
        if (RIDER_REQUEST_DEBUG) {
          console.log('[RiderRequestScreen] submit early return: destination not committed');
        }
        return;
      }
      const validation = {
        hasDestination: Boolean(destination.trim()),
        destinationCommitted,
        hasSelectedVehicle: Boolean(selectedVehicle),
      };
      if (RIDER_REQUEST_DEBUG) {
        console.log('[RiderRequestScreen] submit validation result', validation);
      }
      // Fresh resolve + route snapshot on submit (coords may still be catching up after blur/debounce).
      let pickupResolved: LatLng | null = pickupCoords;
      let destinationResolved: LatLng | null = destinationCoords;
      const stopResolved: (LatLng | null)[] = stops.map((_, i) => stopCoords[i] ?? null);

      if (destination.trim() && !destinationResolved) {
        submitStage = 'resolve_destination';
        try {
          const r = await resolvePlace(destination.trim());
          destinationResolved = r?.coords ?? null;
          if (r?.coords) setDestinationCoords(r.coords);
          if (r?.placeId) setDestinationPlaceId(r.placeId);
          if (RIDER_REQUEST_DEBUG) {
            console.log('[RiderRequestScreen] destination resolve result', {
              resolved: Boolean(r),
              destinationResolved,
              placeId: r?.placeId ?? null,
            });
          }
        } catch (error) {
          if (RIDER_REQUEST_DEBUG) {
            console.log('[RiderRequestScreen] destination resolve failed; continuing submit', {
              error,
              destination: destination.trim(),
            });
          }
        }
      }
      if (pickup.trim() && !pickupResolved) {
        submitStage = 'resolve_pickup';
        try {
          const r = await resolvePlace(pickup.trim());
          pickupResolved = r?.coords ?? null;
          if (r?.coords) setPickupCoords(r.coords);
          if (r?.placeId) setPickupPlaceId(r.placeId);
          if (RIDER_REQUEST_DEBUG) {
            console.log('[RiderRequestScreen] pickup resolve result', {
              resolved: Boolean(r),
              pickupResolved,
              placeId: r?.placeId ?? null,
            });
          }
        } catch (error) {
          if (RIDER_REQUEST_DEBUG) {
            console.log('[RiderRequestScreen] pickup resolve failed; continuing submit', {
              error,
              pickup: pickup.trim(),
            });
          }
        }
      }
      submitStage = 'resolve_stops';
      let stopCoordsDirty = false;
      const nextStopPlaceIds = stops.map((_, i) => stopPlaceIds[i] ?? null);
      let stopPlaceIdsDirty = false;
      for (let i = 0; i < stops.length; i++) {
        if (!isValidStopAddressString(stops[i])) continue;
        if (stopResolved[i]) continue;
        try {
          const r = await resolvePlace(stops[i].trim());
          stopResolved[i] = r?.coords ?? null;
          if (r?.coords) stopCoordsDirty = true;
          if (r?.placeId && r.placeId !== (stopPlaceIds[i] ?? null)) {
            nextStopPlaceIds[i] = r.placeId;
            stopPlaceIdsDirty = true;
          }
          if (RIDER_REQUEST_DEBUG) {
            console.log('[RiderRequestScreen] stop resolve result', {
              index: i,
              stop: stops[i].trim(),
              resolved: Boolean(r),
              coords: r?.coords ?? null,
              placeId: r?.placeId ?? null,
            });
          }
        } catch (error) {
          if (RIDER_REQUEST_DEBUG) {
            console.log('[RiderRequestScreen] stop resolve failed; continuing submit', {
              index: i,
              stop: stops[i].trim(),
              error,
            });
          }
        }
      }
      if (stopCoordsDirty) {
        setStopCoords(stops.map((_, i) => stopResolved[i] ?? null));
      }
      if (stopPlaceIdsDirty) {
        setStopPlaceIds(nextStopPlaceIds);
      }

      const rideStops = stops
        .map((address, i) => ({ address, coords: stopResolved[i] ?? null }))
        .filter((s) => isValidStopAddressString(s.address));
      const invalidStop = rideStops.find((s) => s.coords == null);
      if (invalidStop) {
        if (RIDER_REQUEST_DEBUG) {
          console.log('[RiderRequestScreen] submit early return: invalid stop data', {
            address: invalidStop.address,
          });
        }
        return;
      }

      submitStage = 'route_estimate';
      const re = await getRouteEstimate({
        pickupCoords: pickupResolved,
        destinationCoords: destinationResolved,
        stops: rideStops,
        vehicleType: selectedVehicle,
      });
      const fe = await calculateFareEstimate(re, selectedVehicle);
      const estimate =
        re.distanceMeters > 0 && fe
          ? {
              distanceMeters: re.distanceMeters,
              durationSeconds: re.durationSeconds,
              fareEstimate: fe,
              promoCode: activePromo?.code,
            }
          : undefined;

      submitStage = 'payload_build';
      const requestPayload = buildRequestRideRequest(
        pickup,
        destination,
        stops,
        selectedVehicle,
        profileType,
        undefined,
        undefined,
        {
          pickupCoords: pickupResolved,
          destinationCoords: destinationResolved,
          stopCoords: stopResolved,
        },
        estimate,
      );
      if (RIDER_REQUEST_DEBUG) {
        console.log('[RiderRequestScreen] payload built', {
          requestPayload,
        });
        console.log('[RiderRequestScreen] before requestRide()', {
          pickup: requestPayload.pickup,
          destination: requestPayload.destination,
          stops: requestPayload.stops,
          vehicleType: requestPayload.vehicleType,
          profileType: requestPayload.profileType,
          pickupCoords: requestPayload.pickupCoords,
          destinationCoords: requestPayload.destinationCoords,
        });
      }
      submitStage = 'request_ride';
      const { ride } = await riderRideService.requestRide(requestPayload);
      if (RIDER_REQUEST_DEBUG) {
        console.log('[RiderRequestScreen] after requestRide() resolves', {
          rideId: ride.id,
          rideStatus: ride.status,
        });
      }
      submitStage = 'request_ride_success';
      setCurrentRide(ride);
      submitStage = 'set_current_ride';
      if (RIDER_REQUEST_DEBUG) {
        console.log('[RiderRequestScreen] setCurrentRide()', {
          rideId: ride.id,
          rideStatus: ride.status,
        });
      }
      setRideStatus('searching');
    } catch (error) {
      if (RIDER_REQUEST_DEBUG) {
        console.log('[RiderRequestScreen] submitRequestRide catch', {
          submitStage,
          error,
        });
      }
      // Keep rider on vehicle sheet so first tap can retry; transient network/API errors should not feel like a "bounce".
    } finally {
      if (RIDER_REQUEST_DEBUG) {
        console.log('[RiderRequestScreen] submitRequestRide finally');
      }
      requestSubmittingRef.current = false;
      setRequestSubmitting(false);
    }
  }, [
    pickup,
    destination,
    destinationCommitted,
    stops,
    selectedVehicle,
    profileType,
    pickupCoords,
    destinationCoords,
    stopCoords,
    stopPlaceIds,
    setCurrentRide,
    setRideStatus,
    setDestinationCoords,
    setDestinationPlaceId,
    setPickupCoords,
    setPickupPlaceId,
    setStopCoords,
    setStopPlaceIds,
  ]);

  return (
    <>
      {/* Vehicle selection — full-sheet layout (Velox ride-search): trip summary / scroll list / fixed CTA */}
      {showVehicleSelectionSheet && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', damping: 32, stiffness: 380 }}
          className="relative z-[1] grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-t-[1.75rem] bg-white/98 shadow-[0_-20px_60px_rgba(45,27,66,0.2)] backdrop-blur-xl"
        >
          <div className="min-h-0 shrink-0 border-b border-slate-100 px-4 pb-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setDestination('');
                setDestinationCoords(null);
                setDestinationPlaceId(null);
                setDestinationCommitted(false);
              }}
              className="mb-2 flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100"
              aria-label="Back"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                <span className="min-w-0 text-xs font-medium leading-snug text-slate-800">
                  {pickup.trim() || 'Current Location'}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-velox-primary/30 bg-slate-50/80 px-3 py-2.5">
                <div className="h-1.5 w-1.5 shrink-0 rounded-sm bg-red-500" />
                <span className="min-w-0 text-xs font-bold leading-snug text-slate-900">{destination}</span>
              </div>
              {stops.map((stop, i) => (
                <div
                  key={`stop-${i}`}
                  className="flex items-center gap-2 rounded-xl bg-amber-50/90 px-2.5 py-2 ring-1 ring-amber-200/60"
                >
                  <div className="h-1.5 w-1.5 shrink-0 self-center rounded-full bg-amber-500" />
                  <div className="relative min-w-0 flex-1">
                    <input
                      ref={(el) => {
                        stopInputRefs.current[i] = el;
                      }}
                      placeholder={`Stop ${i + 1}`}
                      className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400"
                      value={stop}
                      autoComplete="off"
                      onFocus={() => {
                        cancelStopBlurTimer(i);
                        setStopSuggestionsIndex(i);
                      }}
                      onBlur={() => scheduleStopBlurClose(i)}
                      onChange={(e) => {
                        const v = e.target.value;
                        const newStops = [...stops];
                        newStops[i] = v;
                        setStops(newStops);
                        scheduleStopResolve(i, v, newStops);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setStopSuggestionsIndex(null);
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                    />
                    <PlaceSuggestions
                      query={stop}
                      open={stopSuggestionsIndex === i}
                      onSelect={(s) => {
                        cancelStopBlurTimer(i);
                        const next = [...stops];
                        applyStopSuggestion(i, s, next);
                        setStopSuggestionsIndex(null);
                      }}
                      onDismiss={() => setStopSuggestionsIndex(null)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStopAt(i)}
                    className="shrink-0 rounded-full p-1 text-slate-400 transition-colors hover:bg-amber-100 hover:text-slate-600"
                    aria-label={`Remove stop ${i + 1}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {stops.length < 2 && (
                <button
                  type="button"
                  onClick={() => {
                    if (stops.length >= 2) return;
                    const idx = stops.length;
                    setStops((prev) => [...prev, '']);
                    window.setTimeout(() => {
                      stopInputRefs.current[idx]?.focus();
                      setStopSuggestionsIndex(idx);
                    }, 0);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-white py-2 text-[11px] font-bold text-slate-500 transition-colors hover:border-velox-primary/35 hover:text-velox-primary"
                >
                  <Plus size={14} className="shrink-0" />
                  Add stop
                </button>
              )}
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 py-3">
            <div className="mb-3 flex min-w-0 shrink-0 flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
              <h3 className="shrink-0 text-base font-bold text-slate-900">Choose a ride</h3>
              {routeEstimate && routeEstimate.distanceMeters > 0 && fareEstimate && (
                <p className="min-w-0 text-left text-[11px] leading-snug text-slate-500 sm:max-w-[55%] sm:text-right">
                  <span className="font-medium text-slate-600">
                    {formatDistanceLabel(routeEstimate.distanceMeters)}
                  </span>
                  <span className="mx-1">·</span>
                  <span className="font-medium text-slate-600">
                    {formatDurationLabel(routeEstimate.durationSeconds)}
                  </span>
                  <span className="mx-1">·</span>
                  <span className="font-semibold text-velox-dark">{fareEstimate.formatted} est.</span>
                </p>
              )}
            </div>

            {!hasZeyagoPass && (
              <button
                type="button"
                onClick={() => setShowZeyagoPass(true)}
                className="mb-2.5 flex w-full shrink-0 items-center justify-between rounded-xl bg-velox-primary p-2.5 text-white shadow-lg shadow-[0_8px_24px_rgba(75,44,109,0.18)]"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
                    <Zap size={18} />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-bold leading-tight">Get Zeyago Pass</p>
                    <p className="text-[9px] leading-tight opacity-80">Avoid surge pricing in Bole & Piazza</p>
                  </div>
                </div>
                <ChevronRight size={18} className="shrink-0" />
              </button>
            )}

            <p className="mb-1.5 shrink-0 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
              Available rides
            </p>
            {/* ~3 ride rows visible before scroll on typical phone heights */}
            <div
              className="h-[min(14rem,36vh)] w-full min-h-0 shrink-0 overflow-y-auto overflow-x-hidden overscroll-y-contain rounded-xl border border-slate-100/90 bg-slate-50/50 py-1.5 touch-pan-y [scrollbar-gutter:stable]"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="space-y-2 px-1.5 pb-1.5 pt-0.5">
                {vehicleTypes.map((v) => (
                  <button
                    type="button"
                    key={v.id}
                    onClick={() => setSelectedVehicle(v.id as any)}
                    className={`flex w-full items-center justify-between rounded-xl border-2 px-3 py-2 text-left transition-all ${
                      selectedVehicle === v.id
                        ? 'border-velox-primary bg-velox-primary/10 shadow-sm'
                        : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100 shadow-sm">
                        <img src={v.image} alt={v.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold leading-tight text-slate-900">{v.name}</p>
                        <div className="flex items-center gap-2 text-[9px] text-slate-500">
                          <div className="flex items-center gap-1">
                            <Users size={10} />
                            <span>{v.capacity}</span>
                          </div>
                          <span>•</span>
                          <span>{v.time} away</span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-velox-primary">{v.price}</p>
                      <p className="text-[8px] font-bold uppercase tracking-tighter text-slate-400">Est.</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowRidePreferences(true)}
              className="mb-3 mt-2 flex w-full shrink-0 items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-2.5"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-velox-primary shadow-sm">
                  <Settings2 size={14} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[11px] font-bold text-slate-900">Personalize My Ride</p>
                  <p className="text-[9px] text-slate-500">
                    {Object.values(ridePreferences).some((v) => v)
                      ? 'Preferences set'
                      : 'Quiet ride, AC, Luggage...'}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>

            <div className="mb-1 flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setProfileType('personal')}
                className={`flex-1 rounded-xl border py-2.5 transition-all ${
                  profileType === 'personal'
                    ? 'border-velox-primary bg-velox-primary/10 text-velox-primary'
                    : 'border-slate-100 bg-white text-slate-500'
                }`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <User size={16} />
                  <span className="text-[9px] font-bold uppercase tracking-widest">{t('personal')}</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!businessEmail) {
                    setShowBusinessSetup(true);
                  } else {
                    setProfileType('business');
                  }
                }}
                className={`flex-1 rounded-xl border py-2.5 transition-all ${
                  profileType === 'business'
                    ? 'border-velox-primary bg-velox-primary/10 text-velox-primary'
                    : 'border-slate-100 bg-white text-slate-500'
                }`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <Briefcase size={16} />
                  <span className="text-[9px] font-bold uppercase tracking-widest">{t('business')}</span>
                </div>
              </button>
            </div>
          </div>

          <div
            className="relative z-[5] min-h-0 shrink-0 border-t border-velox-primary/15 bg-white pt-3 shadow-[0_-6px_20px_rgba(45,27,66,0.1)] backdrop-blur-md"
            style={{
              paddingLeft: 'max(1.25rem, env(safe-area-inset-left, 0px))',
              paddingRight: 'max(1.25rem, env(safe-area-inset-right, 0px))',
              paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div className="mx-auto flex w-full max-w-lg min-w-0 items-stretch justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowScheduleRide(true)}
                className="flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 shadow-sm ring-1 ring-slate-200/80 transition-transform active:scale-[0.98]"
              >
                <Calendar size={22} strokeWidth={2} />
              </button>
              <button
                type="button"
                disabled={requestSubmitting}
                onPointerDownCapture={(e) => {
                  if (RIDER_REQUEST_DEBUG) {
                    console.log('[RiderRequestScreen] Request Ride CTA onPointerDownCapture', {
                      pointerType: e.pointerType,
                      button: e.button,
                      pointerId: e.pointerId,
                    });
                  }
                }}
                onPointerDown={(e) => {
                  if (RIDER_REQUEST_DEBUG) {
                    console.log('[RiderRequestScreen] Request Ride CTA onPointerDown', {
                      pointerType: e.pointerType,
                      button: e.button,
                      pointerId: e.pointerId,
                    });
                  }
                  if (requestSubmitting) return;
                  if (e.pointerType === 'mouse' && e.button !== 0) return;
                  requestRideCtaPointerIdRef.current = e.pointerId;
                  // Defer blur: sync blur during capture caused lost synthetic clicks on some WebKit/touch stacks.
                  queueMicrotask(() => {
                    const a = document.activeElement;
                    if (a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement) {
                      a.blur();
                    }
                  });
                }}
                onPointerUp={(e) => {
                  if (RIDER_REQUEST_DEBUG) {
                    console.log('[RiderRequestScreen] Request Ride CTA onPointerUp', {
                      pointerType: e.pointerType,
                      button: e.button,
                      pointerId: e.pointerId,
                      matchesTracked:
                        requestRideCtaPointerIdRef.current != null &&
                        requestRideCtaPointerIdRef.current === e.pointerId,
                    });
                  }
                  if (requestSubmitting) return;
                  if (requestRideCtaPointerIdRef.current !== e.pointerId) return;
                  requestRideCtaPointerIdRef.current = null;
                  if (e.pointerType === 'mouse' && e.button !== 0) return;
                  void submitRequestRide();
                }}
                onPointerCancel={(e) => {
                  if (RIDER_REQUEST_DEBUG) {
                    console.log('[RiderRequestScreen] Request Ride CTA onPointerCancel', {
                      pointerId: e.pointerId,
                    });
                  }
                  if (requestRideCtaPointerIdRef.current === e.pointerId) {
                    requestRideCtaPointerIdRef.current = null;
                  }
                }}
                onMouseDown={(e) => {
                  if (RIDER_REQUEST_DEBUG) {
                    console.log('[RiderRequestScreen] Request Ride CTA onMouseDown', {
                      button: e.button,
                    });
                  }
                }}
                onTouchStart={(e) => {
                  if (RIDER_REQUEST_DEBUG) {
                    console.log('[RiderRequestScreen] Request Ride CTA onTouchStart', {
                      touches: e.touches.length,
                    });
                  }
                }}
                onTouchEnd={(e) => {
                  if (RIDER_REQUEST_DEBUG) {
                    console.log('[RiderRequestScreen] Request Ride CTA onTouchEnd', {
                      touches: e.touches.length,
                      changedTouches: e.changedTouches.length,
                    });
                  }
                }}
                onClick={() => {
                  if (RIDER_REQUEST_DEBUG) {
                    console.log('[RiderRequestScreen] Request Ride CTA onClick', {
                      destination: destination.trim(),
                      destinationCommitted,
                      rideStatus,
                      currentRideId,
                    });
                  }
                  void submitRequestRide();
                }}
                aria-busy={requestSubmitting}
                className="flex min-h-[3.25rem] min-w-0 flex-1 touch-manipulation items-center justify-center rounded-2xl bg-velox-primary px-4 py-3 text-sm font-semibold leading-tight text-white shadow-[0_8px_24px_rgba(75,44,109,0.35)] ring-1 ring-velox-primary/35 transition-[transform,box-shadow] enabled:active:scale-[0.99] disabled:opacity-70"
              >
                {t('requestRide')}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {searchingViewVisible && (
        <div className="relative z-[2] flex w-full min-w-0 shrink-0 flex-col bg-white">
          <div className="velox-safe-x flex shrink-0 flex-col items-center px-5 pb-2 pt-5 text-center">
            <div className="relative mb-4 flex items-center justify-center">
              <div className="velox-pulse-ring" aria-hidden />
              <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-velox-primary text-white shadow-[0_8px_24px_rgba(75,44,109,0.35)] ring-4 ring-velox-primary/15">
                <Car size={24} strokeWidth={2.25} />
              </div>
            </div>
            <h3 className="text-lg font-bold tracking-tight text-slate-900">Finding your ride…</h3>
            <p className="mt-1 max-w-[17rem] text-[13px] leading-snug text-slate-500">
              Connecting you to the nearest driver in Addis Ababa.
            </p>
            {IS_DEV_UI && (
              <div className="mt-3 w-full max-w-sm rounded-xl border border-dashed border-slate-200/90 bg-slate-50/90 px-3 py-2.5">
                <p className="mb-1.5 text-center text-[8px] font-semibold uppercase tracking-wider text-slate-400">
                  Developer
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (currentRide) {
                      setCurrentRide(toAssignedRide(currentRide));
                    }
                    setRideStatus('found');
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                >
                  Simulate driver found
                </button>
              </div>
            )}
          </div>
          <div className="shrink-0 border-t border-slate-100 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-3">
            <button
              type="button"
              onClick={async () => {
                if (currentRide) {
                  await riderRideService.cancelRide({ rideId: currentRide.id });
                }
                setCurrentRide(null);
                setRideStatus('idle');
              }}
              className="flex min-h-[3rem] w-full items-center justify-center rounded-2xl border-2 border-slate-200 bg-white py-3 text-sm font-bold text-slate-800 shadow-sm transition-[transform,box-shadow] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]"
            >
              Cancel request
            </button>
          </div>
        </div>
      )}
    </>
  );
}
