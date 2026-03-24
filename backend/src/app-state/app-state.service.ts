import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Ride as PrismaRide, RideStatus as DbRideStatus } from '@prisma/client';
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
import { PrismaService } from '../prisma/prisma.service';

/**
 * PostgreSQL-backed app state (Prisma). Method names and return shapes match the former in-memory service.
 */
@Injectable()
export class AppStateService {
  private readonly placeholderDriverId = 'placeholder-driver';

  constructor(private readonly prisma: PrismaService) {}

  /** Timed transitions for single-window demos when `DEMO_AUTO_TRIP_PROGRESS=true` on the Nest process. */
  private scheduleDemoAutoProgressIfEnabled(tripId: string): void {
    if (process.env.DEMO_AUTO_TRIP_PROGRESS !== 'true') return;
    const { toDriverArrived, toInProgress, toCompleted } = DEMO_AUTO_TRIP_PROGRESS_DELAYS_MS;
    const t1 = toDriverArrived;
    const t2 = t1 + toInProgress;
    const t3 = t2 + toCompleted;
    setTimeout(() => {
      void this.arriveAtPickup(tripId).catch(() => undefined);
    }, t1);
    setTimeout(() => {
      void this.startTrip(tripId).catch(() => undefined);
    }, t2);
    setTimeout(() => {
      void this.completeTrip(tripId).catch(() => undefined);
    }, t3);
  }

  async setDriverOnline(online: boolean): Promise<{ online: boolean }> {
    await this.prisma.driver.upsert({
      where: { id: this.placeholderDriverId },
      create: { id: this.placeholderDriverId, online },
      update: { online },
    });
    return { online };
  }

  async createRide(dto: RequestRideDto): Promise<{ ride: RideSummaryDto }> {
    const id = `ride-${Date.now()}`;
    const now = new Date();
    const requestId = `req-${id}`;
    const rideDto: RideSummaryDto = {
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
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      distanceMeters: dto.distanceMeters,
      durationSeconds: dto.durationSeconds,
      fareEstimate: dto.fareEstimate,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.ride.create({ data: this.rideDtoToCreateInput(rideDto) });
      await tx.offer.create({
        data: {
          requestId,
          rideId: id,
          pickup: rideDto.pickup,
          destination: rideDto.destination,
          earning: this.formatEarning(dto.fareEstimate),
        },
      });
    });

    return { ride: rideDto };
  }

  private formatEarning(fare?: FareEstimateDto): string {
    if (fare?.formatted) return fare.formatted;
    if (fare?.amount != null) return `ETB ${Math.round(fare.amount).toFixed(2)}`;
    return 'ETB 180.00';
  }

  private rideDtoToCreateInput(row: RideSummaryDto): Prisma.RideUncheckedCreateInput {
    return {
      id: row.id,
      riderId: row.riderId,
      driverId: row.driverId,
      status: row.status as unknown as DbRideStatus,
      pickup: row.pickup,
      destination: row.destination,
      pickupAddress: row.pickupAddress,
      destinationAddress: row.destinationAddress,
      pickupCoords: row.pickupCoords as unknown as Prisma.InputJsonValue,
      destinationCoords: row.destinationCoords as unknown as Prisma.InputJsonValue,
      stops: row.stops as unknown as Prisma.InputJsonValue,
      vehicleType: row.vehicleType,
      profileType: row.profileType,
      scheduledDate: row.scheduledDate,
      scheduledTime: row.scheduledTime,
      createdAt: new Date(row.createdAt ?? Date.now()),
      updatedAt: new Date(row.updatedAt ?? Date.now()),
      distanceMeters: row.distanceMeters,
      durationSeconds: row.durationSeconds,
      fareEstimate: row.fareEstimate as unknown as Prisma.InputJsonValue,
    };
  }

  private toRideSummaryDto(row: PrismaRide): RideSummaryDto {
    return {
      id: row.id,
      riderId: row.riderId,
      driverId: row.driverId,
      status: row.status as unknown as RideStatus,
      pickup: row.pickup,
      destination: row.destination,
      pickupAddress: row.pickupAddress,
      destinationAddress: row.destinationAddress,
      pickupCoords: (row.pickupCoords as RideSummaryDto['pickupCoords']) ?? null,
      destinationCoords: (row.destinationCoords as RideSummaryDto['destinationCoords']) ?? null,
      stops: (row.stops as unknown as RideSummaryDto['stops']) ?? [],
      vehicleType: row.vehicleType as VehicleType,
      profileType: row.profileType as ProfileType,
      scheduledDate: row.scheduledDate ?? undefined,
      scheduledTime: row.scheduledTime ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      distanceMeters: row.distanceMeters ?? undefined,
      durationSeconds: row.durationSeconds ?? undefined,
      fareEstimate: row.fareEstimate as unknown as FareEstimateDto | undefined,
    };
  }

  async findRideOrThrow(rideId: string): Promise<{ ride: RideSummaryDto }> {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) {
      throw new NotFoundException('ride_not_found');
    }
    return { ride: this.toRideSummaryDto(ride) };
  }

  async cancelRide(
    rideId: string,
    _body?: CancelRideBodyDto,
  ): Promise<{ cancelled: true; ride?: RideSummaryDto }> {
    const existing = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!existing) {
      return { cancelled: true };
    }
    const cancelledSnapshot: RideSummaryDto = {
      ...this.toRideSummaryDto(existing),
      status: RideStatus.Cancelled,
      updatedAt: new Date().toISOString(),
    };
    await this.prisma.ride.delete({ where: { id: rideId } });
    return { cancelled: true, ride: cancelledSnapshot };
  }

  async listIncomingRequests(): Promise<{ requests: DriverIncomingOfferDto[] }> {
    const driverRow = await this.prisma.driver.findUnique({
      where: { id: this.placeholderDriverId },
    });
    if (!driverRow?.online) {
      return { requests: [] };
    }
    const offers = await this.prisma.offer.findMany();
    const rideIds = [...new Set(offers.map((o) => o.rideId).filter(Boolean))] as string[];
    const rides =
      rideIds.length > 0
        ? await this.prisma.ride.findMany({ where: { id: { in: rideIds } } })
        : [];
    const rideById = new Map(rides.map((r) => [r.id, r]));

    const out: DriverIncomingOfferDto[] = [];
    for (const offer of offers) {
      if (!offer.rideId) {
        out.push({
          id: offer.requestId,
          pickup: offer.pickup,
          destination: offer.destination,
          earning: offer.earning,
        });
        continue;
      }
      const r = rideById.get(offer.rideId);
      if (r?.status === DbRideStatus.matching) {
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

  async acceptRequest(
    requestId: string,
    _body: AcceptRideDto,
  ): Promise<{ tripId: string; ride: RideSummaryDto }> {
    const offer = await this.prisma.offer.findUnique({ where: { requestId } });
    if (!offer) {
      throw new NotFoundException('unknown_request');
    }
    const tripId = `trip-${requestId}`;
    const now = new Date();
    const nowIso = now.toISOString();

    if (offer.rideId) {
      const r = await this.prisma.ride.findUnique({ where: { id: offer.rideId } });
      if (!r) {
        throw new NotFoundException('missing_ride');
      }
      await this.prisma.$transaction(async (tx) => {
        await tx.ride.update({
          where: { id: offer.rideId! },
          data: {
            driverId: this.placeholderDriverId,
            status: DbRideStatus.driver_assigned,
            updatedAt: now,
          },
        });
        await tx.offer.delete({ where: { requestId } });
        await tx.trip.create({
          data: {
            id: tripId,
            rideId: offer.rideId!,
            driverId: this.placeholderDriverId,
            startedAt: now,
          },
        });
      });
      const updated = await this.prisma.ride.findUniqueOrThrow({ where: { id: offer.rideId } });
      this.scheduleDemoAutoProgressIfEnabled(tripId);
      return { tripId, ride: this.toRideSummaryDto(updated) };
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
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.ride.create({ data: this.rideDtoToCreateInput(synthetic) });
      await tx.offer.delete({ where: { requestId } });
      await tx.trip.create({
        data: {
          id: tripId,
          rideId: synthetic.id,
          driverId: this.placeholderDriverId,
          startedAt: now,
        },
      });
    });
    this.scheduleDemoAutoProgressIfEnabled(tripId);
    const created = await this.prisma.ride.findUniqueOrThrow({ where: { id: synthetic.id } });
    return { tripId, ride: this.toRideSummaryDto(created) };
  }

  async declineRequest(requestId: string): Promise<{ declined: true }> {
    const offer = await this.prisma.offer.findUnique({ where: { requestId } });
    if (offer?.rideId) {
      const existing = await this.prisma.ride.findUnique({ where: { id: offer.rideId } });
      if (existing) {
        await this.prisma.ride.update({
          where: { id: offer.rideId },
          data: {
            status: DbRideStatus.cancelled,
            updatedAt: new Date(),
          },
        });
      }
    }
    await this.prisma.offer.deleteMany({ where: { requestId } });
    return { declined: true };
  }

  private async updateRideByTripId(
    tripId: string,
    status: RideStatus,
  ): Promise<{ tripId: string; ride: RideSummaryDto }> {
    const t = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!t) {
      throw new NotFoundException('trip_not_found');
    }
    const ride = await this.prisma.ride.findUnique({ where: { id: t.rideId } });
    if (!ride) {
      throw new NotFoundException('trip_not_found');
    }
    const now = new Date();
    await this.prisma.ride.update({
      where: { id: ride.id },
      data: {
        status: status as unknown as DbRideStatus,
        updatedAt: now,
      },
    });
    const updated = await this.prisma.ride.findUniqueOrThrow({ where: { id: ride.id } });
    return { tripId, ride: this.toRideSummaryDto(updated) };
  }

  async arriveAtPickup(tripId: string): Promise<{ trip: { tripId: string; ride: RideSummaryDto } }> {
    const { tripId: tid, ride } = await this.updateRideByTripId(tripId, RideStatus.DriverArrived);
    return { trip: { tripId: tid, ride } };
  }

  async startTrip(tripId: string): Promise<{ trip: { tripId: string; ride: RideSummaryDto } }> {
    const { tripId: tid, ride } = await this.updateRideByTripId(tripId, RideStatus.InProgress);
    return { trip: { tripId: tid, ride } };
  }

  async completeTrip(tripId: string): Promise<{ trip: { tripId: string; ride: RideSummaryDto } }> {
    const { tripId: tid, ride } = await this.updateRideByTripId(tripId, RideStatus.Completed);
    return { trip: { tripId: tid, ride } };
  }

  async getTrip(tripId: string): Promise<{ trip: { tripId: string; ride: RideSummaryDto } }> {
    const t = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!t) {
      throw new NotFoundException('trip_not_found');
    }
    const ride = await this.prisma.ride.findUnique({ where: { id: t.rideId } });
    if (!ride) {
      throw new NotFoundException('trip_not_found');
    }
    return { trip: { tripId, ride: this.toRideSummaryDto(ride) } };
  }

  /**
   * Read-only snapshot for admin dashboard — same persisted state as rider/driver flows.
   */
  async getAdminOverview(): Promise<{
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
  }> {
    const [rides, offers, trips, driverRow] = await Promise.all([
      this.prisma.ride.findMany(),
      this.prisma.offer.findMany(),
      this.prisma.trip.findMany(),
      this.prisma.driver.findUnique({ where: { id: this.placeholderDriverId } }),
    ]);

    const rideDtos = rides.map((r) => this.toRideSummaryDto(r));
    const byStatus: Partial<Record<RideStatus, number>> = {};
    for (const r of rideDtos) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    }
    let completedRevenueEstimate = 0;
    for (const r of rideDtos) {
      if (r.status === RideStatus.Completed && r.fareEstimate?.amount != null) {
        completedRevenueEstimate += r.fareEstimate.amount;
      }
    }

    return {
      driverOnline: driverRow?.online ?? false,
      summary: {
        totalRides: rideDtos.length,
        activeTrips: trips.length,
        pendingOffers: offers.length,
        completedRevenueEstimate: Math.round(completedRevenueEstimate * 100) / 100,
        byStatus,
      },
      rides: rideDtos,
      trips: trips.map((t) => ({
        tripId: t.id,
        rideId: t.rideId,
        startedAt: t.startedAt.getTime(),
      })),
      offers: offers.map((o) => ({
        requestId: o.requestId,
        rideId: o.rideId,
        pickup: o.pickup,
        destination: o.destination,
        earning: o.earning,
      })),
    };
  }
}
