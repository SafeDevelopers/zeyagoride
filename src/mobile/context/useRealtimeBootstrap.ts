import { useEffect } from 'react';
import { getRealtimeClient } from '../services/realtime/realtimeClient';

/**
 * Starts the realtime client lifecycle (no UI). Mock mode: no-op connect.
 * Realtime mode: `openSocket` TODO only until WebSocket/Socket.IO is wired.
 */
export function useRealtimeBootstrap(): void {
  useEffect(() => {
    const client = getRealtimeClient();
    client.connect();
    return () => {
      client.disconnect();
    };
  }, []);
}
