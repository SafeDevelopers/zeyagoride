import { Injectable } from '@nestjs/common';
import { AppStateService } from '../app-state/app-state.service';
import { CancelRideBodyDto } from './dto/cancel-ride-body.dto';
import { RequestRideDto } from './dto/request-ride.dto';

@Injectable()
export class RidesService {
  constructor(private readonly appState: AppStateService) {}

  create(riderId: string, dto: RequestRideDto) {
    return this.appState.createRide(riderId, dto);
  }

  findOne(riderId: string, rideId: string) {
    return this.appState.findRideOrThrow(rideId, riderId);
  }

  cancel(riderId: string, rideId: string, body?: CancelRideBodyDto) {
    return this.appState.cancelRide(rideId, body, riderId);
  }

  listNotifications(riderId: string) {
    return this.appState.listRiderNotifications(riderId);
  }
}
