import React, { createContext, useContext, ReactNode } from 'react';
import { useGlobalAppState } from './useGlobalAppState';
import { useRiderState } from '../rider/useRiderState';
import { useDriverState } from '../driver/useDriverState';

export type { AppMode, AuthStep } from '../types/mobile';

function useMobileAppState() {
  const global = useGlobalAppState();
  const rider = useRiderState(global.setShowRating, global.showSOS);
  const driver = useDriverState();
  return {
    ...global,
    ...rider,
    ...driver,
  };
}

const MobileAppContext = createContext<ReturnType<typeof useMobileAppState> | null>(null);

export function MobileAppProvider({ children }: { children: ReactNode }) {
  const value = useMobileAppState();
  return <MobileAppContext.Provider value={value}>{children}</MobileAppContext.Provider>;
}

export function useMobileApp() {
  const ctx = useContext(MobileAppContext);
  if (!ctx) throw new Error('useMobileApp must be used within MobileAppProvider');
  return ctx;
}
