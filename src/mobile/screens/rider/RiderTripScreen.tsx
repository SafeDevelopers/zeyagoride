import { motion } from 'motion/react';
import { Navigation, Star, MessageSquare, PhoneCall, Plus, Share2, ShieldCheck } from '../lucideIcons';
import { useMobileApp } from '../../context/MobileAppContext';
import { riderRideService } from '../../services/api';
import { formatDistanceLabel, formatDurationLabel } from '../../services/mapbox/routeService';
import { toCompletedRide } from '../../services/rides/rideLifecycle';
import { buildWalletTransactionFromRide } from '../../utils/walletFromRide';
import { IS_DEV_UI } from '../../utils/devUi';

export function RiderTripScreen() {
  const {
    t,
    setShowRating,
    pickup,
    destination,
    stops,
    setStops,
    rideStatus,
    setRideStatus,
    currentRide,
    setCurrentRide,
    setShowChat,
    activeDriver,
    setShowShareTrip,
    ridePin,
    setShowSafetyToolkit,
    setTransactions,
  } = useMobileApp();

  return (
    <>
      {rideStatus === 'found' && (
        <div className="py-2">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-2 ring-white shadow-md">
                <img src={activeDriver.image} alt={activeDriver.name} />
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-900">{activeDriver.name}</p>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Star size={10} className="fill-yellow-400 text-yellow-400" />
                  <span>{activeDriver.rating}</span>
                  <span className="mx-1">•</span>
                  <span className="truncate">{activeDriver.car}</span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{activeDriver.plate}</p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xl font-bold text-velox-primary">{activeDriver.eta}</p>
              <p className="text-[9px] font-bold uppercase text-slate-400">ETA</p>
            </div>
          </div>

          {currentRide && currentRide.distanceMeters != null && currentRide.distanceMeters > 0 && (
            <p className="mb-3 break-words text-center text-[11px] leading-relaxed text-slate-500">
              <span className="font-medium text-slate-600">{formatDistanceLabel(currentRide.distanceMeters)}</span>
              <span className="mx-1">·</span>
              <span className="font-medium text-slate-600">
                {currentRide.durationSeconds != null && currentRide.durationSeconds > 0
                  ? formatDurationLabel(currentRide.durationSeconds)
                  : '—'}
              </span>
              {currentRide.fareEstimate?.formatted && (
                <>
                  <span className="mx-1">·</span>
                  <span className="font-semibold text-velox-dark">{currentRide.fareEstimate.formatted} est.</span>
                </>
              )}
            </p>
          )}

          <div className="mb-4 flex items-center justify-between rounded-2xl bg-slate-900 p-3.5 text-white shadow-xl">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
                <ShieldCheck size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-velox-accent">{t('safetyPin')}</p>
                <p className="text-xs font-medium opacity-80">Give this to your driver</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {ridePin.split('').map((digit, i) => (
                <div
                  key={i}
                  className="flex h-9 w-7 items-center justify-center rounded-md bg-white/10 text-lg font-black tracking-tighter"
                >
                  {digit}
                </div>
              ))}
            </div>
          </div>

          {stops.length > 0 && (
            <div className="mb-3 space-y-2 rounded-2xl bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Route with Stops</p>
                {stops.length < 2 && (
                  <button
                    type="button"
                    onClick={() => setStops([...stops, 'New Stop'])}
                    className="text-[10px] font-bold text-velox-primary"
                  >
                    + Add Stop
                  </button>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-velox-primary/100" />
                  <p className="min-w-0 break-words text-xs font-medium text-slate-600">
                    {pickup || 'Current Location'}
                  </p>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <div className="h-1.5 w-1.5 shrink-0 rounded-sm bg-red-500" />
                  <p className="min-w-0 break-words text-xs font-medium text-slate-600">{destination}</p>
                </div>
                {stops.map((stop, i) => (
                  <div key={i} className="flex min-w-0 items-center gap-2">
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <p className="min-w-0 break-words text-xs font-medium text-slate-600">{stop}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stops.length === 0 && (
            <button
              type="button"
              onClick={() => setStops(['New Stop'])}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-2 text-[10px] font-bold text-slate-400"
            >
              <Plus size={12} />
              Add a stop to your trip
            </button>
          )}

          <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              initial={{ width: '12%' }}
              animate={{ width: '45%' }}
              transition={{ duration: 4, repeat: Infinity, repeatType: 'reverse' }}
              className="h-full rounded-full bg-velox-primary"
            />
          </div>
          <div className="mb-4 flex justify-between text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <span>Pickup</span>
            <span className="text-velox-primary">{activeDriver.eta}</span>
            <span>Destination</span>
          </div>

          <div className="mb-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowChat(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-velox-primary"
              aria-label="Chat"
            >
              <MessageSquare size={18} />
            </button>
            <button
              type="button"
              onClick={() => setShowShareTrip(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-velox-primary"
              aria-label="Share"
            >
              <Share2 size={18} />
            </button>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-velox-primary"
              aria-label="Call"
            >
              <PhoneCall size={18} />
            </button>
          </div>

          <button
            type="button"
            onClick={async () => {
              if (currentRide) {
                await riderRideService.cancelRide({ rideId: currentRide.id });
              }
              setCurrentRide(null);
              setRideStatus('idle');
            }}
            className="min-h-[3.25rem] w-full rounded-xl bg-slate-100 py-3.5 text-sm font-bold text-slate-600"
          >
            Cancel Ride
          </button>
        </div>
      )}

      {rideStatus === 'arrived' && (
        <div className="py-3 text-center">
          <div className="mb-5 flex flex-col items-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-velox-accent/15 text-velox-primary">
              <Navigation size={32} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Driver has Arrived!</h3>
            <p className="mt-2 text-sm text-slate-500">
              Your driver {activeDriver.name} is waiting at the pickup point.
            </p>
          </div>

          <div className="mb-5 rounded-2xl bg-slate-50 p-4 text-left">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Driver</p>
              <p className="text-xs font-bold uppercase tracking-wider text-velox-primary">{activeDriver.plate}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full bg-white shadow-sm">
                <img src={activeDriver.image} alt={activeDriver.name} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">{activeDriver.name}</h4>
                <p className="text-sm text-slate-500">{activeDriver.car}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowChat(true)}
              className="flex min-h-[3.25rem] flex-1 items-center justify-center rounded-xl bg-slate-100 py-3.5 text-sm font-bold text-slate-900"
            >
              Chat
            </button>
            <button
              type="button"
              className="flex min-h-[3.25rem] flex-1 items-center justify-center rounded-xl bg-velox-primary py-3.5 text-sm font-bold text-white shadow-[0_8px_28px_rgba(75,44,109,0.35)]"
            >
              Call Driver
            </button>
          </div>
        </div>
      )}

      {rideStatus === 'ongoing' && (
        <div className="py-3">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 pr-1">
              <p className="text-xs font-bold uppercase tracking-widest text-velox-accent">Trip in Progress</p>
              <h3 className="line-clamp-3 text-xl font-bold leading-tight text-slate-900">
                Heading to {destination}
              </h3>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-velox-accent/15 text-velox-primary">
              <Navigation size={24} />
            </div>
          </div>

          <div className="mb-4 space-y-3 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-400">Estimated Arrival</span>
              <span className="text-lg font-bold text-slate-900">
                {currentRide?.durationSeconds != null && currentRide.durationSeconds > 0
                  ? formatDurationLabel(currentRide.durationSeconds)
                  : '12 mins'}
              </span>
            </div>
            {currentRide?.fareEstimate?.formatted && (
              <div className="flex min-w-0 items-center justify-between gap-2 text-xs">
                <span className="shrink-0 font-medium text-slate-500">Fare estimate</span>
                <span className="min-w-0 truncate text-right font-bold text-velox-dark">
                  {currentRide.fareEstimate.formatted}
                </span>
              </div>
            )}
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <motion.div
                initial={{ width: '30%' }}
                animate={{ width: '60%' }}
                transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse' }}
                className="h-full rounded-full bg-velox-primary"
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide text-slate-400">
              <span>Now</span>
              <span className="text-velox-primary">En route</span>
              <span>Drop-off</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setShowSafetyToolkit(true)}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-red-50 p-3.5 text-red-600 transition-all active:scale-95"
            >
              <ShieldCheck size={22} />
              <span className="text-xs font-bold">Safety Toolkit</span>
            </button>
            <button
              type="button"
              onClick={() => setShowShareTrip(true)}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-blue-50 p-3.5 text-blue-600 transition-all active:scale-95"
            >
              <Share2 size={22} />
              <span className="text-xs font-bold">Share Trip</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (currentRide) {
                const completed = toCompletedRide(currentRide);
                setTransactions((prev) => [buildWalletTransactionFromRide(completed, activeDriver.name), ...prev]);
              }
              setRideStatus('idle');
              setShowRating(true);
            }}
            className="mt-5 min-h-[3.25rem] w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white"
          >
            {IS_DEV_UI ? 'Simulate trip completion' : 'Complete trip'}
          </button>
        </div>
      )}
    </>
  );
}
