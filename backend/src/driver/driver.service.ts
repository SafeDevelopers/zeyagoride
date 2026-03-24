import { Injectable } from '@nestjs/common';
import { AppStateService } from '../app-state/app-state.service';
import { AcceptRideDto } from './dto/accept-ride.dto';
import { DeclineRideDto } from './dto/decline-ride.dto';

@Injectable()
export class DriverService {
  constructor(private readonly appState: AppStateService) {}

  setAvailability(online: boolean) {
    return this.appState.setDriverOnline(online);
  }

  listIncomingRequests() {
    return this.appState.listIncomingRequests();
  }

  accept(requestId: string, body: AcceptRideDto) {
    return this.appState.acceptRequest(requestId, body);
  }

  decline(requestId: string, _body: DeclineRideDto) {
    return this.appState.declineRequest(requestId);
  }

  getTrip(tripId: string) {
    return this.appState.getTrip(tripId);
  }

  arriveAtPickup(tripId: string) {
    return this.appState.arriveAtPickup(tripId);
  }

  startTrip(tripId: string) {
    return this.appState.startTrip(tripId);
  }

  completeTrip(tripId: string) {
    return this.appState.completeTrip(tripId);
  }
}
