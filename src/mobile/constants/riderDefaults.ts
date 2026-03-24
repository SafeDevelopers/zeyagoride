import { Briefcase, Home } from 'lucide-react';
import { DEMO_COORD_BOLE_MEDHANIALEM, DEMO_COORD_KAZANCHIS } from '../rider/demoPlaceCoords';
import type { ActiveDriverInfo, CorporateData, FavoritePlace, ScheduledRide, WalletTransaction } from '../types/mobile';

export const INITIAL_ACTIVE_DRIVER: ActiveDriverInfo = {
  name: 'Abebe B.',
  car: 'Toyota Vitz',
  plate: 'AA 2-B12345',
  rating: 4.8,
  eta: '4 min',
  image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Abebe',
};

export const INITIAL_WALLET_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 1,
    type: 'ride',
    amount: -120,
    date: 'Today, 10:30 AM',
    title: 'Ride to Bole',
    pickup: 'Kazanchis',
    destination: 'Bole Medhanialem',
    driver: 'Abebe B.',
    distance: '4.2 km',
    duration: '12 min',
    baseFare: 50,
    distanceFare: 60,
    tax: 10,
  },
  { id: 2, type: 'topup', amount: 500, date: 'Yesterday, 4:15 PM', title: 'Telebirr Top-up' },
  {
    id: 3,
    type: 'ride',
    amount: -180,
    date: 'Mar 19, 2:00 PM',
    title: 'Ride to Kazanchis',
    pickup: 'Piazza',
    destination: 'Kazanchis',
    driver: 'Samuel K.',
    distance: '6.5 km',
    duration: '18 min',
    baseFare: 50,
    distanceFare: 110,
    tax: 20,
  },
];

export const INITIAL_SCHEDULED_RIDES: ScheduledRide[] = [
  {
    id: '1',
    pickup: 'Bole Airport',
    destination: 'Sheraton Addis',
    date: 'Mar 22, 2026',
    time: '10:00 AM',
    status: 'scheduled',
  },
  {
    id: '2',
    pickup: 'Kazanchis',
    destination: 'CMC',
    date: 'Mar 25, 2026',
    time: '08:30 AM',
    status: 'scheduled',
  },
];

export const INITIAL_FAVORITES: FavoritePlace[] = [
  { id: '1', name: 'Home', address: 'Bole, Near Medhanialem', icon: Home, coords: DEMO_COORD_BOLE_MEDHANIALEM },
  { id: '2', name: 'Work', address: 'Kazanchis, Nani Building', icon: Briefcase, coords: DEMO_COORD_KAZANCHIS },
];

export const INITIAL_CORPORATE_DATA: CorporateData = {
  companyName: 'Zeyago Tech Solutions',
  domain: 'zeyago.com',
  teamSpending: 1240.5,
  activeMembers: 12,
  pendingInvoices: 2,
  invoices: [
    { id: 'INV-001', date: 'Mar 01, 2026', amount: 850.2, status: 'Paid' },
    { id: 'INV-002', date: 'Feb 01, 2026', amount: 720.45, status: 'Paid' },
    { id: 'INV-003', date: 'Apr 01, 2026', amount: 1240.5, status: 'Pending' },
  ],
  teamMembers: [
    { id: 1, name: 'Felix M.', email: 'felix@zeyago.com', rides: 14, spending: 240.5 },
    { id: 2, name: 'Abebe B.', email: 'abebe@zeyago.com', rides: 8, spending: 180.0 },
    { id: 3, name: 'Sara K.', email: 'sara@zeyago.com', rides: 22, spending: 420.0 },
  ],
};
