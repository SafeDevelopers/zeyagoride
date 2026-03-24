import { Car, Plus } from '../lucideIcons';
import { useMobileApp } from '../../context/MobileAppContext';

type RiderHistoryScreenProps = {
  /** When true (History menu), list rides only — no top-ups; title reflects trips. */
  ridesOnly?: boolean;
};

export function RiderHistoryScreen({ ridesOnly = false }: RiderHistoryScreenProps) {
  const {
    transactions,
    setShowTripDetails,
    setSelectedTrip,
  } = useMobileApp();

  const rows = ridesOnly ? transactions.filter((tx) => tx.type === 'ride') : transactions;

  return (
    <section className="space-y-3">
      <h5 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {ridesOnly ? 'Recent trips' : 'Recent transactions'}
      </h5>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
          {ridesOnly ? 'No trips yet. Your completed rides will appear here.' : 'No transactions yet.'}
        </p>
      ) : (
      <div className="space-y-2.5">
        {rows.map((tx) => (
          <div
            key={tx.id}
            role={tx.type === 'ride' ? 'button' : undefined}
            tabIndex={tx.type === 'ride' ? 0 : undefined}
            onClick={() => {
              if (tx.type === 'ride') {
                setSelectedTrip(tx);
                setShowTripDetails(true);
              }
            }}
            onKeyDown={(e) => {
              if (tx.type === 'ride' && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                setSelectedTrip(tx);
                setShowTripDetails(true);
              }
            }}
            className={`flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm transition-all ${
              tx.type === 'ride'
                ? 'cursor-pointer hover:border-velox-primary/20 hover:bg-slate-50/80 active:scale-[0.99]'
                : ''
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  tx.type === 'ride' ? 'bg-slate-100 text-slate-600' : 'bg-velox-accent/15 text-velox-primary'
                }`}
              >
                {tx.type === 'ride' ? <Car size={20} /> : <Plus size={20} />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{tx.title}</p>
                <p className="text-[10px] text-slate-400">{tx.date}</p>
              </div>
            </div>
            <p
              className={`shrink-0 pl-2 text-sm font-bold tabular-nums ${
                tx.amount > 0 ? 'text-velox-primary' : 'text-slate-900'
              }`}
            >
              {tx.amount > 0 ? '+' : ''}ETB {Math.abs(tx.amount)}
            </p>
          </div>
        ))}
      </div>
      )}
    </section>
  );
}
