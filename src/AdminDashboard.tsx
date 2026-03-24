import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Car,
  TrendingUp,
  DollarSign,
  Search,
  Bell,
  LayoutDashboard,
  Map,
  ShieldCheck,
  Zap,
  MessageSquare,
  Menu,
  X,
  RefreshCw,
  Loader2,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchAdminOverview, type AdminOverview } from './admin/adminApi';

function formatRideStatus(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminOverview();
      setOverview(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const riderRows = useMemo(() => {
    if (!overview?.rides.length) return [];
    const counts = new Map<string, number>();
    for (const r of overview.rides) {
      const id = (r.riderId ?? 'unknown').trim() || 'unknown';
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts.entries()].map(([id, rides]) => ({
      id,
      label: id === 'unknown' ? 'Unknown rider' : id === 'placeholder-rider' ? 'Placeholder rider' : id,
      rides,
    }));
  }, [overview]);

  const sortedRides = useMemo(() => {
    if (!overview?.rides) return [];
    return [...overview.rides].sort((a, b) => {
      const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
      const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      return tb - ta;
    });
  }, [overview]);

  const [pricing, setPricing] = useState({
    baseFare: 50,
    perKmRate: 15,
    surgeMultiplier: 1.0,
    isSurgeActive: false
  });

  const [tickets, setTickets] = useState([
    { id: '1', user: 'Felix M.', type: 'Rider', issue: 'Overcharged for trip #1234', status: 'open', date: '2026-03-20' },
    { id: '2', user: 'Abebe B.', type: 'Driver', issue: 'App crashing on pickup', status: 'in-progress', date: '2026-03-19' },
    { id: '3', user: 'Sara K.', type: 'Rider', issue: 'Lost item in car', status: 'closed', date: '2026-03-18' },
  ]);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar (Desktop & Mobile) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white p-6 transition-transform lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <ShieldCheck size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight">Zeyago<span className="text-emerald-600">Admin</span></span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden rounded-lg p-2 text-slate-400 hover:bg-slate-50">
            <X size={20} />
          </button>
        </div>
        
        <nav className="space-y-2">
          {[
            { icon: LayoutDashboard, label: 'Dashboard' },
            { icon: Users, label: 'Users' },
            { icon: Car, label: 'Drivers' },
            { icon: Map, label: 'Live Map' },
            { icon: DollarSign, label: 'Payments' },
            { icon: Zap, label: 'Pricing' },
            { icon: MessageSquare, label: 'Support' },
          ].map((item, i) => (
            <button 
              key={i} 
              onClick={() => { setActiveTab(item.label); setIsSidebarOpen(false); }}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${activeTab === item.label ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-white transition-all shadow-sm"
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold">{activeTab}</h1>
              <p className="hidden sm:block text-slate-500 text-sm">
                {activeTab === 'Dashboard' && "Welcome back, Admin. Here's what's happening today."}
                {activeTab === 'Users' && "Riders inferred from in-memory rides (same backend as mobile)."}
                {activeTab === 'Drivers' && "Driver availability matches PUT /driver/availability."}
                {activeTab === 'Live Map' && "Map preview — live counts from backend below."}
                {activeTab === 'Payments' && "Monitor revenue, payouts, and transaction history."}
              </p>
              {lastUpdated && (
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Data synced {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => void loadOverview()}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
              title="Reload from API"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                placeholder="Search anything..." 
                className="rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <button className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50">
              <Bell size={20} />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border-2 border-white"></span>
            </button>
          </div>
        </header>

        {activeTab === 'Dashboard' && (
          <>
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <AlertCircle className="mt-0.5 shrink-0" size={20} />
                <div>
                  <p className="font-bold">Could not reach backend</p>
                  <p className="mt-1 text-amber-800/90">{error}</p>
                  <p className="mt-2 text-xs text-amber-700">
                    Start Nest on port 3000 or set <code className="rounded bg-white/80 px-1">VITE_API_BASE_URL</code>.
                  </p>
                </div>
              </div>
            )}

            {/* Stats Grid — same AppStateService counts as mobile */}
            <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: 'Rides in memory',
                  value: loading ? '…' : (overview?.summary.totalRides ?? 0).toLocaleString(),
                  icon: Car,
                  color: 'text-blue-600',
                  bg: 'bg-blue-50',
                },
                {
                  label: 'Driver online',
                  value: loading ? '…' : overview?.driverOnline ? 'Yes' : 'No',
                  icon: Radio,
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50',
                },
                {
                  label: 'Est. revenue (completed)',
                  value: loading
                    ? '…'
                    : `ETB ${(overview?.summary.completedRevenueEstimate ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}`,
                  icon: DollarSign,
                  color: 'text-purple-600',
                  bg: 'bg-purple-50',
                },
                {
                  label: 'Active trips / offers',
                  value: loading
                    ? '…'
                    : `${overview?.summary.activeTrips ?? 0} / ${overview?.summary.pendingOffers ?? 0}`,
                  icon: TrendingUp,
                  color: 'text-orange-600',
                  bg: 'bg-orange-50',
                },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
                >
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${stat.bg} ${stat.color}`}>
                    <stat.icon size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-500">{stat.label}</p>
                  <h3 className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</h3>
                </motion.div>
              ))}
            </div>

            {/* Live rides — backend ride rows */}
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold">Live rides</h2>
                  <p className="text-sm text-slate-500">Same records as mobile rider/driver flows (in-memory store).</p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadOverview()}
                  className="text-sm font-bold text-emerald-600 hover:underline"
                >
                  Refresh
                </button>
              </div>
              {loading && !overview ? (
                <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
                  <Loader2 className="animate-spin" size={22} />
                  Loading rides…
                </div>
              ) : sortedRides.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
                  No rides yet. Request a ride from the mobile app (with API connected).
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-sm font-bold text-slate-400">
                        <th className="pb-3 pr-2">Ride</th>
                        <th className="pb-3 pr-2">Status</th>
                        <th className="pb-3 pr-2">Pickup</th>
                        <th className="pb-3 pr-2">Destination</th>
                        <th className="pb-3">Fare</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {sortedRides.slice(0, 20).map((ride) => (
                        <tr key={ride.id} className="text-sm">
                          <td className="max-w-[140px] py-3 pr-2 font-mono text-xs text-slate-600">
                            <span className="block truncate" title={ride.id}>
                              {ride.id}
                            </span>
                          </td>
                          <td className="max-w-[120px] py-3 pr-2">
                            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                              {formatRideStatus(ride.status)}
                            </span>
                          </td>
                          <td className="max-w-[200px] py-3 pr-2 font-medium text-slate-800">
                            <span className="line-clamp-2" title={ride.pickup}>
                              {ride.pickup}
                            </span>
                          </td>
                          <td className="max-w-[200px] py-3 pr-2 font-medium text-slate-800">
                            <span className="line-clamp-2" title={ride.destination}>
                              {ride.destination}
                            </span>
                          </td>
                          <td className="py-3 text-slate-600">
                            {ride.fareEstimate?.formatted ??
                              (ride.fareEstimate?.amount != null
                                ? `ETB ${ride.fareEstimate.amount}`
                                : '—')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {!loading && overview && overview.offers.length > 0 && (
              <div className="mt-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="mb-4 text-xl font-bold">Pending driver offers</h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 font-bold text-slate-400">
                        <th className="pb-3">Request</th>
                        <th className="pb-3">Pickup</th>
                        <th className="pb-3">Destination</th>
                        <th className="pb-3">Earning</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {overview.offers.map((o) => (
                        <tr key={o.requestId}>
                          <td className="max-w-[140px] py-3 font-mono text-xs">
                            <span className="block truncate" title={o.requestId}>
                              {o.requestId}
                            </span>
                          </td>
                          <td className="max-w-[200px] py-3">
                            <span className="line-clamp-2" title={o.pickup}>
                              {o.pickup}
                            </span>
                          </td>
                          <td className="max-w-[200px] py-3">
                            <span className="line-clamp-2" title={o.destination}>
                              {o.destination}
                            </span>
                          </td>
                          <td className="py-3 font-semibold text-emerald-700">{o.earning}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'Users' && (
          <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Riders (from rides)</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Unique <code className="rounded bg-slate-100 px-1">riderId</code> values seen in stored rides.
                </p>
              </div>
            </div>
            {loading && !overview ? (
              <div className="flex items-center gap-2 py-12 text-slate-500">
                <Loader2 className="animate-spin" size={22} />
                Loading…
              </div>
            ) : riderRows.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
                No rider activity in memory yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-sm font-bold text-slate-400">
                      <th className="pb-4">Rider id</th>
                      <th className="pb-4">Rides (count)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {riderRows.map((rider) => (
                      <tr key={rider.id} className="group">
                        <td className="max-w-md py-4">
                          <p className="truncate font-mono text-sm font-bold text-slate-900" title={rider.label}>
                            {rider.label}
                          </p>
                        </td>
                        <td className="py-4 text-sm font-bold text-slate-900">{rider.rides}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Drivers' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold">Driver availability</h2>
              <p className="mt-1 text-sm text-slate-500">
                Backend exposes a single demo driver pool flag — same state the driver app toggles with Go Online.
              </p>
              {loading && !overview ? (
                <div className="mt-6 flex items-center gap-2 text-slate-500">
                  <Loader2 className="animate-spin" size={22} />
                  Loading…
                </div>
              ) : (
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                      overview?.driverOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Radio size={16} />
                    {overview?.driverOnline ? 'Online — receiving requests' : 'Offline'}
                  </span>
                  <span className="text-sm text-slate-600">
                    Active trips: <strong>{overview?.summary.activeTrips ?? 0}</strong>
                  </span>
                  <span className="text-sm text-slate-600">
                    Pending offers: <strong>{overview?.summary.pendingOffers ?? 0}</strong>
                  </span>
                </div>
              )}
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="mb-4 text-lg font-bold">Active trips (tripId)</h3>
              {!overview?.trips.length ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-500">
                  No active trips in memory.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 font-bold text-slate-400">
                        <th className="pb-3">Trip</th>
                        <th className="pb-3">Ride</th>
                        <th className="pb-3">Started</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {overview.trips.map((t) => (
                        <tr key={t.tripId}>
                          <td className="max-w-[180px] py-3 font-mono text-xs">
                            <span className="block truncate" title={t.tripId}>
                              {t.tripId}
                            </span>
                          </td>
                          <td className="max-w-[180px] py-3 font-mono text-xs">
                            <span className="block truncate" title={t.rideId}>
                              {t.rideId}
                            </span>
                          </td>
                          <td className="py-3 text-slate-600">
                            {new Date(t.startedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Live Map' && (
          <div className="relative h-[600px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="max-w-md text-center">
                <Map size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="font-bold text-slate-400">Map preview</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Live positions are not streamed yet. Use Dashboard for current ride rows; driver online:{' '}
                  <strong>{overview?.driverOnline ? 'yes' : 'no'}</strong>, active trips:{' '}
                  <strong>{overview?.summary.activeTrips ?? 0}</strong>.
                </p>
              </div>
            </div>
            
            {/* Simulated Driver Markers */}
            {[
              { top: '30%', left: '40%', name: 'Abebe' },
              { top: '60%', left: '20%', name: 'Samuel' },
              { top: '45%', left: '70%', name: 'Mulugeta' },
              { top: '20%', left: '80%', name: 'Sara' },
            ].map((d, i) => (
              <motion.div 
                key={i}
                animate={{ 
                  x: [0, Math.random() * 20 - 10, 0],
                  y: [0, Math.random() * 20 - 10, 0]
                }}
                transition={{ duration: 5, repeat: Infinity }}
                className="absolute flex flex-col items-center gap-1"
                style={{ top: d.top, left: d.left }}
              >
                <div className="rounded-lg bg-emerald-600 p-1.5 text-white shadow-lg">
                  <Car size={16} />
                </div>
                <span className="rounded bg-white px-1.5 py-0.5 text-[8px] font-bold shadow-sm">{d.name}</span>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'Payments' && (
          <div className="space-y-6">
            {overview && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
                <strong>From API:</strong> estimated completed revenue{' '}
                <strong>
                  ETB{' '}
                  {overview.summary.completedRevenueEstimate.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 1,
                  })}
                </strong>{' '}
                (sum of <code className="rounded bg-white/80 px-1">fareEstimate.amount</code> on completed rides).
              </div>
            )}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
                <h3 className="mb-6 text-lg font-bold">Revenue chart (demo)</h3>
                <div className="flex h-48 items-end justify-between gap-2">
                  {[40, 60, 45, 80, 55, 90, 75].map((h, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-2">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        className="w-full rounded-t-lg bg-emerald-500"
                      />
                      <span className="text-[10px] font-bold text-slate-400">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
                <h3 className="mb-6 text-lg font-bold">Payout status (demo)</h3>
                <div className="space-y-4">
                  {[
                    { name: 'Abebe B.', amount: 4500, status: 'Processing', date: 'Today' },
                    { name: 'Samuel K.', amount: 3200, status: 'Completed', date: 'Yesterday' },
                    { name: 'Mulugeta T.', amount: 5100, status: 'Completed', date: 'Mar 18' },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{p.name}</p>
                        <p className="text-[10px] text-slate-500">{p.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">ETB {p.amount.toLocaleString()}</p>
                        <p className={`text-[10px] font-bold ${p.status === 'Completed' ? 'text-emerald-600' : 'text-orange-600'}`}>{p.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Pricing' && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
              <h3 className="mb-6 text-lg font-bold">Standard Pricing</h3>
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Base Fare (ETB)</label>
                  <input 
                    type="number" 
                    className="w-full rounded-xl border border-slate-200 p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={pricing.baseFare}
                    onChange={(e) => setPricing({...pricing, baseFare: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Rate per KM (ETB)</label>
                  <input 
                    type="number" 
                    className="w-full rounded-xl border border-slate-200 p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={pricing.perKmRate}
                    onChange={(e) => setPricing({...pricing, perKmRate: Number(e.target.value)})}
                  />
                </div>
                <button className="w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-100">
                  Update Standard Rates
                </button>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-bold">Surge Pricing</h3>
                <button 
                  onClick={() => setPricing({...pricing, isSurgeActive: !pricing.isSurgeActive})}
                  className={`relative h-6 w-12 rounded-full transition-colors ${pricing.isSurgeActive ? 'bg-emerald-600' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${pricing.isSurgeActive ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Surge Multiplier</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="1" 
                      max="3" 
                      step="0.1"
                      className="flex-1 accent-emerald-600"
                      value={pricing.surgeMultiplier}
                      onChange={(e) => setPricing({...pricing, surgeMultiplier: Number(e.target.value)})}
                    />
                    <span className="text-xl font-black text-emerald-600">{pricing.surgeMultiplier}x</span>
                  </div>
                </div>
                <div className="rounded-2xl bg-orange-50 p-4 border border-orange-100">
                  <p className="text-xs font-bold text-orange-800">Surge pricing is currently {pricing.isSurgeActive ? 'ACTIVE' : 'INACTIVE'}.</p>
                  <p className="text-[10px] text-orange-600 mt-1">When active, all ride fares will be multiplied by {pricing.surgeMultiplier}x.</p>
                </div>
                <button className="w-full rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-lg shadow-slate-200">
                  Apply Surge Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Support' && (
          <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">Support Tickets</h2>
              <div className="flex gap-2">
                <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold hover:bg-slate-50">Filter</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-sm font-bold text-slate-400">
                    <th className="pb-4">User</th>
                    <th className="pb-4">Type</th>
                    <th className="pb-4">Issue</th>
                    <th className="pb-4">Date</th>
                    <th className="pb-4">Status</th>
                    <th className="pb-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="group">
                      <td className="py-4">
                        <p className="font-bold text-slate-900">{ticket.user}</p>
                      </td>
                      <td className="py-4">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ticket.type === 'Rider' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                          {ticket.type}
                        </span>
                      </td>
                      <td className="py-4">
                        <p className="text-sm text-slate-600 max-w-xs truncate">{ticket.issue}</p>
                      </td>
                      <td className="py-4 text-sm text-slate-500">{ticket.date}</td>
                      <td className="py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          ticket.status === 'open' ? 'bg-red-50 text-red-600' : 
                          ticket.status === 'in-progress' ? 'bg-orange-50 text-orange-600' : 
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button className="rounded-lg bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-100">
                          Resolve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
