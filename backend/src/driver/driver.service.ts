import { Injectable } from '@nestjs/common';
import { AppStateService } from '../app-state/app-state.service';
import { AcceptRideDto } from './dto/accept-ride.dto';
import { CompleteTripDto } from './dto/complete-trip.dto';
import { CreateTopUpDto } from './dto/create-top-up.dto';
import { DeclineRideDto } from './dto/decline-ride.dto';
import { MarkNotificationsReadDto } from './dto/mark-notifications-read.dto';
import type { Express } from 'express';

@Injectable()
export class DriverService {
  constructor(private readonly appState: AppStateService) {}

  setAvailability(driverId: string, online: boolean) {
    return this.appState.setDriverOnline(driverId, online);
  }

  getProfile(driverId: string) {
    return this.appState.getDriverProfile(driverId);
  }

  listIncomingRequests(driverId: string) {
    return this.appState.listIncomingRequests(driverId);
  }

  accept(driverId: string, requestId: string, body: AcceptRideDto) {
    return this.appState.acceptRequest(driverId, requestId, body);
  }

  decline(driverId: string, requestId: string, _body: DeclineRideDto) {
    return this.appState.declineRequest(driverId, requestId);
  }

  getTrip(driverId: string, tripId: string) {
    return this.appState.getTrip(tripId, driverId);
  }

  arriveAtPickup(driverId: string, tripId: string) {
    return this.appState.arriveAtPickup(tripId, driverId);
  }

  startTrip(driverId: string, tripId: string) {
    return this.appState.startTrip(tripId, driverId);
  }

  completeTrip(driverId: string, tripId: string, body?: CompleteTripDto) {
    return this.appState.completeTrip(tripId, body, driverId);
  }

  getWallet(driverId: string) {
    return this.appState.getDriverWalletSnapshot(driverId);
  }

  updateVehicle(
    driverId: string,
    body: {
      make: string;
      model: string;
      color: string;
      capacity: number;
      tagNumber: string;
      insuranceExpiry?: string;
    },
  ) {
    return this.appState.upsertDriverVehicle(driverId, body);
  }

  listWalletTransactions(driverId: string) {
    return this.appState.listDriverWalletTransactions(driverId);
  }

  submitTopUp(driverId: string, body: CreateTopUpDto) {
    return this.appState.createDriverTopUpRequest(driverId, body);
  }

  listTopUpRequests(driverId: string) {
    return this.appState.listDriverTopUpRequests(driverId);
  }

  uploadTopUpProof(driverId: string, requestId: string, file: Express.Multer.File) {
    return this.appState.uploadDriverTopUpProof(driverId, requestId, {
      buffer: file.buffer,
      mimetype: file.mimetype,
      size: file.size,
    });
  }

  listNotifications(driverId: string) {
    return this.appState.listDriverNotifications(driverId);
  }

  markNotificationsRead(driverId: string, body: MarkNotificationsReadDto) {
    return this.appState.markDriverNotificationsRead(driverId, body.ids);
  }
}
