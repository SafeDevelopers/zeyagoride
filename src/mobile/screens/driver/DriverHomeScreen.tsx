import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Menu,
  Navigation,
  Award,
  BarChart3,
  Car,
  Flame,
  Settings2,
  ChevronDown,
  AlertTriangle,
  Wallet,
} from '../lucideIcons';
import { useMobileApp } from '../../context/MobileAppContext';
import { driverRideService } from '../../services/api';
import { mockInjectSimulatedOffer } from '../../services/api/mockRideRegistry';
import { IS_DEV_UI } from '../../utils/devUi';

export function DriverHomeScreen() {
  const {
    isOnline,
    setIsOnline,
    setShowEarningsHistory,
    setShowDestinationFilter,
    destinationFilter,
    setShowMaintenanceTracker,
    driverTier,
    setShowTiers,
    setIncomingRequest,
    isNavigating,
    setShowEarningsAnalytics,
    setShowVehicleManagement,
    setShowHeatmap,
    setShowPerformance,
    setIsMenuOpen,
    driverWalletSnapshot,
    refreshDriverWallet,
    setShowDriverWallet,
    driverProfile,
  } = useMobileApp();

  const snapshot = driverWalletSnapshot;
  const walletBlocked = snapshot?.blocked === true;
  const walletWarningOnly = Boolean(snapshot && !snapshot.blocked && snapshot.belowWarning);
  const blockingReasons = driverProfile?.onlineBlockingReasons ?? [];
  const cantGoOnline = blockingReasons.length > 0;
  const blockingCopy =
    blockingReasons[0] === 'driver_account_not_approved'
      ? 'Your driver account is still pending admin approval.'
      : blockingReasons[0] === 'vehicle_missing'
        ? 'Add your vehicle details to finish onboarding.'
        : blockingReasons[0] === 'vehicle_pending_approval'
          ? 'Your vehicle update is pending admin approval.'
          : blockingReasons[0] === 'vehicle_rejected'
            ? `Vehicle rejected${driverProfile?.vehicle?.rejectionReason ? `: ${driverProfile.vehicle.rejectionReason}` : '.'}`
            : 'Wallet below minimum. Top up and wait for approval before going online.';

  /** Bottom stats panel: collapsed by default so map + center CTA stay prominent. */
  const [statsPanelOpen, setStatsPanelOpen] = useState(false);

  return (
    <>
      <div className="pointer-events-none relative h-full">
        {/* Map is rendered by MobileAppShell behind this layer — keep background transparent so Mapbox shows through. */}
        {isNavigating && (
          <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center">
            <div className="h-1 w-full max-w-[200px] rounded-full bg-velox-primary/20">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 10, repeat: Infinity }}
                className="h-full rounded-full bg-velox-primary/100"
              />
            </div>
          </div>
        )}

        {/* Top — floating menu + earnings (Velox driver home) */}
        {!isNavigating && (
          <div className="pointer-events-auto absolute left-0 right-0 top-0 z-20 flex items-start justify-between px-4 pt-[max(1rem,env(safe-area-inset-top,0px))]">
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-velox-dark shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-transform active:scale-95"
              aria-label="Menu"
            >
              <Menu size={20} />
            </button>
            <button
              type="button"
              onClick={() => (snapshot ? setShowDriverWallet(true) : setShowEarningsAnalytics(true))}
              className="rounded-2xl bg-velox-primary px-5 py-2.5 text-left text-white shadow-[0_12px_40px_rgba(75,44,109,0.45)] transition-transform active:scale-[0.98]"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                {snapshot ? 'Wallet balance' : 'Earnings'}
              </div>
              <div className="text-lg font-bold leading-tight">
                {snapshot ? `ETB ${snapshot.balance.toLocaleString()}` : 'ETB 1,250.00'}
              </div>
            </button>
          </div>
        )}

        {/* Bottom-left — GO ONLINE / OFFLINE (above Stats & features bar) */}
        {/* Bottom Stats / Controls — collapsible; online/offline via circle above */}
        {!isNavigating && (
          <div className="pointer-events-auto absolute bottom-0 z-30 flex w-full flex-col items-stretch gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
            {cantGoOnline && (
              <div className="rounded-2xl border border-red-200 bg-red-50/95 px-4 py-3 shadow-[0_8px_28px_rgba(0,0,0,0.12)] ring-1 ring-red-100 backdrop-blur-sm">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                    <AlertTriangle size={20} strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-red-950">Can&apos;t receive trips</p>
                    <p className="mt-1 text-xs font-medium leading-snug text-red-900/90">
                      {blockingCopy}
                    </p>
                    {blockingReasons[0] === 'wallet_below_minimum' && (
                      <button
                        type="button"
                        onClick={() => setShowDriverWallet(true)}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition-transform active:scale-[0.99] sm:w-auto"
                      >
                        <Wallet size={16} strokeWidth={2.25} />
                        Top up in wallet
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            {snapshot && walletWarningOnly && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 shadow-[0_8px_28px_rgba(0,0,0,0.1)] ring-1 ring-amber-100 backdrop-blur-sm">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                    <AlertTriangle size={20} strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-amber-950">Low balance</p>
                    <p className="mt-1 text-xs font-medium leading-snug text-amber-900/90">
                      Below warning level (ETB {snapshot.warningThreshold.toLocaleString()}). You can still go online —
                      top up soon to avoid hitting the minimum and losing offers.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowDriverWallet(true)}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/80 bg-white px-4 py-2 text-xs font-black text-amber-950 shadow-sm transition-transform active:scale-[0.99] sm:w-auto"
                    >
                      <Wallet size={16} strokeWidth={2.25} />
                      Open wallet
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-start">
              <button
                type="button"
                title={
                  !isOnline && cantGoOnline
                    ? blockingCopy
                    : undefined
                }
                onClick={async () => {
                  const next = !isOnline;
                  if (next && cantGoOnline) return;
                  await driverRideService.setDriverOnline(next);
                  setIsOnline(next);
                  void refreshDriverWallet();
                }}
                disabled={!isOnline && cantGoOnline}
                className={`flex h-24 w-24 flex-col items-center justify-center rounded-full font-black text-white shadow-xl transition-transform active:scale-95 ${
                  isOnline ? 'bg-red-500 shadow-red-500/35' : 'bg-velox-primary shadow-[0_10px_32px_rgba(75,44,109,0.42)]'
                } ${!isOnline && cantGoOnline ? 'cursor-not-allowed opacity-45' : ''}`}
              >
                {isOnline ? (
                  <>
                    <span className="text-lg leading-none tracking-tight">OFF</span>
                    <span className="mt-0.5 text-[10px] font-bold opacity-90">LINE</span>
                  </>
                ) : (
                  <>
                    <span className="text-lg leading-none tracking-tight">GO</span>
                    <span className="mt-0.5 text-[10px] font-bold opacity-90">ONLINE</span>
                  </>
                )}
              </button>
            </div>
            <div
              className={`grid overflow-hidden rounded-3xl border border-white/15 bg-white/96 shadow-[0_16px_48px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-[grid-template-rows] duration-300 ease-out ${
                statsPanelOpen ? 'grid-rows-[auto_1fr]' : 'grid-rows-[auto_0fr]'
              }`}
            >
              <button
                type="button"
                onClick={() => setStatsPanelOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50/80"
                aria-expanded={statsPanelOpen}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {'Stats & features'}
                </span>
                <ChevronDown
                  size={20}
                  className={`shrink-0 text-slate-400 transition-transform duration-300 ${
                    statsPanelOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div className="min-h-0 overflow-hidden">
                <div className="max-h-[min(58vh,520px)] overflow-y-auto overscroll-y-contain px-6 pb-6 pt-1">
                  <div className="mb-6 grid grid-cols-2 gap-4 border-b border-slate-100 pb-6 sm:grid-cols-4">
                    <button
                      type="button"
                      onClick={() => (snapshot ? setShowDriverWallet(true) : setShowEarningsAnalytics(true))}
                      className="text-center transition-transform active:scale-95"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {snapshot ? 'Wallet' : 'Earnings'}
                      </p>
                      <p className="text-lg font-bold text-slate-900">
                        {snapshot ? `ETB ${snapshot.balance.toLocaleString()}` : 'ETB 1,250.00'}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEarningsHistory(true)}
                      className="text-center transition-transform active:scale-95"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trips</p>
                      <p className="text-lg font-bold text-slate-900">8</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPerformance(true)}
                      className="text-center transition-transform active:scale-95"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rating</p>
                      <p className="text-lg font-bold text-slate-900">4.95</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTiers(true)}
                      className="text-center transition-transform active:scale-95"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tier</p>
                      <div className="flex items-center justify-center gap-1">
                        <Award size={14} className="text-velox-primary" />
                        <p className="text-lg font-bold text-velox-primary">{driverTier}</p>
                      </div>
                    </button>
                  </div>
                  <div className="mb-6 grid grid-cols-3 gap-2">
                    {[
                      { icon: BarChart3, label: 'Analytics', onClick: () => setShowEarningsAnalytics(true) },
                      { icon: Car, label: 'Vehicles', onClick: () => setShowVehicleManagement(true) },
                      { icon: Flame, label: 'Heatmap', onClick: () => setShowHeatmap(true) },
                      {
                        icon: Navigation,
                        label: 'Heading Home',
                        onClick: () => setShowDestinationFilter(true),
                        active: !!destinationFilter,
                      },
                      { icon: Settings2, label: 'Maintenance', onClick: () => setShowMaintenanceTracker(true) },
                      { icon: Award, label: 'Tiers', onClick: () => setShowTiers(true) },
                    ].map((item, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={item.onClick}
                        className={`flex flex-col items-center gap-2 rounded-2xl p-3 transition-all ${
                          item.active
                            ? 'bg-velox-primary text-white shadow-md'
                            : 'bg-slate-50 text-slate-600 hover:bg-velox-primary/10 hover:text-velox-primary'
                        }`}
                      >
                        <item.icon size={18} />
                        <span className="text-[8px] font-bold uppercase tracking-wider">{item.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowEarningsHistory(true)}
                        className={`min-h-[2.75rem] rounded-xl bg-slate-50 py-2.5 text-xs font-bold text-slate-600 ${
                          IS_DEV_UI && isOnline ? 'flex-1' : 'w-full'
                        }`}
                      >
                        Earnings History
                      </button>
                      {IS_DEV_UI && isOnline && (
                        <button
                          type="button"
                          onClick={() => {
                            const o = mockInjectSimulatedOffer();
                            setIncomingRequest({ ...o });
                          }}
                          className="min-h-[2.75rem] flex-1 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-2.5 text-[10px] font-bold leading-tight text-slate-500 transition-colors hover:border-velox-primary/30 hover:text-velox-primary"
                        >
                          Simulate request
                        </button>
                      )}
                    </div>
                    {!IS_DEV_UI && isOnline && (
                      <p className="text-center text-[10px] text-slate-400">Listening for ride requests</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
