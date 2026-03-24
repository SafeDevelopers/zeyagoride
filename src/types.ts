export interface User {
  id: string;
  name: string;
  phone: string;
  role: 'rider' | 'driver' | 'admin';
  language: 'en' | 'am';
}

export interface Ride {
  id: string;
  riderId: string;
  driverId?: string;
  pickup: string;
  dropoff: string;
  fare: number;
  status: 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  status: 'online' | 'offline';
  rating: number;
  vehicle: string;
  plate: string;
}
