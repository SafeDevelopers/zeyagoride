import type { RideStatus as ApiRideStatus } from '../types/api';
import type { RideStatus as RiderUiPhase } from '../types/mobile';

const order: Record<RiderUiPhase, number> = {
  idle: 0,
  searching: 1,
  found: 2,
  arrived: 3,
  ongoing: 4,
  completed: 5,
};

export function mapApiRideStatusToUi(api: ApiRideStatus): RiderUiPhase {
  switch (api) {
    case 'pending':
    case 'matching':
      return 'searching';
    case 'driver_assigned':
      return 'found';
    case 'driver_arrived':
      return 'arrived';
    case 'in_progress':
      return 'ongoing';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'idle';
    default:
      return 'searching';
  }
}

export function maxRiderUiPhase(a: RiderUiPhase, b: RiderUiPhase): RiderUiPhase {
  return order[a] >= order[b] ? a : b;
}
