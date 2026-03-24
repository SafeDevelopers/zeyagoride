import { MobileAppProvider } from './context/MobileAppContext';
import { useRealtimeBootstrap } from './context/useRealtimeBootstrap';
import { useSessionBootstrap } from './context/useSessionBootstrap';
import { useRideStatusSync } from './context/useRideStatusSync';
import { MobileAppShell } from './MobileAppShell';

function SessionBootstrap() {
  useSessionBootstrap();
  return null;
}

function RideStatusSync() {
  useRideStatusSync();
  return null;
}

function RealtimeBootstrap() {
  useRealtimeBootstrap();
  return null;
}

export default function MobileApp() {
  return (
    <MobileAppProvider>
      <SessionBootstrap />
      <RealtimeBootstrap />
      <RideStatusSync />
      <MobileAppShell />
    </MobileAppProvider>
  );
}
