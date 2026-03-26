/** Shared admin UI formatting — no API or business logic. */

export function formatEtb(
  amount: number | null | undefined,
  opts?: { fractionDigits?: number },
): string {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  const fd = opts?.fractionDigits ?? 0;
  return `ETB ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: fd,
    maximumFractionDigits: fd,
  })}`;
}

export function formatAdminDateTime(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function topUpStatusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'approved') return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20';
  if (s === 'rejected') return 'bg-slate-100 text-slate-700 ring-1 ring-slate-400/25';
  return 'bg-amber-50 text-amber-900 ring-1 ring-amber-600/20';
}

export function walletEligibilityBadgeClass(blocked: boolean, belowWarning: boolean): string {
  if (blocked) return 'bg-red-50 text-red-800 ring-1 ring-red-200';
  if (belowWarning) return 'bg-amber-50 text-amber-900 ring-1 ring-amber-200';
  return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200';
}

export function rideStatusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'completed') return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200';
  if (s === 'cancelled') return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
  if (s === 'matching' || s === 'pending') return 'bg-sky-50 text-sky-900 ring-1 ring-sky-200';
  if (s.includes('progress') || s === 'in_progress') return 'bg-violet-50 text-violet-900 ring-1 ring-violet-200';
  return 'bg-slate-50 text-slate-800 ring-1 ring-slate-200';
}
