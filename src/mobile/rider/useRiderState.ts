import { useState, useEffect, useRef } from 'react';
import { VEHICLE_TYPES } from '../constants/vehicleTypes';
import {
  INITIAL_ACTIVE_DRIVER,
  INITIAL_CORPORATE_DATA,
  INITIAL_FAVORITES,
  INITIAL_SCHEDULED_RIDES,
  INITIAL_WALLET_TRANSACTIONS,
} from '../constants/riderDefaults';
import { toCompletedRide } from '../services/rides/rideLifecycle';
import { buildWalletTransactionFromRide } from '../utils/walletFromRide';
import type { LatLng, RideSummary } from '../types/api';
import type {
  ActiveDriverInfo,
  CorporateData,
  FavoritePlace,
  PaymentMethod,
  RideStatus,
  ScheduledRide,
  SelectedVehicleId,
  WalletTransaction,
} from '../types/mobile';

export function useRiderState(
  setShowRating: (value: boolean) => void,
  showSOS: boolean,
) {
  const vehicleTypes = VEHICLE_TYPES;

  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  /** Demo / future Mapbox picker — null when address is free-text or unknown. */
  const [pickupCoords, setPickupCoords] = useState<LatLng | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<LatLng | null>(null);
  /** Mapbox `feature.id` or `demo:*` when resolved (optional). */
  const [pickupPlaceId, setPickupPlaceId] = useState<string | null>(null);
  const [destinationPlaceId, setDestinationPlaceId] = useState<string | null>(null);
  /**
   * True only after the user picks a suggestion or an explicit saved place — not while typing free text.
   * Gates the request / vehicle sheet so typing alone does not open it.
   */
  const [destinationCommitted, setDestinationCommitted] = useState(false);
  /** Rider home “Where to?” panel: taller while searching so suggestions stay usable (shell reads this for max-height). */
  const [riderWhereToSearchExpanded, setRiderWhereToSearchExpanded] = useState(false);
  /** Full-screen planning sheet (pickup / destination / saved) — presentation only. */
  const [riderPlanningSheetOpen, setRiderPlanningSheetOpen] = useState(false);
  /** After opening the planning sheet, focus this stop row input (index into `stops`). */
  const [riderPlanningStopFocusIndex, setRiderPlanningStopFocusIndex] = useState<number | null>(
    null,
  );
  const [stops, setStops] = useState<string[]>([]);
  /** Parallel to `stops` — coords per stop when seeded. */
  const [stopCoords, setStopCoords] = useState<(LatLng | null)[]>([]);
  const [stopPlaceIds, setStopPlaceIds] = useState<(string | null)[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [rideStatus, setRideStatus] = useState<RideStatus>('idle');
  /** Set when `requestRide` succeeds; used for `cancelRide`. */
  const [currentRide, setCurrentRide] = useState<RideSummary | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<SelectedVehicleId>('economy');
  const [chatMessages, setChatMessages] = useState<{ sender: 'rider' | 'driver'; text: string }[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const [activeDriver, setActiveDriver] = useState<ActiveDriverInfo>(INITIAL_ACTIVE_DRIVER);

  const [walletBalance, setWalletBalance] = useState(1250.5);
  const [sosCountdown, setSosCountdown] = useState(5);
  const [transactions, setTransactions] = useState<WalletTransaction[]>(INITIAL_WALLET_TRANSACTIONS);

  const [selectedTrip, setSelectedTrip] = useState<unknown>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [ridePreferences, setRidePreferences] = useState({
    quietRide: false,
    acOn: false,
    luggageSpace: false,
  });
  const [hasZeyagoPass, setHasZeyagoPass] = useState(false);
  const [profileType, setProfileType] = useState<'personal' | 'business'>('personal');
  const [zeyagoPoints, setZeyagoPoints] = useState(450);
  const [businessEmail, setBusinessEmail] = useState('');
  const [ridePin, setRidePin] = useState('4821');
  const [enteredPin, setEnteredPin] = useState(['', '', '', '']);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { id: '1', type: 'telebirr', name: 'Telebirr', last4: '8844', isDefault: true },
    { id: '2', type: 'visa', name: 'Visa', last4: '4242', isDefault: false },
  ]);

  const [scheduledRides, setScheduledRides] = useState<ScheduledRide[]>(INITIAL_SCHEDULED_RIDES);

  const [favorites, setFavorites] = useState<FavoritePlace[]>(INITIAL_FAVORITES);

  const [corporateData, setCorporateData] = useState<CorporateData>(INITIAL_CORPORATE_DATA);

  const walletCompletedForRideRef = useRef(false);

  useEffect(() => {
    if (rideStatus !== 'completed') {
      walletCompletedForRideRef.current = false;
      return;
    }
    setShowRating(true);
    if (!currentRide || walletCompletedForRideRef.current) return;
    walletCompletedForRideRef.current = true;
    setTransactions((prev) => [
      buildWalletTransactionFromRide(toCompletedRide(currentRide), activeDriver.name),
      ...prev,
    ]);
  }, [rideStatus, currentRide, activeDriver.name, setShowRating]);

  useEffect(() => {
    if (showSOS && sosCountdown > 0) {
      const timer = setTimeout(() => setSosCountdown(sosCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [showSOS, sosCountdown]);

  useEffect(() => {
    setStopCoords((prev) =>
      stops.map((_, i) => (i < prev.length ? prev[i] ?? null : null)),
    );
    setStopPlaceIds((prev) =>
      stops.map((_, i) => (i < prev.length ? prev[i] ?? null : null)),
    );
  }, [stops.length]);

  return {
    pickup,
    setPickup,
    destination,
    setDestination,
    pickupCoords,
    setPickupCoords,
    destinationCoords,
    setDestinationCoords,
    pickupPlaceId,
    setPickupPlaceId,
    destinationPlaceId,
    setDestinationPlaceId,
    destinationCommitted,
    setDestinationCommitted,
    riderWhereToSearchExpanded,
    setRiderWhereToSearchExpanded,
    riderPlanningSheetOpen,
    setRiderPlanningSheetOpen,
    riderPlanningStopFocusIndex,
    setRiderPlanningStopFocusIndex,
    stops,
    setStops,
    stopCoords,
    setStopCoords,
    stopPlaceIds,
    setStopPlaceIds,
    isSearching,
    setIsSearching,
    rideStatus,
    setRideStatus,
    currentRide,
    setCurrentRide,
    selectedVehicle,
    setSelectedVehicle,
    chatMessages,
    setChatMessages,
    newMessage,
    setNewMessage,
    activeDriver,
    setActiveDriver,
    walletBalance,
    setWalletBalance,
    sosCountdown,
    setSosCountdown,
    transactions,
    setTransactions,
    selectedTrip,
    setSelectedTrip,
    scheduledDate,
    setScheduledDate,
    scheduledTime,
    setScheduledTime,
    ridePreferences,
    setRidePreferences,
    hasZeyagoPass,
    setHasZeyagoPass,
    profileType,
    setProfileType,
    zeyagoPoints,
    setZeyagoPoints,
    businessEmail,
    setBusinessEmail,
    ridePin,
    setRidePin,
    enteredPin,
    setEnteredPin,
    isPinVerified,
    setIsPinVerified,
    paymentMethods,
    setPaymentMethods,
    scheduledRides,
    setScheduledRides,
    favorites,
    setFavorites,
    corporateData,
    setCorporateData,
    vehicleTypes,
  };
}
