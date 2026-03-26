import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, Loader2, Bell, ChevronRight, FileText, Upload, CheckCircle, ImageIcon } from '../lucideIcons';
import { useMobileApp } from '../../context/MobileAppContext';
import { driverRideService } from '../../services/api';
import type {
  DriverTopUpRequestRow,
  DriverWalletSnapshot,
  DriverWalletTransactionRow,
} from '../../types/api';

function formatWalletTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function topUpStatusBadge(status: string): { label: string; className: string } {
  const s = status.toLowerCase();
  if (s === 'approved') {
    return { label: 'Approved', className: 'bg-emerald-50 text-emerald-800 ring-emerald-600/15' };
  }
  if (s === 'rejected') {
    return { label: 'Rejected', className: 'bg-slate-100 text-slate-700 ring-slate-400/20' };
  }
  return { label: 'Pending', className: 'bg-amber-50 text-amber-900 ring-amber-600/20' };
}

export function DriverWalletScreen() {
  const { showDriverWallet, setShowDriverWallet, setShowNotifications, refreshDriverWallet } = useMobileApp();
  const [snapshot, setSnapshot] = useState<DriverWalletSnapshot | null>(null);
  const [transactions, setTransactions] = useState<DriverWalletTransactionRow[]>([]);
  const [topUps, setTopUps] = useState<DriverTopUpRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [method, setMethod] = useState<'telebirr' | 'bank' | 'cash'>('telebirr');
  const [submitting, setSubmitting] = useState(false);
  const [lastCreatedTopUpId, setLastCreatedTopUpId] = useState<string | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofSelectedFileName, setProofSelectedFileName] = useState<string | null>(null);
  const [proofAttachRequestId, setProofAttachRequestId] = useState<string | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const sortedTopUps = useMemo(
    () =>
      [...topUps].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [topUps],
  );

  const pendingTopUps = useMemo(() => sortedTopUps.filter((r) => r.status === 'pending'), [sortedTopUps]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [w, tx, tu] = await Promise.all([
        driverRideService.getWallet(),
        driverRideService.listWalletTransactions(),
        driverRideService.listTopUpRequests(),
      ]);
      setSnapshot(w);
      setTransactions(tx.transactions);
      setTopUps(tu.requests);
      void refreshDriverWallet();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  }, [refreshDriverWallet]);

  useEffect(() => {
    if (showDriverWallet) {
      void load();
    }
  }, [showDriverWallet, load]);

  useEffect(() => {
    if (lastCreatedTopUpId) {
      setProofAttachRequestId(lastCreatedTopUpId);
    }
  }, [lastCreatedTopUpId]);

  useEffect(() => {
    if (!proofAttachRequestId && pendingTopUps.length > 0) {
      setProofAttachRequestId(pendingTopUps[0].id);
    }
  }, [pendingTopUps, proofAttachRequestId]);

  useEffect(() => {
    if (
      proofAttachRequestId &&
      pendingTopUps.length > 0 &&
      !pendingTopUps.some((p) => p.id === proofAttachRequestId)
    ) {
      setProofAttachRequestId(pendingTopUps[0].id);
    }
  }, [pendingTopUps, proofAttachRequestId]);

  const submitTopUp = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 1) return;
    setSubmitting(true);
    setError(null);
    try {
      const { id } = await driverRideService.submitTopUpRequest({
        amount: Math.round(n),
        method,
        reference: reference.trim() || 'n/a',
      });
      setLastCreatedTopUpId(id);
      setAmount('');
      setReference('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const uploadProofFor = async (requestId: string, file: File | null) => {
    if (!file) return;
    setProofUploading(true);
    setError(null);
    try {
      await driverRideService.uploadTopUpProof(requestId, file);
      if (proofInputRef.current) proofInputRef.current.value = '';
      setProofSelectedFileName(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setProofUploading(false);
    }
  };

  const statusChip = snapshot
    ? snapshot.blocked
      ? { label: 'Blocked', className: 'bg-red-50 text-red-800 ring-red-600/20' }
      : snapshot.belowWarning
        ? { label: 'Low balance', className: 'bg-amber-50 text-amber-900 ring-amber-600/25' }
        : { label: 'Active', className: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20' }
    : null;

  return (
    <AnimatePresence>
      {showDriverWallet && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDriverWallet(false)}
            className="absolute inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute inset-x-0 bottom-0 z-[90] flex max-h-[min(90vh,780px)] flex-col overflow-hidden rounded-t-[2.5rem] bg-[#f8f9fb] shadow-2xl ring-1 ring-slate-200/80"
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-5 pb-[max(1.75rem,env(safe-area-inset-bottom,0px))] pt-6">
              <div className="mb-6 flex shrink-0 items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Wallet</p>
                  <h3 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900">Driver balance</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDriverWallet(false)}
                  className="rounded-full bg-white p-2.5 text-slate-600 shadow-sm ring-1 ring-slate-200/80 transition-colors hover:bg-slate-50"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {loading && !snapshot ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
                  <Loader2 className="animate-spin" size={24} />
                  <p className="text-sm font-medium">Loading wallet…</p>
                </div>
              ) : snapshot ? (
                <>
                  {/* Balance + thresholds + status */}
                  <section className="mb-6 overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Available balance
                        </p>
                        <p className="mt-1 font-mono text-4xl font-black tabular-nums tracking-tight text-slate-900">
                          <span className="text-lg font-bold text-slate-400">ETB</span>{' '}
                          {snapshot.balance.toLocaleString()}
                        </p>
                      </div>
                      {statusChip && (
                        <span
                          className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ${statusChip.className}`}
                        >
                          {statusChip.label}
                        </span>
                      )}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
                      <div className="rounded-xl bg-slate-50/80 px-3 py-2.5 ring-1 ring-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Min. to drive</p>
                        <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-slate-900">
                          ETB {snapshot.minBalance.toLocaleString()}
                        </p>
                        <p className="mt-1 text-[10px] leading-snug text-slate-500">Needed to receive trip offers</p>
                      </div>
                      <div className="rounded-xl bg-slate-50/80 px-3 py-2.5 ring-1 ring-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Warning level</p>
                        <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-slate-900">
                          ETB {snapshot.warningThreshold.toLocaleString()}
                        </p>
                        <p className="mt-1 text-[10px] leading-snug text-slate-500">Top up before you hit this</p>
                      </div>
                    </div>

                    {snapshot.blocked && (
                      <div className="mt-4 flex gap-2.5 rounded-xl bg-amber-50/90 p-3.5 ring-1 ring-amber-200/60">
                        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" />
                        <div className="min-w-0 text-xs leading-relaxed text-amber-950">
                          <p className="font-bold">You can’t receive new trips yet</p>
                          <p className="mt-1 text-amber-900/90">
                            Submit a top-up and wait for admin approval to get back above the minimum.
                          </p>
                        </div>
                      </div>
                    )}
                    {!snapshot.blocked && snapshot.belowWarning && (
                      <div className="mt-4 flex gap-2.5 rounded-xl bg-sky-50/90 p-3.5 ring-1 ring-sky-200/60">
                        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-sky-700" />
                        <p className="text-xs font-medium leading-relaxed text-sky-950">
                          You’re below the warning threshold — topping up soon avoids interruptions.
                        </p>
                      </div>
                    )}
                  </section>

                  {/* Wallet / top-up messages live in main Notifications */}
                  <section className="mb-6 rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200/70">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200/80">
                        <Bell size={18} className="text-slate-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900">Wallet &amp; top-up updates</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                          Approvals, balance alerts, and commission notices are in your main Notifications list.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDriverWallet(false);
                            setShowNotifications(true);
                          }}
                          className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-velox-primary underline decoration-velox-primary/30 underline-offset-2"
                        >
                          View wallet updates in Notifications
                          <ChevronRight size={14} strokeWidth={2.5} className="opacity-80" />
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Top-up form */}
                  <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                    <h4 className="text-sm font-bold text-slate-900">Request a top-up</h4>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Admin will review and credit your wallet after verification.
                    </p>

                    <div className="mt-5 space-y-5">
                      <div>
                        <label htmlFor="wallet-topup-amount" className="mb-1.5 block text-xs font-bold text-slate-800">
                          Amount
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                            ETB
                          </span>
                          <input
                            id="wallet-topup-amount"
                            type="number"
                            min={1}
                            step={1}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full rounded-xl border-0 bg-slate-50 py-3 pl-12 pr-3 font-mono text-base font-bold tabular-nums text-slate-900 ring-1 ring-slate-200/80 transition-shadow placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-velox-primary/25"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="wallet-topup-method" className="mb-1.5 block text-xs font-bold text-slate-800">
                          How you paid
                        </label>
                        <select
                          id="wallet-topup-method"
                          value={method}
                          onChange={(e) => setMethod(e.target.value as 'telebirr' | 'bank' | 'cash')}
                          className="w-full appearance-none rounded-xl border-0 bg-slate-50 py-3 pl-3 pr-10 text-sm font-semibold text-slate-900 ring-1 ring-slate-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-velox-primary/25"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.75rem center',
                          }}
                        >
                          <option value="telebirr">Telebirr</option>
                          <option value="bank">Bank transfer</option>
                          <option value="cash">Cash at office</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="wallet-topup-ref" className="mb-1.5 block text-xs font-bold text-slate-800">
                          {method === 'cash' ? 'Receipt or reference' : 'Transaction reference'}
                        </label>
                        <input
                          id="wallet-topup-ref"
                          type="text"
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                          placeholder={
                            method === 'cash'
                              ? 'Receipt #, staff name, or office note'
                              : 'Paste your transfer reference'
                          }
                          className="w-full rounded-xl border-0 bg-slate-50 px-3 py-3 text-sm text-slate-900 ring-1 ring-slate-200/80 transition-shadow placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-velox-primary/25"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void submitTopUp()}
                      disabled={submitting}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-velox-primary py-3.5 text-sm font-bold text-white shadow-md shadow-velox-primary/20 transition-opacity disabled:opacity-55"
                    >
                      {submitting ? 'Submitting…' : 'Submit for approval'}
                      {!submitting && <ChevronRight size={18} strokeWidth={2.5} className="opacity-90" />}
                    </button>
                  </section>

                  {/* Payment proof — after request, attach receipt for faster admin review */}
                  <section className="mb-6 overflow-hidden rounded-2xl border border-velox-primary/15 bg-gradient-to-b from-violet-50/80 to-white p-5 ring-1 ring-violet-100">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-violet-100">
                        <ImageIcon size={22} className="text-velox-primary" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-slate-900">Add payment proof</h4>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          After you pay (Telebirr, bank, or cash), attach a <strong className="font-semibold text-slate-800">screenshot or photo</strong> of the
                          confirmation or receipt. Admin uses this to match your transfer — JPEG, PNG, or WebP, max 5&nbsp;MB.
                        </p>
                        <ul className="mt-2 space-y-1 text-[11px] leading-snug text-slate-500">
                          <li>
                            <span className="font-semibold text-slate-700">Telebirr / bank:</span> success screen or SMS-style confirmation.
                          </li>
                          <li>
                            <span className="font-semibold text-slate-700">Cash:</span> stamped receipt or signed slip photo.
                          </li>
                        </ul>
                      </div>
                    </div>

                    {pendingTopUps.length > 0 ? (
                      <div className="mt-4">
                        <label htmlFor="proof-target" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          Link proof to request
                        </label>
                        <select
                          id="proof-target"
                          value={proofAttachRequestId ?? ''}
                          onChange={(e) => setProofAttachRequestId(e.target.value || null)}
                          className="w-full rounded-xl border-0 bg-white py-3 pl-3 pr-10 text-sm font-semibold text-slate-900 ring-1 ring-slate-200/90 focus:outline-none focus:ring-2 focus:ring-velox-primary/25"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.75rem center',
                          }}
                        >
                          {pendingTopUps.map((r) => (
                            <option key={r.id} value={r.id}>
                              ETB {r.amount.toLocaleString()} · {r.method} · {formatWalletTime(r.createdAt)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <p className="mt-4 rounded-xl bg-white/80 px-3 py-2.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-100">
                        Submit a top-up request above first — then you can attach proof to that pending request.
                      </p>
                    )}

                    <div className="mt-4">
                      <input
                        ref={proofInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          setProofSelectedFileName(f?.name ?? null);
                        }}
                        className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-800 file:ring-1 file:ring-slate-200"
                      />
                      {proofSelectedFileName ? (
                        <p className="mt-2 flex items-center gap-2 text-[11px] font-medium text-slate-700">
                          <FileText size={14} className="shrink-0 text-slate-500" />
                          <span className="truncate">{proofSelectedFileName}</span>
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      disabled={proofUploading || !proofAttachRequestId || pendingTopUps.length === 0}
                      onClick={() => {
                        const f = proofInputRef.current?.files?.[0] ?? null;
                        if (proofAttachRequestId) void uploadProofFor(proofAttachRequestId, f);
                      }}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {proofUploading ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <Upload size={18} strokeWidth={2.25} />
                          Upload proof
                        </>
                      )}
                    </button>
                  </section>

                  {/* Top-up request history — newest first */}
                  <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Your top-up requests</h4>
                        <p className="mt-0.5 text-xs text-slate-500">Newest first · proof status per request</p>
                      </div>
                    </div>
                    <ul className="mt-4 max-h-[min(40vh,280px)] space-y-2 overflow-y-auto overscroll-y-contain pr-0.5">
                      {sortedTopUps.length === 0 ? (
                        <li className="py-8 text-center text-sm text-slate-500">None yet.</li>
                      ) : (
                        sortedTopUps.map((r) => {
                          const badge = topUpStatusBadge(r.status);
                          const hasProof = Boolean(r.proofUrl);
                          return (
                            <li
                              key={r.id}
                              className="rounded-xl border border-slate-100 bg-slate-50/40 px-3 py-3 ring-1 ring-slate-100/80"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${badge.className}`}
                                >
                                  {badge.label}
                                </span>
                                <time
                                  dateTime={r.createdAt}
                                  className="font-mono text-[10px] font-medium text-slate-400"
                                >
                                  {formatWalletTime(r.createdAt)}
                                </time>
                              </div>
                              <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span className="text-base font-black tabular-nums text-slate-900">
                                  ETB {r.amount.toLocaleString()}
                                </span>
                                <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
                                  {r.method}
                                </span>
                              </div>
                              <p
                                className="mt-1.5 break-all font-mono text-[11px] leading-snug text-slate-600"
                                title={r.reference}
                              >
                                Ref: {r.reference}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {hasProof ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-900 ring-1 ring-emerald-600/20">
                                    <CheckCircle size={12} strokeWidth={2.5} className="shrink-0" />
                                    Proof uploaded
                                  </span>
                                ) : r.status === 'pending' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900 ring-1 ring-amber-200">
                                    <AlertTriangle size={12} className="shrink-0" />
                                    No proof yet — add above
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium text-slate-400">No proof on file</span>
                                )}
                              </div>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </section>

                  {error && (
                    <p
                      role="alert"
                      className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-900 ring-1 ring-red-100"
                    >
                      {error}
                    </p>
                  )}

                  {/* Ledger */}
                  <section className="rounded-2xl bg-white p-5 pb-1 shadow-sm ring-1 ring-slate-200/70">
                    <h4 className="text-sm font-bold text-slate-900">Activity</h4>
                    <p className="mt-0.5 text-xs text-slate-500">Credits, commissions, and adjustments</p>
                    <ul className="mt-4 space-y-2">
                      {transactions.length === 0 ? (
                        <li className="py-8 text-center text-sm text-slate-500">No transactions yet.</li>
                      ) : (
                        transactions.map((row) => (
                          <li
                            key={row.id}
                            className="flex items-start justify-between gap-3 rounded-xl px-3 py-3 ring-1 ring-slate-100"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold capitalize text-slate-900">{row.type}</p>
                              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{row.reason}</p>
                              <time
                                dateTime={row.createdAt}
                                className="mt-1.5 block font-mono text-[10px] font-medium text-slate-400"
                              >
                                {formatWalletTime(row.createdAt)}
                              </time>
                            </div>
                            <span
                              className={`shrink-0 font-mono text-sm font-bold tabular-nums ${
                                row.type === 'credit' ? 'text-emerald-600' : 'text-slate-900'
                              }`}
                            >
                              {row.type === 'commission' ? '−' : row.type === 'credit' ? '+' : ''}
                              {row.amount}
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  </section>
                </>
              ) : (
                <p className="py-12 text-center text-sm text-slate-500">Wallet unavailable.</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
