import { Injectable, NotFoundException } from '@nestjs/common';
import { RideSummaryDto } from '../common/dto/ride-summary.dto';
import { ProfileType } from '../common/enums/profile-type.enum';
import { RideStatus } from '../common/enums/ride-status.enum';
import { VehicleType } from '../common/enums/vehicle-type.enum';
import { DriverIncomingOfferDto } from '../driver/dto/driver-incoming-offer.dto';
import { FareEstimateDto } from '../common/dto/fare-estimate.dto';
import { CancelRideBodyDto } from '../rides/dto/cancel-ride-body.dto';
import { RequestRideDto } from '../rides/dto/request-ride.dto';
import { AcceptRideDto } from '../driver/dto/accept-ride.dto';
import { DEMO_AUTO_TRIP_PROGRESS_DELAYS_MS } from './demo-auto-trip-timing';

type OfferRow = {
  requestId: string;
  rideId: string | null;
  pickup: string;
  destination: string;
  earning: string;
};

/**
 * Single in-memory store for rides, driver offers, and trips (no DB).
 * Keeps rider `POST /rides` and driver matching/accept/decline/trip flows consistent.
 */
@Injectable()
export class AppStateService {
  private readonly rides = new Map<string, RideSummaryDto>();
  private readonly offers = new Map<string, OfferRow>();
  private readonly rideIdToRequestId = new Map<string, string>();
  private readonly trips = new Map<string, { tripId: string; rideId: string; startedAt: number }>();

  private driverOnline = false;

  private readonly placeholderDriverId = 'placeholder-driver';

  /** Timed transitions for single-window demos when `DEMO_AUTO_TRIP_PROGRESS=true` on the Nest process. */
  private scheduleDemoAutoProgressIfEnabled(tripId: string): void {
    if (process.env.DEMO_AUTO_TRIP_PROGRESS !== 'true') return;
    const { toDriverArrived, toInProgress, toCompleted } = DEMO_AUTO_TRIP_PROGRESS_DELAYS_MS;
    const t1 = toDriverArrived;
    const t2 = t1 + toInProgress;
    const t3 = t2 + toCompleted;
    setTimeout(() => {
      try {
        this.arriveAtPickup(tripId);
      } catch {
        /* trip removed or invalid */
      }
    }, t1);
    setTimeout(() => {
      try {
        this.startTrip(tripId);
      } catch {
        /* trip removed or invalid */
      }
    }, t2);
    setTimeout(() => {
      try {
        this.completeTrip(tripId);
      } catch {
        /* trip removed or invalid */
      }
    }, t3);
  }

  setDriverOnline(online: boolean): { online: boolean } {
    this.driverOnline = online;
    return { online };
  }

  createRide(dto: RequestRideDto): { ride: RideSummaryDto } {
    const id = `ride-${Date.now()}`;
    const now = new Date().toISOString();
    const ride: RideSummaryDto = {
      id,
      riderId: 'placeholder-rider',
      driverId: null,
      status: RideStatus.Matching,
      pickup: dto.pickup,
      destination: dto.destination,
      pickupAddress: dto.pickupAddress,
      destinationAddress: dto.destinationAddress,
      pickupCoords: dto.pickupCoords ?? null,
      destinationCoords: dto.destinationCoords ?? null,
      stops: dto.stops ?? [],
      vehicleType: dto.vehicleType,
      profileType: dto.profileType,
      scheduledDate: dto.scheduledDate,
      scheduledTime: dto.scheduledTime,
      createdAt: now,
      updatedAt: now,
      distanceMeters: dto.distanceMeters,
      durationSeconds: dto.durationSeconds,
      fareEstimate: dto.fareEstimate,
    };
    this.rides.set(id, ride);

    const requestId = `req-${id}`;
    const earning = this.formatEarning(dto.fareEstimate);
    this.offers.set(requestId, {
      requestId,
      rideId: id,
      pickup: ride.pickup,
      destination: ride.destination,
      earning,
    });
    this.rideIdToRequestId.set(id, requestId);

    return { ride };
  }

  private formatEarning(fare?: FareEstimateDto): string {
    if (fare?.formatted) return fare.formatted;
    if (fare?.amount != null) return `ETB ${Math.round(fare.amount).toFixed(2)}`;
    return 'ETB 180.00';
  }

  findRideOrThrow(rideId: string): { ride: RideSummaryDto } {
    const ride = this.rides.get(rideId);
    if (!ride) {
      throw new NotFoundException('ride_not_found');
    }
    return { ride };
  }

  cancelRide(rideId: string, _body?: CancelRideBodyDto): { cancelled: true; ride?: RideSummaryDto } {
    const existing = this.rides.get(rideId);
    if (!existing) {
      return { cancelled: true };
    }
    const cancelledSnapshot: RideSummaryDto = {
      ...existing,
      status: RideStatus.Cancelled,
      updatedAt: new Date().toISOString(),
    };

    const reqId = this.rideIdToRequestId.get(rideId);
    if (reqId) {
      this.offers.delete(reqId);
      this.rideIdToRequestId.delete(rideId);
    }
    for (const [tid, tr] of [...this.trips.entries()]) {
      if (tr.rideId === rideId) {
        this.trips.delete(tid);
      }
    }
    this.rides.delete(rideId);

    return { cancelled: true, ride: cancelledSnapshot };
  }

  listIncomingRequests(): { requests: DriverIncomingOfferDto[] } {
    if (!this.driverOnline) {
      return { requests: [] };
    }
    const out: DriverIncomingOfferDto[] = [];
    for (const offer of this.offers.values()) {
      if (!offer.rideId) {
        out.push({
          id: offer.requestId,
          pickup: offer.pickup,
          destination: offer.destination,
          earning: offer.earning,
        });
        continue;
      }
      const r = this.rides.get(offer.rideId);
      if (r?.status === RideStatus.Matching) {
        out.push({
          id: offer.requestId,
          pickup: offer.pickup,
          destination: offer.destination,
          earning: offer.earning,
        });
      }
    }
    return { requests: out };
  }

  acceptRequest(requestId: string, _body: AcceptRideDto): { tripId: string; ride: RideSummaryDto } {
    const offer = this.offers.get(requestId);
    if (!offer) {
      throw new NotFoundException('unknown_request');
    }
    const tripId = `trip-${requestId}`;
    const now = new Date().toISOString();

    if (offer.rideId) {
      const r = this.rides.get(offer.rideId);
      if (!r) {
        throw new NotFoundException('missing_ride');
      }
      const updated: RideSummaryDto = {
        ...r,
        driverId: this.placeholderDriverId,
        status: RideStatus.DriverAssigned,
        updatedAt: now,
      };
      this.rides.set(offer.rideId, updated);
      this.offers.delete(requestId);
      this.rideIdToRequestId.delete(offer.rideId);
      this.trips.set(tripId, { tripId, rideId: offer.rideId, startedAt: Date.now() });
      this.scheduleDemoAutoProgressIfEnabled(tripId);
      return { tripId, ride: updated };
    }

    const synthetic: RideSummaryDto = {
      id: requestId,
      riderId: null,
      driverId: this.placeholderDriverId,
      status: RideStatus.DriverAssigned,
      pickup: offer.pickup,
      destination: offer.destination,
      pickupAddress: offer.pickup,
      destinationAddress: offer.destination,
      pickupCoords: null,
      destinationCoords: null,
      stops: [],
      vehicleType: VehicleType.Economy,
      profileType: ProfileType.Personal,
      createdAt: now,
      updatedAt: now,
    };
    this.rides.set(synthetic.id, synthetic);
    this.offers.delete(requestId);
    this.trips.set(tripId, { tripId, rideId: synthetic.id, startedAt: Date.now() });
    this.scheduleDemoAutoProgressIfEnabled(tripId);
    return { tripId, ride: synthetic };
  }

  declineRequest(requestId: string): { declined: true } {
    const offer = this.offers.get(requestId);
    if (offer?.rideId) {
      const existing = this.rides.get(offer.rideId);
      if (existing) {
        const cancelled: RideSummaryDto = {
          ...existing,
          status: RideStatus.Cancelled,
          updatedAt: new Date().toISOString(),
        };
        this.rides.set(offer.rideId, cancelled);
      }
      this.rideIdToRequestId.delete(offer.rideId);
    }
    this.offers.delete(requestId);
    return { declined: true };
  }

  private updateRideByTripId(tripId: string, status: RideStatus): { tripId: string; ride: RideSummaryDto } {
    const t = this.trips.get(tripId);
    if (!t) {
      throw new NotFoundException('trip_not_found');
    }
    const ride = this.rides.get(t.rideId);
    if (!ride) {
      throw new NotFoundException('trip_not_found');
    }
    const updated: RideSummaryDto = {
      ...ride,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.rides.set(t.rideId, updated);
    return { tripId, ride: updated };
  }

  arriveAtPickup(tripId: string): { trip: { tripId: string; ride: RideSummaryDto } } {
    const { tripId: tid, ride } = this.updateRideByTripId(tripId, RideStatus.DriverArrived);
    return { trip: { tripId: tid, ride } };
  }

  startTrip(tripId: string): { trip: { tripId: string; ride: RideSummaryDto } } {
    const { tripId: tid, ride } = this.updateRideByTripId(tripId, RideStatus.InProgress);
    return { trip: { tripId: tid, ride } };
  }

  completeTrip(tripId: string): { trip: { tripId: string; ride: RideSummaryDto } } {
    const { tripId: tid, ride } = this.updateRideByTripId(tripId, RideStatus.Completed);
    return { trip: { tripId: tid, ride } };
  }

  getTrip(tripId: string): { trip: { tripId: string; ride: RideSummaryDto } } {
    const t = this.trips.get(tripId);
    if (!t) {
      throw new NotFoundException('trip_not_found');
    }
    const ride = this.rides.get(t.rideId);
    if (!ride) {
      throw new NotFoundException('trip_not_found');
    }
    return { trip: { tripId, ride } };
  }

  /**
   * Read-only snapshot for admin dashboard — same in-memory state as rider/driver flows.
   * No separate admin data model.
   */
  getAdminOverview(): {
    driverOnline: boolean;
    summary: {
      totalRides: number;
      activeTrips: number;
      pendingOffers: number;
      completedRevenueEstimate: number;
      byStatus: Partial<Record<RideStatus, number>>;
    };
    rides: RideSummaryDto[];
    trips: Array<{ tripId: string; rideId: string; startedAt: number }>;
    offers: Array<{
      requestId: string;
      rideId: string | null;
      pickup: string;
      destination: string;
      earning: string;
    }>;
  } {
    const rides = [...this.rides.values()];
    const byStatus: Partial<Record<RideStatus, number>> = {};
    for (const r of rides) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    }
    let completedRevenueEstimate = 0;
    for (const r of rides) {
      if (r.status === RideStatus.Completed && r.fareEstimate?.amount != null) {
        completedRevenueEstimate += r.fareEstimate.amount;
      }
    }
    return {
      driverOnline: this.driverOnline,
      summary: {
        totalRides: rides.length,
        activeTrips: this.trips.size,
        pendingOffers: this.offers.size,
        completedRevenueEstimate: Math.round(completedRevenueEstimate * 100) / 100,
        byStatus,
      },
      rides,
      trips: [...this.trips.values()],
      offers: [...this.offers.values()],
    };
  }
}
