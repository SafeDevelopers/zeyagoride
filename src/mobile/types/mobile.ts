import type { LucideIcon } from 'lucide-react';
import type { LatLng } from './api';
import type { FareEstimate } from './route';

export type AppMode = 'rider' | 'driver';

export type AuthStep =
  | 'welcome'
  | 'phone'
  | 'otp'
  | 'rider_register'
  | 'driver_register'
  | 'home';

/** Rider UI trip phase — not the API `RideStatus` in `types/api`. */
export type RideStatus = 'idle' | 'searching' | 'found' | 'arrived' | 'ongoing' | 'completed';

export type SelectedVehicleId =
  | 'economy'
  | 'basic'
  | 'classic'
  | 'electric'
  | 'minivan'
  | 'executive'
  | 'hourly';

export type DriverTier = 'Standard' | 'Pro' | 'Elite';

/** Matches runtime usage in driver navigation UI (see DriverActiveTripScreen) */
export type DriverNavStep =
  | 'to_pickup'
  | 'at_pickup'
  | 'to_stop'
  | 'at_stop'
  | 'to_destination'
  | null;

export type VerificationStep =
  | 'start'
  | 'profile_pic'
  | 'national_id'
  | 'license'
  | 'vehicle_details'
  | 'registration'
  | 'insurance'
  | 'pending';

export type SupportStep = 'list' | 'details' | 'success';

export type ChatSender = 'rider' | 'driver';

export type ChatMessage = { sender: ChatSender; text: string };

export type VehicleTypeOption = {
  id: SelectedVehicleId;
  name: string;
  price: string;
  time: string;
  capacity: number;
  image: string;
  icon: LucideIcon;
};

export type ActiveDriverInfo = {
  name: string;
  car: string;
  plate: string;
  rating: number;
  eta: string;
  image: string;
};

export type IncomingDriverRequest = {
  id: string;
  pickup: string;
  destination: string;
  earning: string;
};

export type VehicleDetailsForm = {
  make: string;
  model: string;
  color: string;
  capacity: string;
  tagNumber: string;
};

export type WalletTransaction = {
  id: number;
  type: 'ride' | 'topup';
  amount: number;
  date: string;
  title: string;
  pickup?: string;
  destination?: string;
  driver?: string;
  distance?: string;
  duration?: string;
  baseFare?: number;
  distanceFare?: number;
  tax?: number;
  /** When a ride is linked to route preview data (optional). */
  distanceMeters?: number;
  durationSeconds?: number;
  fareEstimate?: FareEstimate;
};

export type PaymentMethod = {
  id: string;
  type: string;
  name: string;
  last4: string;
  isDefault: boolean;
};

export type ScheduledRide = {
  id: string;
  pickup: string;
  destination: string;
  date: string;
  time: string;
  status: string;
  /** Copied from the ride snapshot when scheduled (optional). */
  distanceMeters?: number;
  durationSeconds?: number;
  fareEstimate?: FareEstimate;
};

export type FavoritePlace = {
  id: string;
  name: string;
  address: string;
  icon: LucideIcon;
  /** Demo / Mapbox-ready coords when the place is seeded (optional). */
  coords?: LatLng | null;
};

export type TrainingModule = {
  id: string;
  title: string;
  desc: string;
  completed: boolean;
  icon: LucideIcon;
};

export type DriverDocument = {
  id: string;
  title: string;
  status: string;
  expiry: string;
  icon: LucideIcon;
};

export type DriverVehicle = {
  id: string;
  model: string;
  plate: string;
  color: string;
  status: string;
  insuranceExpiry: string;
};

export type AppNotification = {
  id: number;
  title: string;
  message: string;
  type: string;
  time: string;
  read: boolean;
};

export type Compliment = {
  id: number;
  label: string;
  count: number;
  icon: LucideIcon;
};

export type RideRequestInfo = {
  id: string;
  rider: string;
  pickup: string;
  destination: string;
  fare: number;
};

export type CurrentTripInfo = {
  status: 'pickup' | 'enroute' | 'completed';
  rider?: string;
  driver?: string;
  pickup: string;
  destination: string;
  fare: number;
};

export type CorporateData = {
  companyName: string;
  domain: string;
  teamSpending: number;
  activeMembers: number;
  pendingInvoices: number;
  invoices: { id: string; date: string; amount: number; status: string }[];
  teamMembers: { id: number; name: string; email: string; rides: number; spending: number }[];
};

export type MaintenanceLog = {
  id: string;
  type: string;
  amount: string;
  date: string;
  km: string;
};
