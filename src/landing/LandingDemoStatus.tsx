import { useEffect, useState } from 'react';
import { Activity, Loader2, ServerOff, CheckCircle2 } from 'lucide-react';
import { fetchAdminOverview } from '../admin/adminApi';

/**
 * Optional read-only snapshot from Nest `AppStateService` (same as mobile/admin).
 * Subtle; safe when the API is unreachable.
 */
export function LandingDemoStatus() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [rides, setRides] = useState<number | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(false);
      try {
        const o = await fetchAdminOverview();
        if (!cancelled) {
          setRides(o.summary.totalRides);
          setOnline(o.driverOnline);
        }
      } catch {
        if (!cancelled) {
          setErr(true);
          setRides(null);
          setOnline(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-2xl border border-velox-primary/12 bg-white/80 p-3.5 shadow-[0_4px_24px_rgba(45,27,66,0.06)] backdrop-blur-sm sm:p-4">
      <div className="flex items-start gap-3 sm:items-center sm:gap-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-velox-primary/[0.08] text-velox-primary sm:h-10 sm:w-10">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin sm:h-[18px] sm:w-[18px]" strokeWidth={2.25} />
          ) : err ? (
            <ServerOff className="h-4 w-4 text-slate-400 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 sm:h-[18px] sm:w-[18px]" strokeWidth={2.25} />
          )}
        </div>
        <div className="min-w-0 flex-1 pt-0.5 sm:pt-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Service status</p>
          {loading ? (
            <p className="mt-0.5 text-sm leading-snug text-slate-600">Checking API…</p>
          ) : err ? (
            <p className="mt-0.5 text-sm leading-snug text-slate-600">
              API not reachable — the mobile app still works with its built-in flow. Connect the server to sync live
              ride data here.
            </p>
          ) : (
            <p className="mt-0.5 text-sm leading-snug text-slate-800">
              <span className="font-semibold text-emerald-700">Connected</span>
              <span className="text-slate-400"> · </span>
              <span className="font-semibold text-velox-primary">{rides ?? 0}</span>
              <span className="text-slate-600"> rides</span>
              <span className="text-slate-400"> · </span>
              <span className={online ? 'font-medium text-emerald-700' : 'font-medium text-slate-500'}>
                Driver {online ? 'online' : 'offline'}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
