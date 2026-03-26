import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Phone,
  ChevronRight,
  MapPin,
  Navigation,
  Clock,
  CreditCard,
  User,
  Settings,
  History,
  LogOut,
  Car,
  Menu,
  X,
  Star,
  DollarSign,
  Activity,
  MessageSquare,
  PhoneCall,
  Home,
  Briefcase,
  CheckCircle,
  AlertCircle,
  FileText,
  Camera,
  ArrowRight,
  Map as MapIcon,
  Wallet,
  Shield,
  AlertTriangle,
  Plus,
  Calendar,
  HelpCircle,
  Info,
  MessageCircle,
  Smartphone,
  CreditCard as CardIcon,
  Trash2,
  ChevronLeft,
  Search,
  BarChart3,
  PieChart,
  TrendingUp,
  LayoutDashboard,
  Bell,
  Gift,
  Share2,
  Copy,
  Building2,
  Users,
  Download,
  Globe,
  Check,
  Award,
  ThumbsUp,
  Tag,
  AlertCircle as AlertIcon,
  Map as MapIcon2,
  Layers,
  Flame,
  Sparkles,
  ShieldCheck,
  Send,
  MessageSquareOff,
  Wind,
  Luggage,
  Settings2,
  Zap,
  Lock,
  Sun,
  Moon,
  Monitor,
  Wrench,
} from 'lucide-react';
import { useMobileApp } from './context/MobileAppContext';
import { riderRideService, driverRideService } from './services/api';
import { appSettingsService } from './services/api/appSettingsService';
import { buildRequestRideRequest } from './services/api/adapters';
import { driverNavAfterTripStart } from './services/rides/rideLifecycle';
import { calculateFareEstimate, getRouteEstimate } from './services/mapbox/routeService';
import { walletTransactionDistanceLabel, walletTransactionDurationLabel } from './utils/walletFromRide';
import { MapboxMap } from './components/maps/MapboxMap';
import type { MapboxCameraFraming } from './components/maps/types';
import { WelcomeScreen } from './screens/auth/WelcomeScreen';
import { PhoneScreen } from './screens/auth/PhoneScreen';
import { OtpScreen } from './screens/auth/OtpScreen';
import { RiderRegistrationScreen } from './screens/auth/RiderRegistrationScreen';
import { DriverRegistrationScreen } from './screens/auth/DriverRegistrationScreen';
import { RiderHomeScreen, RiderPlanningSheet } from './screens/rider/RiderHomeScreen';
import { RiderRequestScreen } from './screens/rider/RiderRequestScreen';
import { RiderTripScreen } from './screens/rider/RiderTripScreen';
import { RiderProfileScreen } from './screens/rider/RiderProfileScreen';
import { DriverProfileScreen } from './screens/driver/DriverProfileScreen';
import { DriverWalletScreen } from './screens/driver/DriverWalletScreen';
import { RiderHistoryScreen } from './screens/rider/RiderHistoryScreen';
import { DriverVerificationScreen } from './screens/driver/DriverVerificationScreen';
import { DriverHomeScreen } from './screens/driver/DriverHomeScreen';
import { DriverActiveTripScreen } from './screens/driver/DriverActiveTripScreen';
import { DriverRequestsScreen } from './screens/driver/DriverRequestsScreen';
import { DriverHistoryScreen } from './screens/driver/DriverHistoryScreen';
import type { WalletTransaction } from './types/mobile';
import type { DriverNotificationRow, LatLng, RideSummary } from './types/api';
import type { RideStatus as RiderUiPhase } from './types/mobile';
import { mapApiRideStatusToUi } from './utils/rideUiPhase';

const RIDER_REQUEST_DEBUG = import.meta.env.DEV;

/**
 * Rider active-trip map: approximate vehicle position along pickup→destination so framing matches
 * driver trip (driver pin + route) when the API does not expose live driver GPS.
 */
function estimateRiderTripDriverVehicleCoords(ride: RideSummary, uiPhase: RiderUiPhase): LatLng | null {
  const pickup = ride.pickupCoords;
  const dest = ride.destinationCoords;
  if (!pickup || !dest) return null;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const at = (t: number): LatLng => ({
    latitude: lerp(pickup.latitude, dest.latitude, t),
    longitude: lerp(pickup.longitude, dest.longitude, t),
  });
  const s = ride.status;
  if (s === 'driver_assigned' || uiPhase === 'found') return at(0.18);
  if (s === 'driver_arrived' || uiPhase === 'arrived') return pickup;
  if (s === 'in_progress' || uiPhase === 'ongoing') return at(0.62);
  return null;
}

function formatDriverWalletNotificationTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/** Maps persisted `DriverNotificationType` to inbox labels (wallet / top-up / commission). */
function driverWalletNotificationCategory(
  type: string,
): { label: string; dotClass: string } {
  switch (type) {
    case 'low_balance_warning':
      return { label: 'Low balance alert', dotClass: 'bg-amber-500' };
    case 'wallet_blocked':
      return { label: 'Dispatch blocked', dotClass: 'bg-red-500' };
    case 'top_up_approved':
      return { label: 'Top-up approved', dotClass: 'bg-emerald-500' };
    case 'top_up_rejected':
      return { label: 'Top-up declined', dotClass: 'bg-slate-500' };
    case 'commission_deducted':
      return { label: 'Trip commission', dotClass: 'bg-violet-600' };
    default:
      return { label: 'Wallet', dotClass: 'bg-slate-400' };
  }
}

export function MobileAppShell() {
  /** Browser geolocation for “my location” pin on the map (home step only). */
  const [userLocationCoords, setUserLocationCoords] = useState<LatLng | null>(null);
  const [ratingComment, setRatingComment] = useState('');
  /** Vehicle Management: inline add form (manual plate/tag entry). */
  const [driverVehicleAddOpen, setDriverVehicleAddOpen] = useState(false);
  const [newVehicleForm, setNewVehicleForm] = useState({
    model: '',
    plate: '',
    color: '',
    insuranceExpiry: '',
  });

  const {
    t,
    language,
    setLanguage,
    mode,
    setMode,
    step,
    setStep,
    phone,
    setPhone,
    isMenuOpen,
    setIsMenuOpen,
    isOnline,
    setIsOnline,
    resendCooldown,
    setResendCooldown,
    showEarningsHistory,
    setShowEarningsHistory,
    showRating,
    setShowRating,
    showProfile,
    setShowProfile,
    showDriverProfile,
    setShowDriverProfile,
    showDriverWallet,
    setShowDriverWallet,
    rating,
    setRating,
    hoverRating,
    setHoverRating,
    userName,
    setUserName,
    userPhone,
    setUserPhone,
    isEditingProfile,
    setIsEditingProfile,
    editName,
    setEditName,
    pickup,
    setPickup,
    destination,
    destinationCommitted,
    riderActiveTripPanelCollapsed,
    setRiderActiveTripPanelCollapsed,
    riderWhereToSearchExpanded,
    riderPlanningSheetOpen,
    setRiderPlanningSheetOpen,
    setDestination,
    setDestinationCoords,
    setDestinationPlaceId,
    setDestinationCommitted,
    pickupCoords,
    setPickupCoords,
    setPickupPlaceId,
    destinationCoords,
    stops,
    stopCoords,
    setStops,
    setStopCoords,
    setStopPlaceIds,
    setRiderPlanningStopFocusIndex,
    isSearching,
    setIsSearching,
    rideStatus,
    setRideStatus,
    currentRide,
    setCurrentRide,
    selectedVehicle,
    setSelectedVehicle,
    showChat,
    setShowChat,
    chatMessages,
    setChatMessages,
    newMessage,
    setNewMessage,
    activeDriver,
    setActiveDriver,
    isVerified,
    setIsVerified,
    showVerification,
    setShowVerification,
    showDestinationFilter,
    setShowDestinationFilter,
    destinationFilter,
    setDestinationFilter,
    filterUsesLeft,
    setFilterUsesLeft,
    showMaintenanceTracker,
    setShowMaintenanceTracker,
    maintenanceLogs,
    setMaintenanceLogs,
    activeKm,
    setActiveKm,
    driverTier,
    setDriverTier,
    showTiers,
    setShowTiers,
    incomingRequest,
    setIncomingRequest,
    requestTimer,
    setRequestTimer,
    isNavigating,
    setIsNavigating,
    navStep,
    setNavStep,
    setNavStopLegIndex,
    activeTripId,
    setActiveTripId,
    verificationStep,
    setVerificationStep,
    vehicleDetails,
    setVehicleDetails,
    showWallet,
    setShowWallet,
    showTripHistory,
    setShowTripHistory,
    walletBalance,
    setWalletBalance,
    showSOS,
    setShowSOS,
    sosCountdown,
    setSosCountdown,
    transactions,
    setTransactions,
    showTripDetails,
    setShowTripDetails,
    selectedTrip,
    setSelectedTrip,
    showPaymentMethods,
    setShowPaymentMethods,
    showAddPayment,
    setShowAddPayment,
    showScheduleRide,
    setShowScheduleRide,
    scheduledDate,
    setScheduledDate,
    scheduledTime,
    setScheduledTime,
    showHelp,
    setShowHelp,
    showFAQ,
    setShowFAQ,
    showShareTrip,
    setShowShareTrip,
    showRidePreferences,
    setShowRidePreferences,
    showZeyagoPass,
    setShowZeyagoPass,
    ridePreferences,
    setRidePreferences,
    hasZeyagoPass,
    setHasZeyagoPass,
    profileType,
    setProfileType,
    zeyagoPoints,
    setZeyagoPoints,
    showRewards,
    setShowRewards,
    showBusinessSetup,
    setShowBusinessSetup,
    businessEmail,
    setBusinessEmail,
    ridePin,
    setRidePin,
    enteredPin,
    setEnteredPin,
    showPinVerification,
    setShowPinVerification,
    requireRideSafetyPin,
    isPinVerified,
    setIsPinVerified,
    paymentMethods,
    setPaymentMethods,
    showEarningsAnalytics,
    setShowEarningsAnalytics,
    showVehicleManagement,
    setShowVehicleManagement,
    showHeatmap,
    setShowHeatmap,
    showPerformance,
    setShowPerformance,
    showNotifications,
    setShowNotifications,
    showReferral,
    setShowReferral,
    showCorporateDashboard,
    setShowCorporateDashboard,
    showDocumentVault,
    setShowDocumentVault,
    showSupport,
    setShowSupport,
    showSafetyToolkit,
    setShowSafetyToolkit,
    showSettings,
    setShowSettings,
    settingsPushEnabled,
    setSettingsPushEnabled,
    settingsTheme,
    setSettingsTheme,
    settingsCompactUI,
    setSettingsCompactUI,
    supportStep,
    setSupportStep,
    selectedSupportTrip,
    setSelectedSupportTrip,
    otp,
    setOtp,
    isVerifying,
    setIsVerifying,
    showFavorites,
    setShowFavorites,
    showPayout,
    setShowPayout,
    payoutAmount,
    setPayoutAmount,
    payoutMethod,
    setPayoutMethod,
    showPromos,
    setShowPromos,
    promoCode,
    setPromoCode,
    activePromo,
    setActivePromo,
    promoError,
    setPromoError,
    showScheduledRides,
    setShowScheduledRides,
    showTrainingAcademy,
    setShowTrainingAcademy,
    navPreference,
    setNavPreference,
    showNavSettings,
    setShowNavSettings,
    rideRequest,
    setRideRequest,
    currentTrip,
    setCurrentTrip,
    scheduledRides,
    setScheduledRides,
    trainingModules,
    setTrainingModules,
    favorites,
    setFavorites,
    driverDocuments,
    setDriverDocuments,
    corporateData,
    setCorporateData,
    driverVehicles,
    setDriverVehicles,
    notifications,
    setNotifications,
    compliments,
    setCompliments,
    vehicleTypes,
    handleNextStep,
    handleResendOtp,
    handleLogout,
    refreshDriverWallet,
    refreshDriverProfile,
  } = useMobileApp();

  const prevDriverWalletOpenRef = React.useRef(false);
  useEffect(() => {
    if (prevDriverWalletOpenRef.current && !showDriverWallet && mode === 'driver') {
      void refreshDriverWallet();
    }
    prevDriverWalletOpenRef.current = showDriverWallet;
  }, [showDriverWallet, mode, refreshDriverWallet]);

  const [driverWalletNotifications, setDriverWalletNotifications] = useState<DriverNotificationRow[]>([]);

  const refreshDriverWalletNotifications = useCallback(async () => {
    if (mode !== 'driver') return;
    try {
      const res = await driverRideService.listNotifications();
      setDriverWalletNotifications(res.notifications);
    } catch {
      setDriverWalletNotifications([]);
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'driver') {
      setDriverWalletNotifications([]);
      return;
    }
    void refreshDriverWalletNotifications();
  }, [mode, showNotifications, isMenuOpen, showDriverWallet, refreshDriverWalletNotifications]);

  const markDriverWalletNotificationsRead = useCallback(async () => {
    try {
      await driverRideService.markNotificationsRead();
      await refreshDriverWalletNotifications();
    } catch {
      /* keep list as-is */
    }
  }, [refreshDriverWalletNotifications]);

  useEffect(() => {
    if (step !== 'home') {
      setUserLocationCoords(null);
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocationCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {
        /* permission denied or position unavailable */
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [step]);

  /** After rating, restore rider/driver home: clear trip overlays and shared ride state so the shell header + bottom card render again. */
  const dismissRatingAndReturnHome = useCallback(() => {
    setShowRating(false);
    setRating(0);
    setHoverRating(0);
    setRatingComment('');
    setShowChat(false);
    setShowShareTrip(false);
    setShowSafetyToolkit(false);
    setShowTripDetails(false);
    setShowPinVerification(false);
    setEnteredPin(['', '', '', '']);
    setIsPinVerified(false);
    setRideStatus('idle');
    setCurrentRide(null);
    setIsSearching(false);
    setActiveTripId(null);
    setIsNavigating(false);
    setNavStep('to_pickup');
    setNavStopLegIndex(null);
    setDestination('');
    setDestinationCoords(null);
    setDestinationPlaceId(null);
    setDestinationCommitted(false);
    setPickup('');
    setPickupCoords(null);
    setPickupPlaceId(null);
    setStops([]);
    setStopCoords([]);
    setStopPlaceIds([]);
    setRiderPlanningSheetOpen(false);
    setRiderPlanningStopFocusIndex(null);
  }, [
    setShowRating,
    setRating,
    setHoverRating,
    setRatingComment,
    setShowChat,
    setShowShareTrip,
    setShowSafetyToolkit,
    setShowTripDetails,
    setShowPinVerification,
    setEnteredPin,
    setIsPinVerified,
    setRideStatus,
    setCurrentRide,
    setIsSearching,
    setActiveTripId,
    setIsNavigating,
    setNavStep,
    setNavStopLegIndex,
    setDestination,
    setDestinationCoords,
    setDestinationPlaceId,
    setDestinationCommitted,
    setPickup,
    setPickupCoords,
    setPickupPlaceId,
    setStops,
    setStopCoords,
    setStopPlaceIds,
    setRiderPlanningSheetOpen,
    setRiderPlanningStopFocusIndex,
  ]);

  type RiderTab = 'home' | 'trips' | 'wallet';
  const [riderTab, setRiderTab] = useState<RiderTab>('home');

  /** Full-screen / sheet overlays where the rider bottom chrome should yield (keep trip flow visible otherwise). */
  const riderShellOverlay =
    showRating ||
    showChat ||
    showWallet ||
    showTripHistory ||
    showProfile ||
    showSettings ||
    showTripDetails ||
    showSOS ||
    showVerification ||
    showHelp ||
    showFAQ ||
    showShareTrip ||
    showRewards ||
    showBusinessSetup ||
    showPinVerification ||
    showPaymentMethods ||
    showAddPayment ||
    showEarningsAnalytics ||
    showVehicleManagement ||
    showHeatmap ||
    showPerformance ||
    showNotifications ||
    showReferral ||
    showCorporateDashboard ||
    showDocumentVault ||
    showSupport ||
    showSafetyToolkit ||
    showFavorites ||
    showPayout ||
    showPromos ||
    showScheduledRides ||
    showTrainingAcademy ||
    showNavSettings;

  /** Rider chrome (map + bottom sheet) when not in a full-screen overlay; wallet tab opens modal. */
  const riderMapChromeVisible =
    step === 'home' &&
    mode === 'rider' &&
    !riderShellOverlay &&
    riderTab !== 'wallet';

  /** HTML reference: no bottom tab bar on rider home/planning — Trips/Wallet via menu or tabs on other tabs. */
  const riderBottomNavVisible = riderMapChromeVisible && riderTab !== 'home';

  const riderFloatingCardVisible = riderMapChromeVisible;
  const riderEffectiveRideStatus: RiderUiPhase =
    mode === 'rider' && currentRide?.status
      ? mapApiRideStatusToUi(currentRide.status)
      : rideStatus;
  const currentRideId = currentRide?.id ?? null;
  const currentRideApiStatus = currentRide?.status ?? null;
  const riderHasSearchingRide =
    riderEffectiveRideStatus === 'searching' ||
    currentRideApiStatus === 'pending' ||
    currentRideApiStatus === 'matching';
  const riderHasUnresolvedCurrentRide =
    currentRide != null &&
    currentRideApiStatus !== 'cancelled' &&
    riderEffectiveRideStatus !== 'completed' &&
    riderEffectiveRideStatus !== 'found' &&
    riderEffectiveRideStatus !== 'arrived' &&
    riderEffectiveRideStatus !== 'ongoing';
  const riderSearchingViewVisible = riderHasSearchingRide || riderHasUnresolvedCurrentRide;

  /** Velox ride-search: taller sheet so trip summary + list + fixed CTA fit like the mockup. */
  const riderVehicleSheetExpanded =
    mode === 'rider' &&
    riderTab === 'home' &&
    destinationCommitted &&
    Boolean(destination.trim()) &&
    riderEffectiveRideStatus === 'idle' &&
    !riderSearchingViewVisible &&
    currentRide == null;

  /** Vehicle sheet or searching UI: single flex column so RiderRequestScreen is not beside an empty scroll area. */
  const riderRequestSheetMainLayout =
    mode === 'rider' &&
    riderTab === 'home' &&
    destinationCommitted &&
    Boolean(destination.trim()) &&
    ((riderEffectiveRideStatus === 'idle' && !riderSearchingViewVisible && currentRide == null) ||
      riderSearchingViewVisible);

  /** “Finding your ride…” — short sheet; avoids empty vertical gap above cancel. */
  const riderSearchingCompactSheet =
    mode === 'rider' &&
    riderTab === 'home' &&
    destinationCommitted &&
    Boolean(destination.trim()) &&
    riderSearchingViewVisible;

  /** Compact bottom panel on rider home (Where to? only) — more map like the reference. */
  const riderHomePlanningCompact =
    mode === 'rider' && riderEffectiveRideStatus === 'idle' && !destinationCommitted && !riderVehicleSheetExpanded;

  /** Matched driver en route / at pickup / trip — taller sheet so trip controls are not clipped. */
  const riderActiveTripSheet =
    mode === 'rider' &&
    (riderEffectiveRideStatus === 'found' || riderEffectiveRideStatus === 'arrived' || riderEffectiveRideStatus === 'ongoing');

  const riderActiveTripPanelCompact =
    riderActiveTripSheet && riderActiveTripPanelCollapsed;

  /** Expanded active-trip sheet should hug content; collapsed uses a fixed cap. */
  const riderActiveTripExpandedContentSized =
    riderActiveTripSheet && !riderActiveTripPanelCompact;

  const riderBottomGlassMaxClass = riderRequestSheetMainLayout
    ? riderSearchingCompactSheet
      ? 'max-h-[min(42%,360px)]'
      : 'max-h-[88%]'
    : riderHomePlanningCompact
      ? riderWhereToSearchExpanded
        ? 'max-h-[min(88%,620px)]'
        : 'max-h-[min(52%,380px)]'
      : riderActiveTripSheet
        ? riderActiveTripPanelCompact
          ? 'max-h-[min(36%,260px)]'
          : 'max-h-none'
        : 'max-h-[46%]';

  /** Idle “where to?” only — not searching / not committed route (those use routeOverview). */
  const riderMapRiderHomeFraming =
    mode === 'rider' &&
    riderTab === 'home' &&
    riderEffectiveRideStatus === 'idle' &&
    !destinationCommitted;

  /** Mapbox camera mode from trip role + UI phase (no business logic changes). */
  const mapCameraFraming = useMemo((): MapboxCameraFraming => {
    if (mode === 'rider') {
      if (
        riderEffectiveRideStatus === 'found' ||
        riderEffectiveRideStatus === 'arrived' ||
        riderEffectiveRideStatus === 'ongoing'
      ) {
        return 'activeNavigation';
      }
      if (
        (riderEffectiveRideStatus === 'idle' &&
          destinationCommitted &&
          Boolean(destination.trim()) &&
          !riderSearchingViewVisible &&
          currentRide == null) ||
        riderSearchingViewVisible
      ) {
        return 'routeOverview';
      }
      if (riderMapRiderHomeFraming) {
        return 'riderHome';
      }
      return 'default';
    }
    if (
      mode === 'driver' &&
      isVerified &&
      (activeTripId != null || isNavigating)
    ) {
      return 'activeNavigation';
    }
    return 'default';
  }, [
    mode,
    riderEffectiveRideStatus,
    destinationCommitted,
    destination,
    riderSearchingViewVisible,
    riderMapRiderHomeFraming,
    isVerified,
    activeTripId,
    isNavigating,
  ]);

  useEffect(() => {
    if (!RIDER_REQUEST_DEBUG || mode !== 'rider') return;
    console.log('[MobileAppShell] rider request/search render gate', {
      riderTab,
      rideStatus,
      riderEffectiveRideStatus,
      currentRideId,
      currentRideApiStatus,
      destinationCommitted,
      destination: destination.trim(),
      riderVehicleSheetExpanded,
      riderRequestSheetMainLayout,
      riderSearchingCompactSheet,
      riderHasSearchingRide,
      riderHasUnresolvedCurrentRide,
      riderSearchingViewVisible,
    });
  }, [
    mode,
    riderTab,
    rideStatus,
    riderEffectiveRideStatus,
    currentRideId,
    currentRideApiStatus,
    destinationCommitted,
    destination,
    riderVehicleSheetExpanded,
    riderRequestSheetMainLayout,
    riderSearchingCompactSheet,
    riderHasSearchingRide,
    riderHasUnresolvedCurrentRide,
    riderSearchingViewVisible,
  ]);

  useEffect(() => {
    if (!RIDER_REQUEST_DEBUG || mode !== 'rider') return;
    const topPillText =
      riderEffectiveRideStatus === 'found'
        ? 'Driver arriving'
        : riderEffectiveRideStatus === 'arrived'
          ? 'Driver is here'
          : riderEffectiveRideStatus === 'ongoing'
            ? 'Trip in progress'
            : null;
    if (!topPillText) return;
    console.log('[MobileAppShell] rider top pill source', {
      currentRideStatus: currentRide?.status ?? null,
      mappedRiderUiPhase: riderEffectiveRideStatus,
      topPillText,
    });
  }, [mode, currentRide?.status, riderEffectiveRideStatus]);

  const previousRiderRenderRef = React.useRef<{
    riderSearchingCompactSheet: boolean;
    riderVehicleSheetExpanded: boolean;
    riderRequestSheetMainLayout: boolean;
    riderSearchingViewVisible: boolean;
  } | null>(null);

  useEffect(() => {
    if (!RIDER_REQUEST_DEBUG || mode !== 'rider') return;
    const prev = previousRiderRenderRef.current;
    if (
      prev?.riderSearchingCompactSheet &&
      !riderSearchingCompactSheet &&
      riderVehicleSheetExpanded
    ) {
      console.log('[MobileAppShell] searching -> request-sheet transition', {
        rideStatus,
        riderEffectiveRideStatus,
        currentRideId,
        currentRideApiStatus,
        destinationCommitted,
        destination: destination.trim(),
        riderVehicleSheetExpanded,
        riderRequestSheetMainLayout,
        riderSearchingCompactSheet,
        riderHasSearchingRide,
        riderHasUnresolvedCurrentRide,
        riderSearchingViewVisible,
      });
    }
    previousRiderRenderRef.current = {
      riderSearchingCompactSheet,
      riderVehicleSheetExpanded,
      riderRequestSheetMainLayout,
      riderSearchingViewVisible,
    };
  }, [
    mode,
    rideStatus,
    riderEffectiveRideStatus,
    currentRideId,
    currentRideApiStatus,
    destinationCommitted,
    destination,
    riderVehicleSheetExpanded,
    riderRequestSheetMainLayout,
    riderSearchingCompactSheet,
    riderHasSearchingRide,
    riderHasUnresolvedCurrentRide,
    riderSearchingViewVisible,
  ]);

  const riderMapDriverCoords = useMemo(() => {
    if (mode !== 'rider') return null;
    if (!currentRide) return null;
    if (
      riderEffectiveRideStatus !== 'found' &&
      riderEffectiveRideStatus !== 'arrived' &&
      riderEffectiveRideStatus !== 'ongoing'
    ) {
      return null;
    }
    return estimateRiderTripDriverVehicleCoords(currentRide, riderEffectiveRideStatus);
  }, [mode, currentRide, riderEffectiveRideStatus]);

  /** Where-to phase on rider Home: no outer sheet scroll; suggestion list scrolls inside PlaceSuggestions. */
  const riderWhereToNoOuterScroll =
    mode === 'rider' && riderTab === 'home' && riderEffectiveRideStatus === 'idle' && !destinationCommitted;

  /** Active trip / search: keep planning + trip UI on Home so tabs do not hide an in-progress ride. */
  useEffect(() => {
    if (mode !== 'rider') return;
    if (riderEffectiveRideStatus !== 'idle' && riderEffectiveRideStatus !== 'completed') {
      setRiderTab('home');
    }
  }, [mode, riderEffectiveRideStatus]);

  useEffect(() => {
    if (mode === 'driver') setRiderTab('home');
  }, [mode]);

  /** Wallet tab opens the existing wallet modal; closing the modal returns to Home tab. */
  useEffect(() => {
    if (mode !== 'rider' || step !== 'home') return;
    if (riderTab === 'wallet' && riderEffectiveRideStatus === 'idle') {
      setShowWallet(true);
    }
  }, [mode, step, riderTab, riderEffectiveRideStatus, setShowWallet]);

  useEffect(() => {
    if (!showWallet && riderTab === 'wallet') {
      setRiderTab('home');
    }
  }, [showWallet, riderTab]);

  return (
    <div className="velox-phone-chrome flex min-h-screen items-center justify-center p-4 font-sans">
      {/* Phone Frame Simulation */}
      <div className="relative flex h-[800px] w-[380px] flex-col overflow-hidden rounded-[3rem] border border-white/10 bg-white shadow-[0_32px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/20">
        {/* Status Bar */}
        <div className="flex h-8 w-full shrink-0 items-center justify-between px-8 pt-2 text-[10px] font-bold text-slate-900">
          <span>9:41</span>
          <div className="flex gap-1">
            <Activity size={10} />
            <div className="h-2 w-4 rounded-sm bg-slate-900"></div>
          </div>
        </div>

        {/* Fills space below status bar so h-full children match visible area (avoids clipping bottom nav). */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="h-full min-h-0">
        <AnimatePresence mode="wait">
          {step === 'welcome' && <WelcomeScreen />}
          {step === 'phone' && <PhoneScreen />}
          {step === 'otp' && <OtpScreen />}
          {step === 'rider_register' && <RiderRegistrationScreen />}
          {step === 'driver_register' && <DriverRegistrationScreen />}

          {step === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-full min-h-0 flex-col bg-velox-bg"
            >
              {/* App Header — hidden on rider Home tab: map uses floating controls (Velox layout) */}
              {!(
                (mode === 'rider' && riderTab === 'home') ||
                (mode === 'driver' && isVerified)
              ) && (
              <div
                className={`flex items-center border-b border-velox-primary/8 bg-white/95 px-6 py-4 shadow-[0_8px_32px_rgba(45,27,66,0.06)] backdrop-blur-md ${
                  mode === 'rider' ? 'justify-start' : 'justify-between'
                }`}
              >
                <button type="button" onClick={() => setIsMenuOpen(true)} className="rounded-full bg-velox-bg p-2 text-velox-dark transition-all hover:bg-velox-primary/10">
                  <Menu size={20} />
                </button>

                {mode !== 'rider' && (
                  <>
                    <span className="pointer-events-none text-sm font-bold tracking-tight text-velox-dark">
                      Zeyago
                    </span>

                    <div className="h-10 w-10 rounded-full bg-velox-accent/15 p-1 ring-2 ring-velox-accent/25">
                      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="rounded-full" />
                    </div>
                  </>
                )}
              </div>
              )}

              {/* Main Content: map + overlays reserve space above rider tab bar */}
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="relative min-h-0 flex-1 overflow-hidden">
                <MapboxMap
                  pickupCoords={currentRide?.pickupCoords ?? pickupCoords ?? null}
                  destinationCoords={currentRide?.destinationCoords ?? destinationCoords ?? null}
                  driverCoords={mode === 'driver' ? userLocationCoords : riderMapDriverCoords}
                  userLocationCoords={mode === 'driver' ? null : userLocationCoords}
                  cameraFraming={mapCameraFraming}
                  stops={
                    currentRide?.stops ??
                    stops.map((address, i) => ({
                      address,
                      coords: stopCoords[i] ?? null,
                    }))
                  }
                  showRoute={
                    (destinationCommitted && Boolean(destination.trim())) || currentRide != null
                  }
                  routePolylineSegment={
                    ((mode === 'driver' &&
                      isNavigating &&
                      mapCameraFraming === 'activeNavigation' &&
                      navStep === 'to_pickup') ||
                      (mode === 'rider' && riderEffectiveRideStatus === 'found'))
                      ? 'driver_to_pickup'
                      : 'full_trip'
                  }
                  className="h-full w-full"
                />

                {/* Velox-style floating top bar (rider + Home tab only) */}
                {mode === 'rider' && riderTab === 'home' && (
                  <div className="pointer-events-none absolute left-0 right-0 top-4 z-[25] flex items-center justify-start px-4">
                    <button
                      type="button"
                      onClick={() => setIsMenuOpen(true)}
                      className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-velox-dark shadow-[0_8px_24px_rgba(45,27,66,0.18)] transition-transform active:scale-95"
                      aria-label="Menu"
                    >
                      <Menu size={20} />
                    </button>
                  </div>
                )}

                {/* Trip status pill over map (Velox rider active) */}
                {mode === 'rider' &&
                  (riderEffectiveRideStatus === 'found' || riderEffectiveRideStatus === 'arrived' || riderEffectiveRideStatus === 'ongoing') && (
                    <div
                      className={`absolute left-4 z-[26] max-w-[min(100%-2rem,280px)] rounded-full px-4 py-2 text-xs font-bold text-white shadow-lg ${
                        riderEffectiveRideStatus === 'arrived' ? 'bg-green-600' : 'bg-velox-primary'
                      } ${mode === 'rider' && riderTab === 'home' ? 'top-[4.5rem]' : 'top-4'}`}
                    >
                      {riderEffectiveRideStatus === 'found' && 'Driver arriving'}
                      {riderEffectiveRideStatus === 'arrived' && 'Driver is here'}
                      {riderEffectiveRideStatus === 'ongoing' && 'Trip in progress'}
                    </div>
                  )}

                {/* SOS — right edge, vertically centered on map (rider home tab + verified driver home) */}
                {step === 'home' &&
                  !(mode === 'driver' && !isVerified) &&
                  (mode !== 'rider' || riderTab === 'home') && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowSOS(true);
                        setSosCountdown(5);
                      }}
                      className="absolute right-2 top-1/2 z-50 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-red-600 text-white shadow-md shadow-red-300/40 transition-transform active:scale-95"
                      aria-label="Emergency SOS"
                    >
                      <Shield size={18} />
                    </button>
                  )}

                {/* Rider: planning sheet (pickup / destination / saved) — opens from “Where to?” */}
                {mode === 'rider' &&
                  riderTab === 'home' &&
                  riderPlanningSheetOpen &&
                  rideStatus === 'idle' && (
                    <div className="pointer-events-auto absolute inset-0 z-[60] flex flex-col justify-end">
                      <button
                        type="button"
                        className="min-h-0 flex-1 cursor-default bg-black/45"
                        onClick={() => setRiderPlanningSheetOpen(false)}
                        aria-label="Close planning"
                      />
                      <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        className="pointer-events-auto max-h-[85%] min-h-0 w-full overflow-hidden rounded-t-[1.75rem] bg-white shadow-[0_-12px_48px_rgba(0,0,0,0.25)]"
                      >
                        <div className="max-h-full min-h-0 overflow-y-auto overscroll-y-contain velox-safe-x pt-3 velox-scroll-bottom">
                          <RiderPlanningSheet />
                        </div>
                      </motion.div>
                    </div>
                  )}

                {/* Rider Mode UI — active trip uses flex justify-end so the sheet grows from the bottom; collapsed stays a short strip */}
                {mode === 'rider' && riderFloatingCardVisible && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 z-10 flex min-h-0 flex-col justify-end">
                  <div
                    className={`pointer-events-none w-full min-h-0 transition-[max-height] duration-300 ease-out ${riderBottomGlassMaxClass}${
                      riderRequestSheetMainLayout
                        ? riderSearchingCompactSheet
                          ? ' h-auto min-h-0'
                          : ' h-[min(88%,calc(100%-0.5rem))] min-h-0'
                        : riderActiveTripSheet
                          ? riderActiveTripPanelCompact
                            ? ' h-auto min-h-[5.25rem] max-h-[min(36%,260px)]'
                            : ' h-auto min-h-0'
                          : ''
                    }`}
                  >
                    <motion.div
                      layout
                      className={`velox-glass-bottom pointer-events-auto relative mx-auto flex w-full flex-col rounded-t-[1.75rem]${
                        riderRequestSheetMainLayout
                          ? riderSearchingCompactSheet
                            ? ' max-h-full min-h-0 overflow-hidden'
                            : ' h-full max-h-full min-h-0 overflow-hidden'
                          : riderActiveTripSheet
                            ? riderActiveTripPanelCompact
                              ? ' h-auto min-h-0 max-h-full overflow-hidden'
                              : ' h-auto max-h-[min(88%,calc(100%-0.75rem))] min-h-0 overflow-hidden'
                            : ''
                      }${riderWhereToNoOuterScroll ? ' overflow-visible' : !riderRequestSheetMainLayout && !riderActiveTripSheet ? ' overflow-hidden' : ''}`}
                    >
                      {riderActiveTripSheet && (
                        <button
                          type="button"
                          onClick={() => setRiderActiveTripPanelCollapsed((c) => !c)}
                          className="flex w-full shrink-0 cursor-grab justify-center border-0 bg-transparent py-2 active:cursor-grabbing"
                          aria-label={
                            riderActiveTripPanelCollapsed ? 'Expand trip details' : 'Collapse trip details'
                          }
                        >
                          <span className="pointer-events-none h-1.5 w-12 rounded-full bg-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]" />
                        </button>
                      )}
                      <div
                        className={`relative flex min-h-0 flex-col${
                          riderRequestSheetMainLayout
                            ? riderSearchingCompactSheet
                              ? ' overflow-hidden'
                              : ' h-full flex-1 overflow-hidden'
                            : riderActiveTripSheet
                              ? riderActiveTripPanelCompact
                                ? ' h-auto shrink-0 overflow-hidden'
                                : ' h-auto shrink-0 overflow-visible'
                              : ' flex-1'
                        }${riderWhereToNoOuterScroll ? ' overflow-visible' : !riderRequestSheetMainLayout && !riderActiveTripSheet ? ' overflow-hidden' : ''}`}
                      >
                        {riderRequestSheetMainLayout ? (
                          <div
                            className={
                              riderSearchingCompactSheet
                                ? 'flex w-full min-w-0 flex-col'
                                : 'flex h-full min-h-0 min-w-0 flex-1 flex-col'
                            }
                          >
                            <RiderRequestScreen />
                          </div>
                        ) : (
                          <>
                            <div
                              className={`velox-safe-x velox-safe-b velox-scroll-bottom ${
                                riderWhereToNoOuterScroll
                                  ? 'shrink-0 overflow-x-hidden overflow-y-visible pt-5'
                                  : riderActiveTripSheet && riderActiveTripPanelCompact
                                    ? 'shrink-0 overflow-x-hidden overflow-y-hidden pt-3'
                                    : riderActiveTripExpandedContentSized
                                      ? 'velox-safe-x velox-safe-b w-full shrink-0 overflow-x-hidden overflow-y-auto overscroll-y-contain pb-3 pt-1'
                                      : 'min-h-0 flex-1 overflow-y-auto overscroll-y-contain pt-5'
                              }`}
                            >
                              {riderTab === 'home' && (
                                <>
                                  <RiderHomeScreen />
                                  <RiderTripScreen />
                                </>
                              )}
                              {riderTab === 'trips' && (
                                <div className="flex min-h-0 flex-col">
                                  <h3 className="mb-4 text-xl font-bold text-slate-900">Trip activity</h3>
                                  <RiderHistoryScreen />
                                </div>
                              )}
                            </div>
                            {riderTab === 'home' && <RiderRequestScreen />}
                          </>
                        )}
                      </div>
                    </motion.div>
                  </div>
                  </div>
                )}

                {/* Rider: active trip / search UI when overlays hide the floating card */}
                {mode === 'rider' && !riderFloatingCardVisible && riderEffectiveRideStatus !== 'idle' && riderEffectiveRideStatus !== 'completed' && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 z-10 flex min-h-0 flex-col justify-end">
                  <div
                    className={`pointer-events-none w-full min-h-0 transition-[max-height] duration-300 ease-out ${riderBottomGlassMaxClass}${
                      riderActiveTripSheet
                        ? riderActiveTripPanelCompact
                          ? ' h-auto min-h-[5.25rem] max-h-[min(36%,260px)]'
                          : ' h-auto min-h-0'
                        : ''
                    }`}
                  >
                    <motion.div
                      layout
                      className={`velox-glass-bottom pointer-events-auto relative mx-auto flex w-full flex-col overflow-hidden rounded-t-[1.75rem]${
                        riderActiveTripSheet && riderActiveTripPanelCompact
                          ? ' h-auto min-h-0 max-h-full'
                          : riderActiveTripSheet
                            ? ' h-auto max-h-[min(88%,calc(100%-0.75rem))] min-h-0'
                            : ' h-full max-h-full min-h-0'
                      }`}
                    >
                      {riderActiveTripSheet && (
                        <button
                          type="button"
                          onClick={() => setRiderActiveTripPanelCollapsed((c) => !c)}
                          className="flex w-full shrink-0 cursor-grab justify-center border-0 bg-transparent py-2 active:cursor-grabbing"
                          aria-label={
                            riderActiveTripPanelCollapsed ? 'Expand trip details' : 'Collapse trip details'
                          }
                        >
                          <span className="pointer-events-none h-1.5 w-12 rounded-full bg-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]" />
                        </button>
                      )}
                      <div
                        className={`relative flex min-h-0 flex-col overflow-hidden${
                          riderActiveTripSheet && riderActiveTripPanelCompact
                            ? ' h-auto shrink-0'
                            : riderActiveTripSheet
                              ? ' h-auto shrink-0'
                              : ' h-full flex-1'
                        }`}
                      >
                        <div
                          className={
                            riderActiveTripSheet && riderActiveTripPanelCompact
                              ? 'shrink-0 overflow-x-hidden overflow-y-hidden velox-safe-x velox-safe-b pt-3 velox-scroll-bottom'
                              : riderActiveTripSheet
                                ? 'velox-safe-x velox-safe-b min-h-0 shrink-0 overflow-x-hidden overflow-y-auto overscroll-y-contain pb-3 pt-1 velox-scroll-bottom'
                                : 'min-h-0 flex-1 overflow-y-auto overscroll-y-contain velox-safe-x velox-safe-b pt-5 velox-scroll-bottom'
                          }
                        >
                          <RiderHomeScreen />
                          <RiderTripScreen />
                        </div>
                        <RiderRequestScreen />
                      </div>
                    </motion.div>
                  </div>
                  </div>
                )}

                {/* Driver Mode UI */}
                {mode === 'driver' && (
                  <div className="pointer-events-none absolute inset-0 z-40">
                    {!isVerified ? (
                      <div className="pointer-events-auto absolute inset-0 z-[60] overflow-y-auto overflow-x-hidden overscroll-y-contain bg-white">
                        <DriverVerificationScreen />
                      </div>
                    ) : (
                      <div className="pointer-events-none relative h-full">
                        <DriverHomeScreen />
                        <DriverActiveTripScreen />
                        <DriverRequestsScreen />
                      </div>
                    )}
                  </div>
                )}

                </div>

                {riderBottomNavVisible && (
                  <nav
                    className="relative z-30 flex min-h-[56px] shrink-0 items-stretch justify-around rounded-t-[1.25rem] border-t border-velox-primary/10 bg-white/95 px-1 pt-2 shadow-[0_-12px_40px_rgba(45,27,66,0.12)] backdrop-blur-md"
                    style={{
                      paddingBottom: 'max(14px, env(safe-area-inset-bottom, 0px))',
                    }}
                    aria-label="Rider navigation"
                  >
                    {(
                      [
                        { id: 'home' as const, label: 'Home', Icon: Home },
                        { id: 'trips' as const, label: 'Trips', Icon: History },
                        { id: 'wallet' as const, label: 'Wallet', Icon: Wallet },
                      ] as const
                    ).map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setRiderTab(id)}
                        className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold transition-colors ${
                          riderTab === id ? 'text-velox-primary' : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <Icon
                          size={22}
                          strokeWidth={riderTab === id ? 2.25 : 1.75}
                          className={riderTab === id ? 'text-velox-primary' : 'text-slate-400'}
                        />
                        <span className="truncate">{label}</span>
                      </button>
                    ))}
                  </nav>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
          </div>
        </div>

        {/* Chat Modal */}
        <AnimatePresence>
                {showChat && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-[110] flex flex-col bg-white"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 p-6 pt-12">
                        <div className="flex items-center gap-3">
                          <button onClick={() => setShowChat(false)} className="rounded-full bg-slate-100 p-2">
                            <ChevronRight className="rotate-180" size={20} />
                          </button>
                          <div>
                            <h4 className="font-bold text-slate-900">{activeDriver.name}</h4>
                            <p className="text-[10px] text-velox-accent font-bold uppercase">Online</p>
                          </div>
                        </div>
                        <button className="rounded-full bg-velox-accent/15 p-2 text-velox-primary">
                          <PhoneCall size={20} />
                        </button>
                      </div>

                      <div className="flex-1 space-y-4 overflow-y-auto p-6">
                        <div className="rounded-2xl bg-blue-50 p-4 text-center">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Safety Tip</p>
                          <p className="mt-1 text-xs text-blue-500">Keep your communication within the app for your safety and to avoid extra costs.</p>
                        </div>
                        {chatMessages.length === 0 && (
                          <div className="flex h-full flex-col items-center justify-center text-center opacity-50">
                            <MessageSquare size={48} className="mb-4 text-slate-300" />
                            <p className="text-sm text-slate-500">No messages yet. Send a message to coordinate pickup.</p>
                          </div>
                        )}
                        {chatMessages.map((msg, i) => (
                          <div key={i} className={`flex ${msg.sender === mode ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm font-medium ${msg.sender === mode ? 'bg-velox-primary text-white' : 'bg-slate-100 text-slate-900'}`}>
                              {msg.text}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-slate-100 p-6 pb-12">
                        <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                          {(mode === 'rider' ? [
                            "I'm at the gate",
                            "I'm coming now",
                            "Wait for 2 mins",
                            "Where are you?",
                            "I'm wearing a red jacket"
                          ] : [
                            "I'm at your location",
                            "Traffic is heavy",
                            "I'll be there in 2 mins",
                            "Where exactly are you?",
                            "I've arrived"
                          ]).map((reply, i) => (
                            <button 
                              key={i}
                              onClick={() => {
                                setChatMessages([...chatMessages, {sender: mode, text: reply}]);
                              }}
                              className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:border-velox-primary hover:text-velox-primary transition-all"
                            >
                              {reply}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && newMessage.trim() && (setChatMessages([...chatMessages, {sender: mode, text: newMessage}]), setNewMessage(''))}
                            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-velox-primary"
                          />
                          <button 
                            onClick={() => {
                              if (newMessage.trim()) {
                                setChatMessages([...chatMessages, {sender: mode, text: newMessage}]);
                                setNewMessage('');
                              }
                            }}
                            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-velox-primary text-white"
                          >
                            <ChevronRight size={20} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Profile Modal (rider vs driver) */}
              <RiderProfileScreen />
              <DriverProfileScreen />
              <DriverWalletScreen />

              {/* Rating Modal */}
              <AnimatePresence>
                {showRating && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-[100] bg-slate-900/45 backdrop-blur-sm"
                    >
                      <motion.div 
                        initial={{ y: 28, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 16, opacity: 0 }}
                        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[420px] rounded-t-[2rem] bg-white px-6 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-5 text-center shadow-[0_-20px_60px_rgba(15,23,42,0.22)]"
                      >
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 shadow-inner">
                          <CheckCircle size={34} className="text-green-600" strokeWidth={2.25} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Trip completed!</h3>
                        <p className="mt-1.5 text-sm text-slate-500">
                          {mode === 'rider' ? 'How was your ride?' : 'How was the rider?'}
                        </p>
                        <p className="mx-auto mt-1 max-w-[16rem] text-xs leading-relaxed text-slate-400">
                          Your feedback helps us improve the Zeyago experience.
                        </p>
                        
                        <div className="my-5 flex justify-center gap-3 text-3xl sm:gap-3.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              type="button"
                              key={star}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              onClick={() => setRating(star)}
                              className={`flex h-14 w-14 items-center justify-center rounded-2xl border shadow-sm transition-all active:scale-[0.97] ${
                                star <= (hoverRating || rating)
                                  ? 'border-amber-300 bg-amber-50 text-amber-500 shadow-[0_10px_22px_rgba(245,158,11,0.18)]'
                                  : 'border-slate-200 bg-white text-slate-400 hover:border-amber-200 hover:bg-amber-50/50 hover:text-amber-400'
                              }`}
                              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                            >
                              <Star 
                                size={30} 
                                className={star <= (hoverRating || rating) ? 'text-amber-500 drop-shadow-[0_2px_6px_rgba(245,158,11,0.28)]' : 'text-slate-400'} 
                                fill={star <= (hoverRating || rating) ? 'currentColor' : 'none'}
                              />
                            </button>
                          ))}
                        </div>

                        <div className="mb-4 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-3 text-left shadow-sm">
                          <label
                            htmlFor="rating-comment"
                            className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400"
                          >
                            Comment
                          </label>
                          <textarea
                            id="rating-comment"
                            value={ratingComment}
                            onChange={(e) => setRatingComment(e.target.value)}
                            placeholder="Add a comment (optional)"
                            rows={3}
                            className="min-h-[5.5rem] w-full resize-none rounded-2xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-velox-primary focus:ring-4 focus:ring-velox-primary/12"
                          />
                        </div>

                        <div className="w-full max-w-sm shrink-0 space-y-2.5 px-1">
                        <button 
                          type="button"
                          onClick={dismissRatingAndReturnHome}
                          disabled={rating === 0}
                          className="min-h-12 w-full rounded-xl bg-velox-primary py-3.5 text-sm font-bold text-white shadow-[0_8px_28px_rgba(75,44,109,0.35)] disabled:opacity-50"
                        >
                          Submit Rating
                        </button>
                        <button 
                          type="button"
                          onClick={dismissRatingAndReturnHome}
                          className="w-full py-2.5 text-sm font-bold text-slate-400"
                        >
                          Skip
                        </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Earnings History Modal */}
              <DriverHistoryScreen />

              {/* Side Menu Simulation */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMenuOpen(false)}
                className="absolute inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                className="absolute inset-y-0 left-0 z-[70] flex h-full max-h-full min-h-0 w-3/4 max-w-[min(85vw,320px)] flex-col overflow-hidden bg-white"
              >
                <div className="velox-mobile-menu-pad mb-6 flex shrink-0 items-center gap-4 pt-[max(2rem,env(safe-area-inset-top,0px))]">
                  <div className="h-16 w-16 rounded-full bg-velox-accent/15 p-1 ring-2 ring-velox-accent/25">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="rounded-full" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{userName}</h4>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Star size={12} className="fill-yellow-400 text-yellow-400" />
                      <span>4.95 Rating</span>
                    </div>
                  </div>
                </div>

                <div className="velox-mobile-menu-pad velox-scroll-bottom min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
                <nav className="space-y-6">
                  {mode === 'rider' ? (
                    <>
                  <button 
                    type="button"
                    onClick={() => {
                      setShowProfile(true);
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-velox-primary transition-colors"
                  >
                    <User size={20} />
                    <span className="font-bold">Profile</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowWallet(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-velox-primary transition-colors"
                  >
                    <Wallet size={20} />
                    <span className="font-bold">Zeyago Wallet</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowPaymentMethods(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-velox-primary transition-colors"
                  >
                    <CardIcon size={20} />
                    <span className="font-bold">Payment</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTripHistory(true);
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-4 text-slate-600 transition-colors hover:text-velox-primary"
                  >
                    <History size={20} />
                    <span className="font-bold">{t('history')}</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowScheduledRides(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-velox-primary transition-colors"
                  >
                    <Calendar size={20} />
                    <span className="font-bold">Scheduled Rides</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowFavorites(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-velox-primary transition-colors"
                  >
                    <Star size={20} />
                    <span className="font-bold">Favorite Places</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowReferral(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-velox-primary transition-colors"
                  >
                    <Gift size={20} />
                    <span className="font-bold">Refer & Earn</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowRewards(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-velox-primary transition-colors"
                  >
                    <Sparkles size={20} className="text-yellow-500" />
                    <div className="flex flex-1 items-center justify-between">
                      <span className="font-bold">{t('rewards')}</span>
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-700">{zeyagoPoints} {t('points')}</span>
                    </div>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowPromos(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-velox-primary transition-colors"
                  >
                    <Tag size={20} />
                    <span className="font-bold">Promos & Discounts</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowZeyagoPass(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-velox-primary transition-colors"
                  >
                    <Zap size={20} className="text-velox-primary" />
                    <span className="font-bold">Zeyago Pass</span>
                    {!hasZeyagoPass && (
                      <span className="ml-auto rounded-full bg-velox-accent/15 px-2 py-0.5 text-[8px] font-bold text-velox-primary">NEW</span>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowCorporateDashboard(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-velox-primary transition-colors"
                  >
                    <Building2 size={20} className="text-blue-600" />
                    <span className="font-bold">Corporate Dashboard</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowNotifications(true); setIsMenuOpen(false); }}
                    className="relative flex w-full items-center gap-4 text-slate-600 hover:text-velox-primary transition-colors"
                  >
                    <Bell size={20} />
                    <span className="font-bold">Notifications</span>
                    {(notifications.some((n) => !n.read) ||
                      driverWalletNotifications.some((n) => !n.read)) && (
                      <span className="absolute left-3 top-0 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowNavSettings(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-velox-primary transition-colors"
                  >
                    <Navigation size={20} />
                    <span className="font-bold">Navigation Settings</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowSupport(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-velox-primary transition-colors"
                  >
                    <HelpCircle size={20} />
                    <span className="font-bold">Support</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowHelp(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-velox-primary transition-colors"
                  >
                    <Info size={20} />
                    <span className="font-bold">About Zeyago</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettings(true);
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-4 text-slate-600 transition-colors hover:text-velox-primary"
                  >
                    <Settings size={20} />
                    <span className="font-bold">Settings</span>
                  </button>
                    </>
                  ) : (
                    <>
                  <button 
                    type="button"
                    onClick={() => {
                      setShowDriverProfile(true);
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-velox-primary transition-colors"
                  >
                    <User size={20} />
                    <span className="font-bold">Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDriverWallet(true);
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-4 text-slate-600 transition-colors hover:text-velox-primary"
                  >
                    <Wallet size={20} />
                    <span className="font-bold">Wallet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEarningsAnalytics(true);
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-4 text-slate-600 transition-colors hover:text-velox-primary"
                  >
                    <BarChart3 size={20} />
                    <span className="font-bold">Earnings</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEarningsHistory(true);
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-4 text-slate-600 transition-colors hover:text-velox-primary"
                  >
                    <History size={20} />
                    <span className="font-bold">Trip History</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowVehicleManagement(true);
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-4 text-slate-600 transition-colors hover:text-velox-primary"
                  >
                    <Car size={20} />
                    <span className="font-bold">Vehicle Management</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDocumentVault(true);
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-4 text-slate-600 transition-colors hover:text-velox-primary"
                  >
                    <FileText size={20} />
                    <span className="font-bold">Documents</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMaintenanceTracker(true);
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-4 text-slate-600 transition-colors hover:text-velox-primary"
                  >
                    <Wrench size={20} />
                    <span className="font-bold">Maintenance</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPerformance(true);
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-4 text-slate-600 transition-colors hover:text-velox-primary"
                  >
                    <TrendingUp size={20} />
                    <span className="font-bold">Performance & Tier</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowTrainingAcademy(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-velox-primary transition-colors"
                  >
                    <Award size={20} />
                    <span className="font-bold">Training Academy</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowNotifications(true); setIsMenuOpen(false); }}
                    className="relative flex w-full items-center gap-4 text-slate-600 hover:text-velox-primary transition-colors"
                  >
                    <Bell size={20} />
                    <span className="font-bold">Notifications</span>
                    {(notifications.some((n) => !n.read) ||
                      driverWalletNotifications.some((n) => !n.read)) && (
                      <span className="absolute left-3 top-0 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowSupport(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-velox-primary transition-colors"
                  >
                    <HelpCircle size={20} />
                    <span className="font-bold">Support</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowHelp(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-velox-primary transition-colors"
                  >
                    <Info size={20} />
                    <span className="font-bold">About Zeyago</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettings(true);
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-4 text-slate-600 transition-colors hover:text-velox-primary"
                  >
                    <Settings size={20} />
                    <span className="font-bold">Settings</span>
                  </button>
                    </>
                  )}
                  <div className="h-px bg-slate-100 my-6"></div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Mode</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setMode('rider'); setIsMenuOpen(false); }}
                        className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${mode === 'rider' ? 'bg-velox-primary text-white shadow-md' : 'bg-white text-slate-600 border border-slate-100'}`}
                      >
                        Rider
                      </button>
                      <button 
                        onClick={() => { setMode('driver'); setIsMenuOpen(false); }}
                        className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${mode === 'driver' ? 'bg-velox-primary text-white shadow-md' : 'bg-white text-slate-600 border border-slate-100'}`}
                      >
                        Driver
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 mt-4">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Language / ቋንቋ / Afaan</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'en', label: 'English' },
                        { id: 'am', label: 'አማርኛ' },
                        { id: 'om', label: 'Oromiffa' }
                      ].map((lang) => (
                        <button 
                          key={lang.id}
                          onClick={() => setLanguage(lang.id as any)}
                          className={`rounded-xl py-2 text-[10px] font-bold transition-all ${language === lang.id ? 'bg-velox-primary text-white shadow-md' : 'bg-white text-slate-600 border border-slate-100'}`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>

                </nav>
                </div>
                <div className="velox-mobile-menu-pad shrink-0 border-t border-slate-100 bg-white pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
                  <button
                    type="button"
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 py-3.5 font-bold text-red-600"
                  >
                    <LogOut size={20} />
                    Log out
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* SOS Modal */}
        <AnimatePresence>
          {showSOS && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[150] flex items-center justify-center bg-red-600/90 p-6 backdrop-blur-md"
              >
                <div className="w-full max-w-sm text-center text-white">
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-white text-red-600 shadow-2xl"
                  >
                    <AlertTriangle size={48} />
                  </motion.div>
                  <h2 className="mb-4 text-3xl font-bold uppercase tracking-tighter">Emergency SOS</h2>
                  <p className="mb-12 text-lg font-medium opacity-90">
                    Zeyago support and emergency services are being alerted.
                  </p>
                  
                  <div className="mb-12">
                    <p className="text-sm font-bold uppercase tracking-widest opacity-60">Alerting in</p>
                    <span className="text-8xl font-black">{sosCountdown}</span>
                  </div>

                  <div className="space-y-4">
                    <button 
                      onClick={() => setShowSOS(false)}
                      className="w-full rounded-2xl bg-white py-5 text-xl font-bold text-red-600 shadow-xl"
                    >
                      Cancel Alert
                    </button>
                    <button className="flex w-full items-center justify-center gap-2 text-sm font-bold opacity-60">
                      <Phone size={16} />
                      Call Emergency Services Directly
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Safety Toolkit (from RiderTripScreen — share, SOS, trusted contacts) */}
        <AnimatePresence>
          {showSafetyToolkit && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSafetyToolkit(false)}
                className="absolute inset-0 z-[160] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[165] max-h-[min(92vh,760px)] min-h-0 overflow-y-auto overscroll-y-contain rounded-t-[2.5rem] bg-white p-8 shadow-2xl [-webkit-overflow-scrolling:touch]"
              >
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Safety Toolkit</h3>
                  <button
                    type="button"
                    onClick={() => setShowSafetyToolkit(false)}
                    className="rounded-full bg-slate-100 p-2"
                  >
                    <X size={20} />
                  </button>
                </div>

                <p className="mb-6 text-sm text-slate-500">
                  Quick actions for a safer trip. Zeyago monitors active rides 24/7.
                </p>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSafetyToolkit(false);
                      setShowShareTrip(true);
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition-all hover:border-velox-primary/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        <Share2 size={22} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Share Trip</p>
                        <p className="text-[10px] text-slate-500">Open live link sharing</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowSafetyToolkit(false);
                      setShowSOS(true);
                      setSosCountdown(5);
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-left transition-all hover:border-red-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-red-600 shadow-sm">
                        <AlertTriangle size={22} />
                      </div>
                      <div>
                        <p className="font-bold text-red-800">Emergency SOS</p>
                        <p className="text-[10px] text-red-600/80">Start emergency countdown</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-red-300" />
                  </button>

                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Users size={18} className="text-slate-500" />
                      <p className="text-sm font-bold text-slate-900">Trusted Contacts</p>
                    </div>
                    <p className="mb-3 text-xs text-slate-500">
                      Add people who receive your trip updates automatically. Full setup arrives in a future update.
                    </p>
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-400"
                    >
                      Coming soon
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSafetyToolkit(false)}
                    className="w-full rounded-2xl bg-slate-900 py-4 font-bold text-white"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Settings */}
        <AnimatePresence>
          {showSettings && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSettings(false)}
                className="absolute inset-0 z-[200] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[205] flex max-h-[88%] min-h-0 flex-col rounded-t-[2.5rem] bg-white shadow-2xl"
              >
                <div className="mb-2 flex shrink-0 items-center justify-between px-8 pt-8">
                  <h3 className="text-2xl font-bold text-slate-900">Settings</h3>
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="rounded-full bg-slate-100 p-2"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-8 pb-8">
                <div className="space-y-8">
                  <div>
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Language</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'en', label: 'English' },
                        { id: 'am', label: 'አማርኛ' },
                        { id: 'om', label: 'Oromiffa' },
                      ].map((lang) => (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => setLanguage(lang.id as 'en' | 'am' | 'om')}
                          className={`rounded-xl py-2.5 text-[10px] font-bold transition-all ${language === lang.id ? 'bg-velox-primary text-white shadow-md' : 'border border-slate-100 bg-white text-slate-600'}`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
                        <Bell size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Push notifications</p>
                        <p className="text-[10px] text-slate-500">Trip updates, promos, and account alerts</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settingsPushEnabled}
                      onClick={() => setSettingsPushEnabled((v) => !v)}
                      className={`relative h-8 w-14 rounded-full transition-colors ${settingsPushEnabled ? 'bg-velox-primary' : 'bg-slate-200'}`}
                    >
                      <span
                        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${settingsPushEnabled ? 'left-7' : 'left-1'}`}
                      />
                    </button>
                  </div>

                  <div>
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Appearance</p>
                    <p className="mb-2 text-xs text-slate-500">Match system, light, or dark appearance</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'system' as const, label: 'System', icon: Monitor },
                        { id: 'light' as const, label: 'Light', icon: Sun },
                        { id: 'dark' as const, label: 'Dark', icon: Moon },
                      ].map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSettingsTheme(id)}
                          className={`flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all ${settingsTheme === id ? 'border-velox-primary bg-velox-primary/10 text-velox-dark' : 'border-slate-100 bg-white text-slate-600'}`}
                        >
                          <Icon size={20} />
                          <span className="text-[10px] font-bold">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Compact UI</p>
                      <p className="text-[10px] text-slate-500">Tighter spacing in lists and cards</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settingsCompactUI}
                      onClick={() => setSettingsCompactUI((v) => !v)}
                      className={`relative h-8 w-14 rounded-full transition-colors ${settingsCompactUI ? 'bg-velox-primary' : 'bg-slate-200'}`}
                    >
                      <span
                        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${settingsCompactUI ? 'left-7' : 'left-1'}`}
                      />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-red-100 bg-red-50 py-4 font-bold text-red-600"
                  >
                    <LogOut size={20} />
                    Log out
                  </button>
                </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Wallet Modal */}
        <AnimatePresence>
          {showWallet && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowWallet(false)}
                className="absolute inset-0 z-[120] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[130] flex h-[88%] max-h-[720px] flex-col overflow-hidden rounded-t-[2.5rem] bg-white shadow-2xl"
              >
                <div className="velox-safe-x flex shrink-0 items-center justify-between border-b border-slate-100/90 px-5 pb-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
                  <h3 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Zeyago Wallet</h3>
                  <button
                    type="button"
                    onClick={() => setShowWallet(false)}
                    className="rounded-full bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200"
                    aria-label="Close wallet"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-4">
                  <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#3d2560] via-velox-primary to-[#2d1b42] p-6 text-white shadow-[0_16px_40px_rgba(45,27,66,0.35)] ring-1 ring-white/10">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Current balance</p>
                    <p className="mt-1 text-3xl font-black tabular-nums tracking-tight sm:text-4xl">
                      ETB {walletBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                    </p>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddPayment(true);
                        }}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-white/15 py-3.5 text-sm font-bold text-white shadow-inner ring-1 ring-white/20 backdrop-blur-sm transition-colors hover:bg-white/25"
                      >
                        <Plus size={18} strokeWidth={2.5} />
                        Top Up
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPayout(true)}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-white/15 py-3.5 text-sm font-bold text-white shadow-inner ring-1 ring-white/20 backdrop-blur-sm transition-colors hover:bg-white/25"
                      >
                        <ArrowRight size={18} strokeWidth={2.5} />
                        Withdraw
                      </button>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="mb-3 flex items-center justify-between">
                      <h5 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Linked methods</h5>
                      <button
                        type="button"
                        onClick={() => setShowPaymentMethods(true)}
                        className="text-xs font-bold text-velox-primary transition-colors hover:text-velox-dark"
                      >
                        Manage
                      </button>
                    </div>
                    <div className="-mx-1 flex gap-3 overflow-x-auto pb-2 pt-0.5 [scrollbar-width:thin]">
                      {[
                        { name: 'Telebirr', color: 'bg-blue-600', logo: 'T' },
                        { name: 'CBE Birr', color: 'bg-purple-600', logo: 'C' },
                        { name: 'Visa', color: 'bg-slate-900', logo: 'V' },
                      ].map((method) => (
                        <div
                          key={method.name}
                          className="flex min-w-[100px] flex-col items-center gap-2"
                        >
                          <div
                            className={`flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-black text-white shadow-md ${method.color}`}
                          >
                            {method.logo}
                          </div>
                          <span className="text-center text-[11px] font-bold text-slate-600">{method.name}</span>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setShowAddPayment(true)}
                        className="flex min-w-[100px] flex-col items-center gap-2"
                      >
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 transition-colors hover:border-velox-primary/40 hover:text-velox-primary">
                          <Plus size={22} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-400">Add new</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Trip history (menu → History): trips list only; opens trip details on row tap — not the wallet sheet */}
        <AnimatePresence>
          {showTripHistory && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowTripHistory(false)}
                className="absolute inset-0 z-[120] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[130] flex h-[88%] max-h-[720px] flex-col overflow-hidden rounded-t-[2.5rem] bg-white shadow-2xl"
              >
                <div className="velox-safe-x flex shrink-0 items-center justify-between border-b border-slate-100/90 px-5 pb-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
                  <h3 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{t('history')}</h3>
                  <button
                    type="button"
                    onClick={() => setShowTripHistory(false)}
                    className="rounded-full bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200"
                    aria-label="Close history"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-4">
                  <RiderHistoryScreen ridesOnly />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Trip Details Modal */}
        <AnimatePresence>
          {showTripDetails && selectedTrip && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowTripDetails(false)}
                className="absolute inset-0 z-[140] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[150] flex h-[90%] max-h-[720px] flex-col overflow-hidden rounded-t-[2.5rem] bg-white shadow-2xl"
              >
                {(() => {
                  const trip = selectedTrip as WalletTransaction;
                  const distLabel = walletTransactionDistanceLabel(trip);
                  const durLabel = walletTransactionDurationLabel(trip);
                  const pickupDisplay =
                    trip.pickup?.trim() || 'Pickup address not available';
                  const destDisplay =
                    trip.destination?.trim() || 'Destination not available';
                  const distFareLine =
                    distLabel === '—' ? 'Distance' : `Distance (${distLabel})`;
                  const fmtEtb = (n: number) =>
                    `ETB ${Number(n).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`;
                  return (
                    <>
                      <div className="velox-safe-x flex shrink-0 items-center justify-between border-b border-slate-100/90 px-5 pb-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
                        <h3 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                          Trip Details
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowTripDetails(false)}
                          className="rounded-full bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200"
                          aria-label="Close trip details"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-4">
                        <div className="relative mb-6 h-44 w-full overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-b from-slate-50 to-slate-100/80 shadow-inner">
                          <div
                            className="absolute inset-0 opacity-[0.35]"
                            style={{
                              backgroundImage:
                                'radial-gradient(#94a3b8 1px, transparent 1px)',
                              backgroundSize: '18px 18px',
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2.5">
                              <div className="h-3.5 w-3.5 rounded-full bg-velox-primary shadow-[0_0_0_6px_rgba(75,44,109,0.12)] ring-2 ring-white" />
                              <div className="h-14 w-0.5 border-l-2 border-dashed border-slate-300/90" />
                              <div className="h-3.5 w-3.5 rounded-full bg-slate-900 shadow-[0_0_0_6px_rgba(15,23,42,0.08)] ring-2 ring-white" />
                            </div>
                          </div>
                        </div>

                        <div className="mb-6 space-y-5">
                          <div className="flex items-start gap-4">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-velox-accent/15 text-velox-primary">
                              <MapPin size={16} strokeWidth={2.25} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-500/90">
                                Pickup
                              </p>
                              <p className="mt-1 text-[15px] font-bold leading-snug text-slate-900">
                                {pickupDisplay}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
                              <Navigation size={16} strokeWidth={2.25} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-500/90">
                                Destination
                              </p>
                              <p className="mt-1 text-[15px] font-bold leading-snug text-slate-900">
                                {destDisplay}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] ring-1 ring-slate-50">
                          <div className="mb-5 flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-2 ring-white shadow-sm">
                                <img
                                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(trip.driver ?? 'driver')}`}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-[15px] font-bold text-slate-900">
                                  {trip.driver ?? 'Driver'}
                                </p>
                                <div className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                                  <Star
                                    size={12}
                                    className="shrink-0 fill-yellow-400 text-yellow-400"
                                  />
                                  <span>4.9 rating</span>
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-xs font-bold text-slate-900">
                                Toyota Vitz
                              </p>
                              <p className="mt-0.5 font-mono text-[11px] font-semibold tracking-wide text-slate-500">
                                AA 2-B12345
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                Distance
                              </p>
                              <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">
                                {distLabel}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                Duration
                              </p>
                              <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">
                                {durLabel}
                              </p>
                            </div>
                          </div>
                          {trip.fareEstimate?.formatted && (
                            <p className="mt-4 rounded-2xl bg-slate-50 px-3 py-2 text-center text-[11px] font-semibold text-slate-600">
                              Trip estimate: {trip.fareEstimate.formatted}
                            </p>
                          )}
                        </div>

                        <div className="mb-6">
                          <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-sky-500/90">
                            Fare breakdown
                          </h4>
                          <div className="space-y-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/80">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-100/80 px-4 py-3.5 text-sm">
                              <span className="text-slate-600">Base fare</span>
                              <span className="font-bold tabular-nums text-slate-900">
                                {fmtEtb(trip.baseFare ?? 0)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 border-b border-slate-100/80 px-4 py-3.5 text-sm">
                              <span className="text-slate-600">{distFareLine}</span>
                              <span className="font-bold tabular-nums text-slate-900">
                                {fmtEtb(trip.distanceFare ?? 0)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm">
                              <span className="text-slate-600">Tax &amp; fees</span>
                              <span className="font-bold tabular-nums text-slate-900">
                                {fmtEtb(trip.tax ?? 0)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 bg-white px-4 py-4">
                              <span className="font-bold text-slate-900">
                                Total paid
                              </span>
                              <span className="text-lg font-black tabular-nums text-velox-primary">
                                {fmtEtb(Math.abs(trip.amount))}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowHelp(true)}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 py-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100"
                        >
                          <HelpCircle size={18} />
                          Report an issue
                        </button>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Payment Methods Modal */}
        <AnimatePresence>
          {showPaymentMethods && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPaymentMethods(false)}
                className="absolute inset-0 z-[140] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[150] max-h-[min(92vh,760px)] min-h-0 overflow-y-auto overscroll-y-contain rounded-t-[2.5rem] bg-white p-8 shadow-2xl [-webkit-overflow-scrolling:touch]"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Payment Methods</h3>
                  <button onClick={() => setShowPaymentMethods(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-5">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white font-black ${method.type === 'telebirr' ? 'bg-blue-600' : 'bg-slate-900'}`}>
                          {method.type === 'telebirr' ? 'T' : 'V'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{method.name}</p>
                          <p className="text-xs text-slate-400">•••• {method.last4}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {method.isDefault && <span className="rounded-full bg-velox-accent/15 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-velox-primary">Default</span>}
                        <button className="text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => setShowAddPayment(true)}
                  className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-velox-primary py-4 font-bold text-white shadow-lg shadow-[0_8px_24px_rgba(75,44,109,0.18)]"
                >
                  <Plus size={20} />
                  Add Payment Method
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Add Payment Method Modal */}
        <AnimatePresence>
          {showAddPayment && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddPayment(false)}
                className="absolute inset-0 z-[160] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="absolute inset-y-0 right-0 z-[170] w-full bg-white p-8"
              >
                <button onClick={() => setShowAddPayment(false)} className="mb-8 flex items-center gap-2 text-slate-400">
                  <ChevronLeft size={20} />
                  <span className="text-sm font-bold">Back</span>
                </button>

                <h3 className="mb-2 text-2xl font-bold text-slate-900">Add Payment</h3>
                <p className="mb-8 text-sm text-slate-500">Choose a payment method to link to your Zeyago account.</p>

                <div className="space-y-4">
                  {[
                    { id: 'telebirr', name: 'Telebirr', icon: 'T', color: 'bg-blue-600' },
                    { id: 'cbe', name: 'CBE Birr', icon: 'C', color: 'bg-purple-600' },
                    { id: 'card', name: 'Credit or Debit Card', icon: <CardIcon size={20} />, color: 'bg-slate-900' },
                  ].map((method) => (
                    <button key={method.id} className="flex w-full items-center justify-between rounded-2xl border border-slate-100 p-5 hover:border-velox-primary/15 hover:bg-velox-primary/10 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white font-black ${method.color}`}>
                          {method.icon}
                        </div>
                        <span className="font-bold text-slate-900">{method.name}</span>
                      </div>
                      <ChevronRight size={20} className="text-slate-300" />
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Schedule Ride Modal */}
        <AnimatePresence>
          {showScheduleRide && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowScheduleRide(false)}
                className="absolute inset-0 z-[140] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[150] max-h-[min(92vh,760px)] min-h-0 overflow-y-auto overscroll-y-contain rounded-t-[2.5rem] bg-white p-8 shadow-2xl [-webkit-overflow-scrolling:touch]"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Schedule a Ride</h3>
                  <button onClick={() => setShowScheduleRide(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Pickup Date</label>
                    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 border border-slate-100">
                      <Calendar size={20} className="text-velox-primary" />
                      <input 
                        type="date" 
                        className="w-full bg-transparent font-bold text-slate-900 outline-none"
                        value={scheduledDate}
                        onChange={e => setScheduledDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Pickup Time</label>
                    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 border border-slate-100">
                      <Clock size={20} className="text-velox-primary" />
                      <input 
                        type="time" 
                        className="w-full bg-transparent font-bold text-slate-900 outline-none"
                        value={scheduledTime}
                        onChange={e => setScheduledTime(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 rounded-2xl bg-blue-50 p-4 flex gap-3">
                  <Info size={20} className="text-blue-600 shrink-0" />
                  <p className="text-xs text-blue-800 leading-relaxed">
                    A driver will be assigned to your ride 15 minutes before your scheduled pickup time.
                  </p>
                </div>

                <button 
                  onClick={async () => {
                    const rideStops = stops.map((address, i) => ({
                      address,
                      coords: stopCoords[i] ?? null,
                    }));
                    const re = await getRouteEstimate({
                      pickupCoords,
                      destinationCoords,
                      stops: rideStops,
                      vehicleType: selectedVehicle,
                    });
                    const fe = await calculateFareEstimate(re, selectedVehicle);
                    const estimate =
                      re.distanceMeters > 0 && fe
                        ? {
                            distanceMeters: re.distanceMeters,
                            durationSeconds: re.durationSeconds,
                            fareEstimate: fe,
                            promoCode: activePromo?.code,
                          }
                        : undefined;
                    const { ride } = await riderRideService.requestRide(
                      buildRequestRideRequest(
                        pickup,
                        destination,
                        stops,
                        selectedVehicle,
                        profileType,
                        scheduledDate || undefined,
                        scheduledTime || undefined,
                        {
                          pickupCoords,
                          destinationCoords,
                          stopCoords,
                        },
                        estimate,
                      ),
                    );
                    setCurrentRide(ride);
                    setScheduledRides((prev) => [
                      ...prev,
                      {
                        id: ride.id,
                        pickup: ride.pickup,
                        destination: ride.destination,
                        date: scheduledDate
                          ? new Date(`${scheduledDate}T12:00:00`).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—',
                        time: scheduledTime || '—',
                        status: 'scheduled',
                        distanceMeters: ride.distanceMeters,
                        durationSeconds: ride.durationSeconds,
                        fareEstimate: ride.fareEstimate,
                      },
                    ]);
                    setShowScheduleRide(false);
                    setRideStatus('searching');
                  }}
                  className="mt-8 w-full rounded-2xl bg-velox-primary py-4 font-bold text-white shadow-lg shadow-[0_8px_24px_rgba(75,44,109,0.18)]"
                >
                  Confirm Schedule
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Help & Support Modal */}
        <AnimatePresence>
          {showHelp && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowHelp(false)}
                className="absolute inset-0 z-[160] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[170] max-h-[min(92vh,760px)] min-h-0 overflow-y-auto overscroll-y-contain rounded-t-[2.5rem] bg-white p-8 shadow-2xl [-webkit-overflow-scrolling:touch]"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Help & Support</h3>
                  <button onClick={() => setShowHelp(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-8 flex gap-4">
                  <button className="flex flex-1 flex-col items-center gap-3 rounded-3xl bg-velox-primary/10 p-6 text-velox-primary">
                    <MessageCircle size={32} />
                    <span className="text-xs font-bold">Chat with us</span>
                  </button>
                  <button className="flex flex-1 flex-col items-center gap-3 rounded-3xl bg-blue-50 p-6 text-blue-600">
                    <PhoneCall size={32} />
                    <span className="text-xs font-bold">Call Support</span>
                  </button>
                </div>

                <div className="mb-8">
                  <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Common Issues</h4>
                  <div className="space-y-3">
                    {[
                      'I lost an item',
                      'Driver was unprofessional',
                      'Incorrect fare charged',
                      'App technical issue',
                    ].map((issue) => (
                      <button key={issue} className="flex w-full items-center justify-between rounded-2xl border border-slate-50 p-4 hover:bg-slate-50">
                        <span className="text-sm font-bold text-slate-900">{issue}</span>
                        <ChevronRight size={18} className="text-slate-300" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">FAQs</h4>
                  <div className="space-y-3">
                    {[
                      'How to pay with Telebirr?',
                      'Zeyago safety features',
                      'Cancellation policy',
                    ].map((faq) => (
                      <button key={faq} className="flex w-full items-center justify-between rounded-2xl border border-slate-50 p-4 hover:bg-slate-50">
                        <span className="text-sm font-bold text-slate-900">{faq}</span>
                        <ChevronRight size={18} className="text-slate-300" />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Earnings Analytics Modal */}
        <AnimatePresence>
          {showEarningsAnalytics && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowEarningsAnalytics(false)}
                className="absolute inset-0 z-[140] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[150] velox-bottom-sheet"
              >
                <div className="velox-bottom-sheet-head">
                  <h3 className="text-2xl font-bold text-slate-900">Earnings Analytics</h3>
                  <button type="button" onClick={() => setShowEarningsAnalytics(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="velox-bottom-sheet-scroll">
                  <div className="mb-6 grid grid-cols-2 gap-4">
                    <div className="rounded-3xl bg-velox-primary/10 p-6">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-velox-primary">Active Time</p>
                      <p className="text-2xl font-bold text-slate-900">32h 45m</p>
                    </div>
                    <div className="rounded-3xl bg-blue-50 p-6">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Online Time</p>
                      <p className="text-2xl font-bold text-slate-900">45h 20m</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">Weekly Performance</h4>
                      <select className="bg-transparent text-xs font-bold text-velox-primary outline-none">
                        <option>This Week</option>
                        <option>Last Week</option>
                      </select>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
                      <div className="flex h-28 items-stretch gap-2">
                        {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                          <div
                            key={i}
                            className="flex min-h-0 min-w-0 flex-1 flex-col justify-end"
                          >
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${h}%` }}
                              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                              className={`w-full min-h-0 rounded-t-md ${h > 70 ? 'bg-velox-primary' : 'bg-velox-accent/30'}`}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex justify-between gap-1.5 border-t border-slate-100/90 pt-2">
                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                          <span
                            key={i}
                            className="min-w-0 flex-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">Insights</h4>
                    <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-velox-accent/15 text-velox-primary">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">15% Increase</p>
                        <p className="text-xs text-slate-500">Your earnings are higher than last week.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                        <Clock size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Peak Hours</p>
                        <p className="text-xs text-slate-500">You earn 25% more between 7 AM - 9 AM.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <button 
                      onClick={() => setShowDocumentVault(true)}
                      className="flex w-full items-center justify-between rounded-3xl border-2 border-slate-100 p-6 hover:border-velox-primary transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-900">
                          <ShieldCheck size={24} />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-slate-900">Document Vault</p>
                          <p className="text-xs text-slate-500">Manage your licenses & permits</p>
                        </div>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <ChevronRight size={16} />
                      </div>
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Vehicle Management Modal */}
        <AnimatePresence>
          {showVehicleManagement && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowVehicleManagement(false)}
                className="absolute inset-0 z-[140] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[150] velox-bottom-sheet"
              >
                <div className="velox-bottom-sheet-head">
                  <h3 className="text-2xl font-bold text-slate-900">My Vehicles</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowVehicleManagement(false);
                      setDriverVehicleAddOpen(false);
                    }}
                    className="rounded-full bg-slate-100 p-2"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="velox-bottom-sheet-scroll">
                  <div className="space-y-4">
                    {(driverVehicles.length > 0 ? driverVehicles : []).map((v) => (
                      <div 
                        key={v.id} 
                        className={`relative rounded-3xl border p-6 transition-all ${
                          v.status === 'approved'
                            ? 'border-velox-primary bg-velox-primary/10'
                            : v.status === 'rejected'
                              ? 'border-red-200 bg-red-50'
                              : 'border-amber-200 bg-amber-50'
                        }`}
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${v.status === 'active' ? 'bg-velox-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                              <Car size={24} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{v.model}</p>
                              <p className="text-xs text-slate-500">{v.plate} • {v.color}</p>
                            </div>
                          </div>
                          <span className="rounded-full bg-slate-900 px-3 py-1 text-[8px] font-bold uppercase tracking-wider text-white">
                            {v.status}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                          <div className="flex items-center gap-2">
                            <Shield size={14} className={new Date(v.insuranceExpiry) < new Date() ? 'text-red-500' : 'text-velox-accent'} />
                            <span className="text-[10px] font-bold text-slate-400">Insurance: {v.insuranceExpiry}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-500">Single vehicle account</span>
                        </div>
                      </div>
                    ))}
                    {driverVehicles.length === 0 && (
                      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                        No vehicle on file yet. Add your vehicle to continue driver onboarding.
                      </div>
                    )}
                  </div>

                  {driverVehicleAddOpen && (
                    <div className="mt-6 space-y-4 rounded-3xl border border-velox-primary/20 bg-slate-50/90 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Add vehicle (manual entry)</p>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Model</label>
                        <input
                          type="text"
                          value={newVehicleForm.model}
                          onChange={(e) => setNewVehicleForm((f) => ({ ...f, model: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-100 bg-white p-3 text-sm font-bold text-slate-900 outline-none focus:border-velox-primary"
                          placeholder="e.g. Toyota Vitz"
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Plate / tag number (type exactly as on your vehicle)
                        </label>
                        <input
                          type="text"
                          inputMode="text"
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          value={newVehicleForm.plate}
                          onChange={(e) => setNewVehicleForm((f) => ({ ...f, plate: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-100 bg-white p-3 text-sm font-bold text-slate-900 outline-none focus:border-velox-primary"
                          placeholder="Enter plate or tag number"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Color</label>
                        <input
                          type="text"
                          value={newVehicleForm.color}
                          onChange={(e) => setNewVehicleForm((f) => ({ ...f, color: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-100 bg-white p-3 text-sm font-bold text-slate-900 outline-none focus:border-velox-primary"
                          placeholder="e.g. Silver"
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Insurance expiry</label>
                        <input
                          type="text"
                          value={newVehicleForm.insuranceExpiry}
                          onChange={(e) => setNewVehicleForm((f) => ({ ...f, insuranceExpiry: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-100 bg-white p-3 text-sm font-bold text-slate-900 outline-none focus:border-velox-primary"
                          placeholder="YYYY-MM-DD"
                          autoComplete="off"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDriverVehicleAddOpen(false);
                            setNewVehicleForm({ model: '', plate: '', color: '', insuranceExpiry: '' });
                          }}
                          className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const model = newVehicleForm.model.trim();
                            const plate = newVehicleForm.plate.trim();
                            const color = newVehicleForm.color.trim();
                            if (!model || !plate || !color) return;
                            const insuranceExpiry = newVehicleForm.insuranceExpiry.trim() || '2026-12-31';
                            await driverRideService.updateVehicle({
                              make: model.split(' ')[0] || model,
                              model,
                              color,
                              tagNumber: plate,
                              capacity: 4,
                              insuranceExpiry,
                            });
                            setDriverVehicles([
                              {
                                id: driverVehicles[0]?.id ?? `v-${Date.now()}`,
                                model,
                                plate,
                                color,
                                status: 'pending',
                                insuranceExpiry,
                              },
                            ]);
                            await refreshDriverProfile();
                            setDriverVehicleAddOpen(false);
                            setNewVehicleForm({ model: '', plate: '', color: '', insuranceExpiry: '' });
                          }}
                          disabled={!newVehicleForm.model.trim() || !newVehicleForm.plate.trim() || !newVehicleForm.color.trim()}
                          className="flex-1 rounded-2xl bg-velox-primary py-3 text-sm font-bold text-white shadow-md disabled:opacity-50"
                        >
                          Save vehicle
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setDriverVehicleAddOpen((o) => !o)}
                    className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-lg shadow-slate-200"
                  >
                    <Plus size={20} />
                    {driverVehicleAddOpen ? 'Close vehicle form' : driverVehicles.length > 0 ? 'Update vehicle' : 'Add vehicle'}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Heatmap Modal */}
        <AnimatePresence>
          {showHeatmap && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowHeatmap(false)}
                className="absolute inset-0 z-[140] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[150] velox-bottom-sheet"
              >
                <div className="velox-bottom-sheet-head">
                  <h3 className="text-2xl font-bold text-slate-900">Demand Heatmap</h3>
                  <button type="button" onClick={() => setShowHeatmap(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="velox-bottom-sheet-scroll">
                <div className="mb-8 h-48 w-full rounded-3xl bg-slate-100 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                  {/* Simulated Heatmap Blobs */}
                  <div className="absolute top-1/4 left-1/3 h-20 w-20 rounded-full bg-red-500/40 blur-2xl"></div>
                  <div className="absolute bottom-1/4 right-1/4 h-24 w-24 rounded-full bg-orange-500/40 blur-2xl"></div>
                  <div className="absolute top-1/2 left-1/2 h-16 w-16 rounded-full bg-red-600/50 blur-xl"></div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">High Demand Areas</h4>
                  {[
                    { name: 'Bole Medhanialem', demand: 'Very High', color: 'text-red-600' },
                    { name: 'Kazanchis', demand: 'High', color: 'text-orange-600' },
                    { name: 'Piazza', demand: 'Moderate', color: 'text-yellow-600' },
                  ].map((area) => (
                    <div key={area.name} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center gap-3">
                        <Flame size={18} className={area.color} />
                        <span className="text-sm font-bold text-slate-900">{area.name}</span>
                      </div>
                      <span className={`text-xs font-bold ${area.color}`}>{area.demand}</span>
                    </div>
                  ))}
                </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Document Vault Modal */}
        <AnimatePresence>
          {showDocumentVault && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDocumentVault(false)}
                className="absolute inset-0 z-[160] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[170] velox-bottom-sheet"
              >
                <div className="velox-bottom-sheet-head">
                  <h3 className="text-2xl font-bold text-slate-900">Document Vault</h3>
                  <button type="button" onClick={() => setShowDocumentVault(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="velox-bottom-sheet-scroll">
                <div className="mb-6 rounded-3xl bg-velox-primary/10 p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-velox-primary text-white">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-velox-dark">Compliance Status</p>
                      <p className="text-xs text-velox-primary">3 of 4 documents verified</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {driverDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                          <doc.icon size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{doc.title}</p>
                          <p className="text-[10px] text-slate-500">
                            {doc.status === 'verified' ? `Expires: ${doc.expiry}` : 
                             doc.status === 'expiring_soon' ? `Expiring soon: ${doc.expiry}` : 
                             'Verification in progress'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {doc.status === 'verified' ? (
                          <div className="rounded-full bg-velox-accent/15 p-1 text-velox-primary">
                            <Check size={12} />
                          </div>
                        ) : doc.status === 'expiring_soon' ? (
                          <div className="rounded-full bg-orange-100 p-1 text-orange-600">
                            <AlertTriangle size={12} />
                          </div>
                        ) : (
                          <div className="rounded-full bg-blue-100 p-1 text-blue-600">
                            <Clock size={12} />
                          </div>
                        )}
                        <button className="text-xs font-bold text-velox-primary">Update</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <Plus size={24} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-bold text-slate-400">Add New Document</p>
                </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Support Flow Modal */}
        <AnimatePresence>
          {showSupport && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { setShowSupport(false); setSupportStep('list'); }}
                className="absolute inset-0 z-[180] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[190] flex h-[85%] min-h-0 flex-col rounded-t-[2.5rem] bg-white shadow-2xl"
              >
                <div className="mb-2 flex shrink-0 items-center justify-between px-8 pt-8">
                  <h3 className="text-2xl font-bold text-slate-900">Support</h3>
                  <button onClick={() => { setShowSupport(false); setSupportStep('list'); }} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-8 pb-8">
                {supportStep === 'list' && (
                  <div className="space-y-6">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">Recent Trips</h4>
                    <div className="space-y-4">
                      {transactions.filter(t => t.type === 'ride').map((trip) => (
                        <button 
                          key={trip.id}
                          onClick={() => { setSelectedSupportTrip(trip); setSupportStep('details'); }}
                          className="flex w-full items-center justify-between rounded-2xl border border-slate-100 p-4 hover:border-velox-primary transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                              <Car size={20} />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold text-slate-900">{trip.destination}</p>
                              <p className="text-[10px] text-slate-500">{trip.date}</p>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-slate-300" />
                        </button>
                      ))}
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-6">
                      <h4 className="mb-4 text-sm font-bold text-slate-900">Other Issues</h4>
                      <div className="space-y-3">
                        {['Account & Payment', 'Safety Concern', 'App Feedback'].map((issue) => (
                          <button key={issue} className="flex w-full items-center justify-between rounded-xl bg-white p-4 text-sm font-bold text-slate-600 shadow-sm">
                            {issue}
                            <ChevronRight size={16} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {supportStep === 'details' && selectedSupportTrip && (
                  <div className="space-y-6">
                    <button onClick={() => setSupportStep('list')} className="flex items-center gap-2 text-sm font-bold text-velox-primary">
                      <ChevronLeft size={16} />
                      Back to trips
                    </button>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Selected Trip</p>
                      <p className="mt-1 font-bold text-slate-900">{selectedSupportTrip.destination}</p>
                      <p className="text-[10px] text-slate-500">{selectedSupportTrip.date}</p>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">What happened?</h4>
                    <div className="space-y-3">
                      {(mode === 'rider' ? [
                        'I lost an item',
                        'Driver was unprofessional',
                        'Vehicle was not clean',
                        'Incorrect fare charged',
                        'Safety issue'
                      ] : [
                        'Rider was difficult',
                        'Rider damaged vehicle',
                        'Incorrect pickup location',
                        'Safety concern',
                        'Payment issue'
                      ]).map((reason) => (
                        <button 
                          key={reason}
                          onClick={() => setSupportStep('success')}
                          className="flex w-full items-center justify-between rounded-2xl border border-slate-100 p-4 text-sm font-bold text-slate-600 hover:border-velox-primary hover:text-velox-primary transition-all"
                        >
                          {reason}
                          <ChevronRight size={16} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {supportStep === 'success' && (
                  <div className="flex h-[60%] flex-col items-center justify-center text-center">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-velox-accent/15 text-velox-primary">
                      <CheckCircle size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Issue Reported</h3>
                    <p className="mt-2 text-sm text-slate-500">Our support team has received your report and will get back to you within 24 hours.</p>
                    <button 
                      onClick={() => { setShowSupport(false); setSupportStep('list'); }}
                      className="mt-8 w-full rounded-2xl bg-velox-primary py-4 font-bold text-white"
                    >
                      Done
                    </button>
                  </div>
                )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Scheduled Rides Modal */}
        <AnimatePresence>
          {showScheduledRides && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowScheduledRides(false)}
                className="absolute inset-0 z-[260] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[270] max-h-[min(92vh,760px)] min-h-0 overflow-y-auto overscroll-y-contain rounded-t-[2.5rem] bg-white p-8 shadow-2xl [-webkit-overflow-scrolling:touch]"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Scheduled Rides</h3>
                  <button onClick={() => setShowScheduledRides(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  {scheduledRides.length > 0 ? (
                    scheduledRides.map((ride) => (
                      <div key={ride.id} className="rounded-3xl border border-slate-100 p-6">
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-velox-primary">
                            <Calendar size={16} />
                            <span className="text-sm font-bold">{ride.date} • {ride.time}</span>
                          </div>
                          <span className="rounded-full bg-velox-primary/10 px-3 py-1 text-[10px] font-bold text-velox-primary uppercase">Scheduled</span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-velox-primary/100"></div>
                            <p className="text-sm font-bold text-slate-900">{ride.pickup}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-slate-900"></div>
                            <p className="text-sm font-bold text-slate-900">{ride.destination}</p>
                          </div>
                        </div>
                        <div className="mt-6 flex gap-3">
                          <button className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Edit</button>
                          <button 
                            onClick={() => setScheduledRides(scheduledRides.filter(r => r.id !== ride.id))}
                            className="flex-1 rounded-xl border border-red-100 py-3 text-sm font-bold text-red-500 hover:bg-red-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center">
                      <Calendar size={48} className="mx-auto mb-4 text-slate-200" />
                      <p className="font-bold text-slate-400">No scheduled rides</p>
                    </div>
                  )}
                </div>

                <button className="mt-8 w-full rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-lg shadow-slate-200">
                  Schedule New Ride
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Training Academy Modal */}
        <AnimatePresence>
          {showTrainingAcademy && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowTrainingAcademy(false)}
                className="absolute inset-0 z-[280] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[290] max-h-[min(92vh,760px)] min-h-0 overflow-y-auto overscroll-y-contain rounded-t-[2.5rem] bg-white p-8 shadow-2xl [-webkit-overflow-scrolling:touch]"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Training Academy</h3>
                  <button onClick={() => setShowTrainingAcademy(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-8 rounded-3xl bg-velox-primary p-6 text-white shadow-xl shadow-[0_8px_24px_rgba(75,44,109,0.18)]">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60">Your Progress</p>
                  <div className="mt-4 flex items-center justify-between">
                    <h4 className="text-3xl font-black">33%</h4>
                    <span className="text-sm font-bold">1 / 3 Modules</span>
                  </div>
                  <div className="mt-4 h-2 w-full rounded-full bg-white/20">
                    <div className="h-full w-1/3 rounded-full bg-white shadow-sm"></div>
                  </div>
                </div>

                <div className="space-y-4 overflow-y-auto no-scrollbar pb-20">
                  {trainingModules.map((module) => (
                    <div key={module.id} className="flex items-center justify-between rounded-3xl border border-slate-100 p-5 hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${module.completed ? 'bg-velox-accent/15 text-velox-primary' : 'bg-slate-100 text-slate-400'}`}>
                          <module.icon size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{module.title}</p>
                          <p className="text-xs text-slate-500">{module.desc}</p>
                        </div>
                      </div>
                      {module.completed ? (
                        <div className="rounded-full bg-velox-primary/10 p-1 text-velox-primary">
                          <CheckCircle size={20} />
                        </div>
                      ) : (
                        <ChevronRight size={20} className="text-slate-300" />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Navigation Settings Modal */}
        <AnimatePresence>
          {showNavSettings && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowNavSettings(false)}
                className="absolute inset-0 z-[300] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[310] max-h-[min(92vh,760px)] min-h-0 overflow-y-auto overscroll-y-contain rounded-t-[2.5rem] bg-white p-8 shadow-2xl [-webkit-overflow-scrolling:touch]"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Navigation</h3>
                  <button onClick={() => setShowNavSettings(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  {[
                    { id: 'built-in', name: 'Zeyago Maps (Built-in)', icon: MapIcon },
                    { id: 'google', name: 'Google Maps', icon: Globe },
                    { id: 'waze', name: 'Waze', icon: Navigation },
                  ].map((nav) => (
                    <button 
                      key={nav.id}
                      onClick={() => setNavPreference(nav.id)}
                      className={`flex w-full items-center justify-between rounded-2xl border-2 p-5 transition-all ${navPreference === nav.id ? 'border-velox-primary bg-velox-primary/10' : 'border-slate-100 bg-white'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${navPreference === nav.id ? 'bg-velox-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <nav.icon size={20} />
                        </div>
                        <span className="font-bold text-slate-900">{nav.name}</span>
                      </div>
                      {navPreference === nav.id && (
                        <div className="h-6 w-6 rounded-full bg-velox-primary p-1 text-white">
                          <Check size={16} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setShowNavSettings(false)}
                  className="mt-8 w-full rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-lg shadow-slate-200"
                >
                  Save Preference
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Favorite Places Modal */}
        <AnimatePresence>
          {showFavorites && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowFavorites(false)}
                className="absolute inset-0 z-[200] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[210] max-h-[min(92vh,760px)] min-h-0 overflow-y-auto overscroll-y-contain rounded-t-[2.5rem] bg-white p-8 shadow-2xl [-webkit-overflow-scrolling:touch]"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Favorite Places</h3>
                  <button onClick={() => setShowFavorites(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  {favorites.map((fav) => (
                    <div key={fav.id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-velox-primary/10 text-velox-primary">
                          <fav.icon size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{fav.name}</p>
                          <p className="text-xs text-slate-500">{fav.address}</p>
                        </div>
                      </div>
                      <button className="text-slate-400 hover:text-red-500">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                <button className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-lg shadow-slate-200">
                  <Plus size={20} />
                  Add New Place
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Payout Modal */}
        <AnimatePresence>
          {showPayout && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPayout(false)}
                className="absolute inset-0 z-[220] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[230] max-h-[min(92vh,760px)] min-h-0 overflow-y-auto overscroll-y-contain rounded-t-[2.5rem] bg-white p-8 shadow-2xl [-webkit-overflow-scrolling:touch]"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Request Payout</h3>
                  <button onClick={() => setShowPayout(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-8 rounded-3xl bg-slate-50 p-6">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Available for Payout</p>
                  <h4 className="mt-1 text-3xl font-black text-slate-900">ETB {walletBalance.toLocaleString()}</h4>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Amount to Withdraw</label>
                    <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-100 p-4 focus-within:border-velox-primary transition-all">
                      <span className="font-bold text-slate-400">ETB</span>
                      <input 
                        type="number" 
                        placeholder="0.00"
                        className="w-full bg-transparent font-bold text-slate-900 outline-none"
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Payout Method</label>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: 'telebirr', name: 'Telebirr', icon: 'T', color: 'bg-blue-600' },
                        { id: 'cbe', name: 'CBE Birr', icon: 'C', color: 'bg-purple-600' },
                      ].map((method) => (
                        <button 
                          key={method.id}
                          onClick={() => setPayoutMethod(method.id)}
                          className={`flex items-center gap-3 rounded-2xl border-2 p-4 transition-all ${payoutMethod === method.id ? 'border-velox-primary bg-velox-primary/10' : 'border-slate-100 bg-white'}`}
                        >
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black text-white ${method.color}`}>
                            {method.icon}
                          </div>
                          <span className="text-sm font-bold text-slate-900">{method.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setWalletBalance(prev => prev - Number(payoutAmount));
                    setShowPayout(false);
                    setShowWallet(false);
                  }}
                  disabled={!payoutAmount || Number(payoutAmount) > walletBalance || Number(payoutAmount) <= 0}
                  className="mt-auto w-full rounded-2xl bg-velox-primary py-4 text-lg font-bold text-white shadow-lg shadow-[0_8px_24px_rgba(75,44,109,0.18)] disabled:opacity-50"
                >
                  Confirm Payout
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Promos Modal */}
        <AnimatePresence>
          {showPromos && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPromos(false)}
                className="absolute inset-0 z-[240] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[250] max-h-[min(92vh,760px)] min-h-0 overflow-y-auto overscroll-y-contain rounded-t-[2.5rem] bg-white p-8 shadow-2xl [-webkit-overflow-scrolling:touch]"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Promos & Discounts</h3>
                  <button onClick={() => setShowPromos(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-8">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Enter Promo Code</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g. ZEYAGO20"
                      className="flex-1 rounded-2xl border-2 border-slate-100 p-4 font-bold uppercase outline-none focus:border-velox-primary transition-all"
                      value={promoCode}
                      onChange={(e) => { setPromoCode(e.target.value); setPromoError(''); }}
                    />
                    <button 
                      onClick={async () => {
                        try {
                          const promo = await appSettingsService.getPromoSettings();
                          const inputCode = promoCode.trim().toUpperCase();
                          const savedCode = promo.code.trim().toUpperCase();
                          if (
                            promo.enabled &&
                            promo.active &&
                            inputCode.length > 0 &&
                            inputCode === savedCode
                          ) {
                            setActivePromo({
                              code: promo.code,
                              discount: promo.discountAmount,
                              discountType: promo.discountType,
                            });
                            setPromoCode('');
                            setPromoError('');
                          } else {
                            setPromoError('Invalid promo code');
                          }
                        } catch {
                          setPromoError('Promo settings unavailable');
                        }
                      }}
                      className="rounded-2xl bg-slate-900 px-6 font-bold text-white"
                    >
                      Apply
                    </button>
                  </div>
                  {promoError && <p className="mt-2 text-xs font-bold text-red-500">{promoError}</p>}
                </div>

                {activePromo && (
                  <div className="mb-8 rounded-3xl bg-velox-primary/10 p-6 border-2 border-velox-primary/15">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-velox-primary text-white">
                          <Tag size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-velox-dark">{activePromo.code} Applied</p>
                          <p className="text-xs text-velox-primary">
                            {activePromo.discountType === 'fixed'
                              ? `ETB ${activePromo.discount} off your next ride`
                              : `${activePromo.discount}% off your next ride`}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActivePromo(null)}
                        className="text-xs font-bold text-red-500 underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Available Offers</h4>
                <div className="space-y-4">
                  {[
                    { title: 'Welcome Bonus', desc: 'Get 50% off your first ride', code: 'WELCOME50' },
                    { title: 'Weekend Special', desc: 'ETB 50 off on weekend rides', code: 'WEEKEND50' },
                  ].map((offer) => (
                    <div key={offer.code} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{offer.title}</p>
                        <p className="text-[10px] text-slate-500">{offer.desc}</p>
                      </div>
                      <button 
                        onClick={() => setPromoCode(offer.code)}
                        className="text-xs font-bold text-velox-primary"
                      >
                        Copy
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Driver Performance Modal */}
        <AnimatePresence>
          {showPerformance && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPerformance(false)}
                className="absolute inset-0 z-[140] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[150] velox-bottom-sheet"
              >
                <div className="velox-bottom-sheet-head">
                  <h3 className="text-2xl font-bold text-slate-900">Performance</h3>
                  <button onClick={() => setShowPerformance(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="velox-bottom-sheet-scroll">
                  <div className="mb-8 flex flex-col items-center text-center">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-50 text-yellow-500 ring-4 ring-yellow-100">
                      <Star size={40} className="fill-yellow-500" />
                    </div>
                    <h4 className="text-3xl font-black text-slate-900">4.95</h4>
                    <p className="text-sm text-slate-500">Average Rating (Last 500 trips)</p>
                  </div>

                  <div className="mb-8">
                    <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Top Compliments</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {compliments.map((c) => (
                        <div key={c.id} className="flex flex-col items-center gap-2 rounded-3xl bg-slate-50 p-6 text-center">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-velox-primary shadow-sm">
                            <c.icon size={20} />
                          </div>
                          <p className="text-[10px] font-bold text-slate-900">{c.label}</p>
                          <p className="text-lg font-black text-velox-primary">{c.count}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Areas for Improvement</h4>
                    <div className="rounded-3xl border border-slate-100 p-6">
                      <div className="flex items-start gap-4">
                        <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                          <Info size={16} />
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Some riders mentioned that the car temperature could be adjusted. Consider asking riders if they're comfortable with the AC.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Notification Center Modal */}
        <AnimatePresence>
          {showNotifications && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowNotifications(false)}
                className="absolute inset-0 z-[140] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[150] velox-bottom-sheet"
              >
                <div className="velox-bottom-sheet-head">
                  <h3 className="text-2xl font-bold text-slate-900">Notifications</h3>
                  <button onClick={() => setShowNotifications(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="velox-bottom-sheet-scroll">
                  <div className="space-y-6">
                    {mode === 'driver' && (
                      <div>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Wallet &amp; trips
                          </h4>
                          {driverWalletNotifications.some((n) => !n.read) ? (
                            <button
                              type="button"
                              onClick={() => void markDriverWalletNotificationsRead()}
                              className="text-[10px] font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-800"
                            >
                              Mark wallet read
                            </button>
                          ) : null}
                        </div>
                        <div className="space-y-3">
                          {driverWalletNotifications.length === 0 ? (
                            <p className="rounded-2xl bg-slate-50 px-4 py-4 text-center text-xs text-slate-500">
                              No wallet updates yet. Balance alerts, top-up results, and trip commissions appear here.
                            </p>
                          ) : (
                            driverWalletNotifications.map((n) => {
                              const cat = driverWalletNotificationCategory(n.type);
                              return (
                                <div
                                  key={n.id}
                                  className={`relative rounded-2xl p-4 transition-all ${
                                    n.read
                                      ? 'bg-slate-50 ring-1 ring-slate-100'
                                      : 'bg-violet-50/40 ring-1 ring-violet-200/50'
                                  }`}
                                >
                                  <div className="mb-2 flex items-center justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-2">
                                      <div className={`h-2 w-2 shrink-0 rounded-full ${cat.dotClass}`} />
                                      <span className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                        {cat.label}
                                      </span>
                                    </div>
                                    <time
                                      dateTime={n.createdAt}
                                      className="shrink-0 font-mono text-[10px] text-slate-400"
                                    >
                                      {formatDriverWalletNotificationTime(n.createdAt)}
                                    </time>
                                  </div>
                                  <h4 className="mb-1 text-sm font-bold text-slate-900">{n.title}</h4>
                                  <p className="text-xs leading-relaxed text-slate-600">{n.body}</p>
                                  {!n.read && (
                                    <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-violet-500" />
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      {mode === 'driver' && notifications.length > 0 && (
                        <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          General
                        </h4>
                      )}
                      <div className="space-y-4">
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`relative rounded-3xl p-5 transition-all ${n.read ? 'bg-slate-50' : 'bg-velox-primary/10 ring-1 ring-velox-accent/20'}`}
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`h-2 w-2 rounded-full ${
                                    n.type === 'promo' || n.type === 'success'
                                      ? 'bg-velox-primary/100'
                                      : n.type === 'alert'
                                        ? 'bg-red-500'
                                        : n.type === 'warning'
                                          ? 'bg-amber-500'
                                          : 'bg-blue-500'
                                  }`}
                                ></div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                  {n.type}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400">{n.time}</span>
                            </div>
                            <h4 className="mb-1 font-bold text-slate-900">{n.title}</h4>
                            <p className="text-xs leading-relaxed text-slate-500">{n.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Destination Filter Modal */}
        <AnimatePresence>
          {showDestinationFilter && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDestinationFilter(false)}
                className="absolute inset-0 z-[180] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[190] velox-bottom-sheet"
              >
                <div className="velox-bottom-sheet-head">
                  <h3 className="text-2xl font-bold text-slate-900">Heading Home</h3>
                  <button onClick={() => setShowDestinationFilter(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="velox-bottom-sheet-scroll">
                  <div className="mb-8 flex flex-col items-center text-center">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-velox-primary/10 text-velox-primary">
                      <Navigation size={40} />
                    </div>
                    <h4 className="mb-2 text-xl font-bold text-slate-900">Set Your Destination</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      We'll only show you requests moving towards your destination. You have <span className="font-bold text-velox-primary">{filterUsesLeft} uses</span> left today.
                    </p>
                  </div>

                  {destinationFilter ? (
                    <div className="mb-8 rounded-3xl bg-velox-primary/10 p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-velox-primary shadow-sm">
                            <Home size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Active Filter</p>
                            <p className="font-bold text-slate-900">{destinationFilter}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setDestinationFilter(null)}
                          className="text-xs font-bold text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-8 space-y-4">
                      {['Bole', 'Piazza', 'Kazanchis', 'Sarbet'].map((loc) => (
                        <button 
                          key={loc}
                          type="button"
                          onClick={() => {
                            if (filterUsesLeft > 0) {
                              setDestinationFilter(loc);
                              setFilterUsesLeft(prev => prev - 1);
                              setShowDestinationFilter(false);
                            }
                          }}
                          disabled={filterUsesLeft === 0}
                          className="flex w-full items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-velox-primary/15 hover:bg-velox-primary/10 disabled:opacity-50"
                        >
                          <MapPin size={20} className="text-slate-400" />
                          <span className="font-bold text-slate-900">{loc}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <button 
                    type="button"
                    onClick={() => setShowDestinationFilter(false)}
                    className="w-full rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-lg shadow-slate-200"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Maintenance Tracker Modal */}
        <AnimatePresence>
          {showMaintenanceTracker && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMaintenanceTracker(false)}
                className="absolute inset-0 z-[180] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[190] velox-bottom-sheet"
              >
                <div className="velox-bottom-sheet-head">
                  <h3 className="text-2xl font-bold text-slate-900">Maintenance</h3>
                  <button type="button" onClick={() => setShowMaintenanceTracker(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="velox-bottom-sheet-scroll">
                  <div className="mb-8 grid grid-cols-2 gap-4">
                    <div className="rounded-3xl bg-slate-50 p-6 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active KM</p>
                      <p className="text-2xl font-black text-slate-900">{activeKm.toLocaleString()}</p>
                    </div>
                    <div className="rounded-3xl bg-velox-primary/10 p-6 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-velox-primary">Next Service</p>
                      <p className="text-2xl font-black text-velox-primary">{(activeKm + 500).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mb-8 space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">Recent Logs</h4>
                    <div className="space-y-3">
                      {maintenanceLogs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${log.type === 'fuel' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                              {log.type === 'fuel' ? <DollarSign size={18} /> : <Settings2 size={18} />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{log.type === 'fuel' ? 'Fuel Refill' : 'Oil Change'}</p>
                              <p className="text-[10px] text-slate-500">{log.date} • {log.km} KM</p>
                            </div>
                          </div>
                          <p className="font-bold text-slate-900">ETB {log.amount}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">Reminders</h4>
                    <div className="rounded-3xl border border-orange-100 bg-orange-50/30 p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                          <AlertTriangle size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">Tire Rotation Due</p>
                          <p className="text-xs text-slate-500 leading-relaxed">Your last tire rotation was at 8,000 KM. It's recommended every 5,000 KM.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button type="button" className="mt-8 w-full rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-lg shadow-slate-200">
                    Add New Log
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Driver Tiers Modal */}
        <AnimatePresence>
          {showTiers && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowTiers(false)}
                className="absolute inset-0 z-[180] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[190] velox-bottom-sheet"
              >
                <div className="velox-bottom-sheet-head">
                  <h3 className="text-2xl font-bold text-slate-900">Driver Tiers</h3>
                  <button type="button" onClick={() => setShowTiers(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="velox-bottom-sheet-scroll">
                  <div className="mb-8 flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-velox-primary/10 text-velox-primary ring-8 ring-velox-accent/25/50">
                        <Award size={48} />
                      </div>
                      <div className="absolute -bottom-2 -right-2 rounded-full bg-velox-primary px-3 py-1 text-[10px] font-bold text-white shadow-lg">
                        {driverTier}
                      </div>
                    </div>
                    <h4 className="mb-2 text-2xl font-black text-slate-900">You're a Pro Driver!</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      Maintain your 4.9+ rating and low cancellation rate to reach <span className="font-bold text-velox-primary">Elite</span> status.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { tier: 'Standard', status: 'completed', benefits: ['Standard Commission (20%)', 'Basic Support'] },
                      { tier: 'Pro', status: 'active', benefits: ['Reduced Commission (15%)', 'Priority Support', 'Fuel Discounts'] },
                      { tier: 'Elite', status: 'locked', benefits: ['Lowest Commission (10%)', 'Airport Priority', 'Monthly Bonus'] },
                    ].map((t) => (
                      <div 
                        key={t.tier}
                        className={`rounded-3xl border p-6 transition-all ${t.status === 'active' ? 'border-velox-primary bg-velox-primary/10' : 'border-slate-100 bg-white opacity-60'}`}
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <h5 className="text-lg font-bold text-slate-900">{t.tier}</h5>
                          {t.status === 'active' && <span className="text-xs font-bold text-velox-primary">Current Tier</span>}
                          {t.status === 'locked' && <Lock size={16} className="text-slate-400" />}
                        </div>
                        <div className="space-y-2">
                          {t.benefits.map((b, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <CheckCircle size={14} className={t.status === 'locked' ? 'text-slate-300' : 'text-velox-accent'} />
                              <span className="text-xs text-slate-600">{b}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button 
                    type="button"
                    onClick={() => setShowTiers(false)}
                    className="mt-8 w-full rounded-2xl bg-velox-primary py-4 font-bold text-white shadow-lg shadow-[0_8px_24px_rgba(75,44,109,0.18)]"
                  >
                    View My Progress
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Ride Preferences Modal */}
        <AnimatePresence>
          {showRidePreferences && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowRidePreferences(false)}
                className="absolute inset-0 z-[180] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[190] velox-bottom-sheet"
              >
                <div className="velox-bottom-sheet-head">
                  <h3 className="text-2xl font-bold text-slate-900">Ride Preferences</h3>
                  <button type="button" onClick={() => setShowRidePreferences(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="velox-bottom-sheet-scroll">
                  <div className="space-y-4">
                    {[
                      { id: 'quietRide', label: 'Quiet Ride', description: 'Prefer a silent journey', icon: MessageSquareOff },
                      { id: 'acOn', label: 'AC On', description: 'Request air conditioning', icon: Wind },
                      { id: 'luggageSpace', label: 'Luggage Space', description: 'Need space for bags', icon: Luggage },
                    ].map((pref) => (
                      <button 
                        key={pref.id}
                        type="button"
                        onClick={() => setRidePreferences(prev => ({ ...prev, [pref.id]: !prev[pref.id as keyof typeof prev] }))}
                        className={`flex w-full items-center justify-between rounded-2xl border p-4 transition-all ${ridePreferences[pref.id as keyof typeof ridePreferences] ? 'border-velox-primary bg-velox-primary/10' : 'border-slate-100 bg-white'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${ridePreferences[pref.id as keyof typeof ridePreferences] ? 'bg-velox-primary text-white' : 'bg-slate-100 text-slate-600'}`}>
                            <pref.icon size={24} />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-slate-900">{pref.label}</p>
                            <p className="text-xs text-slate-500">{pref.description}</p>
                          </div>
                        </div>
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${ridePreferences[pref.id as keyof typeof ridePreferences] ? 'border-velox-primary bg-velox-primary' : 'border-slate-200'}`}>
                          {ridePreferences[pref.id as keyof typeof ridePreferences] && <Check size={14} className="text-white" />}
                        </div>
                      </button>
                    ))}
                  </div>

                  <button 
                    type="button"
                    onClick={() => setShowRidePreferences(false)}
                    className="mt-8 w-full rounded-2xl bg-velox-primary py-4 font-bold text-white shadow-lg shadow-[0_8px_24px_rgba(75,44,109,0.18)]"
                  >
                    Save Preferences
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Zeyago Pass Modal */}
        <AnimatePresence>
          {showZeyagoPass && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowZeyagoPass(false)}
                className="absolute inset-0 z-[180] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[190] velox-bottom-sheet"
              >
                <div className="velox-bottom-sheet-head">
                  <h3 className="text-2xl font-bold text-slate-900">Zeyago Pass</h3>
                  <button type="button" onClick={() => setShowZeyagoPass(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="velox-bottom-sheet-scroll">
                  <div className="mb-8 overflow-hidden rounded-3xl bg-velox-primary p-6 text-white relative">
                    <Zap size={120} className="absolute -right-8 -top-8 opacity-10 rotate-12" />
                    <div className="relative z-10">
                      <h4 className="text-2xl font-black">Monthly Pass</h4>
                      <p className="mt-2 text-sm opacity-90">Enjoy zero surge pricing and priority pickups across Addis Ababa.</p>
                      <div className="mt-6 flex items-baseline gap-1">
                        <span className="text-3xl font-black">ETB 499</span>
                        <span className="text-sm opacity-70">/ month</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">What's Included</h4>
                    {[
                      { icon: Zap, title: 'No Surge Pricing', desc: 'Pay standard rates even during peak hours in Bole, Piazza & Kazanchis.' },
                      { icon: Clock, title: 'Priority Pickup', desc: 'Get matched with the nearest drivers 20% faster.' },
                      { icon: ShieldCheck, title: 'Premium Support', desc: '24/7 dedicated support line for Pass members.' },
                    ].map((benefit, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-velox-primary/10 text-velox-primary">
                          <benefit.icon size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{benefit.title}</p>
                          <p className="text-xs text-slate-500 leading-relaxed">{benefit.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button 
                    type="button"
                    onClick={() => {
                      setHasZeyagoPass(true);
                      setShowZeyagoPass(false);
                      alert('Welcome to Zeyago Pass! Your benefits are now active.');
                    }}
                    className="mt-8 w-full rounded-2xl bg-velox-primary py-4 font-bold text-white shadow-lg shadow-[0_8px_24px_rgba(75,44,109,0.18)]"
                  >
                    {hasZeyagoPass ? 'Manage Subscription' : 'Subscribe Now'}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Corporate Dashboard Modal */}
        <AnimatePresence>
          {showCorporateDashboard && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowCorporateDashboard(false)}
                className="absolute inset-0 z-[120] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[130] velox-bottom-sheet"
              >
                <div className="velox-bottom-sheet-head">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">Corporate</h3>
                      <p className="text-xs text-slate-500">{corporateData.companyName}</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowCorporateDashboard(false)} 
                    className="rounded-full bg-slate-100 p-2"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="velox-bottom-sheet-scroll">
                {/* Spending Summary */}
                <div className="mb-8 grid grid-cols-2 gap-4">
                  <div className="rounded-3xl bg-slate-50 p-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Team Spending</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">${corporateData.teamSpending.toFixed(2)}</p>
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-velox-primary">
                      <TrendingUp size={12} />
                      <span>+12.5% vs last month</span>
                    </div>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active Members</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{corporateData.activeMembers}</p>
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-blue-600">
                      <Users size={12} />
                      <span>{corporateData.teamMembers.length} managed</span>
                    </div>
                  </div>
                </div>

                {/* Domain Management */}
                <div className="mb-8">
                  <h4 className="mb-4 text-sm font-bold text-slate-900">Domain Management</h4>
                  <div className="flex items-center justify-between rounded-3xl border border-slate-100 p-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-2xl bg-velox-primary/10 p-3 text-velox-primary">
                        <Globe size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">@{corporateData.domain}</p>
                        <p className="text-xs text-slate-500">Auto-approve team members</p>
                      </div>
                    </div>
                    <div className="flex h-6 w-12 items-center rounded-full bg-velox-primary px-1">
                      <div className="h-4 w-4 translate-x-6 rounded-full bg-white"></div>
                    </div>
                  </div>
                </div>

                {/* Team Members */}
                <div className="mb-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">Team Members</h4>
                    <button className="text-xs font-bold text-velox-primary">Add New</button>
                  </div>
                  <div className="space-y-4">
                    {corporateData.teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-white p-1">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} alt={member.name} className="rounded-full" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{member.name}</p>
                            <p className="text-[10px] text-slate-500">{member.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">${member.spending.toFixed(2)}</p>
                          <p className="text-[10px] text-slate-500">{member.rides} rides</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Monthly Invoices */}
                <div className="mb-8">
                  <h4 className="mb-4 text-sm font-bold text-slate-900">Monthly Invoices</h4>
                  <div className="space-y-3">
                    {corporateData.invoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-slate-50 p-2 text-slate-600">
                            <FileText size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{invoice.id}</p>
                            <p className="text-[10px] text-slate-500">{invoice.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-900">${invoice.amount.toFixed(2)}</p>
                            <p className={`text-[10px] font-bold ${invoice.status === 'Paid' ? 'text-velox-primary' : 'text-orange-500'}`}>{invoice.status}</p>
                          </div>
                          <button className="rounded-full bg-slate-50 p-2 text-slate-400">
                            <Download size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="button" className="w-full rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-lg shadow-slate-200">
                  Export Full Report
                </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* PIN Verification Modal (Driver) */}
        <AnimatePresence>
          {requireRideSafetyPin && showPinVerification && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPinVerification(false)}
                className="absolute inset-0 z-[200] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="absolute left-1/2 top-1/2 z-[210] max-h-[min(85vh,720px)] w-[85%] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-y-contain rounded-[2.5rem] bg-white p-8 shadow-2xl [-webkit-overflow-scrolling:touch]"
              >
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-velox-primary/10 text-velox-primary">
                    <ShieldCheck size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{t('verifyPin')}</h3>
                  <p className="mt-2 text-sm text-slate-500">Ask the rider for their 4-digit safety code to start the trip.</p>
                </div>

                <div className="mb-8 flex justify-center gap-3">
                  {enteredPin.map((digit, i) => (
                    <input 
                      key={i}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d?$/.test(val)) {
                          const newPin = [...enteredPin];
                          newPin[i] = val;
                          setEnteredPin(newPin);
                          // Auto focus next
                          if (val && i < 3) {
                            const next = e.target.nextElementSibling as HTMLInputElement;
                            next?.focus();
                          }
                        }
                      }}
                      className="h-16 w-14 rounded-2xl border-2 border-slate-300 bg-slate-50 text-center text-2xl font-black tracking-[0.08em] text-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.08)] outline-none transition-all focus:border-velox-primary focus:bg-white focus:ring-4 focus:ring-velox-primary/15"
                    />
                  ))}
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setEnteredPin(['', '', '', '']);
                      setShowPinVerification(false);
                    }}
                    className="flex-1 rounded-2xl bg-slate-100 py-4 font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      if (enteredPin.join('') === ridePin) {
                        try {
                          let nextRide = currentRide;
                          if (activeTripId) {
                            const res = await driverRideService.tripStart(activeTripId);
                            setCurrentRide(res.trip.ride);
                            nextRide = res.trip.ride;
                          }
                          setIsPinVerified(true);
                          setShowPinVerification(false);
                          const next = driverNavAfterTripStart(nextRide);
                          setNavStep(next.step);
                          setNavStopLegIndex(next.stopIndex);
                          setRideStatus('ongoing');
                          setEnteredPin(['', '', '', '']);
                        } catch {
                          if (currentRide) {
                            const nextRide = {
                              ...currentRide,
                              status: 'in_progress' as const,
                            };
                            setCurrentRide(nextRide);
                            setIsPinVerified(true);
                            setShowPinVerification(false);
                            const next = driverNavAfterTripStart(nextRide);
                            setNavStep(next.step);
                            setNavStopLegIndex(next.stopIndex);
                            setRideStatus('ongoing');
                            setEnteredPin(['', '', '', '']);
                          }
                        }
                      } else {
                        alert('Invalid PIN. Please check with the rider.');
                      }
                    }}
                    className="flex-[2] rounded-2xl bg-velox-primary py-4 font-bold text-white shadow-lg shadow-[0_8px_24px_rgba(75,44,109,0.18)]"
                  >
                    {t('verifyPin')} & {t('startTrip')}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Business Setup Modal */}
        <AnimatePresence>
          {showBusinessSetup && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowBusinessSetup(false)}
                className="absolute inset-0 z-[180] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[190] max-h-[min(92vh,760px)] min-h-0 overflow-y-auto overscroll-y-contain rounded-t-[2.5rem] bg-white p-8 shadow-2xl [-webkit-overflow-scrolling:touch]"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Business Profile</h3>
                  <button onClick={() => setShowBusinessSetup(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-8 text-center">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Briefcase size={40} />
                  </div>
                  <h4 className="mb-2 text-xl font-bold text-slate-900">Separate Work & Life</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Set up a business profile to automatically receive receipts at your work email and enable monthly invoicing.
                  </p>
                </div>

                <div className="mb-8 space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Work Email</label>
                    <input 
                      type="email" 
                      value={businessEmail}
                      onChange={(e) => setBusinessEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full rounded-2xl border-2 border-slate-100 p-4 text-slate-900 focus:border-velox-primary outline-none transition-all"
                    />
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-velox-primary shadow-sm">
                        <FileText size={16} />
                      </div>
                      <p className="text-xs font-medium text-slate-600">Monthly invoicing enabled automatically</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    if (businessEmail) {
                      setProfileType('business');
                      setShowBusinessSetup(false);
                    }
                  }}
                  className="w-full rounded-2xl bg-velox-primary py-4 font-bold text-white shadow-lg shadow-[0_8px_24px_rgba(75,44,109,0.18)]"
                >
                  Complete Setup
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Zeyago Rewards Modal */}
        <AnimatePresence>
          {showRewards && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowRewards(false)}
                className="absolute inset-0 z-[180] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[190] max-h-[min(92vh,760px)] min-h-0 overflow-y-auto overscroll-y-contain rounded-t-[2.5rem] bg-white p-8 shadow-2xl [-webkit-overflow-scrolling:touch]"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Zeyago Rewards</h3>
                  <button onClick={() => setShowRewards(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-8 rounded-[2rem] bg-gradient-to-br from-yellow-400 to-orange-500 p-8 text-white shadow-xl relative overflow-hidden">
                  <Sparkles size={120} className="absolute -right-8 -top-8 opacity-20 rotate-12" />
                  <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">Available Points</p>
                  <h4 className="mt-2 text-5xl font-black">{zeyagoPoints}</h4>
                  <p className="mt-4 text-xs font-medium opacity-90">You've earned 120 points this week! Keep riding to unlock more rewards.</p>
                </div>

                <div className="space-y-6">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">Redeem Points</h4>
                  <div className="space-y-4">
                    {[
                      { title: 'Free Coffee at Tomoca', cost: 200, icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50' },
                      { title: 'ETB 50 Ride Discount', cost: 350, icon: DollarSign, color: 'text-velox-primary', bg: 'bg-velox-primary/10' },
                      { title: 'Zeyago Pass (1 Week)', cost: 800, icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
                    ].map((reward, i) => (
                      <button 
                        key={i}
                        disabled={zeyagoPoints < reward.cost}
                        className="flex w-full items-center justify-between rounded-3xl border border-slate-100 p-4 transition-all hover:border-yellow-200 hover:bg-yellow-50/30 disabled:opacity-50"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${reward.bg} ${reward.color}`}>
                            <reward.icon size={24} />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-slate-900">{reward.title}</p>
                            <p className="text-xs text-slate-500">{reward.cost} points</p>
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-slate-300" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-8 rounded-2xl bg-slate-50 p-4">
                  <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">How it works</p>
                  <p className="mt-2 text-center text-xs text-slate-500">Earn 10 points for every 10km traveled with Zeyago.</p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Share Trip Modal */}
        <AnimatePresence>
          {showShareTrip && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowShareTrip(false)}
                className="absolute inset-0 z-[180] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[190] max-h-[min(92vh,760px)] min-h-0 overflow-y-auto overscroll-y-contain rounded-t-[2.5rem] bg-white p-8 shadow-2xl [-webkit-overflow-scrolling:touch]"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Safety Toolkit</h3>
                  <button onClick={() => setShowShareTrip(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-8 flex flex-col items-center text-center">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <ShieldCheck size={40} />
                  </div>
                  <h4 className="mb-2 text-xl font-bold text-slate-900">Share My Trip</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Send a live tracking link to your trusted contacts. They'll see your real-time location and trip details.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      alert('Trip link copied! Sharing via SMS...');
                      setShowShareTrip(false);
                    }}
                    className="flex flex-col items-center gap-3 rounded-3xl bg-slate-50 p-6 transition-all hover:bg-blue-50 hover:text-blue-600"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                      <MessageCircle size={24} />
                    </div>
                    <span className="text-xs font-bold">Share via SMS</span>
                  </button>
                  <button 
                    onClick={() => {
                      alert('Trip link copied! Sharing via Telegram...');
                      setShowShareTrip(false);
                    }}
                    className="flex flex-col items-center gap-3 rounded-3xl bg-slate-50 p-6 transition-all hover:bg-blue-50 hover:text-blue-600"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                      <Send size={24} />
                    </div>
                    <span className="text-xs font-bold">Telegram</span>
                  </button>
                </div>

                <div className="mt-8 rounded-2xl bg-velox-primary/10 p-4 flex items-center gap-3">
                  <Shield size={20} className="text-velox-primary" />
                  <p className="text-[10px] font-bold text-velox-dark">
                    Your trip is monitored by Zeyago Safety Team 24/7.
                  </p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Referral Program Modal */}
        <AnimatePresence>
          {showReferral && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowReferral(false)}
                className="absolute inset-0 z-[140] bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 z-[150] max-h-[min(92vh,760px)] min-h-0 overflow-y-auto overscroll-y-contain rounded-t-[2.5rem] bg-white p-8 shadow-2xl [-webkit-overflow-scrolling:touch]"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Refer & Earn</h3>
                  <button onClick={() => setShowReferral(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-velox-primary/10 text-velox-primary">
                    <Gift size={64} />
                  </div>
                  <h4 className="mb-4 text-2xl font-black text-slate-900">Get ETB 100 Free!</h4>
                  <p className="mb-8 text-sm text-slate-500 leading-relaxed">
                    Invite your friends to Zeyago. When they complete their first ride, you both get ETB 100 in your wallet.
                  </p>

                  <div className="mb-8 w-full rounded-2xl bg-slate-50 p-4 flex items-center justify-between border border-dashed border-slate-200">
                    <span className="font-mono font-bold text-slate-900">ZEYAGO-FELIX-2026</span>
                    <button className="flex items-center gap-2 text-xs font-bold text-velox-primary">
                      <Copy size={16} />
                      Copy
                    </button>
                  </div>

                  <button className="flex w-full items-center justify-center gap-3 rounded-2xl bg-velox-primary py-4 font-bold text-white shadow-lg shadow-[0_8px_24px_rgba(75,44,109,0.18)]">
                    <Share2 size={20} />
                    Share Invite Link
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
