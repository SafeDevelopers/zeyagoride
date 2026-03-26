import type { SelectedVehicleId } from './mobile';
import type { FareEstimate } from './route';

/**
 * API boundary types for mobile services (auth, rider rides, driver rides).
 * Mock implementations live under `services/api/` until real HTTP clients exist.
 */

/** Backend auth — request OTP to the given phone (E.164 or normalized digits per API contract). */
export type LoginWithPhoneRequest = {
  phone: string;
  role?: SessionUserRole;
};

/** Backend auth — OTP send acknowledged. */
export type LoginWithPhoneResponse = {
  message: string;
};

export type SessionUserRole = 'rider' | 'driver' | 'admin';

/** Normalized user returned on successful auth (matches persisted session `user`). */
export type SessionUser = {
  id: string;
  phone: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  role: SessionUserRole;
};

export type VerifyOtpRequest = {
  phone: string;
  code: string;
  role?: SessionUserRole;
};

/** Tokens + user + session boundary time (ISO 8601). */
export type VerifyOtpResponse = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
  /** Access token expiry (ISO 8601). */
  expiresAt: string;
  registrationRequired: boolean;
  authFlow: 'login' | 'register';
};

export type RegisterRiderRequest = {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
};

export type RegisterDriverRequest = {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  make: string;
  model: string;
  color: string;
  capacity: number;
  tagNumber: string;
  insuranceExpiry?: string;
};

export type DriverVehicleUpdateRequest = {
  make: string;
  model: string;
  color: string;
  capacity: number;
  tagNumber: string;
  insuranceExpiry?: string;
};

export type UpdateProfileRequest = {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
};

export type VehicleApprovalStatus = 'pending' | 'approved' | 'rejected';

export type DriverVehicleProfile = {
  id: string;
  make: string;
  model: string;
  color: string;
  capacity: number;
  tagNumber: string;
  insuranceExpiry: string | null;
  status: VehicleApprovalStatus;
  rejectionReason: string | null;
};

/** Vehicle category for pricing / matching (aligned with UI `SelectedVehicleId`). */
export type VehicleType = SelectedVehicleId;

/** Server-side ride lifecycle (distinct from UI rider trip phase in `types/mobile`). */
export type RideStatus =
  | 'pending'
  | 'matching'
  | 'driver_assigned'
  | 'driver_arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type PaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'refunded';

/** Recorded when driver completes trip (cash-first; aligns with Prisma `RidePaymentMethod`). */
export type RidePaymentMethod = 'cash' | 'bank' | 'telebirr';

/** WGS84 coordinates — Mapbox / Directions API compatible. */
export type LatLng = {
  latitude: number;
  longitude: number;
};

export type RideStop = {
  address: string;
  coords: LatLng | null;
};

/** Normalized ride projection for list/detail and post-mutation responses. */
export type RideSummary = {
  id: string;
  riderId?: string | null;
  driverId?: string | null;
  status: RideStatus;
  /** Legacy one-line labels (keep for existing UI copy). */
  pickup: string;
  destination: string;
  pickupAddress: string;
  destinationAddress: string;
  pickupCoords: LatLng | null;
  destinationCoords: LatLng | null;
  stops: RideStop[];
  vehicleType: VehicleType;
  profileType: 'personal' | 'business';
  scheduledDate?: string;
  scheduledTime?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Preview / confirmed route metrics when provided by client or API. */
  distanceMeters?: number;
  durationSeconds?: number;
  originalFare?: number;
  discountAmount?: number;
  finalFare?: number;
  promoCode?: string | null;
  paymentStatus?: PaymentStatus;
  paymentId?: string | null;
  fareEstimate?: FareEstimate;
  paymentMethod?: RidePaymentMethod;
};

export type RequestRideRequest = {
  pickup: string;
  destination: string;
  pickupAddress: string;
  destinationAddress: string;
  pickupCoords: LatLng | null;
  destinationCoords: LatLng | null;
  stops: RideStop[];
  vehicleType: VehicleType;
  profileType: 'personal' | 'business';
  scheduledDate?: string;
  scheduledTime?: string;
  /** Snapshot from route/fare preview at request time (optional). */
  distanceMeters?: number;
  durationSeconds?: number;
  fareEstimate?: FareEstimate;
  promoCode?: string;
};

export type RequestRideResponse = {
  ride: RideSummary;
};

export type CancelRideRequest = {
  rideId: string;
  reason?: string;
};

export type CancelRideResponse = {
  cancelled: true;
  ride?: RideSummary;
};

export type DriverAvailabilityRequest = {
  online: boolean;
};

export type DriverAvailabilityResponse = {
  online: boolean;
};

export type DriverProfile = {
  id: string;
  userId: string;
  name: string | null;
  phone: string | null;
  online: boolean;
  isVerified: boolean;
  verificationStatus: string;
  vehicle: DriverVehicleProfile | null;
  canGoOnline: boolean;
  onlineBlockingReasons: string[];
  activeTripCount: number;
  walletBalance: number;
  walletMinBalance: number;
  walletWarningThreshold: number;
  walletBlocked: boolean;
  walletBelowWarning: boolean;
};

export type DriverWalletSnapshot = {
  balance: number;
  minBalance: number;
  warningThreshold: number;
  blocked: boolean;
  belowWarning: boolean;
};

export type DriverWalletTransactionRow = {
  id: string;
  type: string;
  amount: number;
  reason: string;
  rideId: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type DriverNotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
};

export type ListDriverNotificationsResponse = {
  notifications: DriverNotificationRow[];
};

/** Persisted rider in-app rows; same shape as driver notifications for easy merging later. */
export type RiderNotificationRow = DriverNotificationRow;

export type ListRiderNotificationsResponse = {
  notifications: RiderNotificationRow[];
};

export type DriverTopUpRequestRow = {
  id: string;
  amount: number;
  method: string;
  reference: string;
  status: string;
  createdAt: string;
  proofUrl: string | null;
};

export type ListDriverTopUpRequestsResponse = {
  requests: DriverTopUpRequestRow[];
};

export type ListDriverWalletTransactionsResponse = {
  transactions: DriverWalletTransactionRow[];
};

export type SubmitTopUpRequest = {
  amount: number;
  method: 'telebirr' | 'bank' | 'cash';
  reference: string;
};

export type CompleteTripBody = {
  paymentMethod?: RidePaymentMethod;
};

export type AcceptRideRequest = {
  requestId: string;
};

export type AcceptRideResponse = {
  tripId: string;
  ride: RideSummary;
};

export type DeclineRideRequest = {
  requestId: string;
  reason?: string;
};

export type DeclineRideResponse = {
  declined: true;
};

export type GetRideRequest = {
  rideId: string;
};

export type GetRideResponse = {
  ride: RideSummary;
};

/** Incoming offer row for driver polling (matches UI `IncomingDriverRequest` fields). */
export type DriverIncomingOffer = {
  id: string;
  pickup: string;
  destination: string;
  earning: string;
};

export type ListDriverRequestsResponse = {
  requests: DriverIncomingOffer[];
};

export type TripSummary = {
  tripId: string;
  ride: RideSummary;
};

export type GetTripRequest = {
  tripId: string;
};

export type GetTripResponse = {
  trip: TripSummary;
};
