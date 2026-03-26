import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Car,
  TrendingUp,
  DollarSign,
  Search,
  Bell,
  LayoutDashboard,
  Map as MapIcon,
  ShieldCheck,
  Zap,
  MessageSquare,
  Menu,
  X,
  RefreshCw,
  Loader2,
  AlertCircle,
  Radio,
  Printer,
  Download,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  approveAdminTopUpRequest,
  downloadAdminWalletTransactionsCsv,
  fetchAdminDrivers,
  fetchAdminRiders,
  fetchAdminPricing,
  fetchAdminPromos,
  fetchAdminOverview,
  fetchAdminTopUpRequests,
  fetchAdminWalletNotifications,
  fetchAdminWalletTransactions,
  rejectAdminTopUpRequest,
  type AdminDriverRow,
  type AdminRiderRow,
  type AdminOverview,
  type AdminPricingSettings,
  type AdminPromoSettings,
  type AdminTopUpRequestRow,
  type AdminWalletNotificationRow,
  type AdminWalletTransactionRow,
  updateAdminDriverVehicleApproval,
  updateAdminDriverVerification,
  updateAdminPricing,
  updateAdminPromos,
  updateAdminCommission,
  updateAdminSettings,
} from './admin/adminApi';
import {
  formatAdminDateTime,
  formatEtb,
  rideStatusBadgeClass,
  topUpStatusBadgeClass,
  walletEligibilityBadgeClass,
} from './admin/adminPresentation';
import { authService } from './mobile/services/api';
import {
  clearMobileSession,
  getAccessToken,
  getStoredUser,
  persistSessionAfterVerify,
} from './mobile/services/sessionStorage';

function formatRideStatus(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function AdminDashboard() {
  const initialAdminUser = getStoredUser();
  const hasAdminSession = initialAdminUser?.role === 'admin' && Boolean(getAccessToken());
  const [authStep, setAuthStep] = useState<'phone' | 'otp' | 'ready'>(hasAdminSession ? 'ready' : 'phone');
  const [authPhone, setAuthPhone] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [adminUserName, setAdminUserName] = useState(hasAdminSession ? initialAdminUser?.name ?? 'Admin' : 'Admin');
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [drivers, setDrivers] = useState<AdminDriverRow[]>([]);
  const [riders, setRiders] = useState<AdminRiderRow[]>([]);
  const [driverActionId, setDriverActionId] = useState<string | null>(null);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [promoSaving, setPromoSaving] = useState(false);
  const [pricing, setPricing] = useState<AdminPricingSettings>({
    baseFare: 35,
    perKmRate: 11,
    perMinuteRate: 2,
    minimumFare: 25,
    cancellationFee: 20,
  });
  const [promo, setPromo] = useState<AdminPromoSettings>({
    enabled: true,
    code: 'ZEYAGO20',
    discountType: 'percent',
    discountAmount: 20,
    active: true,
  });

  const [walletTransactions, setWalletTransactions] = useState<AdminWalletTransactionRow[]>([]);
  const [topUpRequests, setTopUpRequests] = useState<AdminTopUpRequestRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [topUpActionId, setTopUpActionId] = useState<string | null>(null);
  const [walletNotifications, setWalletNotifications] = useState<AdminWalletNotificationRow[]>([]);
  const [topUpStatusFilter, setTopUpStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'all' | 'commission' | 'credit' | 'debit'>('all');

  const filteredTopUpRequests = useMemo(() => {
    if (topUpStatusFilter === 'all') return topUpRequests;
    return topUpRequests.filter((r) => r.status.toLowerCase() === topUpStatusFilter);
  }, [topUpRequests, topUpStatusFilter]);

  const filteredWalletTransactions = useMemo(() => {
    if (ledgerTypeFilter === 'all') return walletTransactions;
    return walletTransactions.filter((t) => t.type === ledgerTypeFilter);
  }, [walletTransactions, ledgerTypeFilter]);

  const PAYMENTS_SUBVIEWS = useMemo(
    () =>
      [
        { id: 'balances' as const, label: 'Wallet balances' },
        { id: 'topups' as const, label: 'Top-up requests' },
        { id: 'commission' as const, label: 'Commission ledger' },
        { id: 'transactions' as const, label: 'Wallet transactions' },
        { id: 'notifications' as const, label: 'Notifications' },
        { id: 'export' as const, label: 'Export / print' },
      ] as const,
    [],
  );
  type PaymentsSubview = (typeof PAYMENTS_SUBVIEWS)[number]['id'];
  const [paymentsSubview, setPaymentsSubview] = useState<PaymentsSubview>('balances');
  const [commissionForm, setCommissionForm] = useState<{ commissionType: 'percent'; commissionRate: number }>({
    commissionType: 'percent',
    commissionRate: 5,
  });
  const [commissionSaving, setCommissionSaving] = useState(false);

  useEffect(() => {
    const c = overview?.settings?.commission;
    if (c) {
      setCommissionForm({
        commissionType: 'percent',
        commissionRate: c.commissionRate,
      });
    }
  }, [overview?.settings?.commission]);

  const commissionRateDisplay = overview?.settings?.commission?.commissionRate ?? commissionForm.commissionRate;

  const loadPaymentsData = useCallback(async () => {
    setPaymentsLoading(true);
    setPaymentsError(null);
    try {
      const [tx, top, notes] = await Promise.all([
        fetchAdminWalletTransactions({ limit: 300 }),
        fetchAdminTopUpRequests(),
        fetchAdminWalletNotifications(100),
      ]);
      setWalletTransactions(tx.transactions);
      setTopUpRequests(top.requests);
      setWalletNotifications(notes.notifications);
    } catch (e) {
      setPaymentsError(e instanceof Error ? e.message : 'Failed to load wallet data');
      setWalletTransactions([]);
      setTopUpRequests([]);
      setWalletNotifications([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  const loadOverview = useCallback(async () => {
    if (authStep !== 'ready') return;
    setLoading(true);
    setError(null);
    try {
      const [data, driverRows, riderRows, pricingSettings, promoSettings] = await Promise.all([
        fetchAdminOverview(),
        fetchAdminDrivers(),
        fetchAdminRiders(),
        fetchAdminPricing(),
        fetchAdminPromos(),
      ]);
      setOverview(data);
      setDrivers(driverRows);
      setRiders(riderRows);
      setPricing(pricingSettings);
      setPromo(promoSettings);
      setLastUpdated(new Date());
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load';
      if (
        message.includes('missing_bearer_token') ||
        message.includes('Unauthorized') ||
        message.includes('insufficient_role')
      ) {
        clearMobileSession();
        setAuthStep('phone');
        setAdminUserName('Admin');
      }
      setError(message);
      setOverview(null);
      setDrivers([]);
      setRiders([]);
    } finally {
      setLoading(false);
    }
  }, [authStep]);

  useEffect(() => {
    if (authStep === 'ready') {
      void loadOverview();
    }
  }, [loadOverview]);

  useEffect(() => {
    if (authStep === 'ready' && activeTab === 'Payments') {
      void loadPaymentsData();
    }
  }, [activeTab, authStep, loadPaymentsData]);

  const toggleRequireRideSafetyPin = useCallback(async () => {
    if (!overview || settingsSaving) return;
    const nextValue = !overview.settings.requireRideSafetyPin;
    setSettingsSaving(true);
    setError(null);
    try {
      const settings = await updateAdminSettings({
        ...overview.settings,
        requireRideSafetyPin: nextValue,
      });
      setOverview((prev) =>
        prev
          ? {
              ...prev,
              settings,
            }
          : prev,
      );
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update settings');
    } finally {
      setSettingsSaving(false);
    }
  }, [overview, settingsSaving]);

  const toggleDemoAutoTripProgression = useCallback(async () => {
    if (!overview || settingsSaving) return;
    const nextValue = !overview.settings.demoAutoTripProgression;
    setSettingsSaving(true);
    setError(null);
    try {
      const settings = await updateAdminSettings({
        ...overview.settings,
        demoAutoTripProgression: nextValue,
      });
      setOverview((prev) =>
        prev
          ? {
              ...prev,
              settings,
            }
          : prev,
      );
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update settings');
    } finally {
      setSettingsSaving(false);
    }
  }, [overview, settingsSaving]);

  const sortedRides = useMemo(() => {
    if (!overview?.rides) return [];
    return [...overview.rides].sort((a, b) => {
      const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
      const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      return tb - ta;
    });
  }, [overview]);

  const [tickets, setTickets] = useState([
    { id: '1', user: 'Felix M.', type: 'Rider', issue: 'Overcharged for trip #1234', status: 'open', date: '2026-03-20' },
    { id: '2', user: 'Abebe B.', type: 'Driver', issue: 'App crashing on pickup', status: 'in-progress', date: '2026-03-19' },
    { id: '3', user: 'Sara K.', type: 'Rider', issue: 'Lost item in car', status: 'closed', date: '2026-03-18' },
  ]);

  const handleDriverVerificationAction = useCallback(
    async (driverId: string, verificationStatus: 'approved' | 'rejected' | 'pending') => {
      setDriverActionId(driverId);
      setError(null);
      try {
        const updated = await updateAdminDriverVerification(driverId, verificationStatus);
        setDrivers((prev) => prev.map((driver) => (driver.id === driverId ? updated : driver)));
        setLastUpdated(new Date());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update driver verification');
      } finally {
        setDriverActionId(null);
      }
    },
    [],
  );

  const handleDriverVehicleAction = useCallback(
    async (driverId: string, vehicleStatus: 'approved' | 'rejected' | 'pending') => {
      setDriverActionId(driverId);
      setError(null);
      try {
        await updateAdminDriverVehicleApproval(driverId, vehicleStatus);
        const refreshed = await fetchAdminDrivers();
        setDrivers(refreshed);
        setLastUpdated(new Date());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update vehicle approval');
      } finally {
        setDriverActionId(null);
      }
    },
    [],
  );

  const handleSavePricing = useCallback(async () => {
    setPricingSaving(true);
    setError(null);
    try {
      const next = await updateAdminPricing(pricing);
      setPricing(next);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update pricing');
    } finally {
      setPricingSaving(false);
    }
  }, [pricing]);

  const handleSavePromo = useCallback(async () => {
    setPromoSaving(true);
    setError(null);
    try {
      const next = await updateAdminPromos(promo);
      setPromo(next);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update promo settings');
    } finally {
      setPromoSaving(false);
    }
  }, [promo]);

  const handleAdminOtpRequest = useCallback(async () => {
    if (authSubmitting || authPhone.replace(/\D/g, '').length < 9) return;
    setAuthSubmitting(true);
    setError(null);
    try {
      await authService.loginWithPhone(authPhone);
      setAuthStep('otp');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to request OTP');
    } finally {
      setAuthSubmitting(false);
    }
  }, [authPhone, authSubmitting]);

  const handleAdminVerify = useCallback(async () => {
    if (authSubmitting || authOtp.trim().length < 4) return;
    setAuthSubmitting(true);
    setError(null);
    try {
      const res = await authService.verifyOtp(authPhone, authOtp.trim());
      if (res.user.role !== 'admin') {
        clearMobileSession();
        setError('This account is not authorized for admin access.');
        setAuthStep('phone');
        return;
      }
      persistSessionAfterVerify(res);
      setAdminUserName(res.user.name);
      setAuthStep('ready');
      setAuthOtp('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to verify OTP');
    } finally {
      setAuthSubmitting(false);
    }
  }, [authOtp, authPhone, authSubmitting]);

  const handleAdminLogout = useCallback(() => {
    clearMobileSession();
    setAuthStep('phone');
    setAuthPhone('');
    setAuthOtp('');
    setAdminUserName('Admin');
    setOverview(null);
    setDrivers([]);
    setRiders([]);
    setError(null);
  }, []);

  if (authStep !== 'ready') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Admin Sign In</h1>
              <p className="text-sm text-slate-500">Use an admin phone number configured in the backend.</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {error}
            </div>
          )}

          {authStep === 'phone' ? (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Phone number</label>
                <input
                  type="tel"
                  placeholder="+251911223344"
                  value={authPhone}
                  onChange={(e) => setAuthPhone(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleAdminOtpRequest()}
                disabled={authSubmitting || authPhone.replace(/\D/g, '').length < 9}
                className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {authSubmitting ? 'Sending OTP…' : 'Send OTP'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">OTP code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter OTP"
                  value={authOtp}
                  onChange={(e) => setAuthOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
                <p className="mt-2 text-xs text-slate-500">Phone: {authPhone}</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAuthStep('phone')}
                  className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void handleAdminVerify()}
                  disabled={authSubmitting || authOtp.trim().length < 4}
                  className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {authSubmitting ? 'Verifying…' : 'Verify OTP'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

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
        
        <nav className="space-y-1.5">
          {(
            [
              { icon: LayoutDashboard, label: 'Dashboard' as const },
              { icon: Users, label: 'Riders' as const },
              { icon: Car, label: 'Drivers' as const },
              { icon: MapIcon, label: 'Live Map' as const, hint: 'Soon' },
              { icon: DollarSign, label: 'Payments' as const },
              { icon: Zap, label: 'Pricing' as const },
              { icon: MessageSquare, label: 'Support' as const, hint: 'Soon' },
            ] as const
          ).map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setActiveTab(item.label);
                setIsSidebarOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left text-sm font-bold transition-all ${
                activeTab === item.label
                  ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-3">
                <item.icon size={18} />
                {item.label}
              </span>
              {'hint' in item && item.hint ? (
                <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                  {item.hint}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50/80 p-4 lg:p-10">
        <header className="mb-8 flex flex-col gap-4 sm:mb-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:bg-slate-50"
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">{activeTab}</h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
                {activeTab === 'Dashboard' &&
                  'Overview of persisted rides, driver status, and operations settings from the same API as the mobile apps.'}
                {activeTab === 'Riders' && 'Rider accounts from the database with ride counts from linked trips.'}
                {activeTab === 'Drivers' &&
                  'Verification, online state, wallet snapshot, and active trips from the backend driver APIs.'}
                {activeTab === 'Live Map' && 'Preview only — not tied to live GPS. Use Dashboard and Drivers for real state.'}
                {activeTab === 'Payments' &&
                  'Driver wallets, commission ledger, top-up approvals, and exported transaction history.'}
                {activeTab === 'Pricing' && 'Fare and promo values stored in app settings. Commission is under Payments.'}
                {activeTab === 'Support' && 'Coming soon — mock ticket list for layout only.'}
              </p>
              {lastUpdated && (
                <p className="mt-2 text-xs font-medium text-slate-400">
                  Last refreshed {formatAdminDateTime(lastUpdated.toISOString())}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={() => void loadOverview()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
              title="Reload overview, riders, drivers, pricing, and promos from API"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              <span className="hidden sm:inline">Refresh data</span>
            </button>
            <button
              type="button"
              onClick={handleAdminLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              title={`Signed in as ${adminUserName}`}
            >
              <ExternalLink size={16} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
            <span
              className="hidden items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-400 sm:inline-flex"
              title="Global search is not implemented yet"
            >
              <Search size={16} />
              Search — coming soon
            </span>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-400 shadow-sm hover:bg-slate-50"
              title="Admin alerts — coming soon"
              disabled
            >
              <Bell size={20} />
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
                    Check <code className="rounded bg-white/80 px-1">VITE_API_BASE_URL</code>, backend auth env, and that you are signed in with an admin account.
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
                    : formatEtb(overview?.summary.completedRevenueEstimate ?? 0, { fractionDigits: 1 }),
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

            <div className="mb-10 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-col gap-1">
                <h2 className="text-xl font-bold text-slate-900">Operations / Settings</h2>
                <p className="text-sm text-slate-500">
                  Manage the current shared backend settings used by admin and the mobile apps.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {[
                  {
                    key: 'requireRideSafetyPin',
                    title: 'Require ride safety PIN',
                    description:
                      'Driver must verify the rider PIN before trip start.',
                    enabled: overview?.settings.requireRideSafetyPin ?? true,
                    onToggle: toggleRequireRideSafetyPin,
                  },
                  {
                    key: 'demoAutoTripProgression',
                    title: 'Demo auto trip progression',
                    description:
                      'Automatically advances assigned trips through arrived, in progress, and completed.',
                    enabled: overview?.settings.demoAutoTripProgression ?? false,
                    onToggle: toggleDemoAutoTripProgression,
                  },
                ].map((setting) => (
                  <div
                    key={setting.key}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{setting.title}</h3>
                        <p className="mt-1 text-sm leading-snug text-slate-500">
                          {setting.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void setting.onToggle()}
                        disabled={!overview || settingsSaving}
                        aria-checked={setting.enabled}
                        className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors ${
                          setting.enabled ? 'border-emerald-700 bg-emerald-600' : 'border-slate-400 bg-slate-200'
                        } disabled:opacity-60`}
                      >
                        <span
                          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                            setting.enabled ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-600">
                      Status: <strong>{setting.enabled ? 'On' : 'Off'}</strong>
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4">
                  <p className="text-sm font-bold text-slate-900">Pricing / promos</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Managed from the Pricing tab. Values are now persisted in backend app settings.
                  </p>
                </div>
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4">
                  <p className="text-sm font-bold text-slate-900">Driver onboarding</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Managed from the Drivers tab. Admin approval now controls the persisted driver verification state used by mobile.
                  </p>
                </div>
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900">Support & global alerts</p>
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Coming soon
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Wallet, top-ups, and commission notifications are under <strong className="text-slate-700">Payments</strong>.
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-slate-600">
                {settingsSaving ? 'Saving operations settings…' : 'Operations settings are persisted in backend app settings.'}
              </p>
            </div>

            {/* Live rides — backend ride rows */}
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold">Live rides</h2>
                  <p className="text-sm text-slate-500">Same persisted records used by mobile rider and driver flows.</p>
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
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3 pr-2">Ride</th>
                        <th className="px-3 py-3 pr-2">Status</th>
                        <th className="px-3 py-3 pr-2">Pickup</th>
                        <th className="px-3 py-3 pr-2">Destination</th>
                        <th className="px-3 py-3 pr-2">Fare</th>
                        <th className="px-3 py-3">Payment</th>
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
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${rideStatusBadgeClass(ride.status)}`}
                            >
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
                          <td className="py-3 pr-2 text-slate-700 tabular-nums">
                            {ride.fareEstimate?.formatted ??
                              (ride.finalFare != null
                                ? formatEtb(ride.finalFare, { fractionDigits: 0 })
                                : ride.fareEstimate?.amount != null
                                  ? formatEtb(ride.fareEstimate.amount, { fractionDigits: 0 })
                                  : '—')}
                          </td>
                          <td className="py-3 text-slate-600">
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                                {(ride.paymentStatus ?? 'unpaid').replace('_', ' ')}
                              </span>
                              {ride.paymentId && (
                                <span className="font-mono text-[11px] text-slate-400">
                                  {ride.paymentId}
                                </span>
                              )}
                            </div>
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
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3">Request</th>
                        <th className="px-3 py-3">Pickup</th>
                        <th className="px-3 py-3">Destination</th>
                        <th className="px-3 py-3">Earning</th>
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

        {activeTab === 'Riders' && (
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm text-sky-950">
              <strong className="font-bold">User records</strong> with role rider. Ride count = persisted rides where this user is the rider.
            </div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Rider directory</h2>
                <p className="mt-1 text-sm text-slate-500">From the database — same ids the mobile apps use when booking.</p>
              </div>
            </div>
            {loading && riders.length === 0 ? (
              <div className="flex items-center gap-2 py-12 text-slate-500">
                <Loader2 className="animate-spin" size={22} />
                Loading…
              </div>
            ) : riders.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
                No rider accounts yet. Sign up as a rider in the app to create rows here.
              </p>
            ) : (
              <div className="overflow-x-auto">
                  <table className="w-full min-w-[1080px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3">Rider id</th>
                        <th className="px-3 py-3">Name</th>
                        <th className="px-3 py-3">Contact</th>
                        <th className="px-3 py-3">Address</th>
                        <th className="px-3 py-3 text-right">Rides</th>
                        <th className="px-3 py-3">Created</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {riders.map((rider) => (
                      <tr key={rider.id} className="group">
                        <td className="max-w-[200px] px-3 py-4">
                          <p className="truncate font-mono text-xs font-bold text-slate-900" title={rider.id}>
                            {rider.id}
                          </p>
                        </td>
                        <td className="px-3 py-4 font-medium text-slate-900">
                          {rider.name ?? ([rider.firstName, rider.lastName].filter(Boolean).join(' ') || '—')}
                        </td>
                        <td className="px-3 py-4 text-slate-600">
                          <p>{rider.phone ?? '—'}</p>
                          <p className="mt-1 text-xs text-slate-500">{rider.email ?? 'No email'}</p>
                        </td>
                        <td className="px-3 py-4 text-slate-600">{rider.address ?? '—'}</td>
                        <td className="px-3 py-4 text-right tabular-nums font-bold text-slate-900">{rider.rideCount}</td>
                        <td className="px-3 py-4 tabular-nums text-slate-600">{formatAdminDateTime(rider.createdAt)}</td>
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
              <h2 className="text-xl font-bold">Driver onboarding and verification</h2>
              <p className="mt-1 text-sm text-slate-500">
                Review the persisted driver profile used by the mobile driver app and manage approval status directly from admin.
              </p>
              {loading && !drivers.length ? (
                <div className="mt-6 flex items-center gap-2 text-slate-500">
                  <Loader2 className="animate-spin" size={22} />
                  Loading…
                </div>
              ) : drivers.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
                  No persisted drivers found yet.
                </p>
              ) : (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[1120px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3 pr-3">Driver</th>
                        <th className="px-3 py-3 pr-3">Name / phone</th>
                        <th className="px-3 py-3 pr-3">Verification</th>
                        <th className="px-3 py-3 pr-3">Vehicle</th>
                        <th className="px-3 py-3 pr-3">Availability</th>
                        <th className="px-3 py-3 pr-3">Wallet</th>
                        <th className="px-3 py-3 pr-3">Unread</th>
                        <th className="px-3 py-3 pr-3">Trips</th>
                        <th className="px-3 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {drivers.map((driver) => (
                        <tr key={driver.id}>
                          <td className="py-4 pr-3">
                            <p className="font-mono text-xs font-bold text-slate-900">{driver.id}</p>
                            <p className="mt-1 font-mono text-[11px] text-slate-500">{driver.userId}</p>
                          </td>
                          <td className="py-4 pr-3">
                            <p className="font-bold text-slate-900">
                              {driver.name ?? ([driver.firstName, driver.lastName].filter(Boolean).join(' ') || 'Unnamed driver')}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">{driver.phone ?? 'No phone on file'}</p>
                            <p className="mt-1 text-xs text-slate-500">{driver.email ?? 'No email on file'}</p>
                            <p className="mt-1 text-xs text-slate-400">{driver.address ?? 'No address on file'}</p>
                          </td>
                          <td className="py-4 pr-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                driver.isVerified
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : driver.verificationStatus === 'rejected'
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {driver.verificationStatus}
                            </span>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Updated {formatAdminDateTime(driver.updatedAt)}
                            </p>
                          </td>
                          <td className="py-4 pr-3">
                            <p className="font-bold text-slate-900">{driver.vehicleSummary ?? 'No vehicle'}</p>
                            <p className="mt-1 text-xs text-slate-500">{driver.vehicleTagNumber ?? 'No plate / tag'}</p>
                            <span
                              className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                driver.vehicleStatus === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : driver.vehicleStatus === 'rejected'
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {driver.vehicleStatus ?? 'missing'}
                            </span>
                          </td>
                          <td className="py-4 pr-3">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold ${
                                driver.online ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              <Radio size={14} />
                              {driver.online ? 'Online' : 'Offline'}
                            </span>
                          </td>
                          <td className="py-4 pr-3">
                            <p className="font-bold tabular-nums text-slate-900">
                              {formatEtb(driver.walletBalance ?? undefined)}
                            </p>
                            <span
                              className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${walletEligibilityBadgeClass(
                                Boolean(driver.walletBlocked),
                                Boolean(driver.walletBelowWarning && !driver.walletBlocked),
                              )}`}
                            >
                              {driver.walletBlocked
                                ? 'Blocked'
                                : driver.walletBelowWarning
                                  ? 'Low balance'
                                  : 'Eligible'}
                            </span>
                          </td>
                          <td className="py-4 pr-3">
                            {(driver.walletUnreadNotifications ?? 0) > 0 ? (
                              <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700">
                                {driver.walletUnreadNotifications}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-4 pr-3 font-bold text-slate-900">{driver.activeTripCount}</td>
                          <td className="py-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={driverActionId === driver.id || driver.verificationStatus === 'approved'}
                                onClick={() => void handleDriverVerificationAction(driver.id, 'approved')}
                                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={driverActionId === driver.id || driver.verificationStatus === 'rejected'}
                                onClick={() => void handleDriverVerificationAction(driver.id, 'rejected')}
                                className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                disabled={driverActionId === driver.id || driver.verificationStatus === 'pending'}
                                onClick={() => void handleDriverVerificationAction(driver.id, 'pending')}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-60"
                              >
                                Mark pending
                              </button>
                              <button
                                type="button"
                                disabled={driverActionId === driver.id || driver.vehicleStatus === 'approved'}
                                onClick={() => void handleDriverVehicleAction(driver.id, 'approved')}
                                className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-800 disabled:opacity-60"
                              >
                                Approve vehicle
                              </button>
                              <button
                                type="button"
                                disabled={driverActionId === driver.id || driver.vehicleStatus === 'rejected'}
                                onClick={() => void handleDriverVehicleAction(driver.id, 'rejected')}
                                className="rounded-xl bg-red-100 px-3 py-2 text-xs font-bold text-red-800 disabled:opacity-60"
                              >
                                Reject vehicle
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3">Trip</th>
                        <th className="px-3 py-3">Ride</th>
                        <th className="px-3 py-3">Started</th>
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
                          <td className="py-3 text-slate-600 tabular-nums">
                            {formatAdminDateTime(t.startedAt)}
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
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <strong className="font-bold">Preview only</strong> — decorative markers, not live GPS. Online:{' '}
              <span className="tabular-nums font-semibold">{overview?.driverOnline ? 'yes' : 'no'}</span>, active trips:{' '}
              <span className="tabular-nums font-semibold">{overview?.summary.activeTrips ?? 0}</span>.
            </div>
            <div className="relative h-[560px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-inner">
              <div
                className="absolute inset-0 opacity-40"
                style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '20px 20px' }}
              />
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="max-w-md text-center">
                  <MapIcon size={48} className="mx-auto mb-4 text-slate-300" />
                  <p className="font-bold text-slate-600">Live map — coming soon</p>
                  <p className="mt-2 text-xs text-slate-500">Map integration can plug in here later.</p>
                </div>
              </div>
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
                    y: [0, Math.random() * 20 - 10, 0],
                  }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="pointer-events-none absolute flex flex-col items-center gap-1"
                  style={{ top: d.top, left: d.left }}
                >
                  <div className="rounded-lg bg-emerald-600/90 p-1.5 text-white shadow-lg ring-2 ring-white/80">
                    <Car size={16} />
                  </div>
                  <span className="rounded bg-white/95 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500 shadow-sm ring-1 ring-slate-200">
                    Demo · {d.name}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Payments' && (
          <div className="space-y-6">
            {overview && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
                <strong className="font-bold">Completed ride revenue (estimate):</strong>{' '}
                <span className="tabular-nums font-semibold">
                  {formatEtb(overview.summary.completedRevenueEstimate, { fractionDigits: 1 })}
                </span>{' '}
                — platform commission is tracked separately in driver wallets (
                <span className="tabular-nums font-semibold">{commissionRateDisplay}%</span> of completed trip fare per{' '}
                <strong className="font-semibold">Payments → Wallet balances</strong> settings).
              </div>
            )}

            {paymentsError && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <AlertCircle className="mt-0.5 shrink-0" size={20} />
                <p>{paymentsError}</p>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="-mx-1 flex gap-1 overflow-x-auto pb-1 sm:mx-0 sm:flex-wrap sm:pb-0">
                {PAYMENTS_SUBVIEWS.map((sv) => (
                  <button
                    key={sv.id}
                    type="button"
                    onClick={() => setPaymentsSubview(sv.id)}
                    className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-colors sm:text-sm ${
                      paymentsSubview === sv.id
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {sv.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void loadPaymentsData()}
                disabled={paymentsLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-60"
              >
                {paymentsLoading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                Refresh wallet data
              </button>
            </div>

            <div
              className={paymentsSubview === 'export' ? 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5' : 'hidden'}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <p className="max-w-xl text-sm leading-relaxed text-slate-600">
                  CSV export includes the full transaction feed. <strong className="font-semibold text-slate-800">Print tables</strong> uses the browser
                  print dialog; only the report block (<code className="rounded bg-slate-100 px-1 text-xs">#wallet-print-root</code>) is visible on paper.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void downloadAdminWalletTransactionsCsv().catch((err) =>
                        setPaymentsError(err instanceof Error ? err.message : 'CSV export failed'),
                      );
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50"
                  >
                    <Download size={18} />
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
                  >
                    <Printer size={18} />
                    Print tables
                  </button>
                </div>
              </div>
            </div>

            <div id="wallet-print-root" className="space-y-6">
              <div className="mb-2 border-b border-slate-200 pb-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Zeyago Admin</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">Payments &amp; wallet report</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Generated <span className="tabular-nums font-medium">{formatAdminDateTime(new Date().toISOString())}</span>
                </p>
              </div>
              <div
                className={
                  paymentsSubview === 'balances' ? 'space-y-6' : 'hidden space-y-6 print:block'
                }
              >
                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
                  <h2 className="text-xl font-bold text-slate-900">Platform commission</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Applied on trip completion from the driver wallet (same rate used in ledger reason lines). Flat-fee types can be added later.
                  </p>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Commission type
                      </label>
                      <select
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700"
                        value={commissionForm.commissionType}
                        disabled
                        title="Only percentage is supported for now"
                      >
                        <option value="percent">Percent of trip fare</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Rate (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        className="w-full rounded-xl border border-slate-200 p-3 text-sm font-bold tabular-nums outline-none focus:ring-2 focus:ring-emerald-500/20"
                        value={commissionForm.commissionRate}
                        onChange={(e) =>
                          setCommissionForm((prev) => ({
                            ...prev,
                            commissionRate: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={commissionSaving}
                    onClick={() => {
                      setCommissionSaving(true);
                      setPaymentsError(null);
                      void updateAdminCommission({
                        commissionType: 'percent',
                        commissionRate: commissionForm.commissionRate,
                      })
                        .then(() => void loadOverview())
                        .catch((err) =>
                          setPaymentsError(err instanceof Error ? err.message : 'Failed to save commission'),
                        )
                        .finally(() => setCommissionSaving(false));
                    }}
                    className="mt-4 w-full rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60 sm:w-auto sm:px-8"
                  >
                    {commissionSaving ? 'Saving…' : 'Save commission settings'}
                  </button>
                </div>
                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-xl font-bold text-slate-900">Driver wallet balances</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Same drivers as the Drivers tab — balance and eligibility from backend `DriverWallet`.
                </p>
                {loading && !drivers.length ? (
                  <div className="mt-6 flex items-center gap-2 text-slate-500">
                    <Loader2 className="animate-spin" size={22} />
                    Loading…
                  </div>
                ) : drivers.length === 0 ? (
                  <p className="mt-6 text-sm text-slate-500">No drivers yet.</p>
                ) : (
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-3 pr-2">Driver</th>
                          <th className="px-3 py-3 pr-2">Balance</th>
                          <th className="px-3 py-3 pr-2">Min / warn</th>
                          <th className="px-3 py-3 pr-2">Unread</th>
                          <th className="px-3 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {drivers.map((d) => (
                          <tr key={d.id}>
                            <td className="py-3 pr-2 font-mono text-xs text-slate-700">{d.id}</td>
                            <td className="py-3 pr-2 font-bold tabular-nums text-slate-900">{formatEtb(d.walletBalance ?? undefined)}</td>
                            <td className="py-3 pr-2 text-slate-600 tabular-nums">
                              {d.walletMinBalance != null || d.walletWarningThreshold != null
                                ? `${formatEtb(d.walletMinBalance ?? undefined)} / ${formatEtb(d.walletWarningThreshold ?? undefined)}`
                                : '—'}
                            </td>
                            <td className="py-3 pr-2 tabular-nums text-slate-700">{d.walletUnreadNotifications ?? 0}</td>
                            <td className="py-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${walletEligibilityBadgeClass(
                                  Boolean(d.walletBlocked),
                                  Boolean(d.walletBelowWarning && !d.walletBlocked),
                                )}`}
                              >
                                {d.walletBlocked ? 'Blocked' : d.walletBelowWarning ? 'Warning' : 'OK'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              </div>

              <div
                className={
                  paymentsSubview === 'topups' ? 'space-y-6' : 'hidden space-y-6 print:block'
                }
              >
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Top-up requests</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Verify Telebirr / bank / cash reference, open proof in a new tab, then approve or reject.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'all' as const, label: 'All' },
                        { id: 'pending' as const, label: 'Pending' },
                        { id: 'approved' as const, label: 'Approved' },
                        { id: 'rejected' as const, label: 'Rejected' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setTopUpStatusFilter(f.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                          topUpStatusFilter === f.id
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3 pr-2">Created</th>
                        <th className="px-3 py-3 pr-2">Driver</th>
                        <th className="px-3 py-3 pr-2">Amount</th>
                        <th className="px-3 py-3 pr-2">Method</th>
                        <th className="px-3 py-3 pr-2">Reference</th>
                        <th className="px-3 py-3 pr-2">Proof</th>
                        <th className="px-3 py-3 pr-2">Status</th>
                        <th className="px-3 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTopUpRequests.map((r) => (
                        <tr key={r.id} className="align-top">
                          <td className="whitespace-nowrap py-3 pr-2 text-xs tabular-nums text-slate-600">
                            {formatAdminDateTime(r.createdAt)}
                          </td>
                          <td className="py-3 pr-2 font-mono text-[11px] text-slate-800">{r.driverId}</td>
                          <td className="py-3 pr-2 font-bold tabular-nums text-slate-900">{formatEtb(r.amount)}</td>
                          <td className="py-3 pr-2">
                            <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                              {r.method}
                            </span>
                          </td>
                          <td className="max-w-[min(220px,28vw)] py-3 pr-2">
                            <span className="break-all font-mono text-[11px] leading-snug text-slate-800" title={r.reference}>
                              {r.reference}
                            </span>
                          </td>
                          <td className="py-3 pr-2">
                            {r.proofUrl ? (
                              <a
                                href={r.proofUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-600/20 transition-colors hover:bg-emerald-100"
                              >
                                <ExternalLink size={14} strokeWidth={2.25} className="shrink-0" />
                                Open proof
                              </a>
                            ) : (
                              <span className="text-[11px] font-medium text-slate-400">No file</span>
                            )}
                          </td>
                          <td className="py-3 pr-2">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${topUpStatusBadgeClass(r.status)}`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3">
                            {r.status === 'pending' ? (
                              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                <button
                                  type="button"
                                  disabled={topUpActionId === r.id}
                                  onClick={() => {
                                    setTopUpActionId(r.id);
                                    void approveAdminTopUpRequest(r.id)
                                      .then(() => {
                                        void loadPaymentsData();
                                        void loadOverview();
                                      })
                                      .catch((err) =>
                                        setPaymentsError(err instanceof Error ? err.message : 'Approve failed'),
                                      )
                                      .finally(() => setTopUpActionId(null));
                                  }}
                                  className="inline-flex min-h-[2.25rem] min-w-[6.5rem] items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white shadow-sm disabled:opacity-60"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={topUpActionId === r.id}
                                  onClick={() => {
                                    setTopUpActionId(r.id);
                                    void rejectAdminTopUpRequest(r.id)
                                      .then(() => void loadPaymentsData())
                                      .catch((err) =>
                                        setPaymentsError(err instanceof Error ? err.message : 'Reject failed'),
                                      )
                                      .finally(() => setTopUpActionId(null));
                                  }}
                                  className="inline-flex min-h-[2.25rem] min-w-[6.5rem] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-800 shadow-sm disabled:opacity-60"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] font-medium text-slate-500" title={r.reviewedBy ?? ''}>
                                {r.reviewedBy ? `By ${r.reviewedBy}` : '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!paymentsLoading && topUpRequests.length === 0 && (
                    <p className="mt-4 text-sm text-slate-500">No top-up requests.</p>
                  )}
                  {!paymentsLoading && topUpRequests.length > 0 && filteredTopUpRequests.length === 0 && (
                    <p className="mt-4 text-sm text-slate-500">No requests match this filter.</p>
                  )}
                </div>
              </div>
              </div>

              <div
                className={
                  paymentsSubview === 'commission' ? 'space-y-6' : 'hidden space-y-6 print:block'
                }
              >
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-xl font-bold text-slate-900">Commission ledger</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Rows with type <code className="rounded bg-slate-100 px-1">commission</code> — debited at{' '}
                  <span className="font-semibold tabular-nums">{commissionRateDisplay}%</span> of trip fare (unless capped by wallet floor).
                </p>
                {paymentsLoading && walletTransactions.length === 0 ? (
                  <div className="mt-6 flex items-center gap-2 text-slate-500">
                    <Loader2 className="animate-spin" size={22} />
                    Loading…
                  </div>
                ) : (
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-[800px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-3 pr-2">Time</th>
                          <th className="px-3 py-3 pr-2">Driver</th>
                          <th className="px-3 py-3 pr-2">Type</th>
                          <th className="px-3 py-3 pr-2">Amount</th>
                          <th className="px-3 py-3 pr-2">Ride</th>
                          <th className="px-3 py-3 pr-2">Due / applied</th>
                          <th className="px-3 py-3">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {walletTransactions
                          .filter((t) => t.type === 'commission')
                          .map((t) => (
                            <tr key={t.id}>
                              <td className="max-w-[140px] py-3 pr-2 text-xs tabular-nums text-slate-500">
                                {formatAdminDateTime(t.createdAt)}
                              </td>
                              <td className="py-3 pr-2 font-mono text-xs">{t.driverId}</td>
                              <td className="py-3 pr-2 capitalize">{t.type}</td>
                              <td className="py-3 pr-2 font-bold tabular-nums text-slate-900">{formatEtb(t.amount)}</td>
                              <td className="max-w-[120px] py-3 pr-2 font-mono text-[11px] text-slate-600">
                                {t.rideId ?? '—'}
                              </td>
                              <td className="max-w-[140px] py-3 pr-2 text-[11px] tabular-nums text-slate-600">
                                {t.metadata &&
                                typeof t.metadata.commissionDue === 'number' &&
                                typeof t.metadata.commissionApplied === 'number'
                                  ? `${formatEtb(t.metadata.commissionDue)} / ${formatEtb(t.metadata.commissionApplied)}${
                                      t.metadata.capped ? ' (capped)' : ''
                                    }`
                                  : '—'}
                              </td>
                              <td className="max-w-[320px] py-3 text-slate-600">
                                <span className="line-clamp-2" title={t.reason}>
                                  {t.reason}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {walletTransactions.filter((t) => t.type === 'commission').length === 0 && (
                      <p className="mt-4 text-sm text-slate-500">No commission rows yet.</p>
                    )}
                  </div>
                )}
              </div>
              </div>

              <div
                className={
                  paymentsSubview === 'transactions' ? 'space-y-6' : 'hidden space-y-6 print:block'
                }
              >
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Full transaction history</h2>
                    <p className="mt-1 text-sm text-slate-500">Credits, debits, and commissions — filter for review; CSV export is unchanged.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Type</span>
                    <select
                      value={ledgerTypeFilter}
                      onChange={(e) => setLedgerTypeFilter(e.target.value as typeof ledgerTypeFilter)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm"
                    >
                      <option value="all">All types</option>
                      <option value="commission">Commission</option>
                      <option value="credit">Credit</option>
                      <option value="debit">Debit</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-[880px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3 pr-2">Time</th>
                        <th className="px-3 py-3 pr-2">Driver</th>
                        <th className="px-3 py-3 pr-2">Type</th>
                        <th className="px-3 py-3 pr-2">Amount</th>
                        <th className="px-3 py-3 pr-2">Ledger meta</th>
                        <th className="px-3 py-3">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredWalletTransactions.map((t) => (
                        <tr key={t.id}>
                          <td className="max-w-[140px] py-3 pr-2 text-xs tabular-nums text-slate-500">
                            {formatAdminDateTime(t.createdAt)}
                          </td>
                          <td className="py-3 pr-2 font-mono text-xs">{t.driverId}</td>
                          <td className="py-3 pr-2 capitalize">{t.type}</td>
                          <td className="py-3 pr-2 font-bold tabular-nums text-slate-900">{formatEtb(t.amount)}</td>
                          <td className="max-w-[200px] py-3 pr-2 font-mono text-[10px] text-slate-500">
                            {t.metadata
                              ? JSON.stringify(t.metadata).length > 96
                                ? `${JSON.stringify(t.metadata).slice(0, 93)}…`
                                : JSON.stringify(t.metadata)
                              : '—'}
                          </td>
                          <td className="max-w-[400px] py-3 text-slate-600">
                            <span className="line-clamp-2" title={t.reason}>
                              {t.reason}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!paymentsLoading && walletTransactions.length === 0 && (
                    <p className="mt-4 text-sm text-slate-500">No ledger rows yet.</p>
                  )}
                  {!paymentsLoading && walletTransactions.length > 0 && filteredWalletTransactions.length === 0 && (
                    <p className="mt-4 text-sm text-slate-500">No rows match this type filter.</p>
                  )}
                </div>
              </div>
              </div>

              <div
                className={
                  paymentsSubview === 'notifications' ? 'space-y-6' : 'hidden space-y-6 print:block'
                }
              >
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-xl font-bold text-slate-900">Driver notifications</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Wallet, top-up, and commission events persisted for drivers (unread highlighted).
                </p>
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[960px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3 pr-2">Time</th>
                        <th className="px-3 py-3 pr-2">Driver</th>
                        <th className="px-3 py-3 pr-2">Type</th>
                        <th className="px-3 py-3 pr-2">Read</th>
                        <th className="px-3 py-3">Title / body</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {walletNotifications.map((n) => (
                        <tr key={n.id} className={n.read ? '' : 'bg-rose-50/40'}>
                          <td className="py-3 pr-2 text-xs tabular-nums text-slate-500">
                            {formatAdminDateTime(n.createdAt)}
                          </td>
                          <td className="py-3 pr-2 font-mono text-xs">{n.driverId}</td>
                          <td className="py-3 pr-2 text-[11px] capitalize text-slate-700">{n.type}</td>
                          <td className="py-3 pr-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                n.read ? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' : 'bg-rose-100 text-rose-800 ring-1 ring-rose-200'
                              }`}
                            >
                              {n.read ? 'Read' : 'Unread'}
                            </span>
                          </td>
                          <td className="max-w-[480px] py-3 text-slate-700">
                            <p className="font-bold">{n.title}</p>
                            <p className="mt-0.5 text-xs text-slate-600">{n.body}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!paymentsLoading && walletNotifications.length === 0 && (
                    <p className="mt-4 text-sm text-slate-500">No notifications yet.</p>
                  )}
                </div>
              </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Pricing' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-950">
              <strong className="font-bold">Saved in app settings.</strong> Trip commission rate is under{' '}
              <strong className="font-semibold">Payments → Wallet balances</strong>.
            </div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
              <h3 className="mb-2 text-lg font-bold text-slate-900">Core pricing</h3>
              <p className="mb-6 text-sm text-slate-500">
                Base fare, distance/time rates, minimum fare, and cancellation fee (ETB).
              </p>
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
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Rate per Minute (ETB)</label>
                  <input 
                    type="number" 
                    className="w-full rounded-xl border border-slate-200 p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={pricing.perMinuteRate}
                    onChange={(e) => setPricing({...pricing, perMinuteRate: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Minimum Fare (ETB)</label>
                  <input 
                    type="number" 
                    className="w-full rounded-xl border border-slate-200 p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={pricing.minimumFare}
                    onChange={(e) => setPricing({...pricing, minimumFare: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Cancellation Fee (ETB)</label>
                  <input 
                    type="number" 
                    className="w-full rounded-xl border border-slate-200 p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={pricing.cancellationFee}
                    onChange={(e) => setPricing({...pricing, cancellationFee: Number(e.target.value)})}
                  />
                </div>
                <button
                  onClick={() => void handleSavePricing()}
                  disabled={pricingSaving}
                  className="w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-100 disabled:opacity-60"
                >
                  {pricingSaving ? 'Saving pricing…' : 'Save Pricing Settings'}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Promotions</h3>
                  <p className="mt-1 text-sm text-slate-500">Promo code, discount type, and active flags — stored server-side.</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Promotions enabled</p>
                    <p className="text-xs text-slate-500">Master switch for promo availability.</p>
                  </div>
                  <button
                    onClick={() => setPromo({ ...promo, enabled: !promo.enabled })}
                    className={`relative h-6 w-12 rounded-full transition-colors ${promo.enabled ? 'bg-emerald-600' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${promo.enabled ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Promo Code</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 p-4 font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={promo.code}
                    onChange={(e) => setPromo({ ...promo, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Discount Type</label>
                    <select
                      className="w-full rounded-xl border border-slate-200 p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={promo.discountType}
                      onChange={(e) => setPromo({ ...promo, discountType: e.target.value as 'fixed' | 'percent' })}
                    >
                      <option value="percent">Percent</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Discount Amount</label>
                    <input
                      type="number"
                      className="w-full rounded-xl border border-slate-200 p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={promo.discountAmount}
                      onChange={(e) => setPromo({ ...promo, discountAmount: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Promo active</p>
                    <p className="text-xs text-slate-500">Controls whether the saved promo should be treated as active.</p>
                  </div>
                  <button
                    onClick={() => setPromo({ ...promo, active: !promo.active })}
                    className={`relative h-6 w-12 rounded-full transition-colors ${promo.active ? 'bg-emerald-600' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${promo.active ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                <button
                  onClick={() => void handleSavePromo()}
                  disabled={promoSaving}
                  className="w-full rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-lg shadow-slate-200 disabled:opacity-60"
                >
                  {promoSaving ? 'Saving promo…' : 'Save Promo Settings'}
                </button>
              </div>
            </div>
            </div>
          </div>
        )}

        {activeTab === 'Support' && (
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <strong className="font-bold">Coming soon</strong> — mock rows only; no support API yet.
            </div>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold text-slate-900">Support tickets</h2>
              <button
                type="button"
                disabled
                className="w-fit rounded-xl border border-dashed border-slate-200 px-4 py-2 text-sm font-bold text-slate-400"
                title="Coming soon"
              >
                Filter — coming soon
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">User</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Issue</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Actions</th>
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
                        <button
                          type="button"
                          disabled
                          className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-400"
                          title="Coming soon"
                        >
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
