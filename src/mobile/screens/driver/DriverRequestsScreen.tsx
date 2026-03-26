import { motion, AnimatePresence } from 'motion/react';
import { useMobileApp } from '../../context/MobileAppContext';
import { driverRideService } from '../../services/api';

export function DriverRequestsScreen() {
  const REQUEST_TIMER_CIRCUMFERENCE = 176;
  const {
    setRideStatus,
    setCurrentRide,
    incomingRequest,
    setIncomingRequest,
    requestTimer,
    setIsNavigating,
    setNavStep,
    setNavStopLegIndex,
    setActiveTripId,
  } = useMobileApp();

  return (
    <>
      <AnimatePresence>
        {incomingRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto absolute inset-0 z-[60] flex flex-col items-stretch justify-end bg-black/60 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="w-full max-h-[min(520px,85%)] overflow-hidden rounded-3xl bg-white p-5 shadow-2xl"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-velox-primary/15 text-lg font-bold text-velox-primary">
                    4.9
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-velox-accent">New Request</p>
                    <p className="truncate text-lg font-bold text-slate-900">Incoming Ride</p>
                    <p className="text-xs text-slate-400">Rider request</p>
                  </div>
                </div>
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                  <svg className="absolute h-full w-full -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="transparent"
                      className="text-slate-200"
                    />
                    <motion.circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="transparent"
                      strokeDasharray={REQUEST_TIMER_CIRCUMFERENCE}
                      initial={{ strokeDashoffset: 0 }}
                      animate={{ strokeDashoffset: REQUEST_TIMER_CIRCUMFERENCE }}
                      transition={{ duration: 15, ease: 'linear' }}
                      className="text-velox-accent"
                    />
                  </svg>
                  <span className="text-lg font-bold text-slate-900">{requestTimer}</span>
                </div>
              </div>

              <div className="mb-4 rounded-2xl bg-velox-primary/10 px-4 py-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Trip fare</p>
                <span className="text-2xl font-bold tabular-nums text-velox-primary">{incomingRequest.earning}</span>
              </div>

              <div className="mb-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pickup</p>
                    <p className="line-clamp-3 break-words text-sm font-semibold text-slate-900">
                      {incomingRequest.pickup}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-sm bg-red-500" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Destination</p>
                    <p className="line-clamp-3 break-words text-sm font-semibold text-slate-900">
                      {incomingRequest.destination}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (incomingRequest) {
                      await driverRideService.declineRide({ requestId: incomingRequest.id });
                    }
                    setIncomingRequest(null);
                  }}
                  className="min-h-12 flex-1 rounded-xl bg-slate-100 py-3.5 text-sm font-bold text-slate-500"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (incomingRequest) {
                      const res = await driverRideService.acceptRide({ requestId: incomingRequest.id });
                      setActiveTripId(res.tripId);
                      setCurrentRide(res.ride);
                    }
                    setIncomingRequest(null);
                    setIsNavigating(true);
                    setNavStopLegIndex(null);
                    setNavStep('to_pickup');
                    setRideStatus('found');
                  }}
                  className="min-h-12 flex-[2] rounded-xl bg-velox-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-[0_8px_24px_rgba(75,44,109,0.25)]"
                >
                  Accept
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
