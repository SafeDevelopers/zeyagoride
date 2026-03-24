import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, Search, X, Home, Briefcase, Plus, ChevronDown, Star } from '../lucideIcons';
import { PlaceSuggestions } from '../../components/maps/PlaceSuggestions';
import { useMobileApp } from '../../context/MobileAppContext';
import { isLiveGeocodingEnabled, resolvePlace } from '../../services/mapbox/geocodingService';
import type { LatLng } from '../../types/api';
import type { PlaceSuggestion } from '../../types/places';

type DestinationSetters = {
  setDestination: (s: string) => void;
  setDestinationCoords: (c: LatLng | null) => void;
  setDestinationPlaceId: (id: string | null) => void;
  setDestinationCommitted: (v: boolean) => void;
};

/**
 * Typed or blurred destination → same result as choosing a suggestion: commit + coords when resolvable.
 * Keeps existing RiderRequestScreen condition (`destinationCommitted`) without duplicating that screen.
 */
async function resolveAndCommitDestinationText(
  raw: string,
  { setDestination, setDestinationCoords, setDestinationPlaceId, setDestinationCommitted }: DestinationSetters,
  after?: () => void,
) {
  const q = raw.trim();
  if (!q) return;
  const r = await resolvePlace(q);
  if (r) {
    // Only write coords when present — avoids wiping a suggestion’s coords if a follow-up resolve returns null.
    if (r.coords) {
      setDestinationCoords(r.coords);
    }
    setDestinationPlaceId(r.placeId);
    setDestination(r.address);
  }
  setDestinationCommitted(true);
  after?.();
}

/** Full pickup / destination / saved UI — opened from rider home “Where to?”. */
export function RiderPlanningSheet() {
  const {
    pickup,
    setPickup,
    setPickupCoords,
    setPickupPlaceId,
    destination,
    setDestination,
    setDestinationCoords,
    setDestinationPlaceId,
    setDestinationCommitted,
    stops,
    setStops,
    setStopCoords,
    setStopPlaceIds,
    setRiderPlanningSheetOpen,
    riderPlanningSheetOpen,
    riderPlanningStopFocusIndex,
    setRiderPlanningStopFocusIndex,
    destinationCommitted,
  } = useMobileApp();

  const [pickupSuggestionsOpen, setPickupSuggestionsOpen] = useState(false);
  const [destinationSuggestionsOpen, setDestinationSuggestionsOpen] = useState(false);
  const [stopSuggestionsIndex, setStopSuggestionsIndex] = useState<number | null>(null);
  const [savedPlacesOpen, setSavedPlacesOpen] = useState(false);
  const stopInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const destinationBlurCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destinationCommittedAtFocusRef = useRef(false);
  const destinationTextRef = useRef(destination);
  destinationTextRef.current = destination;

  const pickupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTimerRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const blurTimers = useRef<{
    pickup: ReturnType<typeof setTimeout> | null;
    destination: ReturnType<typeof setTimeout> | null;
    stop: Map<number, ReturnType<typeof setTimeout>>;
  }>({ pickup: null, destination: null, stop: new Map() });

  const liveGeo = isLiveGeocodingEnabled();

  useEffect(() => {
    if (!riderPlanningSheetOpen || riderPlanningStopFocusIndex === null) return;
    const idx = riderPlanningStopFocusIndex;
    setStopSuggestionsIndex(idx);
    const id = window.setTimeout(() => {
      const el = stopInputRefs.current[idx];
      el?.focus();
      el?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      setRiderPlanningStopFocusIndex(null);
    }, 80);
    return () => clearTimeout(id);
  }, [riderPlanningSheetOpen, riderPlanningStopFocusIndex, setRiderPlanningStopFocusIndex]);

  const applyPickupResolved = (r: Awaited<ReturnType<typeof resolvePlace>>) => {
    setPickupCoords(r?.coords ?? null);
    setPickupPlaceId(r?.placeId ?? null);
  };

  const applyDestinationResolved = (r: Awaited<ReturnType<typeof resolvePlace>>) => {
    setDestinationCoords(r?.coords ?? null);
    setDestinationPlaceId(r?.placeId ?? null);
  };

  const applyPickupSuggestion = (s: PlaceSuggestion) => {
    setPickup(s.address);
    setPickupCoords(s.coords);
    setPickupPlaceId(s.placeId);
  };

  const applyDestinationSuggestion = (s: PlaceSuggestion) => {
    if (destinationBlurCommitTimerRef.current) {
      clearTimeout(destinationBlurCommitTimerRef.current);
      destinationBlurCommitTimerRef.current = null;
    }
    cancelBlurClose('destination');
    setDestination(s.address);
    setDestinationCoords(s.coords);
    setDestinationPlaceId(s.placeId);
    setDestinationCommitted(true);
    setRiderPlanningSheetOpen(false);
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

  const schedulePickupResolve = (value: string) => {
    if (!value.trim()) {
      applyPickupResolved(null);
      return;
    }
    const run = () => void resolvePlace(value).then(applyPickupResolved);
    if (liveGeo) {
      if (pickupTimerRef.current) clearTimeout(pickupTimerRef.current);
      pickupTimerRef.current = setTimeout(run, 350);
    } else {
      run();
    }
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

  const scheduleBlurClose = (
    kind: 'pickup' | 'destination' | 'stop',
    stopIdx?: number,
  ) => {
    const delay = 180;
    if (kind === 'pickup') {
      if (blurTimers.current.pickup) clearTimeout(blurTimers.current.pickup);
      blurTimers.current.pickup = setTimeout(() => setPickupSuggestionsOpen(false), delay);
      return;
    }
    if (kind === 'destination') {
      if (blurTimers.current.destination) clearTimeout(blurTimers.current.destination);
      blurTimers.current.destination = setTimeout(() => setDestinationSuggestionsOpen(false), delay);
      return;
    }
    if (stopIdx !== undefined) {
      const prev = blurTimers.current.stop.get(stopIdx);
      if (prev) clearTimeout(prev);
      blurTimers.current.stop.set(
        stopIdx,
        setTimeout(() => {
          setStopSuggestionsIndex((cur) => (cur === stopIdx ? null : cur));
        }, delay),
      );
    }
  };

  useEffect(
    () => () => {
      if (destinationBlurCommitTimerRef.current) clearTimeout(destinationBlurCommitTimerRef.current);
    },
    [],
  );

  const cancelBlurClose = (kind: 'pickup' | 'destination' | 'stop', stopIdx?: number) => {
    if (kind === 'pickup' && blurTimers.current.pickup) {
      clearTimeout(blurTimers.current.pickup);
      blurTimers.current.pickup = null;
    }
    if (kind === 'destination' && blurTimers.current.destination) {
      clearTimeout(blurTimers.current.destination);
      blurTimers.current.destination = null;
    }
    if (kind === 'stop' && stopIdx !== undefined) {
      const t = blurTimers.current.stop.get(stopIdx);
      if (t) clearTimeout(t);
      blurTimers.current.stop.delete(stopIdx);
    }
  };

  return (
    <div className="flex max-h-[min(88vh,720px)] min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 pb-3">
        <h4 className="text-lg font-bold text-slate-900">Plan trip</h4>
        <button
          type="button"
          onClick={() => setRiderPlanningSheetOpen(false)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain py-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Current location</p>
        <div className="relative mb-6">
          <div className="flex items-center gap-3 rounded-2xl border border-velox-primary/10 bg-white p-3 shadow-[0_4px_20px_rgba(45,27,66,0.06)]">
            <MapPin size={18} className="shrink-0 text-velox-primary" />
            <div className="relative min-w-0 flex-1">
              <input
                placeholder="Current Location"
                className="w-full bg-transparent text-sm font-medium outline-none"
                value={pickup}
                autoComplete="off"
                onFocus={() => {
                  cancelBlurClose('pickup');
                  setPickupSuggestionsOpen(true);
                  setDestinationSuggestionsOpen(false);
                  setStopSuggestionsIndex(null);
                }}
                onBlur={() => scheduleBlurClose('pickup')}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setPickupSuggestionsOpen(false);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                onChange={(e) => {
                  const v = e.target.value;
                  setPickup(v);
                  schedulePickupResolve(v);
                }}
              />
              <PlaceSuggestions
                query={pickup}
                open={pickupSuggestionsOpen}
                onSelect={applyPickupSuggestion}
                onDismiss={() => setPickupSuggestionsOpen(false)}
              />
            </div>
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Where to?</p>
          <button
            type="button"
            onClick={() => setSavedPlacesOpen((o) => !o)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:text-velox-primary"
            aria-expanded={savedPlacesOpen}
          >
            Saved places
            <ChevronDown
              size={16}
              className={`shrink-0 text-slate-400 transition-transform ${savedPlacesOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
        <div className="relative mb-6">
          <div className="flex items-center gap-3 rounded-xl border-2 border-velox-primary/25 bg-slate-50 p-4">
            <Search size={20} className="shrink-0 text-slate-400" />
            <div className="relative min-w-0 flex-1">
              <input
                type="text"
                placeholder="Destination..."
                className="w-full bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                value={destination}
                autoComplete="off"
                autoCorrect="off"
                onFocus={() => {
                  destinationCommittedAtFocusRef.current = destinationCommitted;
                  cancelBlurClose('destination');
                  setDestinationSuggestionsOpen(true);
                  setPickupSuggestionsOpen(false);
                  setStopSuggestionsIndex(null);
                }}
                onBlur={() => {
                  scheduleBlurClose('destination');
                  if (destinationBlurCommitTimerRef.current) clearTimeout(destinationBlurCommitTimerRef.current);
                  destinationBlurCommitTimerRef.current = setTimeout(() => {
                    destinationBlurCommitTimerRef.current = null;
                    void resolveAndCommitDestinationText(
                      destinationTextRef.current,
                      {
                        setDestination,
                        setDestinationCoords,
                        setDestinationPlaceId,
                        setDestinationCommitted,
                      },
                      () => {
                        if (!destinationCommittedAtFocusRef.current) {
                          setRiderPlanningSheetOpen(false);
                        }
                      },
                    );
                  }, 220);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (destinationBlurCommitTimerRef.current) {
                      clearTimeout(destinationBlurCommitTimerRef.current);
                      destinationBlurCommitTimerRef.current = null;
                    }
                    cancelBlurClose('destination');
                    void resolveAndCommitDestinationText(
                      destination,
                      {
                        setDestination,
                        setDestinationCoords,
                        setDestinationPlaceId,
                        setDestinationCommitted,
                      },
                      () => setRiderPlanningSheetOpen(false),
                    );
                    return;
                  }
                  if (e.key === 'Escape') {
                    setDestinationSuggestionsOpen(false);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                onChange={(e) => {
                  const v = e.target.value;
                  setDestination(v);
                  setDestinationCommitted(false);
                  setDestinationCoords(null);
                  setDestinationPlaceId(null);
                }}
              />
              <PlaceSuggestions
                query={destination}
                open={destinationSuggestionsOpen}
                onSelect={applyDestinationSuggestion}
                onDismiss={() => setDestinationSuggestionsOpen(false)}
              />
            </div>
          </div>
        </div>

        {savedPlacesOpen && (
          <div className="mb-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                const label = 'Bole Medhanialem';
                setDestination(label);
                void resolvePlace(label).then((r) => {
                  applyDestinationResolved(r);
                  setDestinationCommitted(true);
                  setRiderPlanningSheetOpen(false);
                });
              }}
              className="flex items-center gap-3 rounded-2xl border border-velox-primary/10 bg-white/95 p-4 shadow-[0_4px_16px_rgba(45,27,66,0.05)] transition-all hover:border-velox-primary/25 hover:bg-velox-primary/10"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-velox-primary shadow-sm">
                <Home size={16} />
              </div>
              <div className="min-w-0 text-left">
                <p className="truncate text-xs font-bold text-slate-900">Home</p>
                <p className="line-clamp-2 text-[10px] leading-tight text-slate-500">Bole</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                const label = 'Kazanchis';
                setDestination(label);
                void resolvePlace(label).then((r) => {
                  applyDestinationResolved(r);
                  setDestinationCommitted(true);
                  setRiderPlanningSheetOpen(false);
                });
              }}
              className="flex items-center gap-3 rounded-2xl border border-velox-primary/10 bg-white/95 p-4 shadow-[0_4px_16px_rgba(45,27,66,0.05)] transition-all hover:border-velox-primary/25 hover:bg-velox-primary/10"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-velox-primary shadow-sm">
                <Briefcase size={16} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900">Work</p>
                <p className="text-[10px] text-slate-500">Kazanchis</p>
              </div>
            </button>
          </div>
        )}

        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Stops</p>
        <div className="mb-6 space-y-3">
          {stops.map((stop, index) => (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              key={index}
              className="flex items-center gap-3 rounded-2xl border border-velox-primary/10 bg-white p-3 shadow-[0_4px_20px_rgba(45,27,66,0.06)]"
            >
              <div className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-300" />
              <div className="relative min-w-0 flex-1">
                <input
                  ref={(el) => {
                    stopInputRefs.current[index] = el;
                  }}
                  placeholder={`Stop ${index + 1}`}
                  className="w-full bg-transparent text-sm font-medium outline-none"
                  value={stop}
                  autoComplete="off"
                  onFocus={() => {
                    cancelBlurClose('stop', index);
                    setStopSuggestionsIndex(index);
                    setPickupSuggestionsOpen(false);
                    setDestinationSuggestionsOpen(false);
                  }}
                  onBlur={() => scheduleBlurClose('stop', index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setStopSuggestionsIndex(null);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  onChange={(e) => {
                    const v = e.target.value;
                    const newStops = [...stops];
                    newStops[index] = v;
                    setStops(newStops);
                    scheduleStopResolve(index, v, newStops);
                  }}
                />
                <PlaceSuggestions
                  query={stop}
                  open={stopSuggestionsIndex === index}
                  onSelect={(s) => {
                    const next = [...stops];
                    applyStopSuggestion(index, s, next);
                  }}
                  onDismiss={() => setStopSuggestionsIndex(null)}
                />
              </div>
              <button
                type="button"
                onClick={() => setStops(stops.filter((_, i) => i !== index))}
                className="shrink-0 text-slate-400"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}

          {stops.length < 2 && (
            <button
              type="button"
              onClick={() => {
                if (stops.length >= 2) return;
                const idx = stops.length;
                setStops([...stops, '']);
                setRiderPlanningStopFocusIndex(idx);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 py-3 text-xs font-bold text-slate-400 transition-colors hover:border-velox-primary/30 hover:text-velox-primary"
            >
              <Plus size={14} />
              Add stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function RiderHomeScreen() {
  const {
    t,
    destination,
    setDestination,
    setDestinationCoords,
    setDestinationPlaceId,
    setDestinationCommitted,
    rideStatus,
    destinationCommitted,
    favorites,
    setRiderWhereToSearchExpanded,
  } = useMobileApp();

  const [destinationSuggestionsOpen, setDestinationSuggestionsOpen] = useState(false);
  const [savedPlacesModalOpen, setSavedPlacesModalOpen] = useState(false);
  const [destinationInputFocused, setDestinationInputFocused] = useState(false);
  const destinationBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destinationCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const destinationTextRef = useRef(destination);
  destinationTextRef.current = destination;

  const searchSheetExpanded =
    !savedPlacesModalOpen && (destinationInputFocused || destinationSuggestionsOpen);

  useEffect(
    () => () => {
      if (destinationBlurTimerRef.current) clearTimeout(destinationBlurTimerRef.current);
      if (destinationCommitTimerRef.current) clearTimeout(destinationCommitTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!savedPlacesModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSavedPlacesModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [savedPlacesModalOpen]);

  useEffect(() => {
    if (rideStatus !== 'idle' || destinationCommitted) {
      setRiderWhereToSearchExpanded(false);
      return;
    }
    setRiderWhereToSearchExpanded(searchSheetExpanded);
  }, [
    rideStatus,
    destinationCommitted,
    searchSheetExpanded,
    setRiderWhereToSearchExpanded,
  ]);

  useEffect(
    () => () => {
      setRiderWhereToSearchExpanded(false);
    },
    [setRiderWhereToSearchExpanded],
  );

  const collapseWhereToSearch = () => {
    cancelDestinationBlurClose();
    setDestinationSuggestionsOpen(false);
    setDestinationInputFocused(false);
    destinationInputRef.current?.blur();
  };

  const cancelDestinationBlurClose = () => {
    if (destinationBlurTimerRef.current) {
      clearTimeout(destinationBlurTimerRef.current);
      destinationBlurTimerRef.current = null;
    }
  };

  const scheduleDestinationBlurClose = () => {
    cancelDestinationBlurClose();
    destinationBlurTimerRef.current = setTimeout(() => setDestinationSuggestionsOpen(false), 180);
  };

  const applyDestinationSuggestion = (s: PlaceSuggestion) => {
    if (destinationCommitTimerRef.current) {
      clearTimeout(destinationCommitTimerRef.current);
      destinationCommitTimerRef.current = null;
    }
    if (destinationBlurTimerRef.current) {
      clearTimeout(destinationBlurTimerRef.current);
      destinationBlurTimerRef.current = null;
    }
    cancelDestinationBlurClose();
    setDestination(s.address);
    setDestinationCoords(s.coords);
    setDestinationPlaceId(s.placeId);
    setDestinationCommitted(true);
  };

  const destSetters = {
    setDestination,
    setDestinationCoords,
    setDestinationPlaceId,
    setDestinationCommitted,
  };

  return (
    <>
      {rideStatus === 'idle' && !destinationCommitted && (
        <div className="overflow-visible pb-2 pt-1">
          <div
            className={`relative isolate overflow-visible transition-[min-height] duration-300 ease-out ${
              savedPlacesModalOpen
                ? 'min-h-[220px]'
                : searchSheetExpanded
                  ? 'min-h-[min(22rem,52vh)]'
                  : ''
            }`}
          >
            <button
              type="button"
              onClick={collapseWhereToSearch}
              className="group flex w-full flex-col items-center pt-0.5 pb-1.5"
              aria-label="Collapse destination search"
            >
              <span className="h-1 w-11 rounded-full bg-slate-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-colors group-hover:bg-slate-400/90" />
            </button>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="min-w-0 flex-1 text-xl font-bold leading-tight text-slate-800">
                {t('riderHome')}
              </h3>
              <button
                type="button"
                onClick={() => {
                  cancelDestinationBlurClose();
                  setDestinationSuggestionsOpen(false);
                  setDestinationInputFocused(false);
                  destinationInputRef.current?.blur();
                  setSavedPlacesModalOpen(true);
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-bold text-velox-primary transition-colors hover:bg-velox-primary/10"
                aria-haspopup="dialog"
                aria-expanded={savedPlacesModalOpen}
              >
                <Star size={14} className="shrink-0" aria-hidden />
                Saved places
              </button>
            </div>
            <div className="flex items-center gap-4 overflow-visible rounded-xl bg-slate-100 p-4">
              <Search size={20} className="pointer-events-none shrink-0 text-slate-400" />
              <div className="relative z-[80] min-w-0 flex-1 overflow-visible">
                <input
                  ref={destinationInputRef}
                  type="text"
                  placeholder="Destination..."
                  className="w-full bg-transparent text-base font-medium text-slate-900 outline-none placeholder:text-slate-400"
                  value={destination}
                  autoComplete="off"
                  autoCorrect="off"
                  onFocus={() => {
                    cancelDestinationBlurClose();
                    if (destinationCommitTimerRef.current) {
                      clearTimeout(destinationCommitTimerRef.current);
                      destinationCommitTimerRef.current = null;
                    }
                    setDestinationInputFocused(true);
                    setDestinationSuggestionsOpen(true);
                  }}
                  onBlur={() => {
                    setDestinationInputFocused(false);
                    scheduleDestinationBlurClose();
                    if (destinationCommitTimerRef.current) clearTimeout(destinationCommitTimerRef.current);
                    destinationCommitTimerRef.current = setTimeout(() => {
                      destinationCommitTimerRef.current = null;
                      void resolveAndCommitDestinationText(destinationTextRef.current, destSetters);
                    }, 220);
                  }}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDestination(v);
                    setDestinationCommitted(false);
                    setDestinationCoords(null);
                    setDestinationPlaceId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (destinationCommitTimerRef.current) {
                        clearTimeout(destinationCommitTimerRef.current);
                        destinationCommitTimerRef.current = null;
                      }
                      cancelDestinationBlurClose();
                      void resolveAndCommitDestinationText(destination, destSetters);
                      return;
                    }
                    if (e.key === 'Escape') {
                      setDestinationSuggestionsOpen(false);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                />
                <PlaceSuggestions
                  query={destination}
                  open={destinationSuggestionsOpen && !savedPlacesModalOpen}
                  variant={searchSheetExpanded ? 'expanded' : 'default'}
                  onSelect={applyDestinationSuggestion}
                  onDismiss={() => setDestinationSuggestionsOpen(false)}
                />
              </div>
            </div>

            {savedPlacesModalOpen && (
              <>
                <button
                  type="button"
                  className="absolute inset-0 z-[70] rounded-xl bg-slate-900/45"
                  aria-label="Close saved places"
                  onClick={() => setSavedPlacesModalOpen(false)}
                />
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="saved-places-heading"
                  className="absolute left-1/2 top-1/2 z-[80] w-[min(calc(100%-0.5rem),288px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-[0_20px_50px_rgba(45,27,66,0.22)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p id="saved-places-heading" className="text-sm font-bold text-slate-900">
                      Saved places
                    </p>
                    <button
                      type="button"
                      onClick={() => setSavedPlacesModalOpen(false)}
                      className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {favorites.map((fav) => {
                      const Icon = fav.icon;
                      return (
                        <button
                          key={fav.id}
                          type="button"
                          onClick={() => {
                            setDestination(fav.address);
                            setDestinationCoords(fav.coords ?? null);
                            setDestinationPlaceId(null);
                            setDestinationCommitted(true);
                            setSavedPlacesModalOpen(false);
                          }}
                          className="flex min-h-[64px] items-center gap-2 rounded-xl border border-velox-primary/10 bg-slate-50/90 p-2.5 text-left transition-all hover:border-velox-primary/35 hover:bg-velox-primary/10"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-velox-primary shadow-sm">
                            <Icon size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-900">{fav.name}</p>
                            <p className="line-clamp-2 text-[10px] leading-tight text-slate-500">{fav.address}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
