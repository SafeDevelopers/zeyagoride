import { Injectable } from '@nestjs/common';
import { AppStateService } from '../app-state/app-state.service';
import { CancelRideBodyDto } from './dto/cancel-ride-body.dto';
import { RequestRideDto } from './dto/request-ride.dto';

@Injectable()
export class RidesService {
  constructor(private readonly appState: AppStateService) {}

  create(dto: RequestRideDto) {
    return this.appState.createRide(dto);
  }

  findOne(rideId: string) {
    return this.appState.findRideOrThrow(rideId);
  }

  cancel(rideId: string, body?: CancelRideBodyDto) {
    return this.appState.cancelRide(rideId, body);
  }
}
