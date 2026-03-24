import { useEffect, useRef } from 'react';

/**
 * Single interval while `enabled` — cleans up when disabled or unmounted (no duplicate timers).
 */
export function useIntervalWhen(
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled: boolean,
): void {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      void Promise.resolve(cbRef.current()).catch(() => undefined);
    }, intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs]);
}
