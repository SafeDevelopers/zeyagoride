import { useState, useEffect, useRef, useCallback } from 'react';
import {
  INITIAL_COMPLIMENTS,
  INITIAL_DRIVER_DOCUMENTS,
  INITIAL_DRIVER_VEHICLES,
  INITIAL_MAINTENANCE_LOGS,
  INITIAL_TRAINING_MODULES,
} from '../constants/driverDefaults';
import { driverRideService } from '../services/api';
import type {
  Compliment,
  CurrentTripInfo,
  DriverDocument,
  DriverNavStep,
  DriverTier,
  DriverVehicle,
  IncomingDriverRequest,
  MaintenanceLog,
  RideRequestInfo,
  TrainingModule,
  VehicleDetailsForm,
  VerificationStep,
} from '../types/mobile';
import type { DriverProfile, DriverWalletSnapshot } from '../types/api';

export function useDriverState() {
  const requestTimerStartedRef = useRef(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [destinationFilter, setDestinationFilter] = useState<string | null>(null);
  const [filterUsesLeft, setFilterUsesLeft] = useState(2);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>(INITIAL_MAINTENANCE_LOGS);
  const [activeKm, setActiveKm] = useState(12680);
  const [driverTier, setDriverTier] = useState<DriverTier>('Pro');
  const [incomingRequest, setIncomingRequest] = useState<IncomingDriverRequest | null>(null);
  const [requestTimer, setRequestTimer] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navStep, setNavStep] = useState<DriverNavStep>('to_pickup');
  /** Index into `nonEmptyTripStops(ride)` while `navStep` is `to_stop` or `at_stop`. */
  const [navStopLegIndex, setNavStopLegIndex] = useState<number | null>(null);
  const [verificationStep, setVerificationStep] = useState<VerificationStep>('start');
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetailsForm>({
    make: '',
    model: '',
    color: '',
    capacity: '4',
    tagNumber: '',
  });
  const [rideRequest, setRideRequest] = useState<RideRequestInfo | null>(null);
  const [currentTrip, setCurrentTrip] = useState<CurrentTripInfo | null>(null);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);

  const [trainingModules, setTrainingModules] = useState<TrainingModule[]>(INITIAL_TRAINING_MODULES);

  const [driverDocuments, setDriverDocuments] = useState<DriverDocument[]>(INITIAL_DRIVER_DOCUMENTS);

  const [driverVehicles, setDriverVehicles] = useState<DriverVehicle[]>(INITIAL_DRIVER_VEHICLES);

  const [compliments, setCompliments] = useState<Compliment[]>(INITIAL_COMPLIMENTS);

  const [navPreference, setNavPreference] = useState('built-in');

  const [driverWalletSnapshot, setDriverWalletSnapshot] = useState<DriverWalletSnapshot | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);

  const refreshDriverProfile = useCallback(async () => {
    try {
      const profile = await driverRideService.getProfile();
      setDriverProfile(profile);
      setIsVerified(profile.isVerified);
      setIsOnline(profile.online);
      if (profile.vehicle) {
        setDriverVehicles([
          {
            id: profile.vehicle.id,
            model: `${profile.vehicle.make} ${profile.vehicle.model}`,
            plate: profile.vehicle.tagNumber,
            color: profile.vehicle.color,
            status: profile.vehicle.status,
            insuranceExpiry: profile.vehicle.insuranceExpiry ?? 'Pending',
          },
        ]);
        setVehicleDetails({
          make: profile.vehicle.make,
          model: profile.vehicle.model,
          color: profile.vehicle.color,
          capacity: String(profile.vehicle.capacity),
          tagNumber: profile.vehicle.tagNumber,
        });
      } else {
        setDriverVehicles([]);
      }
    } catch {
      /* keep local defaults */
    }
  }, []);

  const refreshDriverWallet = useCallback(async () => {
    try {
      const w = await driverRideService.getWallet();
      setDriverWalletSnapshot(w);
    } catch {
      /* keep last known snapshot */
    }
  }, []);

  useEffect(() => {
    void refreshDriverWallet();
    const interval = setInterval(() => {
      void refreshDriverWallet();
    }, 45_000);
    return () => clearInterval(interval);
  }, [refreshDriverWallet]);

  /** If balance drops below minimum while marked online, turn availability off (matches dispatch rules). */
  useEffect(() => {
    if (!driverWalletSnapshot?.blocked || !isOnline) return;
    let cancelled = false;
    void driverRideService.setDriverOnline(false).finally(() => {
      if (!cancelled) setIsOnline(false);
    });
    return () => {
      cancelled = true;
    };
  }, [driverWalletSnapshot?.blocked, isOnline, setIsOnline]);

  useEffect(() => {
    let cancelled = false;
    void refreshDriverProfile().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [refreshDriverProfile]);

  useEffect(() => {
    if (incomingRequest?.id) {
      requestTimerStartedRef.current = false;
      setRequestTimer(15);
    }
  }, [incomingRequest?.id]);

  useEffect(() => {
    if (requestTimer > 0) {
      requestTimerStartedRef.current = true;
      const timer = setTimeout(() => setRequestTimer(requestTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (requestTimer === 0 && incomingRequest && requestTimerStartedRef.current) {
      void driverRideService.declineRide({ requestId: incomingRequest.id }).then(() => {
        requestTimerStartedRef.current = false;
        setIncomingRequest(null);
      });
    }
  }, [requestTimer, incomingRequest]);

  return {
    isOnline,
    setIsOnline,
    isVerified,
    setIsVerified,
    destinationFilter,
    setDestinationFilter,
    filterUsesLeft,
    setFilterUsesLeft,
    maintenanceLogs,
    setMaintenanceLogs,
    activeKm,
    setActiveKm,
    driverTier,
    setDriverTier,
    incomingRequest,
    setIncomingRequest,
    requestTimer,
    setRequestTimer,
    isNavigating,
    setIsNavigating,
    navStep,
    setNavStep,
    navStopLegIndex,
    setNavStopLegIndex,
    verificationStep,
    setVerificationStep,
    vehicleDetails,
    setVehicleDetails,
    rideRequest,
    setRideRequest,
    currentTrip,
    setCurrentTrip,
    activeTripId,
    setActiveTripId,
    trainingModules,
    setTrainingModules,
    driverDocuments,
    setDriverDocuments,
    driverVehicles,
    setDriverVehicles,
    compliments,
    setCompliments,
    navPreference,
    setNavPreference,
    driverWalletSnapshot,
    driverProfile,
    refreshDriverWallet,
    refreshDriverProfile,
  };
}
