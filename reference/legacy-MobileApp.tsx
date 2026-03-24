import React, { useState, useEffect } from 'react';
import { useLanguage } from './LanguageContext';
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
  Lock
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

type AppMode = 'rider' | 'driver';
type AuthStep = 'welcome' | 'phone' | 'otp' | 'register' | 'home';

export default function MobileApp() {
  const { t, language, setLanguage } = useLanguage();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AppMode>((searchParams.get('role') as AppMode) || 'rider');
  const [step, setStep] = useState<AuthStep>('welcome');
  const [phone, setPhone] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showEarningsHistory, setShowEarningsHistory] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  // Profile state
  const [userName, setUserName] = useState('Felix M.');
  const [userPhone, setUserPhone] = useState('+251 911 223344');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(userName);

  // Simulation state
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [stops, setStops] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [rideStatus, setRideStatus] = useState<'idle' | 'searching' | 'found' | 'arrived' | 'ongoing' | 'completed'>('idle');
  const [selectedVehicle, setSelectedVehicle] = useState<'economy' | 'basic' | 'classic' | 'electric' | 'minivan' | 'executive' | 'hourly'>('economy');
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{sender: 'rider' | 'driver', text: string}[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const vehicleTypes = [
    { id: 'economy', name: 'Zeyago Economy', price: 'ETB 120', time: '3 min', capacity: 4, image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=100&q=80', icon: Car },
    { id: 'basic', name: 'Zeyago Basic', price: 'ETB 150', time: '4 min', capacity: 4, image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=100&q=80', icon: Car },
    { id: 'classic', name: 'Zeyago Classic', price: 'ETB 180', time: '5 min', capacity: 4, image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=100&q=80', icon: Car },
    { id: 'electric', name: 'Zeyago Eco', price: 'ETB 200', time: '6 min', capacity: 4, image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=100&q=80', icon: Zap },
    { id: 'minivan', name: 'Zeyago XL', price: 'ETB 350', time: '8 min', capacity: 6, image: 'https://images.unsplash.com/photo-1532581140115-3e355d1ed1de?auto=format&fit=crop&w=100&q=80', icon: Users },
    { id: 'executive', name: 'Zeyago Luxury', price: 'ETB 500', time: '10 min', capacity: 4, image: 'https://images.unsplash.com/photo-1563720223185-11003d516905?auto=format&fit=crop&w=100&q=80', icon: Star },
    { id: 'hourly', name: 'Zeyago Hourly', price: 'ETB 800', time: 'N/A', capacity: 4, image: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=100&q=80', icon: Clock },
  ];

  const [activeDriver, setActiveDriver] = useState({
    name: 'Abebe B.',
    car: 'Toyota Vitz',
    plate: 'AA 2-B12345',
    rating: 4.8,
    eta: '4 min',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Abebe'
  });

  // Driver Flow State
  const [isVerified, setIsVerified] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [showDestinationFilter, setShowDestinationFilter] = useState(false);
  const [destinationFilter, setDestinationFilter] = useState<string | null>(null);
  const [filterUsesLeft, setFilterUsesLeft] = useState(2);
  const [showMaintenanceTracker, setShowMaintenanceTracker] = useState(false);
  const [maintenanceLogs, setMaintenanceLogs] = useState([
    { id: '1', type: 'fuel', amount: '1200', date: '2026-03-19', km: '12450' },
    { id: '2', type: 'oil', amount: '3500', date: '2026-03-10', km: '12000' },
  ]);
  const [activeKm, setActiveKm] = useState(12680);
  const [driverTier, setDriverTier] = useState<'Standard' | 'Pro' | 'Elite'>('Pro');
  const [showTiers, setShowTiers] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState<{pickup: string, destination: string, earning: string} | null>(null);
  const [requestTimer, setRequestTimer] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navStep, setNavStep] = useState<'to_pickup' | 'to_destination'>('to_pickup');
  const [verificationStep, setVerificationStep] = useState<'start' | 'profile_pic' | 'national_id' | 'license' | 'vehicle_details' | 'registration' | 'insurance' | 'pending'>('start');
  const [vehicleDetails, setVehicleDetails] = useState({
    make: '',
    model: '',
    color: '',
    capacity: '4',
    tagNumber: ''
  });

  // Wallet & SOS State
  const [showWallet, setShowWallet] = useState(false);
  const [walletBalance, setWalletBalance] = useState(1250.50);
  const [showSOS, setShowSOS] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);
  const [transactions, setTransactions] = useState([
    { id: 1, type: 'ride', amount: -120, date: 'Today, 10:30 AM', title: 'Ride to Bole', pickup: 'Kazanchis', destination: 'Bole Medhanialem', driver: 'Abebe B.', distance: '4.2 km', duration: '12 min', baseFare: 50, distanceFare: 60, tax: 10 },
    { id: 2, type: 'topup', amount: 500, date: 'Yesterday, 4:15 PM', title: 'Telebirr Top-up' },
    { id: 3, type: 'ride', amount: -180, date: 'Mar 19, 2:00 PM', title: 'Ride to Kazanchis', pickup: 'Piazza', destination: 'Kazanchis', driver: 'Samuel K.', distance: '6.5 km', duration: '18 min', baseFare: 50, distanceFare: 110, tax: 20 },
  ]);

  // New Rider Flow States
  const [showTripDetails, setShowTripDetails] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showScheduleRide, setShowScheduleRide] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showShareTrip, setShowShareTrip] = useState(false);
  const [showRidePreferences, setShowRidePreferences] = useState(false);
  const [showZeyagoPass, setShowZeyagoPass] = useState(false);
  const [ridePreferences, setRidePreferences] = useState({
    quietRide: false,
    acOn: false,
    luggageSpace: false
  });
  const [hasZeyagoPass, setHasZeyagoPass] = useState(false);
  const [profileType, setProfileType] = useState<'personal' | 'business'>('personal');
  const [zeyagoPoints, setZeyagoPoints] = useState(450);
  const [showRewards, setShowRewards] = useState(false);
  const [showBusinessSetup, setShowBusinessSetup] = useState(false);
  const [businessEmail, setBusinessEmail] = useState('');
  const [ridePin, setRidePin] = useState('4821');
  const [enteredPin, setEnteredPin] = useState(['', '', '', '']);
  const [showPinVerification, setShowPinVerification] = useState(false);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([
    { id: '1', type: 'telebirr', name: 'Telebirr', last4: '8844', isDefault: true },
    { id: '2', type: 'visa', name: 'Visa', last4: '4242', isDefault: false },
  ]);

  // New Driver Flow States
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
  const [supportStep, setSupportStep] = useState<'list' | 'details' | 'success'>('list');
  const [selectedSupportTrip, setSelectedSupportTrip] = useState<any>(null);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showPayout, setShowPayout] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('telebirr');
  const [showPromos, setShowPromos] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [activePromo, setActivePromo] = useState<{code: string, discount: number} | null>(null);
  const [promoError, setPromoError] = useState('');
  const [showScheduledRides, setShowScheduledRides] = useState(false);
  const [showTrainingAcademy, setShowTrainingAcademy] = useState(false);
  const [navPreference, setNavPreference] = useState('built-in');
  const [showNavSettings, setShowNavSettings] = useState(false);
  const [rideRequest, setRideRequest] = useState<{id: string, rider: string, pickup: string, destination: string, fare: number} | null>(null);
  const [currentTrip, setCurrentTrip] = useState<{status: 'pickup' | 'enroute' | 'completed', rider?: string, driver?: string, pickup: string, destination: string, fare: number} | null>(null);

  const [scheduledRides, setScheduledRides] = useState([
    { id: '1', pickup: 'Bole Airport', destination: 'Sheraton Addis', date: 'Mar 22, 2026', time: '10:00 AM', status: 'scheduled' },
    { id: '2', pickup: 'Kazanchis', destination: 'CMC', date: 'Mar 25, 2026', time: '08:30 AM', status: 'scheduled' },
  ]);

  const [trainingModules, setTrainingModules] = useState([
    { id: '1', title: 'Safety Standards', desc: 'Learn about our core safety protocols.', completed: true, icon: Shield },
    { id: '2', title: 'Customer Service', desc: 'How to provide a 5-star experience.', completed: false, icon: Star },
    { id: '3', title: 'App Mastery', desc: 'Advanced features of the Zeyago Driver app.', completed: false, icon: Smartphone },
  ]);

  const [favorites, setFavorites] = useState([
    { id: '1', name: 'Home', address: 'Bole, Near Medhanialem', icon: Home },
    { id: '2', name: 'Work', address: 'Kazanchis, Nani Building', icon: Briefcase },
  ]);

  const [driverDocuments, setDriverDocuments] = useState([
    { id: 'license', title: 'Driving License', status: 'verified', expiry: '2028-05-20', icon: CardIcon },
    { id: 'bollo', title: 'Vehicle Bollo', status: 'expiring_soon', expiry: '2026-04-15', icon: FileText },
    { id: 'insurance', title: 'Insurance Policy', status: 'verified', expiry: '2026-11-30', icon: Shield },
    { id: 'cert', title: 'Zeyago Certification', status: 'pending', expiry: 'N/A', icon: Award },
  ]);

  const [corporateData, setCorporateData] = useState({
    companyName: 'Zeyago Tech Solutions',
    domain: 'zeyago.com',
    teamSpending: 1240.50,
    activeMembers: 12,
    pendingInvoices: 2,
    invoices: [
      { id: 'INV-001', date: 'Mar 01, 2026', amount: 850.20, status: 'Paid' },
      { id: 'INV-002', date: 'Feb 01, 2026', amount: 720.45, status: 'Paid' },
      { id: 'INV-003', date: 'Apr 01, 2026', amount: 1240.50, status: 'Pending' },
    ],
    teamMembers: [
      { id: 1, name: 'Felix M.', email: 'felix@zeyago.com', rides: 14, spending: 240.50 },
      { id: 2, name: 'Abebe B.', email: 'abebe@zeyago.com', rides: 8, spending: 180.00 },
      { id: 3, name: 'Sara K.', email: 'sara@zeyago.com', rides: 22, spending: 420.00 },
    ]
  });

  const [driverVehicles, setDriverVehicles] = useState([
    { id: '1', model: 'Toyota Vitz', plate: 'AA 2-B12345', color: 'Silver', status: 'active', insuranceExpiry: '2026-12-15' },
    { id: '2', model: 'Hyundai Atos', plate: 'AA 2-A98765', color: 'White', status: 'inactive', insuranceExpiry: '2026-08-20' },
  ]);

  const [notifications, setNotifications] = useState([
    { id: 1, title: 'New Promo!', message: 'Get 20% off your next 3 rides with code ZEYAGO20.', type: 'promo', time: '2h ago', read: false },
    { id: 2, title: 'Security Alert', message: 'Your account was logged in from a new device.', type: 'alert', time: '5h ago', read: true },
    { id: 3, title: 'Weekly Report', message: 'Your weekly earnings report is ready to view.', type: 'info', time: '1d ago', read: true },
  ]);

  const [compliments, setCompliments] = useState([
    { id: 1, label: 'Great Conversation', count: 42, icon: MessageCircle },
    { id: 2, label: 'Clean Car', count: 38, icon: Sparkles },
    { id: 3, label: 'Expert Navigation', count: 25, icon: Navigation },
    { id: 4, label: 'Safe Driving', count: 56, icon: Shield },
  ]);

  const handleNextStep = () => {
    if (step === 'welcome') setStep('phone');
    else if (step === 'phone') {
      setStep('otp');
      setResendCooldown(30);
    }
    else if (step === 'otp') setStep('register');
    else if (step === 'register') setStep('home');
  };

  const handleResendOtp = () => {
    if (resendCooldown === 0) {
      setResendCooldown(30);
      // Simulate API call
      console.log("Resending OTP...");
    }
  };

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    if (requestTimer > 0) {
      const timer = setTimeout(() => setRequestTimer(requestTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (requestTimer === 0 && incomingRequest) {
      setIncomingRequest(null);
    }
  }, [requestTimer, incomingRequest]);

  useEffect(() => {
    if (showSOS && sosCountdown > 0) {
      const timer = setTimeout(() => setSosCountdown(sosCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [showSOS, sosCountdown]);

  useEffect(() => {
    if (rideStatus === 'completed') {
      setShowRating(true);
    }
  }, [rideStatus]);

  const toggleMode = () => {
    setMode(prev => prev === 'rider' ? 'driver' : 'rider');
    setIsMenuOpen(false);
  };

  const MapView = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
      map.setView(center, 15);
    }, [center, map]);
    return null;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 font-sans">
      {/* Phone Frame Simulation */}
      <div className="relative h-[800px] w-[380px] overflow-hidden rounded-[3rem] border-[8px] border-slate-800 bg-white shadow-2xl">
        {/* Status Bar */}
        <div className="flex h-8 w-full items-center justify-between px-8 pt-2 text-[10px] font-bold text-slate-900">
          <span>9:41</span>
          <div className="flex gap-1">
            <Activity size={10} />
            <div className="h-2 w-4 rounded-sm bg-slate-900"></div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <motion.div 
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex h-full flex-col items-center justify-center p-8 text-center"
            >
              <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-emerald-600 text-white shadow-xl shadow-emerald-200">
                <Car size={48} />
              </div>
              <h1 className="text-3xl font-bold text-slate-900">{t('welcome')}</h1>
              <p className="mt-4 text-slate-500">Fast, reliable rides in Ethiopia.</p>
              
              <div className="mt-12 w-full space-y-4">
                <button 
                  onClick={() => { setMode('rider'); handleNextStep(); }}
                  className="flex w-full items-center justify-between rounded-2xl bg-emerald-600 p-5 text-lg font-bold text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
                >
                  {t('continueRider')}
                  <ChevronRight size={20} />
                </button>
                <button 
                  onClick={() => { setMode('driver'); handleNextStep(); }}
                  className="flex w-full items-center justify-between rounded-2xl border-2 border-slate-100 p-5 text-lg font-bold text-slate-900 hover:bg-slate-50 transition-all"
                >
                  {t('continueDriver')}
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'phone' && (
            <motion.div 
              key="phone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex h-full flex-col p-8"
            >
              <button onClick={() => setStep('welcome')} className="mb-8 self-start rounded-full bg-slate-100 p-2">
                <X size={20} />
              </button>
              <h2 className="text-2xl font-bold text-slate-900">{t('phoneAuth')}</h2>
              <p className="mt-2 text-slate-500">{t('enterPhone')}</p>
              
              <div className="mt-8 flex items-center gap-3 rounded-2xl border-2 border-slate-100 p-4 focus-within:border-emerald-600 transition-all">
                <span className="font-bold text-slate-400">+251</span>
                <input 
                  type="tel" 
                  placeholder="911 223 344"
                  className="w-full bg-transparent font-bold text-slate-900 outline-none"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <button 
                onClick={handleNextStep}
                disabled={phone.length < 9}
                className="mt-auto w-full rounded-2xl bg-emerald-600 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-100 disabled:opacity-50"
              >
                {t('sendOtp')}
              </button>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div 
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex h-full flex-col p-8"
            >
              <button onClick={() => setStep('phone')} className="mb-8 self-start rounded-full bg-slate-100 p-2">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-2xl font-bold text-slate-900">{t('verifyOtp')}</h2>
              <p className="mt-2 text-slate-500">Enter the 4-digit code sent to +251 {phone}</p>
              
              <div className="mt-8 flex justify-between gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <input 
                    key={i}
                    id={`otp-${i}`}
                    type="text" 
                    maxLength={1}
                    value={otp[i]}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (val) {
                        const newOtp = [...otp];
                        newOtp[i] = val;
                        setOtp(newOtp);
                        if (i < 3) document.getElementById(`otp-${i + 1}`)?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !otp[i] && i > 0) {
                        document.getElementById(`otp-${i - 1}`)?.focus();
                      }
                    }}
                    className="h-16 w-16 rounded-2xl border-2 border-slate-100 text-center text-2xl font-bold text-slate-900 focus:border-emerald-600 outline-none transition-all"
                  />
                ))}
              </div>

              <div className="mt-6 text-center">
                <button 
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                  className={`text-sm font-bold transition-colors ${resendCooldown > 0 ? 'text-slate-400' : 'text-emerald-600 hover:text-emerald-700'}`}
                >
                  {t('resendOtp')} {resendCooldown > 0 && `(${resendCooldown}s)`}
                </button>
              </div>

              <button 
                onClick={() => {
                  setIsVerifying(true);
                  setTimeout(() => {
                    setIsVerifying(false);
                    handleNextStep();
                  }, 1500);
                }}
                disabled={otp.some(v => !v) || isVerifying}
                className="mt-auto flex w-full items-center justify-center rounded-2xl bg-emerald-600 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-100 disabled:opacity-50"
              >
                {isVerifying ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : t('verifyOtp')}
              </button>
            </motion.div>
          )}

          {step === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-full flex-col bg-slate-50"
            >
              {/* App Header */}
              <div className="flex items-center justify-between bg-white px-6 py-4 shadow-sm">
                <button onClick={() => setIsMenuOpen(true)} className="rounded-full bg-slate-100 p-2">
                  <Menu size={20} />
                </button>
                
                {/* Mode Switcher Pill */}
                <div className="flex items-center rounded-full bg-slate-100 p-1">
                  <button 
                    onClick={() => setMode('rider')}
                    className={`rounded-full px-4 py-1.5 text-[10px] font-bold transition-all ${mode === 'rider' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    RIDER
                  </button>
                  <button 
                    onClick={() => setMode('driver')}
                    className={`rounded-full px-4 py-1.5 text-[10px] font-bold transition-all ${mode === 'driver' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    DRIVER
                  </button>
                </div>

                <div className="h-10 w-10 rounded-full bg-emerald-100 p-1 ring-2 ring-emerald-50">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="rounded-full" />
                </div>
              </div>

              {/* Main Content */}
              <div className="relative flex-1 overflow-hidden">
                {/* Interactive Leaflet Map */}
                <div className="absolute inset-0 z-0">
                  <MapContainer 
                    center={[9.0227, 38.7460]} 
                    zoom={13} 
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <MapView center={[9.0227, 38.7460]} />
                    
                    {/* Simulated Driver Markers */}
                    <Marker position={[9.0250, 38.7500]}>
                      <Popup>Zeyago Economy - 3 min away</Popup>
                    </Marker>
                    <Marker position={[9.0180, 38.7400]}>
                      <Popup>Zeyago Premium - 5 min away</Popup>
                    </Marker>
                  </MapContainer>
                </div>

                {/* SOS Button - Floating */}
                <button 
                  onClick={() => {
                    setShowSOS(true);
                    setSosCountdown(5);
                  }}
                  className="absolute right-4 top-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-200 transition-transform active:scale-90"
                >
                  <Shield size={24} />
                </button>

                {/* Rider Mode UI */}
                {mode === 'rider' && (
                  <div className="absolute bottom-0 w-full p-4">
                    <motion.div 
                      layout
                      className="rounded-3xl bg-white p-6 shadow-2xl"
                    >
                      {rideStatus === 'idle' && (
                        <>
                          <h3 className="mb-4 text-xl font-bold text-slate-900">{t('riderHome')}</h3>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
                              <MapPin size={18} className="text-emerald-600" />
                              <input 
                                placeholder="Current Location" 
                                className="w-full bg-transparent text-sm font-medium outline-none"
                                value={pickup}
                                onChange={e => setPickup(e.target.value)}
                              />
                            </div>
                            
                            {stops.map((stop, index) => (
                              <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                key={index} 
                                className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-100"
                              >
                                <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                                <input 
                                  placeholder={`Stop ${index + 1}`} 
                                  className="w-full bg-transparent text-sm font-medium outline-none"
                                  value={stop}
                                  onChange={e => {
                                    const newStops = [...stops];
                                    newStops[index] = e.target.value;
                                    setStops(newStops);
                                  }}
                                />
                                <button 
                                  onClick={() => setStops(stops.filter((_, i) => i !== index))}
                                  className="text-slate-400"
                                >
                                  <X size={16} />
                                </button>
                              </motion.div>
                            ))}

                            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
                              <Navigation size={18} className="text-slate-400" />
                              <input 
                                placeholder="Where to?" 
                                className="w-full bg-transparent text-sm font-medium outline-none"
                                value={destination}
                                onChange={e => setDestination(e.target.value)}
                              />
                              {stops.length < 2 && (
                                <button 
                                  onClick={() => setStops([...stops, ''])}
                                  className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-600"
                                >
                                  <Plus size={14} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="mt-8">
                            <p className="mb-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Saved Places</p>
                            <div className="grid grid-cols-2 gap-3">
                              <button 
                                onClick={() => setDestination('Bole Medhanialem')}
                                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-emerald-100 hover:bg-emerald-50"
                              >
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                                  <Home size={16} />
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-bold text-slate-900">Home</p>
                                  <p className="text-[10px] text-slate-500">Bole</p>
                                </div>
                              </button>
                              <button 
                                onClick={() => setDestination('Kazanchis')}
                                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-emerald-100 hover:bg-emerald-50"
                              >
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                                  <Briefcase size={16} />
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-bold text-slate-900">Work</p>
                                  <p className="text-[10px] text-slate-500">Kazanchis</p>
                                </div>
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Vehicle Selection Overlay */}
                      {destination && rideStatus === 'idle' && (
                        <motion.div 
                          initial={{ y: '100%' }}
                          animate={{ y: 0 }}
                          className="absolute inset-x-0 bottom-0 z-50 rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
                        >
                          <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900">Choose a ride</h3>
                            <button onClick={() => setDestination('')} className="rounded-full bg-slate-100 p-2">
                              <X size={16} />
                            </button>
                          </div>

                          {!hasZeyagoPass && (
                            <button 
                              onClick={() => setShowZeyagoPass(true)}
                              className="mb-6 flex w-full items-center justify-between rounded-2xl bg-emerald-600 p-4 text-white shadow-lg shadow-emerald-100"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                                  <Zap size={20} />
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-bold">Get Zeyago Pass</p>
                                  <p className="text-[10px] opacity-80">Avoid surge pricing in Bole & Piazza</p>
                                </div>
                              </div>
                              <ChevronRight size={20} />
                            </button>
                          )}

                          <div className="mb-6 max-h-[300px] space-y-3 overflow-y-auto pr-1">
                            {vehicleTypes.map((v) => (
                              <button 
                                key={v.id}
                                onClick={() => setSelectedVehicle(v.id as any)}
                                className={`flex w-full items-center justify-between rounded-2xl border p-4 transition-all ${selectedVehicle === v.id ? 'border-emerald-600 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="h-14 w-14 overflow-hidden rounded-xl bg-slate-100 shadow-sm">
                                    <img src={v.image} alt={v.name} className="h-full w-full object-cover" />
                                  </div>
                                  <div className="text-left">
                                    <p className="font-bold text-slate-900">{v.name}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                      <div className="flex items-center gap-1">
                                        <Users size={10} />
                                        <span>{v.capacity}</span>
                                      </div>
                                      <span>•</span>
                                      <span>{v.time} away</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-slate-900">{v.price}</p>
                                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">Best Value</p>
                                </div>
                              </button>
                            ))}
                          </div>

                          <button 
                            onClick={() => setShowRidePreferences(true)}
                            className="mb-6 flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                                <Settings2 size={16} />
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-bold text-slate-900">Personalize My Ride</p>
                                <p className="text-[10px] text-slate-500">
                                  {Object.values(ridePreferences).some(v => v) 
                                    ? "Preferences set" 
                                    : "Quiet ride, AC, Luggage..."}
                                </p>
                              </div>
                            </div>
                            <ChevronRight size={16} className="text-slate-400" />
                          </button>

                          <div className="mb-6 flex gap-2">
                            <button 
                              onClick={() => setProfileType('personal')}
                              className={`flex-1 rounded-2xl border p-4 transition-all ${profileType === 'personal' ? 'border-emerald-600 bg-emerald-50 text-emerald-600' : 'border-slate-100 bg-white text-slate-500'}`}
                            >
                              <div className="flex flex-col items-center gap-1">
                                <User size={18} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{t('personal')}</span>
                              </div>
                            </button>
                            <button 
                              onClick={() => {
                                if (!businessEmail) {
                                  setShowBusinessSetup(true);
                                } else {
                                  setProfileType('business');
                                }
                              }}
                              className={`flex-1 rounded-2xl border p-4 transition-all ${profileType === 'business' ? 'border-emerald-600 bg-emerald-50 text-emerald-600' : 'border-slate-100 bg-white text-slate-500'}`}
                            >
                              <div className="flex flex-col items-center gap-1">
                                <Briefcase size={18} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{t('business')}</span>
                              </div>
                            </button>
                          </div>

                          <div className="flex gap-3">
                            <button 
                              onClick={() => setShowScheduleRide(true)}
                              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-transform active:scale-95"
                            >
                              <Calendar size={24} />
                            </button>
                            <button 
                              onClick={() => setRideStatus('searching')}
                              className="flex-1 rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-100 transition-transform active:scale-95"
                            >
                              {t('requestRide')}
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {rideStatus === 'searching' && (
                        <div className="flex flex-col items-center py-8 text-center">
                          <motion.div 
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
                          >
                            <Car size={32} />
                          </motion.div>
                          <h3 className="text-xl font-bold text-slate-900">Finding your ride...</h3>
                          <p className="mt-2 text-sm text-slate-500">Connecting you to the nearest driver in Addis Ababa.</p>
                          <div className="mt-8 flex w-full flex-col gap-3">
                            <button 
                              onClick={() => setRideStatus('found')}
                              className="w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-100"
                            >
                              Simulate Driver Found
                            </button>
                            <button 
                              onClick={() => setRideStatus('idle')}
                              className="text-sm font-bold text-red-500"
                            >
                              Cancel Request
                            </button>
                          </div>
                        </div>
                      )}

                      {rideStatus === 'found' && (
                        <div className="py-2">
                          <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-100">
                                <img src={activeDriver.image} alt={activeDriver.name} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{activeDriver.name}</p>
                                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                  <Star size={10} className="fill-yellow-400 text-yellow-400" />
                                  <span>{activeDriver.rating}</span>
                                  <span className="mx-1">•</span>
                                  <span>{activeDriver.car}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-emerald-600">{activeDriver.eta}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">{activeDriver.plate}</p>
                            </div>
                          </div>

                          <div className="mb-6 flex items-center justify-between rounded-2xl bg-slate-900 p-4 text-white shadow-xl">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                                <ShieldCheck size={24} />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">{t('safetyPin')}</p>
                                <p className="text-sm font-medium opacity-80">Give this to your driver</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {ridePin.split('').map((digit, i) => (
                                <div key={i} className="flex h-10 w-8 items-center justify-center rounded-lg bg-white/10 text-xl font-black tracking-tighter">
                                  {digit}
                                </div>
                              ))}
                            </div>
                          </div>

                          {stops.length > 0 && (
                            <div className="mb-4 space-y-2 rounded-2xl bg-slate-50 p-3">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Route with Stops</p>
                                {stops.length < 2 && (
                                  <button 
                                    onClick={() => setStops([...stops, 'New Stop'])}
                                    className="text-[10px] font-bold text-emerald-600"
                                  >
                                    + Add Stop
                                  </button>
                                )}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  <p className="text-xs font-medium text-slate-600">{pickup || 'Current Location'}</p>
                                </div>
                                {stops.map((stop, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full border border-slate-400" />
                                    <p className="text-xs font-medium text-slate-600">{stop}</p>
                                  </div>
                                ))}
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                  <p className="text-xs font-medium text-slate-600">{destination}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {stops.length === 0 && (
                            <button 
                              onClick={() => setStops(['New Stop'])}
                              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-2 text-[10px] font-bold text-slate-400"
                            >
                              <Plus size={12} />
                              Add a stop to your trip
                            </button>
                          )}

                          <div className="mb-4 flex gap-3">
                            <button 
                              onClick={() => setShowChat(true)}
                              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-100 py-4 font-bold text-slate-900"
                            >
                              <MessageSquare size={20} />
                              Chat
                            </button>
                            <button 
                              onClick={() => setShowShareTrip(true)}
                              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"
                            >
                              <Share2 size={24} />
                            </button>
                            <button className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                              <PhoneCall size={24} />
                            </button>
                          </div>
                          
                          <button 
                            onClick={() => setRideStatus('idle')}
                            className="w-full rounded-2xl bg-red-50 py-4 font-bold text-red-500"
                          >
                            Cancel Ride
                          </button>
                        </div>
                      )}

                      {rideStatus === 'arrived' && (
                        <div className="py-4 text-center">
                          <div className="mb-6 flex flex-col items-center">
                            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                              <Navigation size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">Driver has Arrived!</h3>
                            <p className="mt-2 text-sm text-slate-500">Your driver {activeDriver.name} is waiting at the pickup point.</p>
                          </div>
                          
                          <div className="mb-8 rounded-3xl bg-slate-50 p-6 text-left">
                            <div className="mb-4 flex items-center justify-between">
                              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Driver</p>
                              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">{activeDriver.plate}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="h-16 w-16 overflow-hidden rounded-full bg-white shadow-sm">
                                <img src={activeDriver.image} alt={activeDriver.name} />
                              </div>
                              <div>
                                <h4 className="text-lg font-bold text-slate-900">{activeDriver.name}</h4>
                                <p className="text-sm text-slate-500">{activeDriver.car}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-4">
                            <button 
                              onClick={() => setShowChat(true)}
                              className="flex-1 rounded-2xl bg-slate-100 py-4 font-bold text-slate-900"
                            >
                              Chat
                            </button>
                            <button className="flex-1 rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-100">
                              Call Driver
                            </button>
                          </div>
                        </div>
                      )}

                      {rideStatus === 'ongoing' && (
                        <div className="py-4">
                          <div className="mb-6 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-emerald-500">Trip in Progress</p>
                              <h3 className="text-2xl font-bold text-slate-900">Heading to {destination}</h3>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                              <Navigation size={24} />
                            </div>
                          </div>

                          <div className="mb-6 space-y-4 rounded-3xl bg-slate-50 p-6">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-400">Estimated Arrival</span>
                              <span className="text-lg font-bold text-slate-900">12 mins</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                              <motion.div 
                                initial={{ width: '30%' }}
                                animate={{ width: '60%' }}
                                transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse' }}
                                className="h-full rounded-full bg-emerald-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <button 
                              onClick={() => setShowSafetyToolkit(true)}
                              className="flex flex-col items-center gap-2 rounded-2xl bg-red-50 p-4 text-red-600 transition-all active:scale-95"
                            >
                              <ShieldCheck size={24} />
                              <span className="text-xs font-bold">Safety Toolkit</span>
                            </button>
                            <button 
                              onClick={() => setShowShareTrip(true)}
                              className="flex flex-col items-center gap-2 rounded-2xl bg-blue-50 p-4 text-blue-600 transition-all active:scale-95"
                            >
                              <Share2 size={24} />
                              <span className="text-xs font-bold">Share Trip</span>
                            </button>
                          </div>

                          <button 
                            onClick={() => {
                              setRideStatus('idle');
                              setShowRating(true);
                            }}
                            className="mt-6 w-full rounded-2xl bg-slate-900 py-4 font-bold text-white"
                          >
                            Simulate Trip Completion
                          </button>
                        </div>
                      )}
                    </motion.div>
                  </div>
                )}

                {/* Driver Mode UI */}
                {mode === 'driver' && (
                  <div className="absolute inset-0 z-40">
                    {!isVerified ? (
                      <div className="flex h-full flex-col bg-white p-8">
                        <div className="mb-8 flex items-center justify-between pt-8">
                          <h2 className="text-2xl font-bold text-slate-900">Driver Verification</h2>
                          <button onClick={() => setMode('rider')} className="text-sm font-bold text-emerald-600">Switch to Rider</button>
                        </div>

                        {verificationStep === 'start' && (
                          <div className="flex flex-1 flex-col">
                            <div className="mb-8 rounded-3xl bg-emerald-50 p-6">
                              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                                <FileText size={24} />
                              </div>
                              <h3 className="mb-2 text-lg font-bold text-slate-900">Become a Zeyago Driver</h3>
                              <p className="text-sm text-slate-600">To start earning with Zeyago, we need to verify your documents. This usually takes less than 24 hours.</p>
                            </div>

                            <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '320px' }}>
                              {[
                                { id: 'profile_pic', label: 'Profile Picture', icon: User },
                                { id: 'national_id', label: 'National ID / Passport', icon: CreditCard },
                                { id: 'license', label: 'Driving License', icon: FileText },
                                { id: 'registration', label: 'Vehicle Registration', icon: Car },
                                { id: 'insurance', label: 'Insurance Policy', icon: CheckCircle },
                              ].map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
                                  <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                                      <doc.icon size={20} />
                                    </div>
                                    <span className="font-bold text-slate-900">{doc.label}</span>
                                  </div>
                                  <div className="h-2 w-2 rounded-full bg-slate-200"></div>
                                </div>
                              ))}
                            </div>

                            <button 
                              onClick={() => setVerificationStep('profile_pic')}
                              className="mt-auto w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-100"
                            >
                              Get Started
                            </button>
                          </div>
                        )}

                        {(verificationStep === 'profile_pic' || verificationStep === 'national_id' || verificationStep === 'license' || verificationStep === 'vehicle_details' || verificationStep === 'registration' || verificationStep === 'insurance') && (
                          <div className="flex flex-1 flex-col">
                            <div className="mb-6 flex items-center justify-between">
                              <button onClick={() => {
                                if (verificationStep === 'profile_pic') setVerificationStep('start');
                                else if (verificationStep === 'national_id') setVerificationStep('profile_pic');
                                else if (verificationStep === 'license') setVerificationStep('national_id');
                                else if (verificationStep === 'vehicle_details') setVerificationStep('license');
                                else if (verificationStep === 'registration') setVerificationStep('vehicle_details');
                                else if (verificationStep === 'insurance') setVerificationStep('registration');
                              }} className="flex items-center gap-2 text-slate-400">
                                <ChevronRight className="rotate-180" size={20} />
                                <span className="text-sm font-bold">Back</span>
                              </button>
                              <div className="flex gap-1">
                                {['profile_pic', 'national_id', 'license', 'vehicle_details', 'registration', 'insurance'].map((s, i) => (
                                  <div 
                                    key={s} 
                                    className={`h-1.5 w-5 rounded-full transition-all ${
                                      ['profile_pic', 'national_id', 'license', 'vehicle_details', 'registration', 'insurance'].indexOf(verificationStep) >= i 
                                        ? 'bg-emerald-600' 
                                        : 'bg-slate-100'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            
                            {verificationStep === 'vehicle_details' ? (
                              <div className="flex flex-1 flex-col overflow-y-auto pr-1">
                                <h3 className="mb-2 text-xl font-bold text-slate-900">Vehicle Details</h3>
                                <p className="mb-6 text-sm text-slate-500">Tell us about the vehicle you'll be driving.</p>
                                
                                <div className="space-y-4">
                                  <div>
                                    <label className="mb-1 block text-xs font-bold text-slate-400 uppercase tracking-wider">Vehicle Make</label>
                                    <input 
                                      type="text" 
                                      placeholder="e.g. Toyota"
                                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 font-bold text-slate-900 outline-none focus:border-emerald-600"
                                      value={vehicleDetails.make}
                                      onChange={(e) => setVehicleDetails({...vehicleDetails, make: e.target.value})}
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-bold text-slate-400 uppercase tracking-wider">Vehicle Model</label>
                                    <input 
                                      type="text" 
                                      placeholder="e.g. Vitz"
                                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 font-bold text-slate-900 outline-none focus:border-emerald-600"
                                      value={vehicleDetails.model}
                                      onChange={(e) => setVehicleDetails({...vehicleDetails, model: e.target.value})}
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="mb-1 block text-xs font-bold text-slate-400 uppercase tracking-wider">Color</label>
                                      <input 
                                        type="text" 
                                        placeholder="e.g. Silver"
                                        className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 font-bold text-slate-900 outline-none focus:border-emerald-600"
                                        value={vehicleDetails.color}
                                        onChange={(e) => setVehicleDetails({...vehicleDetails, color: e.target.value})}
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs font-bold text-slate-400 uppercase tracking-wider">Seats</label>
                                      <select 
                                        className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 font-bold text-slate-900 outline-none focus:border-emerald-600"
                                        value={vehicleDetails.capacity}
                                        onChange={(e) => setVehicleDetails({...vehicleDetails, capacity: e.target.value})}
                                      >
                                        <option value="4">4 Seats</option>
                                        <option value="6">6 Seats</option>
                                        <option value="7">7+ Seats</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-bold text-slate-400 uppercase tracking-wider">Tag (Plate) Number</label>
                                    <input 
                                      type="text" 
                                      placeholder="e.g. AA 2-B12345"
                                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 font-bold text-slate-900 outline-none focus:border-emerald-600"
                                      value={vehicleDetails.tagNumber}
                                      onChange={(e) => setVehicleDetails({...vehicleDetails, tagNumber: e.target.value})}
                                    />
                                  </div>
                                </div>

                                <button 
                                  onClick={() => setVerificationStep('registration')}
                                  disabled={!vehicleDetails.make || !vehicleDetails.model || !vehicleDetails.tagNumber}
                                  className="mt-8 w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-100 disabled:opacity-50"
                                >
                                  Continue
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-1 flex-col">
                                <h3 className="mb-2 text-xl font-bold text-slate-900">
                                  {verificationStep === 'profile_pic' ? 'Upload Profile Picture' : 
                                   verificationStep === 'national_id' ? 'Upload National ID' :
                                   verificationStep === 'license' ? 'Upload Driving License' : 
                                   verificationStep === 'registration' ? 'Upload Vehicle Registration' : 
                                   'Upload Insurance Policy'}
                                </h3>
                                <p className="mb-8 text-sm text-slate-500">
                                  {verificationStep === 'profile_pic' ? 'Please take a clear photo of your face. No sunglasses or hats.' : 
                                   `Please take a clear photo of your ${verificationStep.replace('_', ' ')}. All details must be readable.`}
                                </p>

                                <div className={`flex flex-1 items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 ${verificationStep === 'profile_pic' ? 'aspect-square max-h-[300px] mx-auto' : ''}`}>
                                  <div className="text-center">
                                    <div className={`mx-auto mb-4 flex items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ${verificationStep === 'profile_pic' ? 'h-24 w-24' : 'h-16 w-16'}`}>
                                      <Camera size={verificationStep === 'profile_pic' ? 40 : 32} />
                                    </div>
                                    <p className="text-sm font-bold text-slate-600">Tap to take photo</p>
                                  </div>
                                </div>

                                <button 
                                  onClick={() => {
                                    if (verificationStep === 'profile_pic') setVerificationStep('national_id');
                                    else if (verificationStep === 'national_id') setVerificationStep('license');
                                    else if (verificationStep === 'license') setVerificationStep('vehicle_details');
                                    else if (verificationStep === 'registration') setVerificationStep('insurance');
                                    else if (verificationStep === 'insurance') setVerificationStep('pending');
                                  }}
                                  className="mt-8 w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-100"
                                >
                                  Continue
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {verificationStep === 'pending' && (
                          <div className="flex flex-1 flex-col items-center justify-center text-center">
                            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                              <Clock size={48} />
                            </div>
                            <h3 className="mb-2 text-2xl font-bold text-slate-900">Verification Pending</h3>
                            <p className="mb-8 text-sm text-slate-500">We've received your documents and are reviewing them. We'll notify you once you're approved!</p>
                            <button 
                              onClick={() => { setIsVerified(true); setMode('driver'); }}
                              className="w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white"
                            >
                              Simulate Approval (Demo)
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative h-full">
                        {/* Map Background */}
                        <div className="absolute inset-0 bg-slate-200">
                          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                          {isNavigating && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="h-1 w-full max-w-[200px] rounded-full bg-emerald-500/20">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: '100%' }}
                                  transition={{ duration: 10, repeat: Infinity }}
                                  className="h-full rounded-full bg-emerald-500"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Driver Header */}
                        <div className="absolute top-4 left-0 w-full px-4">
                          <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-lg">
                            <div className="flex items-center gap-3">
                              <div className={`h-3 w-3 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{userName}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{isOnline ? 'Online' : 'Offline'}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setIsOnline(!isOnline)}
                              className={`rounded-full px-6 py-2 text-sm font-bold text-white transition-all ${isOnline ? 'bg-red-500' : 'bg-emerald-600'}`}
                            >
                              {isOnline ? t('goOffline') : t('goOnline')}
                            </button>
                          </div>
                        </div>

                        {/* Navigation View */}
                        {isNavigating && (
                          <div className="absolute top-24 left-0 w-full px-4">
                            <motion.div 
                              initial={{ y: -20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              className="rounded-2xl bg-slate-900 p-5 text-white shadow-xl"
                            >
                              <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600">
                                  <Navigation size={24} className={navStep === 'to_pickup' ? '' : 'rotate-90'} />
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-500">
                                    {navStep === 'to_pickup' ? 'Heading to pickup' : 'Heading to destination'}
                                  </p>
                                  <h4 className="text-lg font-bold">
                                    {navStep === 'to_pickup' ? 'Bole Medhanialem' : 'Kazanchis'}
                                  </h4>
                                </div>
                                <div className="text-right">
                                  <p className="text-xl font-bold">450m</p>
                                  <p className="text-xs text-slate-400">2 min</p>
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        )}

                        {/* Bottom Stats / Controls */}
                        {!isNavigating && (
                          <div className="absolute bottom-0 w-full p-4">
                            <div className="rounded-3xl bg-white p-6 shadow-2xl">
                              <div className="mb-6 grid grid-cols-3 gap-4 border-b border-slate-100 pb-6">
                                <button onClick={() => setShowEarningsAnalytics(true)} className="text-center transition-transform active:scale-95">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Earnings</p>
                                  <p className="text-lg font-bold text-slate-900">ETB 1,250.00</p>
                                </button>
                                <button onClick={() => setShowEarningsHistory(true)} className="text-center transition-transform active:scale-95">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trips</p>
                                  <p className="text-lg font-bold text-slate-900">8</p>
                                </button>
                                <button onClick={() => setShowPerformance(true)} className="text-center transition-transform active:scale-95">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rating</p>
                                  <p className="text-lg font-bold text-slate-900">4.95</p>
                                </button>
                                <button onClick={() => setShowTiers(true)} className="text-center transition-transform active:scale-95">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tier</p>
                                  <div className="flex items-center justify-center gap-1">
                                    <Award size={14} className="text-emerald-600" />
                                    <p className="text-lg font-bold text-emerald-600">{driverTier}</p>
                                  </div>
                                </button>
                              </div>
                              <div className="mb-6 grid grid-cols-3 gap-2">
                                {[
                                  { icon: BarChart3, label: 'Analytics', onClick: () => setShowEarningsAnalytics(true) },
                                  { icon: Car, label: 'Vehicles', onClick: () => setShowVehicleManagement(true) },
                                  { icon: Flame, label: 'Heatmap', onClick: () => setShowHeatmap(true) },
                                  { icon: Navigation, label: 'Heading Home', onClick: () => setShowDestinationFilter(true), active: !!destinationFilter },
                                  { icon: Settings2, label: 'Maintenance', onClick: () => setShowMaintenanceTracker(true) },
                                  { icon: Award, label: 'Tiers', onClick: () => setShowTiers(true) },
                                ].map((item, i) => (
                                  <button 
                                    key={i} 
                                    onClick={item.onClick}
                                    className={`flex flex-col items-center gap-2 rounded-2xl p-3 transition-all ${item.active ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600'}`}
                                  >
                                    <item.icon size={18} />
                                    <span className="text-[8px] font-bold uppercase tracking-wider">{item.label}</span>
                                  </button>
                                ))}
                              </div>
                              <div className="mb-4 flex gap-2">
                                <button 
                                  onClick={() => setShowEarningsHistory(true)}
                                  className="flex-1 rounded-xl bg-slate-50 py-3 text-xs font-bold text-slate-600"
                                >
                                  Earnings History
                                </button>
                                <button 
                                  onClick={() => {
                                    if (isOnline) {
                                      setIncomingRequest({
                                        pickup: 'Bole Medhanialem',
                                        destination: 'Kazanchis',
                                        earning: 'ETB 180.00'
                                      });
                                      setRequestTimer(15);
                                    }
                                  }}
                                  className={`flex-[2] rounded-xl py-3 text-xs font-bold transition-all ${isOnline ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'bg-slate-100 text-slate-400'}`}
                                >
                                  {isOnline ? 'Simulate Request' : 'Go Online'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Navigation Controls */}
                        {isNavigating && (
                          <div className="absolute bottom-0 w-full p-4">
                            <div className="rounded-3xl bg-white p-6 shadow-2xl">
                              <div className="mb-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="h-12 w-12 rounded-full bg-slate-100 p-1">
                                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Rider" className="rounded-full" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900">Felix M.</p>
                                    <p className="text-xs text-slate-500">4.9 Rating</p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => setShowChat(true)}
                                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-900"
                                  >
                                    <MessageSquare size={20} />
                                  </button>
                                  <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                                    <PhoneCall size={20} />
                                  </button>
                                </div>
                              </div>
                              
                              <button 
                                onClick={() => {
                                  if (navStep === 'to_pickup') {
                                    setNavStep('at_pickup');
                                    setRideStatus('arrived');
                                  } else if (navStep === 'at_pickup') {
                                    setNavStep('to_destination');
                                    setRideStatus('ongoing');
                                  } else {
                                    setIsNavigating(false);
                                    setNavStep(null);
                                    setMode('driver');
                                    setRideStatus('completed');
                                    setShowRating(true);
                                  }
                                }}
                                className="w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-100"
                              >
                                {navStep === 'to_pickup' ? 'I have Arrived' : 
                                 navStep === 'at_pickup' ? 'Start Trip' : 
                                 'Complete Trip'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Incoming Request Overlay */}
                        <AnimatePresence>
                          {incomingRequest && (
                            <motion.div 
                              initial={{ y: '100%' }}
                              animate={{ y: 0 }}
                              exit={{ y: '100%' }}
                              className="absolute inset-x-0 bottom-0 z-[60] rounded-t-[2.5rem] bg-slate-900 p-8 text-white shadow-2xl"
                            >
                              <div className="mb-8 flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-500">New Request</p>
                                  <h3 className="text-2xl font-bold">Incoming Ride</h3>
                                </div>
                                <div className="relative flex h-16 w-16 items-center justify-center">
                                  <svg className="absolute h-full w-full -rotate-90">
                                    <circle 
                                      cx="32" cy="32" r="28" 
                                      stroke="currentColor" strokeWidth="4" fill="transparent"
                                      className="text-slate-800"
                                    />
                                    <motion.circle 
                                      cx="32" cy="32" r="28" 
                                      stroke="currentColor" strokeWidth="4" fill="transparent"
                                      strokeDasharray="176"
                                      animate={{ strokeDashoffset: 176 }}
                                      transition={{ duration: 15, ease: 'linear' }}
                                      className="text-emerald-500"
                                    />
                                  </svg>
                                  <span className="text-xl font-bold">{requestTimer}</span>
                                </div>
                              </div>

                              <div className="mb-8 space-y-6">
                                <div className="flex items-start gap-4">
                                  <div className="mt-1 h-3 w-3 rounded-full bg-emerald-500"></div>
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pickup</p>
                                    <p className="font-bold">{incomingRequest.pickup}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-4">
                                  <div className="mt-1 h-3 w-3 rounded-full bg-slate-500"></div>
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Destination</p>
                                    <p className="font-bold">{incomingRequest.destination}</p>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between rounded-2xl bg-white/5 p-4">
                                  <div className="flex items-center gap-2">
                                    <DollarSign size={20} className="text-emerald-500" />
                                    <span className="font-bold">Estimated Earning</span>
                                  </div>
                                  <span className="text-xl font-bold text-emerald-500">{incomingRequest.earning}</span>
                                </div>
                              </div>

                              <div className="flex gap-4">
                                <button 
                                  onClick={() => setIncomingRequest(null)}
                                  className="flex-1 rounded-2xl bg-white/10 py-4 font-bold text-white"
                                >
                                  Decline
                                </button>
                                <button 
                                  onClick={() => {
                                    setIncomingRequest(null);
                                    setIsNavigating(true);
                                    setNavStep('to_pickup');
                                    setRideStatus('found');
                                  }}
                                  className="flex-1 rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-500/20"
                                >
                                  Accept
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                            <p className="text-[10px] text-emerald-500 font-bold uppercase">Online</p>
                          </div>
                        </div>
                        <button className="rounded-full bg-emerald-100 p-2 text-emerald-600">
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
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm font-medium ${msg.sender === mode ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
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
                              className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:border-emerald-600 hover:text-emerald-600 transition-all"
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
                            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                          />
                          <button 
                            onClick={() => {
                              if (newMessage.trim()) {
                                setChatMessages([...chatMessages, {sender: mode, text: newMessage}]);
                                setNewMessage('');
                              }
                            }}
                            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white"
                          >
                            <ChevronRight size={20} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Profile Modal */}
              <AnimatePresence>
                {showProfile && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => { setShowProfile(false); setIsEditingProfile(false); }}
                      className="absolute inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm"
                    />
                    <motion.div 
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      className="absolute inset-x-0 bottom-0 z-[90] h-3/4 rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
                    >
                      <div className="mb-8 flex items-center justify-between">
                        <h3 className="text-2xl font-bold text-slate-900">Rider Profile</h3>
                        <button 
                          onClick={() => { setShowProfile(false); setIsEditingProfile(false); }} 
                          className="rounded-full bg-slate-100 p-2"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="flex flex-col items-center mb-8">
                        <div className="relative mb-4 h-24 w-24 rounded-full bg-emerald-100 p-1 ring-4 ring-emerald-50">
                          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="rounded-full" />
                        </div>
                        
                        {!isEditingProfile ? (
                          <>
                            <h4 className="text-xl font-bold text-slate-900">{userName}</h4>
                            <p className="text-sm text-slate-500">{userPhone}</p>
                            <button 
                              onClick={() => { setIsEditingProfile(true); setEditName(userName); }}
                              className="mt-4 text-sm font-bold text-emerald-600"
                            >
                              Edit Profile
                            </button>
                          </>
                        ) : (
                          <div className="w-full space-y-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                              <input 
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium outline-none focus:border-emerald-600"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => { setUserName(editName); setIsEditingProfile(false); }}
                                className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white"
                              >
                                Save Changes
                              </button>
                              <button 
                                onClick={() => setIsEditingProfile(false)}
                                className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-6">
                        <div className="h-px bg-slate-100"></div>
                        <div>
                          <p className="mb-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Preferred Language</p>
                          <div className="flex gap-3">
                            {[
                              { code: 'en', label: 'English' },
                              { code: 'am', label: 'አማርኛ' }
                            ].map((lang) => (
                              <button 
                                key={lang.code}
                                onClick={() => setLanguage(lang.code as 'en' | 'am')}
                                className={`flex-1 rounded-2xl border p-4 text-center transition-all ${language === lang.code ? 'border-emerald-600 bg-emerald-50 text-emerald-600' : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'}`}
                              >
                                <span className="block text-sm font-bold">{lang.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Rating Modal */}
              <AnimatePresence>
                {showRating && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-6 backdrop-blur-sm"
                    >
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="w-full max-w-sm rounded-[2.5rem] bg-white p-8 text-center shadow-2xl"
                      >
                        <div className="mb-6 flex justify-center">
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <Star size={40} fill="currentColor" />
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">
                          {mode === 'rider' ? 'How was your ride?' : 'How was the rider?'}
                        </h3>
                        <p className="mt-2 text-slate-500">
                          Your feedback helps us improve the Zeyago experience.
                        </p>
                        
                        <div className="my-8 flex justify-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              onClick={() => setRating(star)}
                              className="transition-transform hover:scale-110"
                            >
                              <Star 
                                size={32} 
                                className={star <= (hoverRating || rating) ? 'text-yellow-400' : 'text-slate-200'} 
                                fill={star <= (hoverRating || rating) ? 'currentColor' : 'none'}
                              />
                            </button>
                          ))}
                        </div>

                        <button 
                          onClick={() => {
                            setShowRating(false);
                            setRating(0);
                          }}
                          disabled={rating === 0}
                          className="w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-100 disabled:opacity-50"
                        >
                          Submit Rating
                        </button>
                        <button 
                          onClick={() => {
                            setShowRating(false);
                            setRating(0);
                          }}
                          className="mt-4 text-sm font-bold text-slate-400"
                        >
                          Skip
                        </button>
                      </motion.div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Earnings History Modal */}
              <AnimatePresence>
                {showEarningsHistory && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowEarningsHistory(false)}
                      className="absolute inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm"
                    />
                    <motion.div 
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      className="absolute inset-x-0 bottom-0 z-[90] h-3/4 rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
                    >
                      <div className="mb-6 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900">Earnings History</h3>
                        <button onClick={() => setShowEarningsHistory(false)} className="rounded-full bg-slate-100 p-2">
                          <X size={20} />
                        </button>
                      </div>
                      
                      <div className="space-y-4 overflow-y-auto pb-8" style={{ maxHeight: 'calc(100% - 60px)' }}>
                        {[
                          { id: 1, time: '14:20', from: 'Bole Medhanialem', to: 'Kazanchis', fare: 'ETB 180.00' },
                          { id: 2, time: '13:45', from: 'Piazza', to: 'Old Airport', fare: 'ETB 210.00' },
                          { id: 3, time: '12:10', from: 'Sarbet', to: 'Megenagna', fare: 'ETB 145.00' },
                          { id: 4, time: '11:30', from: 'CMC', to: 'Bole Atlas', fare: 'ETB 195.00' },
                          { id: 5, time: '10:15', from: 'Gerji', to: 'Meskel Square', fare: 'ETB 120.00' },
                        ].map((trip) => (
                          <div key={trip.id} className="rounded-2xl border border-slate-100 p-4 hover:bg-slate-50 transition-colors">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-400">{trip.time}</span>
                              <span className="text-sm font-bold text-emerald-600">{trip.fare}</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                                <p className="text-xs font-medium text-slate-600">{trip.from}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-slate-300"></div>
                                <p className="text-xs font-medium text-slate-600">{trip.to}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

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
                className="absolute inset-y-0 left-0 z-[70] w-3/4 bg-white p-8"
              >
                <div className="mb-8 flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-emerald-100 p-1 ring-2 ring-emerald-50">
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

                <nav className="space-y-6">
                  <button 
                    onClick={() => { setShowProfile(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-emerald-600 transition-colors"
                  >
                    <User size={20} />
                    <span className="font-bold">Profile</span>
                  </button>
                  <button 
                    onClick={() => { setShowWallet(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-emerald-600 transition-colors"
                  >
                    <Wallet size={20} />
                    <span className="font-bold">Zeyago Wallet</span>
                  </button>
                  <button 
                    onClick={() => { setShowPaymentMethods(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-emerald-600 transition-colors"
                  >
                    <CardIcon size={20} />
                    <span className="font-bold">Payment</span>
                  </button>
                  <button 
                    onClick={() => { setShowNotifications(true); setIsMenuOpen(false); }}
                    className="relative flex w-full items-center gap-4 text-slate-600 hover:text-emerald-600 transition-colors"
                  >
                    <Bell size={20} />
                    <span className="font-bold">Notifications</span>
                    {notifications.some(n => !n.read) && (
                      <span className="absolute left-3 top-0 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                    )}
                  </button>
                  <button 
                    onClick={() => { setShowReferral(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-emerald-600 transition-colors"
                  >
                    <Gift size={20} />
                    <span className="font-bold">Refer & Earn</span>
                  </button>
                  <button 
                    onClick={() => { setShowRewards(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-emerald-600 transition-colors"
                  >
                    <Sparkles size={20} className="text-yellow-500" />
                    <div className="flex flex-1 items-center justify-between">
                      <span className="font-bold">{t('rewards')}</span>
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-700">{zeyagoPoints} {t('points')}</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => { setShowZeyagoPass(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-emerald-600 transition-colors"
                  >
                    <Zap size={20} className="text-emerald-600" />
                    <span className="font-bold">Zeyago Pass</span>
                    {!hasZeyagoPass && (
                      <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[8px] font-bold text-emerald-600">NEW</span>
                    )}
                  </button>
                  <button 
                    onClick={() => { setShowCorporateDashboard(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-emerald-600 transition-colors"
                  >
                    <Building2 size={20} className="text-blue-600" />
                    <span className="font-bold">Corporate Dashboard</span>
                  </button>
                  {[
                    { icon: History, label: t('history') },
                    { icon: Settings, label: 'Settings' },
                  ].map((item, i) => (
                    <button key={i} className="flex w-full items-center gap-4 text-slate-600 hover:text-emerald-600 transition-colors">
                      <item.icon size={20} />
                      <span className="font-bold">{item.label}</span>
                    </button>
                  ))}
                  <button 
                    onClick={() => { setShowFavorites(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-emerald-600 transition-colors"
                  >
                    <Star size={20} />
                    <span className="font-bold">Favorite Places</span>
                  </button>
                  <button 
                    onClick={() => { setShowScheduledRides(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-emerald-600 transition-colors"
                  >
                    <Calendar size={20} />
                    <span className="font-bold">Scheduled Rides</span>
                  </button>
                  <button 
                    onClick={() => { setShowPromos(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-emerald-600 transition-colors"
                  >
                    <Tag size={20} />
                    <span className="font-bold">Promos & Discounts</span>
                  </button>
                  <button 
                    onClick={() => { setShowTrainingAcademy(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-emerald-600 transition-colors"
                  >
                    <Award size={20} />
                    <span className="font-bold">Training Academy</span>
                  </button>
                  <button 
                    onClick={() => { setShowNavSettings(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-emerald-600 transition-colors"
                  >
                    <Navigation size={20} />
                    <span className="font-bold">Navigation Settings</span>
                  </button>
                  <button 
                    onClick={() => { setShowSupport(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-emerald-600 transition-colors"
                  >
                    <HelpCircle size={20} />
                    <span className="font-bold">Support</span>
                  </button>
                  <button 
                    onClick={() => { setShowHelp(true); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-4 text-slate-600 hover:text-emerald-600 transition-colors"
                  >
                    <Info size={20} />
                    <span className="font-bold">About Zeyago</span>
                  </button>
                  <div className="h-px bg-slate-100 my-6"></div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Mode</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setMode('rider'); setIsMenuOpen(false); }}
                        className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${mode === 'rider' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-100'}`}
                      >
                        Rider
                      </button>
                      <button 
                        onClick={() => { setMode('driver'); setIsMenuOpen(false); }}
                        className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${mode === 'driver' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-100'}`}
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
                          className={`rounded-xl py-2 text-[10px] font-bold transition-all ${language === lang.id ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-100'}`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => setStep('welcome')} className="mt-4 flex w-full items-center gap-4 text-red-500">
                    <LogOut size={20} />
                    <span className="font-bold">Logout</span>
                  </button>
                </nav>
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
                className="absolute inset-x-0 bottom-0 z-[130] h-[85%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Zeyago Wallet</h3>
                  <button onClick={() => setShowWallet(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-8 rounded-[2rem] bg-emerald-600 p-8 text-white shadow-xl shadow-emerald-100">
                  <p className="text-sm font-bold uppercase tracking-widest opacity-60">Current Balance</p>
                  <h4 className="mt-2 text-4xl font-black">ETB {walletBalance.toLocaleString()}</h4>
                  <div className="mt-8 flex gap-3">
                    <button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/20 py-3 text-sm font-bold backdrop-blur-md">
                      <Plus size={18} />
                      Top Up
                    </button>
                    <button 
                      onClick={() => setShowPayout(true)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/20 py-3 text-sm font-bold backdrop-blur-md"
                    >
                      <ArrowRight size={18} />
                      Withdraw
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h5 className="text-sm font-bold uppercase tracking-widest text-slate-400">Linked Methods</h5>
                    <button 
                      onClick={() => setShowPaymentMethods(true)}
                      className="text-xs font-bold text-emerald-600"
                    >
                      Manage
                    </button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                    {[
                      { name: 'Telebirr', color: 'bg-blue-600', logo: 'T' },
                      { name: 'CBE Birr', color: 'bg-purple-600', logo: 'C' },
                      { name: 'Visa', color: 'bg-slate-900', logo: 'V' },
                    ].map((method) => (
                      <div key={method.name} className="flex min-w-[120px] flex-col items-center gap-2">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black text-white ${method.color}`}>
                          {method.logo}
                        </div>
                        <span className="text-xs font-bold text-slate-600">{method.name}</span>
                      </div>
                    ))}
                    <button className="flex min-w-[120px] flex-col items-center gap-2">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                        <Plus size={24} />
                      </div>
                      <span className="text-xs font-bold text-slate-400">Add New</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <h5 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Recent Transactions</h5>
                  <div className="space-y-4">
                    {transactions.map((tx) => (
                      <div 
                        key={tx.id} 
                        onClick={() => {
                          if (tx.type === 'ride') {
                            setSelectedTrip(tx);
                            setShowTripDetails(true);
                          }
                        }}
                        className={`flex items-center justify-between rounded-2xl border border-slate-50 p-4 transition-all ${tx.type === 'ride' ? 'cursor-pointer hover:bg-slate-50 active:scale-[0.98]' : ''}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tx.type === 'ride' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {tx.type === 'ride' ? <Car size={20} /> : <Plus size={20} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{tx.title}</p>
                            <p className="text-[10px] text-slate-400">{tx.date}</p>
                          </div>
                        </div>
                        <p className={`font-bold ${tx.amount > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {tx.amount > 0 ? '+' : ''}ETB {Math.abs(tx.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
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
                className="absolute inset-x-0 bottom-0 z-[150] h-[90%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
              >
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Trip Details</h3>
                  <button onClick={() => setShowTripDetails(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                  <div className="mb-6 h-40 w-full rounded-3xl bg-slate-100 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></div>
                        <div className="h-12 w-0.5 border-l-2 border-dashed border-slate-300"></div>
                        <div className="h-3 w-3 rounded-full bg-slate-900 ring-4 ring-slate-100"></div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-8 space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <MapPin size={14} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pickup</p>
                        <p className="text-sm font-bold text-slate-900">{selectedTrip.pickup}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-900">
                        <Navigation size={14} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Destination</p>
                        <p className="text-sm font-bold text-slate-900">{selectedTrip.destination}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-8 rounded-3xl border border-slate-100 p-6">
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-slate-100">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedTrip.driver}`} alt="Driver" className="rounded-full" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{selectedTrip.driver}</p>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Star size={10} className="fill-yellow-400 text-yellow-400" />
                            <span>4.9 Rating</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-900">Toyota Vitz</p>
                        <p className="text-[10px] text-slate-400">AA 2-B12345</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-6">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Distance</p>
                        <p className="text-sm font-bold text-slate-900">{selectedTrip.distance}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Duration</p>
                        <p className="text-sm font-bold text-slate-900">{selectedTrip.duration}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Fare Breakdown</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Base Fare</span>
                        <span className="font-bold text-slate-900">ETB {selectedTrip.baseFare}.00</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Distance ({selectedTrip.distance})</span>
                        <span className="font-bold text-slate-900">ETB {selectedTrip.distanceFare}.00</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Tax & Fees</span>
                        <span className="font-bold text-slate-900">ETB {selectedTrip.tax}.00</span>
                      </div>
                      <div className="mt-4 flex justify-between border-t border-slate-100 pt-4">
                        <span className="font-bold text-slate-900">Total Paid</span>
                        <span className="text-lg font-black text-emerald-600">ETB {Math.abs(selectedTrip.amount)}.00</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowHelp(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-50 py-4 text-sm font-bold text-slate-600"
                  >
                    <HelpCircle size={18} />
                    Report an issue
                  </button>
                </div>
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
                className="absolute inset-x-0 bottom-0 z-[150] h-[80%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
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
                        {method.isDefault && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-emerald-600">Default</span>}
                        <button className="text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => setShowAddPayment(true)}
                  className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-100"
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
                    <button key={method.id} className="flex w-full items-center justify-between rounded-2xl border border-slate-100 p-5 hover:border-emerald-100 hover:bg-emerald-50 transition-all">
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
                className="absolute inset-x-0 bottom-0 z-[150] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
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
                      <Calendar size={20} className="text-emerald-600" />
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
                      <Clock size={20} className="text-emerald-600" />
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
                  onClick={() => {
                    setShowScheduleRide(false);
                    setRideStatus('searching');
                  }}
                  className="mt-8 w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-100"
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
                className="absolute inset-x-0 bottom-0 z-[170] h-[85%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Help & Support</h3>
                  <button onClick={() => setShowHelp(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-8 flex gap-4">
                  <button className="flex flex-1 flex-col items-center gap-3 rounded-3xl bg-emerald-50 p-6 text-emerald-600">
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
                className="absolute inset-x-0 bottom-0 z-[150] h-[90%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Earnings Analytics</h3>
                  <button onClick={() => setShowEarningsAnalytics(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                  <div className="mb-8 grid grid-cols-2 gap-4">
                    <div className="rounded-3xl bg-emerald-50 p-6">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Active Time</p>
                      <p className="text-2xl font-bold text-slate-900">32h 45m</p>
                    </div>
                    <div className="rounded-3xl bg-blue-50 p-6">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Online Time</p>
                      <p className="text-2xl font-bold text-slate-900">45h 20m</p>
                    </div>
                  </div>

                  <div className="mb-8">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">Weekly Performance</h4>
                      <select className="text-xs font-bold text-emerald-600 bg-transparent outline-none">
                        <option>This Week</option>
                        <option>Last Week</option>
                      </select>
                    </div>
                    <div className="flex h-40 items-end justify-between gap-2 rounded-3xl border border-slate-100 p-6">
                      {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                        <div key={i} className="flex flex-1 flex-col items-center gap-2">
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            className={`w-full rounded-t-lg ${h > 70 ? 'bg-emerald-500' : 'bg-emerald-200'}`}
                          />
                          <span className="text-[8px] font-bold text-slate-400">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">Insights</h4>
                    <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
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
                      className="flex w-full items-center justify-between rounded-3xl border-2 border-slate-100 p-6 hover:border-emerald-600 transition-all"
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
                className="absolute inset-x-0 bottom-0 z-[150] h-[85%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">My Vehicles</h3>
                  <button onClick={() => setShowVehicleManagement(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  {driverVehicles.map((v) => (
                    <div 
                      key={v.id} 
                      className={`relative rounded-3xl border p-6 transition-all ${v.status === 'active' ? 'border-emerald-600 bg-emerald-50' : 'border-slate-100 bg-white'}`}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${v.status === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <Car size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{v.model}</p>
                            <p className="text-xs text-slate-500">{v.plate} • {v.color}</p>
                          </div>
                        </div>
                        {v.status === 'active' && (
                          <span className="rounded-full bg-emerald-600 px-3 py-1 text-[8px] font-bold uppercase tracking-wider text-white">Active</span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                        <div className="flex items-center gap-2">
                          <Shield size={14} className={new Date(v.insuranceExpiry) < new Date() ? 'text-red-500' : 'text-emerald-500'} />
                          <span className="text-[10px] font-bold text-slate-400">Insurance: {v.insuranceExpiry}</span>
                        </div>
                        {v.status !== 'active' && (
                          <button 
                            onClick={() => {
                              setDriverVehicles(driverVehicles.map(dv => ({ ...dv, status: dv.id === v.id ? 'active' : 'inactive' })));
                            }}
                            className="text-xs font-bold text-emerald-600"
                          >
                            Switch to this car
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-lg shadow-slate-200">
                  <Plus size={20} />
                  Add New Vehicle
                </button>
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
                className="absolute inset-x-0 bottom-0 z-[150] h-[80%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
              >
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Demand Heatmap</h3>
                  <button onClick={() => setShowHeatmap(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

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
                className="absolute inset-x-0 bottom-0 z-[170] h-[85%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Document Vault</h3>
                  <button onClick={() => setShowDocumentVault(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-6 rounded-3xl bg-emerald-50 p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-900">Compliance Status</p>
                      <p className="text-xs text-emerald-600">3 of 4 documents verified</p>
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
                          <div className="rounded-full bg-emerald-100 p-1 text-emerald-600">
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
                        <button className="text-xs font-bold text-emerald-600">Update</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <Plus size={24} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-bold text-slate-400">Add New Document</p>
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
                className="absolute inset-x-0 bottom-0 z-[190] h-[85%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl overflow-y-auto"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Support</h3>
                  <button onClick={() => { setShowSupport(false); setSupportStep('list'); }} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                {supportStep === 'list' && (
                  <div className="space-y-6">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">Recent Trips</h4>
                    <div className="space-y-4">
                      {transactions.filter(t => t.type === 'ride').map((trip) => (
                        <button 
                          key={trip.id}
                          onClick={() => { setSelectedSupportTrip(trip); setSupportStep('details'); }}
                          className="flex w-full items-center justify-between rounded-2xl border border-slate-100 p-4 hover:border-emerald-600 transition-all"
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
                    <button onClick={() => setSupportStep('list')} className="flex items-center gap-2 text-sm font-bold text-emerald-600">
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
                          className="flex w-full items-center justify-between rounded-2xl border border-slate-100 p-4 text-sm font-bold text-slate-600 hover:border-emerald-600 hover:text-emerald-600 transition-all"
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
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <CheckCircle size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Issue Reported</h3>
                    <p className="mt-2 text-sm text-slate-500">Our support team has received your report and will get back to you within 24 hours.</p>
                    <button 
                      onClick={() => { setShowSupport(false); setSupportStep('list'); }}
                      className="mt-8 w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white"
                    >
                      Done
                    </button>
                  </div>
                )}
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
                className="absolute inset-x-0 bottom-0 z-[270] h-[85%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
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
                          <div className="flex items-center gap-2 text-emerald-600">
                            <Calendar size={16} />
                            <span className="text-sm font-bold">{ride.date} • {ride.time}</span>
                          </div>
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-600 uppercase">Scheduled</span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
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
                className="absolute inset-x-0 bottom-0 z-[290] h-[90%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Training Academy</h3>
                  <button onClick={() => setShowTrainingAcademy(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-8 rounded-3xl bg-emerald-600 p-6 text-white shadow-xl shadow-emerald-100">
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
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${module.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          <module.icon size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{module.title}</p>
                          <p className="text-xs text-slate-500">{module.desc}</p>
                        </div>
                      </div>
                      {module.completed ? (
                        <div className="rounded-full bg-emerald-50 p-1 text-emerald-600">
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
                className="absolute inset-x-0 bottom-0 z-[310] h-[60%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
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
                      className={`flex w-full items-center justify-between rounded-2xl border-2 p-5 transition-all ${navPreference === nav.id ? 'border-emerald-600 bg-emerald-50' : 'border-slate-100 bg-white'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${navPreference === nav.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <nav.icon size={20} />
                        </div>
                        <span className="font-bold text-slate-900">{nav.name}</span>
                      </div>
                      {navPreference === nav.id && (
                        <div className="h-6 w-6 rounded-full bg-emerald-600 p-1 text-white">
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
                className="absolute inset-x-0 bottom-0 z-[210] h-[80%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
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
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
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
                className="absolute inset-x-0 bottom-0 z-[230] h-[85%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
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
                    <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-100 p-4 focus-within:border-emerald-600 transition-all">
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
                          className={`flex items-center gap-3 rounded-2xl border-2 p-4 transition-all ${payoutMethod === method.id ? 'border-emerald-600 bg-emerald-50' : 'border-slate-100 bg-white'}`}
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
                  className="mt-auto w-full rounded-2xl bg-emerald-600 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-100 disabled:opacity-50"
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
                className="absolute inset-x-0 bottom-0 z-[250] h-[80%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
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
                      className="flex-1 rounded-2xl border-2 border-slate-100 p-4 font-bold uppercase outline-none focus:border-emerald-600 transition-all"
                      value={promoCode}
                      onChange={(e) => { setPromoCode(e.target.value); setPromoError(''); }}
                    />
                    <button 
                      onClick={() => {
                        if (promoCode.toUpperCase() === 'ZEYAGO20') {
                          setActivePromo({ code: 'ZEYAGO20', discount: 20 });
                          setPromoCode('');
                          setPromoError('');
                        } else {
                          setPromoError('Invalid promo code');
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
                  <div className="mb-8 rounded-3xl bg-emerald-50 p-6 border-2 border-emerald-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                          <Tag size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-emerald-900">{activePromo.code} Applied</p>
                          <p className="text-xs text-emerald-600">{activePromo.discount}% off your next ride</p>
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
                        className="text-xs font-bold text-emerald-600"
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
                className="absolute inset-x-0 bottom-0 z-[150] h-[90%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Performance</h3>
                  <button onClick={() => setShowPerformance(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar">
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
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                            <c.icon size={20} />
                          </div>
                          <p className="text-[10px] font-bold text-slate-900">{c.label}</p>
                          <p className="text-lg font-black text-emerald-600">{c.count}</p>
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
                className="absolute inset-x-0 bottom-0 z-[150] h-[85%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Notifications</h3>
                  <button onClick={() => setShowNotifications(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`relative rounded-3xl p-5 transition-all ${n.read ? 'bg-slate-50' : 'bg-emerald-50 ring-1 ring-emerald-100'}`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${n.type === 'promo' ? 'bg-emerald-500' : n.type === 'alert' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{n.type}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{n.time}</span>
                      </div>
                      <h4 className="mb-1 font-bold text-slate-900">{n.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">{n.message}</p>
                    </div>
                  ))}
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
                className="absolute inset-x-0 bottom-0 z-[190] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Heading Home</h3>
                  <button onClick={() => setShowDestinationFilter(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-8 flex flex-col items-center text-center">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Navigation size={40} />
                  </div>
                  <h4 className="mb-2 text-xl font-bold text-slate-900">Set Your Destination</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    We'll only show you requests moving towards your destination. You have <span className="font-bold text-emerald-600">{filterUsesLeft} uses</span> left today.
                  </p>
                </div>

                {destinationFilter ? (
                  <div className="mb-8 rounded-3xl bg-emerald-50 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-emerald-600 shadow-sm">
                          <Home size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Filter</p>
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
                        onClick={() => {
                          if (filterUsesLeft > 0) {
                            setDestinationFilter(loc);
                            setFilterUsesLeft(prev => prev - 1);
                            setShowDestinationFilter(false);
                          }
                        }}
                        disabled={filterUsesLeft === 0}
                        className="flex w-full items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-emerald-100 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        <MapPin size={20} className="text-slate-400" />
                        <span className="font-bold text-slate-900">{loc}</span>
                      </button>
                    ))}
                  </div>
                )}

                <button 
                  onClick={() => setShowDestinationFilter(false)}
                  className="w-full rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-lg shadow-slate-200"
                >
                  Close
                </button>
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
                className="absolute inset-x-0 bottom-0 z-[190] h-[90%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Maintenance</h3>
                  <button onClick={() => setShowMaintenanceTracker(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-8 grid grid-cols-2 gap-4">
                  <div className="rounded-3xl bg-slate-50 p-6 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active KM</p>
                    <p className="text-2xl font-black text-slate-900">{activeKm.toLocaleString()}</p>
                  </div>
                  <div className="rounded-3xl bg-emerald-50 p-6 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Next Service</p>
                    <p className="text-2xl font-black text-emerald-600">{(activeKm + 500).toLocaleString()}</p>
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

                <button className="mt-8 w-full rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-lg shadow-slate-200">
                  Add New Log
                </button>
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
                className="absolute inset-x-0 bottom-0 z-[190] h-[85%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Driver Tiers</h3>
                  <button onClick={() => setShowTiers(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-8 flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
                      <Award size={48} />
                    </div>
                    <div className="absolute -bottom-2 -right-2 rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-bold text-white shadow-lg">
                      {driverTier}
                    </div>
                  </div>
                  <h4 className="mb-2 text-2xl font-black text-slate-900">You're a Pro Driver!</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Maintain your 4.9+ rating and low cancellation rate to reach <span className="font-bold text-emerald-600">Elite</span> status.
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
                      className={`rounded-3xl border p-6 transition-all ${t.status === 'active' ? 'border-emerald-600 bg-emerald-50' : 'border-slate-100 bg-white opacity-60'}`}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h5 className="text-lg font-bold text-slate-900">{t.tier}</h5>
                        {t.status === 'active' && <span className="text-xs font-bold text-emerald-600">Current Tier</span>}
                        {t.status === 'locked' && <Lock size={16} className="text-slate-400" />}
                      </div>
                      <div className="space-y-2">
                        {t.benefits.map((b, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <CheckCircle size={14} className={t.status === 'locked' ? 'text-slate-300' : 'text-emerald-500'} />
                            <span className="text-xs text-slate-600">{b}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => setShowTiers(false)}
                  className="mt-8 w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-100"
                >
                  View My Progress
                </button>
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
                className="absolute inset-x-0 bottom-0 z-[190] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Ride Preferences</h3>
                  <button onClick={() => setShowRidePreferences(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  {[
                    { id: 'quietRide', label: 'Quiet Ride', description: 'Prefer a silent journey', icon: MessageSquareOff },
                    { id: 'acOn', label: 'AC On', description: 'Request air conditioning', icon: Wind },
                    { id: 'luggageSpace', label: 'Luggage Space', description: 'Need space for bags', icon: Luggage },
                  ].map((pref) => (
                    <button 
                      key={pref.id}
                      onClick={() => setRidePreferences(prev => ({ ...prev, [pref.id]: !prev[pref.id as keyof typeof prev] }))}
                      className={`flex w-full items-center justify-between rounded-2xl border p-4 transition-all ${ridePreferences[pref.id as keyof typeof ridePreferences] ? 'border-emerald-600 bg-emerald-50' : 'border-slate-100 bg-white'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${ridePreferences[pref.id as keyof typeof ridePreferences] ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <pref.icon size={24} />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-slate-900">{pref.label}</p>
                          <p className="text-xs text-slate-500">{pref.description}</p>
                        </div>
                      </div>
                      <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${ridePreferences[pref.id as keyof typeof ridePreferences] ? 'border-emerald-600 bg-emerald-600' : 'border-slate-200'}`}>
                        {ridePreferences[pref.id as keyof typeof ridePreferences] && <Check size={14} className="text-white" />}
                      </div>
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setShowRidePreferences(false)}
                  className="mt-8 w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-100"
                >
                  Save Preferences
                </button>
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
                className="absolute inset-x-0 bottom-0 z-[190] h-[85%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Zeyago Pass</h3>
                  <button onClick={() => setShowZeyagoPass(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-8 overflow-hidden rounded-3xl bg-emerald-600 p-6 text-white relative">
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
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
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
                  onClick={() => {
                    setHasZeyagoPass(true);
                    setShowZeyagoPass(false);
                    alert('Welcome to Zeyago Pass! Your benefits are now active.');
                  }}
                  className="mt-auto w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-100"
                >
                  {hasZeyagoPass ? 'Manage Subscription' : 'Subscribe Now'}
                </button>
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
                className="absolute inset-x-0 bottom-0 z-[130] h-[90%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl overflow-y-auto"
              >
                <div className="mb-8 flex items-center justify-between">
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
                    onClick={() => setShowCorporateDashboard(false)} 
                    className="rounded-full bg-slate-100 p-2"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Spending Summary */}
                <div className="mb-8 grid grid-cols-2 gap-4">
                  <div className="rounded-3xl bg-slate-50 p-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Team Spending</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">${corporateData.teamSpending.toFixed(2)}</p>
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-600">
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
                      <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                        <Globe size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">@{corporateData.domain}</p>
                        <p className="text-xs text-slate-500">Auto-approve team members</p>
                      </div>
                    </div>
                    <div className="flex h-6 w-12 items-center rounded-full bg-emerald-600 px-1">
                      <div className="h-4 w-4 translate-x-6 rounded-full bg-white"></div>
                    </div>
                  </div>
                </div>

                {/* Team Members */}
                <div className="mb-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">Team Members</h4>
                    <button className="text-xs font-bold text-emerald-600">Add New</button>
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
                            <p className={`text-[10px] font-bold ${invoice.status === 'Paid' ? 'text-emerald-600' : 'text-orange-500'}`}>{invoice.status}</p>
                          </div>
                          <button className="rounded-full bg-slate-50 p-2 text-slate-400">
                            <Download size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button className="w-full rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-lg shadow-slate-200">
                  Export Full Report
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* PIN Verification Modal (Driver) */}
        <AnimatePresence>
          {showPinVerification && (
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
                className="absolute left-1/2 top-1/2 z-[210] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-[2.5rem] bg-white p-8 shadow-2xl"
              >
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
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
                      className="h-14 w-12 rounded-xl border-2 border-slate-100 text-center text-2xl font-black text-slate-900 focus:border-emerald-600 outline-none transition-all"
                    />
                  ))}
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowPinVerification(false)}
                    className="flex-1 rounded-2xl bg-slate-100 py-4 font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      if (enteredPin.join('') === ridePin) {
                        setIsPinVerified(true);
                        setShowPinVerification(false);
                        setNavStep('to_destination');
                        setEnteredPin(['', '', '', '']);
                      } else {
                        alert('Invalid PIN. Please check with the rider.');
                      }
                    }}
                    className="flex-[2] rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-100"
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
                className="absolute inset-x-0 bottom-0 z-[190] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
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
                      className="w-full rounded-2xl border-2 border-slate-100 p-4 text-slate-900 focus:border-emerald-600 outline-none transition-all"
                    />
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
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
                  className="w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-100"
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
                className="absolute inset-x-0 bottom-0 z-[190] h-[85%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
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
                      { title: 'ETB 50 Ride Discount', cost: 350, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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
                className="absolute inset-x-0 bottom-0 z-[190] h-[70%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
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

                <div className="mt-8 rounded-2xl bg-emerald-50 p-4 flex items-center gap-3">
                  <Shield size={20} className="text-emerald-600" />
                  <p className="text-[10px] font-bold text-emerald-800">
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
                className="absolute inset-x-0 bottom-0 z-[150] h-[80%] rounded-t-[2.5rem] bg-white p-8 shadow-2xl"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Refer & Earn</h3>
                  <button onClick={() => setShowReferral(false)} className="rounded-full bg-slate-100 p-2">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Gift size={64} />
                  </div>
                  <h4 className="mb-4 text-2xl font-black text-slate-900">Get ETB 100 Free!</h4>
                  <p className="mb-8 text-sm text-slate-500 leading-relaxed">
                    Invite your friends to Zeyago. When they complete their first ride, you both get ETB 100 in your wallet.
                  </p>

                  <div className="mb-8 w-full rounded-2xl bg-slate-50 p-4 flex items-center justify-between border border-dashed border-slate-200">
                    <span className="font-mono font-bold text-slate-900">ZEYAGO-FELIX-2026</span>
                    <button className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                      <Copy size={16} />
                      Copy
                    </button>
                  </div>

                  <button className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-100">
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
