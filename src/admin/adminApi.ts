import { ADMIN_API_PATHS } from '../mobile/contracts/backendContract';

/**
 * Admin reads the same Nest in-memory state as mobile (`GET /admin/overview`).
 * Default API base matches mobile when `VITE_API_BASE_URL` is unset (local Nest on :3000).
 */
export type AdminRideRow = {
  id: string;
  status: string;
  pickup: string;
  destination: string;
  pickupAddress?: string;
  destinationAddress?: string;
  createdAt?: string;
  updatedAt?: string;
  riderId?: string | null;
  driverId?: string | null;
  fareEstimate?: { amount?: number; formatted?: string };
};

export type AdminOverview = {
  driverOnline: boolean;
  summary: {
    totalRides: number;
    activeTrips: number;
    pendingOffers: number;
    completedRevenueEstimate: number;
    byStatus: Record<string, number>;
  };
  rides: AdminRideRow[];
  trips: Array<{ tripId: string; rideId: string; startedAt: number }>;
  offers: Array<{
    requestId: string;
    rideId: string | null;
    pickup: string;
    destination: string;
    earning: string;
  }>;
};

export function getAdminApiBase(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  if (import.meta.env.DEV && raw) {
    try {
      const u = new URL(raw);
      if (typeof window !== 'undefined' && u.origin === window.location.origin) {
        return '';
      }
    } catch {
      /* ignore invalid VITE_API_BASE_URL */
    }
  }
  return raw || 'http://localhost:3000';
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const res = await fetch(`${getAdminApiBase()}${ADMIN_API_PATHS.OVERVIEW}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<AdminOverview>;
}
