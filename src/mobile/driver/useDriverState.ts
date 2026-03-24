import { useState, useEffect } from 'react';
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

export function useDriverState() {
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

  useEffect(() => {
    if (incomingRequest?.id) {
      setRequestTimer(15);
    }
  }, [incomingRequest?.id]);

  useEffect(() => {
    if (requestTimer > 0) {
      const timer = setTimeout(() => setRequestTimer(requestTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (requestTimer === 0 && incomingRequest) {
      void driverRideService.declineRide({ requestId: incomingRequest.id }).then(() => {
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
  };
}
