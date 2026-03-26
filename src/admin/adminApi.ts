import { ADMIN_API_PATHS } from '../mobile/contracts/backendContract';
import { getAccessToken } from '../mobile/services/sessionStorage';

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
  finalFare?: number;
  paymentStatus?: string;
  paymentId?: string | null;
  fareEstimate?: { amount?: number; formatted?: string };
};

export type AdminOverview = {
  driverOnline: boolean;
  settings: AdminSettings;
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

export type AdminCommissionSettings = {
  commissionType: 'percent';
  commissionRate: number;
};

export type AdminSettings = {
  requireRideSafetyPin: boolean;
  demoAutoTripProgression: boolean;
  pricing: AdminPricingSettings;
  promo: AdminPromoSettings;
  /** Present once backend exposes `GET /admin/settings` with commission (older servers may omit). */
  commission?: AdminCommissionSettings;
};

export type AdminPricingSettings = {
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minimumFare: number;
  cancellationFee: number;
};

export type AdminPromoSettings = {
  enabled: boolean;
  code: string;
  discountType: 'fixed' | 'percent';
  discountAmount: number;
  active: boolean;
};

export type AdminDriverRow = {
  id: string;
  userId: string;
  name: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone: string | null;
  email?: string | null;
  address?: string | null;
  online: boolean;
  isVerified: boolean;
  verificationStatus: string;
  vehicleStatus?: string | null;
  vehicleTagNumber?: string | null;
  vehicleSummary?: string | null;
  activeTripCount: number;
  createdAt: string;
  updatedAt: string;
  walletBalance?: number;
  walletMinBalance?: number;
  walletWarningThreshold?: number;
  walletBlocked?: boolean;
  walletBelowWarning?: boolean;
  walletUnreadNotifications?: number;
};

export type AdminRiderRow = {
  id: string;
  name: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone: string | null;
  email?: string | null;
  address?: string | null;
  rideCount: number;
  createdAt: string;
};

export type AdminWalletTransactionRow = {
  id: string;
  driverId: string;
  driverName: string | null;
  type: string;
  amount: number;
  reason: string;
  rideId: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminWalletTransactionsResponse = {
  transactions: AdminWalletTransactionRow[];
};

export type AdminTopUpRequestRow = {
  id: string;
  driverId: string;
  driverName: string | null;
  amount: number;
  method: string;
  reference: string;
  status: string;
  createdAt: string;
  reviewedBy: string | null;
  proofUrl: string | null;
  proofContentType: string | null;
};

export type AdminWalletNotificationRow = {
  id: string;
  driverId: string;
  driverName: string | null;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export type AdminWalletNotificationsResponse = {
  notifications: AdminWalletNotificationRow[];
};

export type AdminTopUpRequestsResponse = {
  requests: AdminTopUpRequestRow[];
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

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const res = await fetch(`${getAdminApiBase()}${ADMIN_API_PATHS.OVERVIEW}`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<AdminOverview>;
}

export async function updateAdminSettings(
  input: AdminSettings,
): Promise<AdminSettings> {
  const res = await fetch(`${getAdminApiBase()}${ADMIN_API_PATHS.SETTINGS}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<AdminSettings>;
}

export async function fetchAdminDrivers(): Promise<AdminDriverRow[]> {
  const res = await fetch(`${getAdminApiBase()}${ADMIN_API_PATHS.DRIVERS}`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<AdminDriverRow[]>;
}

export async function fetchAdminRiders(): Promise<AdminRiderRow[]> {
  const res = await fetch(`${getAdminApiBase()}${ADMIN_API_PATHS.RIDERS}`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<AdminRiderRow[]>;
}

export async function fetchAdminPricing(): Promise<AdminPricingSettings> {
  const res = await fetch(`${getAdminApiBase()}${ADMIN_API_PATHS.PRICING}`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<AdminPricingSettings>;
}

export async function updateAdminPricing(
  input: AdminPricingSettings,
): Promise<AdminPricingSettings> {
  const res = await fetch(`${getAdminApiBase()}${ADMIN_API_PATHS.PRICING}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<AdminPricingSettings>;
}

export async function fetchAdminPromos(): Promise<AdminPromoSettings> {
  const res = await fetch(`${getAdminApiBase()}${ADMIN_API_PATHS.PROMOS}`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<AdminPromoSettings>;
}

export async function updateAdminPromos(
  input: AdminPromoSettings,
): Promise<AdminPromoSettings> {
  const res = await fetch(`${getAdminApiBase()}${ADMIN_API_PATHS.PROMOS}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<AdminPromoSettings>;
}

export async function updateAdminCommission(
  input: Partial<AdminCommissionSettings>,
): Promise<AdminCommissionSettings> {
  const res = await fetch(`${getAdminApiBase()}${ADMIN_API_PATHS.COMMISSION}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<AdminCommissionSettings>;
}

export async function updateAdminDriverVerification(
  driverId: string,
  verificationStatus: string,
): Promise<AdminDriverRow> {
  const res = await fetch(
    `${getAdminApiBase()}${ADMIN_API_PATHS.updateDriverVerification(driverId)}`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ verificationStatus }),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<AdminDriverRow>;
}

export async function updateAdminDriverVehicleApproval(
  driverId: string,
  vehicleStatus: string,
  rejectionReason?: string,
): Promise<{ vehicleStatus: string; rejectionReason: string | null }> {
  const res = await fetch(
    `${getAdminApiBase()}${ADMIN_API_PATHS.updateDriverVehicle(driverId)}`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ vehicleStatus, rejectionReason }),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<{ vehicleStatus: string; rejectionReason: string | null }>;
}

export async function fetchAdminWalletTransactions(
  params?: { driverId?: string; type?: string; limit?: number },
): Promise<AdminWalletTransactionsResponse> {
  const q = new URLSearchParams();
  if (params?.driverId) q.set('driverId', params.driverId);
  if (params?.type) q.set('type', params.type);
  if (params?.limit != null) q.set('limit', String(params.limit));
  const qs = q.toString();
  const path = `${ADMIN_API_PATHS.WALLET_TRANSACTIONS}${qs ? `?${qs}` : ''}`;
  const res = await fetch(`${getAdminApiBase()}${path}`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<AdminWalletTransactionsResponse>;
}

export async function downloadAdminWalletTransactionsCsv(): Promise<void> {
  const res = await fetch(`${getAdminApiBase()}${ADMIN_API_PATHS.walletTransactionsExportCsv()}`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'wallet-transactions.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchAdminTopUpRequests(): Promise<AdminTopUpRequestsResponse> {
  const res = await fetch(`${getAdminApiBase()}${ADMIN_API_PATHS.WALLET_TOP_UP_REQUESTS}`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<AdminTopUpRequestsResponse>;
}

export async function fetchAdminWalletNotifications(
  limit?: number,
): Promise<AdminWalletNotificationsResponse> {
  const q = limit != null ? `?limit=${encodeURIComponent(String(limit))}` : '';
  const res = await fetch(`${getAdminApiBase()}${ADMIN_API_PATHS.WALLET_NOTIFICATIONS}${q}`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<AdminWalletNotificationsResponse>;
}

export async function approveAdminTopUpRequest(requestId: string): Promise<{ credited: number; balance: number }> {
  const res = await fetch(`${getAdminApiBase()}${ADMIN_API_PATHS.approveTopUpRequest(requestId)}`, {
    method: 'PUT',
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<{ credited: number; balance: number }>;
}

export async function rejectAdminTopUpRequest(requestId: string): Promise<{ rejected: true }> {
  const res = await fetch(`${getAdminApiBase()}${ADMIN_API_PATHS.rejectTopUpRequest(requestId)}`, {
    method: 'PUT',
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<{ rejected: true }>;
}
