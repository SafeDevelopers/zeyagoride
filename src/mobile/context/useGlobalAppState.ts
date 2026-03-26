import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from './LanguageContext';
import { advanceAuthStep } from '../utils/authFlow';
import { authService } from '../services/api';
import { appSettingsService } from '../services/api/appSettingsService';
import {
  clearMobileSession,
  getInitialAuthStep,
  getInitialEditName,
  getInitialPhoneDigits,
  getInitialProfileFields,
  getInitialUserName,
  getInitialUserPhoneDisplay,
  formatPhoneForDisplay,
  getStoredUser,
} from '../services/sessionStorage';
import { INITIAL_NOTIFICATIONS } from '../constants/appDefaults';
import { initRideNotifications } from '../services/rides/rideNotifications';
import type { SessionUser } from '../types/api';
import type { AppMode, AuthStep, SupportStep } from '../types/mobile';

export function useGlobalAppState() {
  const { t, language, setLanguage } = useLanguage();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AppMode>((searchParams.get('role') as AppMode) || 'rider');
  const [step, setStep] = useState<AuthStep>(() => getInitialAuthStep());
  const [phone, setPhone] = useState(() => getInitialPhoneDigits());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showEarningsHistory, setShowEarningsHistory] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showDriverProfile, setShowDriverProfile] = useState(false);
  const [showDriverWallet, setShowDriverWallet] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const [userName, setUserName] = useState(() => getInitialUserName());
  const [userPhone, setUserPhone] = useState(() => getInitialUserPhoneDisplay());
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(() => getStoredUser());
  const [profileFields, setProfileFields] = useState(() => getInitialProfileFields());
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(() => getInitialEditName());

  const [showTripDetails, setShowTripDetails] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showScheduleRide, setShowScheduleRide] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showShareTrip, setShowShareTrip] = useState(false);
  const [showRidePreferences, setShowRidePreferences] = useState(false);
  const [showZeyagoPass, setShowZeyagoPass] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [showBusinessSetup, setShowBusinessSetup] = useState(false);
  const [showPinVerification, setShowPinVerification] = useState(false);
  const [requireRideSafetyPin, setRequireRideSafetyPin] = useState(true);

  const [showEarningsAnalytics, setShowEarningsAnalytics] = useState(false);
  const [showVehicleManagement, setShowVehicleManagement] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [showCorporateDashboard, setShowCorporateDashboard] = useState(false);
  const [showDocumentVault, setShowDocumentVault] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showSafetyToolkit, setShowSafetyToolkit] = useState(false);
  const [supportStep, setSupportStep] = useState<SupportStep>('list');
  const [selectedSupportTrip, setSelectedSupportTrip] = useState<any>(null);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showPayout, setShowPayout] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('telebirr');
  const [showPromos, setShowPromos] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [activePromo, setActivePromo] = useState<{
    code: string;
    discount: number;
    discountType: 'fixed' | 'percent';
  } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [showScheduledRides, setShowScheduledRides] = useState(false);
  const [showTrainingAcademy, setShowTrainingAcademy] = useState(false);
  const [showNavSettings, setShowNavSettings] = useState(false);

  const [showWallet, setShowWallet] = useState(false);
  /** Rider menu → History: trip list only (no wallet chrome). */
  const [showTripHistory, setShowTripHistory] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [showDestinationFilter, setShowDestinationFilter] = useState(false);
  const [showMaintenanceTracker, setShowMaintenanceTracker] = useState(false);
  const [showTiers, setShowTiers] = useState(false);
  const [showSOS, setShowSOS] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  /** In-app settings: push-style alerts (placeholder until backend). */
  const [settingsPushEnabled, setSettingsPushEnabled] = useState(true);
  const [settingsTheme, setSettingsTheme] = useState<'system' | 'light' | 'dark'>('system');
  /** Placeholder preference — no global theme application yet. */
  const [settingsCompactUI, setSettingsCompactUI] = useState(false);

  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  useEffect(() => {
    return initRideNotifications(setNotifications);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void appSettingsService
      .getSettings()
      .then((settings) => {
        if (cancelled) return;
        setRequireRideSafetyPin(settings.requireRideSafetyPin);
      })
      .catch(() => {
        /* keep safe default */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleNextStep = () => advanceAuthStep(step, setStep, setResendCooldown);

  const handleResendOtp = async () => {
    if (resendCooldown === 0) {
      setResendCooldown(30);
      await authService.loginWithPhone(phone, mode);
    }
  };

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const toggleMode = () => {
    setMode((prev) => (prev === 'rider' ? 'driver' : 'rider'));
    setIsMenuOpen(false);
  };

  const applyCurrentUser = useCallback((user: SessionUser) => {
    setCurrentUser(user);
    setUserName(user.name);
    setUserPhone(formatPhoneForDisplay(user.phone));
    setEditName(user.name);
    setProfileFields({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      address: user.address,
    });
  }, []);

  const handleLogout = () => {
    clearMobileSession();
    setShowSettings(false);
    setIsMenuOpen(false);
    setStep('welcome');
    setPhone('');
    setOtp(['', '', '', '']);
    setUserName('Felix M.');
    setUserPhone('+251 911 223344');
    setCurrentUser(null);
    setProfileFields({ firstName: '', lastName: '', email: '', address: '' });
    setEditName('Felix M.');
  };

  return {
    t,
    language,
    setLanguage,
    searchParams,
    mode,
    setMode,
    step,
    setStep,
    phone,
    setPhone,
    isMenuOpen,
    setIsMenuOpen,
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
    currentUser,
    setCurrentUser,
    applyCurrentUser,
    profileFields,
    setProfileFields,
    isEditingProfile,
    setIsEditingProfile,
    editName,
    setEditName,
    showTripDetails,
    setShowTripDetails,
    showPaymentMethods,
    setShowPaymentMethods,
    showAddPayment,
    setShowAddPayment,
    showScheduleRide,
    setShowScheduleRide,
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
    showRewards,
    setShowRewards,
    showBusinessSetup,
    setShowBusinessSetup,
    showPinVerification,
    setShowPinVerification,
    requireRideSafetyPin,
    setRequireRideSafetyPin,
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
    showNavSettings,
    setShowNavSettings,
    showWallet,
    setShowWallet,
    showTripHistory,
    setShowTripHistory,
    showChat,
    setShowChat,
    showVerification,
    setShowVerification,
    showDestinationFilter,
    setShowDestinationFilter,
    showMaintenanceTracker,
    setShowMaintenanceTracker,
    showTiers,
    setShowTiers,
    showSOS,
    setShowSOS,
    showSettings,
    setShowSettings,
    settingsPushEnabled,
    setSettingsPushEnabled,
    settingsTheme,
    setSettingsTheme,
    settingsCompactUI,
    setSettingsCompactUI,
    notifications,
    setNotifications,
    handleNextStep,
    handleResendOtp,
    handleLogout,
    toggleMode,
  };
}
