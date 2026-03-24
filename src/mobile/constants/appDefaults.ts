import type { AppNotification } from '../types/mobile';

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 1,
    title: 'New Promo!',
    message: 'Get 20% off your next 3 rides with code ZEYAGO20.',
    type: 'promo',
    time: '2h ago',
    read: false,
  },
  {
    id: 2,
    title: 'Security Alert',
    message: 'Your account was logged in from a new device.',
    type: 'alert',
    time: '5h ago',
    read: true,
  },
  {
    id: 3,
    title: 'Weekly Report',
    message: 'Your weekly earnings report is ready to view.',
    type: 'info',
    time: '1d ago',
    read: true,
  },
];
