import { useState } from 'react';
import { motion } from 'motion/react';
import { Menu, Navigation, Award, BarChart3, Car, Flame, Settings2, ChevronDown } from '../lucideIcons';
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
  } = useMobileApp();

  /** Bottom stats panel: collapsed by default so map + center CTA stay prominent. */
  const [statsPanelOpen, setStatsPanelOpen] = useState(false);

  return (
    <>
      <div className="relative h-full">
        {/* Map Background — dark premium feel */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1224] via-[#2a1f38] to-slate-950">
          <div
            className="absolute inset-0 opacity-[0.2]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          {isNavigating && (
            <div className="absolute inset-0 flex items-center justify-center">
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
        </div>

        {/* Top — floating menu + earnings (Velox driver home) */}
        {!isNavigating && (
          <div className="absolute left-0 right-0 top-0 z-20 flex items-start justify-between px-4 pt-[max(1rem,env(safe-area-inset-top,0px))]">
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
              onClick={() => setShowEarningsAnalytics(true)}
              className="rounded-2xl bg-velox-primary px-5 py-2.5 text-left text-white shadow-[0_12px_40px_rgba(75,44,109,0.45)] transition-transform active:scale-[0.98]"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/80">Earnings</div>
              <div className="text-lg font-bold leading-tight">ETB 1,250.00</div>
            </button>
          </div>
        )}

        {/* Center — GO ONLINE / OFFLINE (Velox mockup emphasis) */}
        {!isNavigating && (
          <div className="absolute left-0 right-0 top-1/2 z-10 flex -translate-y-1/2 justify-center px-6">
            <button
              type="button"
              onClick={async () => {
                const next = !isOnline;
                await driverRideService.setDriverOnline(next);
                setIsOnline(next);
              }}
              className={`flex h-36 w-36 flex-col items-center justify-center rounded-full font-black text-white shadow-2xl transition-transform active:scale-95 ${
                isOnline ? 'bg-red-500 shadow-red-500/40' : 'bg-velox-primary shadow-[0_16px_48px_rgba(75,44,109,0.5)]'
              }`}
            >
              {isOnline ? (
                <>
                  <span className="text-2xl leading-none">OFF</span>
                  <span className="mt-1 text-sm font-bold opacity-90">LINE</span>
                </>
              ) : (
                <>
                  <span className="text-2xl leading-none">GO</span>
                  <span className="mt-1 text-sm font-bold opacity-90">ONLINE</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Bottom Stats / Controls — collapsible; online/offline only via center circle */}
        {!isNavigating && (
          <div className="absolute bottom-0 z-30 w-full px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
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
                      onClick={() => setShowEarningsAnalytics(true)}
                      className="text-center transition-transform active:scale-95"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Earnings</p>
                      <p className="text-lg font-bold text-slate-900">ETB 1,250.00</p>
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
