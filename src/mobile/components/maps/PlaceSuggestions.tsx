import { useEffect, useRef, useState } from 'react';
import { searchPlaces } from '../../services/mapbox/geocodingService';
import type { PlaceSuggestion } from '../../types/places';

export type PlaceSuggestionsProps = {
  /** Current input value (debounced for `searchPlaces`). */
  query: string;
  /** When false, search is skipped and the list is hidden. */
  open: boolean;
  onSelect: (suggestion: PlaceSuggestion) => void;
  /** Called after a selection or when parent wants to sync closed state. */
  onDismiss?: () => void;
  debounceMs?: number;
  /** Extra classes on the list root (positioning lives on a parent `relative` wrapper). */
  className?: string;
  /**
   * `expanded` — rider home search sheet is tall; reserve ~3 two-line rows in the list viewport.
   * `default` — normal compact dropdown.
   */
  variant?: 'default' | 'expanded';
};

/**
 * Debounced forward search dropdown. Uses `searchPlaces` (Mapbox or seeded demo fallback).
 */
export function PlaceSuggestions({
  query,
  open,
  onSelect,
  onDismiss,
  debounceMs = 300,
  className = '',
  variant = 'default',
}: PlaceSuggestionsProps) {
  const [items, setItems] = useState<PlaceSuggestion[]>([]);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!open) {
      setItems([]);
      return;
    }
    const seq = ++requestSeq.current;
    const t = setTimeout(() => {
      void searchPlaces(query).then((list) => {
        if (requestSeq.current !== seq) return;
        setItems(list);
      });
    }, debounceMs);
    return () => clearTimeout(t);
  }, [query, open, debounceMs]);

  if (!open || items.length === 0) {
    return null;
  }

  /** ~3 two-line rows visible; expanded mode always reserves that viewport when results exist. */
  const listMinH =
    variant === 'expanded' && items.length > 0
      ? 'min-h-[11rem]'
      : items.length >= 3
        ? 'min-h-[11rem]'
        : items.length === 2
          ? 'min-h-[7.25rem]'
          : 'min-h-0';

  const listMaxH =
    variant === 'expanded' ? 'max-h-[min(18rem,42vh)]' : 'max-h-[min(22rem,70vh)]';

  return (
    <ul
      role="listbox"
      className={`absolute left-0 right-0 top-full z-[100] mt-1 ${listMaxH} ${listMinH} overflow-x-hidden overflow-y-auto rounded-2xl border border-velox-primary/12 bg-white/98 py-1 shadow-[0_12px_40px_rgba(45,27,66,0.14)] backdrop-blur-md [scrollbar-gutter:stable] ${className}`}
    >
      {items.map((s) => (
        <li key={`${s.id}-${s.address}`} role="option">
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-xs text-slate-800 hover:bg-velox-primary/8"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onSelect(s);
              onDismiss?.();
            }}
          >
            <span className="font-medium">{s.label}</span>
            {s.address && s.address !== s.label && (
              <span className="mt-0.5 block text-[10px] leading-snug text-slate-500">{s.address}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
