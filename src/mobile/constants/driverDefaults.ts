import { Award, FileText, MessageCircle, Navigation, Shield, Sparkles, Star, Smartphone } from 'lucide-react';
import { CreditCard as CardIcon } from 'lucide-react';
import type { Compliment, DriverDocument, DriverVehicle, MaintenanceLog, TrainingModule } from '../types/mobile';

export const INITIAL_MAINTENANCE_LOGS: MaintenanceLog[] = [
  { id: '1', type: 'fuel', amount: '1200', date: '2026-03-19', km: '12450' },
  { id: '2', type: 'oil', amount: '3500', date: '2026-03-10', km: '12000' },
];

export const INITIAL_TRAINING_MODULES: TrainingModule[] = [
  {
    id: '1',
    title: 'Safety Standards',
    desc: 'Learn about our core safety protocols.',
    completed: true,
    icon: Shield,
  },
  {
    id: '2',
    title: 'Customer Service',
    desc: 'How to provide a 5-star experience.',
    completed: false,
    icon: Star,
  },
  {
    id: '3',
    title: 'App Mastery',
    desc: 'Advanced features of the Zeyago Driver app.',
    completed: false,
    icon: Smartphone,
  },
];

export const INITIAL_DRIVER_DOCUMENTS: DriverDocument[] = [
  { id: 'license', title: 'Driving License', status: 'verified', expiry: '2028-05-20', icon: CardIcon },
  { id: 'bollo', title: 'Vehicle Bollo', status: 'expiring_soon', expiry: '2026-04-15', icon: FileText },
  { id: 'insurance', title: 'Insurance Policy', status: 'verified', expiry: '2026-11-30', icon: Shield },
  { id: 'cert', title: 'Zeyago Certification', status: 'pending', expiry: 'N/A', icon: Award },
];

export const INITIAL_DRIVER_VEHICLES: DriverVehicle[] = [
  {
    id: '1',
    model: 'Toyota Vitz',
    plate: 'AA 2-B12345',
    color: 'Silver',
    status: 'active',
    insuranceExpiry: '2026-12-15',
  },
  {
    id: '2',
    model: 'Hyundai Atos',
    plate: 'AA 2-A98765',
    color: 'White',
    status: 'inactive',
    insuranceExpiry: '2026-08-20',
  },
];

export const INITIAL_COMPLIMENTS: Compliment[] = [
  { id: 1, label: 'Great Conversation', count: 42, icon: MessageCircle },
  { id: 2, label: 'Clean Car', count: 38, icon: Sparkles },
  { id: 3, label: 'Expert Navigation', count: 25, icon: Navigation },
  { id: 4, label: 'Safe Driving', count: 56, icon: Shield },
];
