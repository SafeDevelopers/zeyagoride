import { useLayoutEffect } from 'react';

/**
 * Invoked once when the app mounts (see `MobileApp.tsx`).
 * Restored auth step and profile fields are applied synchronously in `useGlobalAppState`
 * initializers via `sessionStorage` helpers — no extra paint delay.
 *
 * TODO: async token validation / silent refresh against the backend.
 */
export function useSessionBootstrap(): void {
  useLayoutEffect(() => {
    void 0;
  }, []);
}
