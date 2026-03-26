import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DriverNotificationType,
  PaymentStatus,
  Prisma,
  Ride as PrismaRide,
  RidePaymentMethod,
  RiderNotificationType,
  RideStatus as DbRideStatus,
  TopUpMethod,
  VehicleApprovalStatus,
  WalletTransactionType,
} from '@prisma/client';
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
import { PaymentProviderService } from '../payments/payment-provider.service';
import { StorageService } from '../storage/storage.service';
import { NotificationService } from '../notifications/notification.service';
import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { SessionUserDto } from '../common/dto/session-user.dto';
import { SessionUserRole } from '../common/enums/session-user-role.enum';
import { StructuredLogger } from '../common/logging/structured-logger';

type PricingSettings = {
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minimumFare: number;
  cancellationFee: number;
};

type PromoSettings = {
  enabled: boolean;
  code: string;
  discountType: 'fixed' | 'percent';
  discountAmount: number;
  active: boolean;
};

/** Persisted platform take on completed trip fare (`commissionRate` = whole percent, e.g. 5 for 5%). */
type CommissionSettings = {
  commissionType: 'percent';
  commissionRate: number;
};

const VEHICLE_RATE_MULTIPLIER: Record<VehicleType, number> = {
  [VehicleType.Economy]: 1,
  [VehicleType.Basic]: 1.18,
  [VehicleType.Classic]: 1.36,
  [VehicleType.Electric]: 1.45,
  [VehicleType.Minivan]: 2,
  [VehicleType.Executive]: 2.55,
  [VehicleType.Hourly]: 0,
};

/**
 * PostgreSQL-backed app state (Prisma). Method names and return shapes match the former in-memory service.
 */
@Injectable()
export class AppStateService {
  private readonly logger = new StructuredLogger(AppStateService.name);
  private readonly placeholderDriverId = 'placeholder-driver';
  private readonly requireRideSafetyPinKey = 'requireRideSafetyPin';
  private readonly demoAutoTripProgressionKey = 'demoAutoTripProgression';
  private readonly pricingSettingsKey = 'pricingSettings';
  private readonly promoSettingsKey = 'promoSettings';
  private readonly commissionSettingsKey = 'commissionSettings';

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentProvider: PaymentProviderService,
    private readonly walletService: WalletService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationService,
    private readonly auditService: AuditService,
  ) {}

  private async ensurePlaceholderDriverRecord(): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: this.placeholderDriverId },
      create: {
        id: this.placeholderDriverId,
        role: 'driver',
        name: 'Demo Driver',
        phone: '+251 911 223344',
      },
      update: {},
    });
    await this.prisma.driver.upsert({
      where: { id: this.placeholderDriverId },
      create: {
        id: this.placeholderDriverId,
        online: false,
        isVerified: false,
        verificationStatus: 'pending',
      },
      update: {},
    });
    await this.prisma.driverVehicle.upsert({
      where: { driverId: this.placeholderDriverId },
      create: {
        driverId: this.placeholderDriverId,
        make: 'Toyota',
        model: 'Vitz',
        color: 'Silver',
        capacity: 4,
        tagNumber: 'AA-12345',
        insuranceExpiry: '2027-12-31',
        status: VehicleApprovalStatus.approved,
      },
      update: {
        status: VehicleApprovalStatus.approved,
      },
    });
    await this.walletService.ensureWallet(this.placeholderDriverId);
  }

  private async getDriverOnlineBlockingReasons(driverId: string): Promise<string[]> {
    const [driver, vehicle, wallet] = await Promise.all([
      this.prisma.driver.findUnique({ where: { id: driverId } }),
      this.prisma.driverVehicle.findUnique({ where: { driverId } }),
      this.prisma.driverWallet.findUnique({ where: { driverId } }),
    ]);
    const reasons: string[] = [];
    if (!driver || !driver.isVerified || driver.verificationStatus !== 'approved') {
      reasons.push('driver_account_not_approved');
    }
    if (!vehicle) {
      reasons.push('vehicle_missing');
    } else if (vehicle.status !== VehicleApprovalStatus.approved) {
      reasons.push(
        vehicle.status === VehicleApprovalStatus.rejected
          ? 'vehicle_rejected'
          : 'vehicle_pending_approval',
      );
    }
    if (wallet && !this.walletService.isEligibleForNewRides(wallet.balance, wallet.minBalance)) {
      reasons.push('wallet_below_minimum');
    }
    return reasons;
  }

  private async getBooleanAppSetting(
    key: string,
    fallback: boolean,
  ): Promise<boolean> {
    const row = await this.prisma.appSetting.upsert({
      where: { key },
      create: { key, booleanValue: fallback },
      update: {},
    });
    return row.booleanValue ?? fallback;
  }

  private async getJsonAppSetting<T extends object>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.appSetting.upsert({
      where: { key },
      create: { key, jsonValue: fallback as unknown as Prisma.InputJsonValue },
      update: {},
    });
    return (row.jsonValue as T | null) ?? fallback;
  }

  private async setJsonAppSetting<T extends object>(key: string, value: T): Promise<T> {
    await this.prisma.appSetting.upsert({
      where: { key },
      create: { key, jsonValue: value as unknown as Prisma.InputJsonValue },
      update: { jsonValue: value as unknown as Prisma.InputJsonValue },
    });
    return value;
  }

  private getDefaultPricingSettings(): PricingSettings {
    return {
      baseFare: 35,
      perKmRate: 11,
      perMinuteRate: 2,
      minimumFare: 25,
      cancellationFee: 20,
    };
  }

  private getDefaultPromoSettings(): PromoSettings {
    return {
      enabled: true,
      code: 'ZEYAGO20',
      discountType: 'percent',
      discountAmount: 20,
      active: true,
    };
  }

  private getDefaultCommissionSettings(): CommissionSettings {
    return { commissionType: 'percent', commissionRate: 5 };
  }

  private normalizeCommissionSettings(
    raw: Partial<CommissionSettings> | CommissionSettings,
  ): CommissionSettings {
    const base = this.getDefaultCommissionSettings();
    const commissionType = raw.commissionType === 'percent' ? 'percent' : base.commissionType;
    let commissionRate =
      typeof raw.commissionRate === 'number' && Number.isFinite(raw.commissionRate)
        ? raw.commissionRate
        : base.commissionRate;
    commissionRate = Math.min(100, Math.max(0, commissionRate));
    return { commissionType, commissionRate };
  }

  private commissionPercentToDecimal(settings: CommissionSettings): number {
    if (settings.commissionType !== 'percent') return 0;
    return Math.min(1, Math.max(0, settings.commissionRate / 100));
  }

  async getCommissionSettings(): Promise<CommissionSettings> {
    const row = await this.prisma.appSetting.findUnique({
      where: { key: this.commissionSettingsKey },
    });
    if (!row?.jsonValue || typeof row.jsonValue !== 'object' || row.jsonValue === null) {
      return this.getDefaultCommissionSettings();
    }
    return this.normalizeCommissionSettings(row.jsonValue as Partial<CommissionSettings>);
  }

  async updateCommissionSettings(
    input: Partial<CommissionSettings>,
    actor?: SessionUserDto,
  ): Promise<CommissionSettings> {
    const current = await this.getCommissionSettings();
    const next = this.normalizeCommissionSettings({ ...current, ...input });
    await this.prisma.$transaction(async (tx) => {
      await tx.appSetting.upsert({
        where: { key: this.commissionSettingsKey },
        create: {
          key: this.commissionSettingsKey,
          jsonValue: next as unknown as Prisma.InputJsonValue,
        },
        update: { jsonValue: next as unknown as Prisma.InputJsonValue },
      });
      if (actor?.role === SessionUserRole.Admin) {
        await this.auditService.recordAdminAction(tx, {
          actor,
          action: 'commission.updated',
          targetType: 'app_setting',
          targetId: this.commissionSettingsKey,
          metadata: {
            previous: current,
            next,
          } as Prisma.InputJsonValue,
        });
      }
    });
    return next;
  }

  private formatFare(amount: number): string {
    return `ETB ${amount.toLocaleString('en-US')}`;
  }

  private async buildAuthoritativeFare(dto: RequestRideDto): Promise<FareEstimateDto> {
    const pricing = await this.getPricingSettings();
    const promo = await this.getPromoSettings();
    const requestedPromoCode = dto.promoCode?.trim().toUpperCase();
    const configuredPromoCode = promo.code.trim().toUpperCase();

    let originalFare = 0;
    if (dto.vehicleType === VehicleType.Hourly) {
      originalFare = 800;
    } else {
      const km = (dto.distanceMeters ?? 0) / 1000;
      const minutes = (dto.durationSeconds ?? 0) / 60;
      const multiplier = VEHICLE_RATE_MULTIPLIER[dto.vehicleType] ?? 1;
      const raw =
        (pricing.baseFare + km * pricing.perKmRate + minutes * pricing.perMinuteRate) *
        multiplier;
      originalFare = Math.max(
        Math.round(pricing.minimumFare * multiplier),
        Math.round(raw / 5) * 5,
      );
    }

    let discountAmount = 0;
    let promoCode = '';
    if (
      requestedPromoCode &&
      promo.enabled &&
      promo.active &&
      requestedPromoCode === configuredPromoCode
    ) {
      discountAmount =
        promo.discountType === 'fixed'
          ? Math.min(originalFare, Math.max(0, Math.round(promo.discountAmount)))
          : Math.min(originalFare, Math.round((originalFare * promo.discountAmount) / 100));
      promoCode = promo.code;
    }

    const finalFare = Math.max(0, originalFare - discountAmount);
    return {
      currency: 'ETB',
      amount: finalFare,
      formatted: this.formatFare(finalFare),
      originalFare,
      discountAmount,
      finalFare,
      promoCode,
    };
  }

  async getAppSettings(): Promise<{
    requireRideSafetyPin: boolean;
    demoAutoTripProgression: boolean;
    pricing: PricingSettings;
    promo: PromoSettings;
    commission: CommissionSettings;
  }> {
    return {
      requireRideSafetyPin: await this.getBooleanAppSetting(
        this.requireRideSafetyPinKey,
        true,
      ),
      demoAutoTripProgression: await this.getBooleanAppSetting(
        this.demoAutoTripProgressionKey,
        process.env.DEMO_AUTO_TRIP_PROGRESS === 'true',
      ),
      pricing: await this.getPricingSettings(),
      promo: await this.getPromoSettings(),
      commission: await this.getCommissionSettings(),
    };
  }

  async updateAppSettings(input: {
    requireRideSafetyPin?: boolean;
    demoAutoTripProgression?: boolean;
  }, actor?: SessionUserDto): Promise<{
    requireRideSafetyPin: boolean;
    demoAutoTripProgression: boolean;
    pricing: PricingSettings;
    promo: PromoSettings;
    commission: CommissionSettings;
  }> {
    const previous = await this.getAppSettings();
    await this.prisma.$transaction(async (tx) => {
      if (typeof input.requireRideSafetyPin === 'boolean') {
        await tx.appSetting.upsert({
          where: { key: this.requireRideSafetyPinKey },
          create: {
            key: this.requireRideSafetyPinKey,
            booleanValue: input.requireRideSafetyPin,
          },
          update: {
            booleanValue: input.requireRideSafetyPin,
          },
        });
      }
      if (typeof input.demoAutoTripProgression === 'boolean') {
        await tx.appSetting.upsert({
          where: { key: this.demoAutoTripProgressionKey },
          create: {
            key: this.demoAutoTripProgressionKey,
            booleanValue: input.demoAutoTripProgression,
          },
          update: {
            booleanValue: input.demoAutoTripProgression,
          },
        });
      }
      if (actor?.role === SessionUserRole.Admin) {
        await this.auditService.recordAdminAction(tx, {
          actor,
          action: 'settings.updated',
          targetType: 'app_settings',
          metadata: {
            previous,
            patch: input,
          } as Prisma.InputJsonValue,
        });
      }
    });
    return this.getAppSettings();
  }

  async getPricingSettings(): Promise<PricingSettings> {
    return this.getJsonAppSetting<PricingSettings>(
      this.pricingSettingsKey,
      this.getDefaultPricingSettings(),
    );
  }

  async updatePricingSettings(
    input: Partial<PricingSettings>,
    actor?: SessionUserDto,
  ): Promise<PricingSettings> {
    const current = await this.getPricingSettings();
    const next: PricingSettings = {
      ...current,
      ...input,
    };
    await this.setJsonAppSetting(this.pricingSettingsKey, next);
    if (actor?.role === SessionUserRole.Admin) {
      await this.auditService.recordAdminAction(this.prisma, {
        actor,
        action: 'pricing.updated',
        targetType: 'app_setting',
        targetId: this.pricingSettingsKey,
        metadata: { previous: current, next } as Prisma.InputJsonValue,
      });
    }
    return next;
  }

  async getPromoSettings(): Promise<PromoSettings> {
    return this.getJsonAppSetting<PromoSettings>(
      this.promoSettingsKey,
      this.getDefaultPromoSettings(),
    );
  }

  async updatePromoSettings(
    input: Partial<PromoSettings>,
    actor?: SessionUserDto,
  ): Promise<PromoSettings> {
    const current = await this.getPromoSettings();
    const next: PromoSettings = {
      ...current,
      ...input,
      discountType: input.discountType === 'fixed' ? 'fixed' : input.discountType === 'percent' ? 'percent' : current.discountType,
    };
    await this.setJsonAppSetting(this.promoSettingsKey, next);
    if (actor?.role === SessionUserRole.Admin) {
      await this.auditService.recordAdminAction(this.prisma, {
        actor,
        action: 'promo.updated',
        targetType: 'app_setting',
        targetId: this.promoSettingsKey,
        metadata: { previous: current, next } as Prisma.InputJsonValue,
      });
    }
    return next;
  }

  /** Timed transitions for single-window demos when admin settings enable auto trip progress. */
  private async scheduleDemoAutoProgressIfEnabled(tripId: string): Promise<void> {
    const enabled = await this.getBooleanAppSetting(
      this.demoAutoTripProgressionKey,
      process.env.DEMO_AUTO_TRIP_PROGRESS === 'true',
    );
    if (!enabled) return;
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

  async setDriverOnline(driverId: string, online: boolean): Promise<{ online: boolean }> {
    await this.walletService.ensureWallet(driverId);
    if (online) {
      const blockingReasons = await this.getDriverOnlineBlockingReasons(driverId);
      if (blockingReasons.length > 0) {
        throw new ForbiddenException(blockingReasons[0]);
      }
    }
    await this.prisma.driver.upsert({
      where: { id: driverId },
      create: {
        id: driverId,
        online,
        isVerified: false,
        verificationStatus: 'pending',
      },
      update: { online },
    });
    this.logger.log('driver.availability_updated', { driverId, online });
    return { online };
  }

  async getDriverProfile(driverId = this.placeholderDriverId): Promise<{
    id: string;
    userId: string;
    name: string | null;
    phone: string | null;
    online: boolean;
    isVerified: boolean;
    verificationStatus: string;
    vehicle: null | {
      id: string;
      make: string;
      model: string;
      color: string;
      capacity: number;
      tagNumber: string;
      insuranceExpiry: string | null;
      status: string;
      rejectionReason: string | null;
    };
    canGoOnline: boolean;
    onlineBlockingReasons: string[];
    activeTripCount: number;
    walletBalance: number;
    walletMinBalance: number;
    walletWarningThreshold: number;
    walletBlocked: boolean;
    walletBelowWarning: boolean;
  }> {
    await this.ensurePlaceholderDriverRecord();
    const [driver, user, rides, vehicle] = await Promise.all([
      this.prisma.driver.findUnique({ where: { id: driverId } }),
      this.prisma.user.findUnique({ where: { id: driverId } }),
      this.prisma.ride.findMany({
        where: {
          driverId,
          status: {
            in: [
              DbRideStatus.driver_assigned,
              DbRideStatus.driver_arrived,
              DbRideStatus.in_progress,
            ],
          },
        },
      }),
      this.prisma.driverVehicle.findUnique({ where: { driverId } }),
    ]);
    if (!driver) {
      throw new NotFoundException('driver_not_found');
    }
    await this.walletService.ensureWallet(driverId);
    const walletRow = await this.prisma.driverWallet.findUniqueOrThrow({
      where: { driverId },
    });
    const balance = walletRow.balance;
    const minB = walletRow?.minBalance ?? 0;
    const warn = walletRow?.warningThreshold ?? 0;
    const walletBlocked = !this.walletService.isEligibleForNewRides(balance, minB);
    const walletBelowWarning = this.walletService.isBelowWarningThreshold(balance, warn);
    const onlineBlockingReasons = await this.getDriverOnlineBlockingReasons(driverId);
    return {
      id: driver.id,
      userId: driver.id,
      name: user?.name ?? null,
      phone: user?.phone ?? null,
      online: driver.online,
      isVerified: driver.isVerified,
      verificationStatus: driver.verificationStatus,
      vehicle: vehicle
        ? {
            id: vehicle.id,
            make: vehicle.make,
            model: vehicle.model,
            color: vehicle.color,
            capacity: vehicle.capacity,
            tagNumber: vehicle.tagNumber,
            insuranceExpiry: vehicle.insuranceExpiry ?? null,
            status: vehicle.status,
            rejectionReason: vehicle.rejectionReason ?? null,
          }
        : null,
      canGoOnline: onlineBlockingReasons.length === 0,
      onlineBlockingReasons,
      activeTripCount: rides.length,
      walletBalance: balance,
      walletMinBalance: minB,
      walletWarningThreshold: warn,
      walletBlocked,
      walletBelowWarning,
    };
  }

  async createRide(riderId: string, dto: RequestRideDto): Promise<{ ride: RideSummaryDto }> {
    const id = `ride-${Date.now()}`;
    const paymentId = `pay-${id}`;
    const now = new Date();
    const requestId = `req-${id}`;
    const authoritativeFare = await this.buildAuthoritativeFare(dto);
    const payment = await this.paymentProvider.prepareRidePayment({
      rideId: id,
      amount: authoritativeFare.finalFare,
      currency: authoritativeFare.currency,
    });
    const rideDto: RideSummaryDto = {
      id,
      riderId,
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
      originalFare: authoritativeFare.originalFare,
      discountAmount: authoritativeFare.discountAmount,
      finalFare: authoritativeFare.finalFare,
      promoCode: authoritativeFare.promoCode || null,
      paymentStatus: payment.status,
      paymentId,
      fareEstimate: authoritativeFare,
    };

    const outboxIds: string[] = [];
    await this.prisma.$transaction(async (tx) => {
      await tx.ride.create({ data: this.rideDtoToCreateInput(rideDto) });
      await tx.payment.create({
        data: {
          id: paymentId,
          rideId: id,
          status: payment.status,
          amount: authoritativeFare.finalFare,
          currency: authoritativeFare.currency,
          provider: payment.provider,
          providerReference: payment.providerReference,
        },
      });
      await tx.offer.create({
        data: {
          requestId,
          rideId: id,
          pickup: rideDto.pickup,
          destination: rideDto.destination,
          earning: this.formatEarning(rideDto.fareEstimate),
        },
      });
      const { eventId } = await this.notifications.createDriverNotificationTx(tx, {
        driverId: this.placeholderDriverId,
        type: DriverNotificationType.new_ride_request,
        title: 'New ride request',
        body: `${rideDto.pickup} → ${rideDto.destination}`,
        data: { rideId: id, requestId },
      });
      outboxIds.push(eventId);
    });
    for (const eid of outboxIds) {
      void this.notifications.flushOutboundDeliveries(eid);
    }
    this.logger.log('ride.created', {
      rideId: id,
      riderId,
      fareAmount: authoritativeFare.finalFare,
      promoCode: authoritativeFare.promoCode || null,
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
      originalFare: row.originalFare,
      discountAmount: row.discountAmount,
      finalFare: row.finalFare,
      promoCode: row.promoCode,
      paymentStatus: (row.paymentStatus ?? PaymentStatus.unpaid) as PaymentStatus,
      paymentId: row.paymentId,
      fareEstimate: row.fareEstimate as unknown as Prisma.InputJsonValue,
      ...(row.paymentMethod != null ? { paymentMethod: row.paymentMethod } : {}),
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
      originalFare: row.originalFare ?? undefined,
      discountAmount: row.discountAmount ?? undefined,
      finalFare: row.finalFare ?? undefined,
      promoCode: row.promoCode ?? undefined,
      paymentStatus: row.paymentStatus as PaymentStatus,
      paymentId: row.paymentId ?? undefined,
      fareEstimate: row.fareEstimate as unknown as FareEstimateDto | undefined,
      paymentMethod: row.paymentMethod as RidePaymentMethod | undefined,
    };
  }

  private fareAmountFromRide(ride: PrismaRide): number {
    if (ride.finalFare != null) {
      return ride.finalFare;
    }
    const fe = ride.fareEstimate as { amount?: number } | null;
    return fe?.amount ?? 0;
  }

  async findRideOrThrow(rideId: string, riderId?: string): Promise<{ ride: RideSummaryDto }> {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) {
      throw new NotFoundException('ride_not_found');
    }
    if (riderId && ride.riderId !== riderId) {
      throw new ForbiddenException('ride_forbidden');
    }
    return { ride: this.toRideSummaryDto(ride) };
  }

  async cancelRide(
    rideId: string,
    _body?: CancelRideBodyDto,
    riderId?: string,
  ): Promise<{ cancelled: true; ride?: RideSummaryDto }> {
    const existing = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!existing) {
      return { cancelled: true };
    }
    if (riderId && existing.riderId !== riderId) {
      throw new ForbiddenException('ride_forbidden');
    }
    const cancelledSnapshot: RideSummaryDto = {
      ...this.toRideSummaryDto(existing),
      status: RideStatus.Cancelled,
      updatedAt: new Date().toISOString(),
    };
    const outboxIds: string[] = [];
    await this.prisma.$transaction(async (tx) => {
      if (existing.riderId) {
        const { eventId } = await this.notifications.createRiderNotificationTx(tx, {
          riderId: existing.riderId,
          type: RiderNotificationType.ride_cancelled,
          title: 'Ride cancelled',
          body: 'Your ride was cancelled.',
          data: { rideId: existing.id },
        });
        outboxIds.push(eventId);
      }
      if (existing.driverId) {
        const { eventId } = await this.notifications.createDriverNotificationTx(tx, {
          driverId: existing.driverId,
          type: DriverNotificationType.ride_cancelled,
          title: 'Ride cancelled',
          body: 'A ride you were assigned to was cancelled.',
          data: { rideId: existing.id },
        });
        outboxIds.push(eventId);
      }
      await tx.ride.delete({ where: { id: rideId } });
    });
    for (const eid of outboxIds) {
      void this.notifications.flushOutboundDeliveries(eid);
    }
    this.logger.log('ride.cancelled', {
      rideId,
      riderId: existing.riderId ?? null,
      driverId: existing.driverId ?? null,
    });
    return { cancelled: true, ride: cancelledSnapshot };
  }

  async listIncomingRequests(driverId = this.placeholderDriverId): Promise<{ requests: DriverIncomingOfferDto[] }> {
    await this.walletService.ensureWallet(driverId);
    const driverRow = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });
    const blockingReasons = await this.getDriverOnlineBlockingReasons(driverId);
    if (!driverRow?.online || blockingReasons.length > 0) {
      return { requests: [] };
    }
    const wallet = await this.prisma.driverWallet.findUnique({
      where: { driverId },
    });
    if (
      !wallet ||
      !this.walletService.isEligibleForNewRides(wallet.balance, wallet.minBalance)
    ) {
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
    driverId: string,
    requestId: string,
    _body: AcceptRideDto,
  ): Promise<{ tripId: string; ride: RideSummaryDto }> {
    await this.walletService.ensureWallet(driverId);
    const wallet = await this.prisma.driverWallet.findUnique({
      where: { driverId },
    });
    if (
      !wallet ||
      !this.walletService.isEligibleForNewRides(wallet.balance, wallet.minBalance)
    ) {
      throw new ForbiddenException('wallet_balance_below_minimum');
    }
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
      const outboxIds: string[] = [];
      await this.prisma.$transaction(async (tx) => {
        await tx.ride.update({
          where: { id: offer.rideId! },
          data: {
            driverId,
            status: DbRideStatus.driver_assigned,
            updatedAt: now,
          },
        });
        await tx.offer.delete({ where: { requestId } });
        await tx.trip.create({
          data: {
            id: tripId,
            rideId: offer.rideId!,
            driverId,
            startedAt: now,
          },
        });
        if (r.riderId) {
          const { eventId } = await this.notifications.createRiderNotificationTx(tx, {
            riderId: r.riderId,
            type: RiderNotificationType.driver_assigned,
            title: 'Driver assigned',
            body: `A driver is on the way: ${r.pickup} → ${r.destination}`,
            data: { rideId: r.id, requestId, tripId },
          });
          outboxIds.push(eventId);
        }
      });
      for (const eid of outboxIds) {
        void this.notifications.flushOutboundDeliveries(eid);
      }
      const updated = await this.prisma.ride.findUniqueOrThrow({ where: { id: offer.rideId } });
      void this.scheduleDemoAutoProgressIfEnabled(tripId);
      this.logger.log('ride.accepted', { requestId, tripId, rideId: offer.rideId, driverId });
      return { tripId, ride: this.toRideSummaryDto(updated) };
    }

    const synthetic: RideSummaryDto = {
      id: requestId,
      riderId: null,
      driverId,
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
          driverId,
          startedAt: now,
        },
      });
    });
    void this.scheduleDemoAutoProgressIfEnabled(tripId);
    const created = await this.prisma.ride.findUniqueOrThrow({ where: { id: synthetic.id } });
    this.logger.log('ride.accepted', { requestId, tripId, rideId: synthetic.id, driverId });
    return { tripId, ride: this.toRideSummaryDto(created) };
  }

  async declineRequest(driverId: string, requestId: string): Promise<{ declined: true }> {
    const offer = await this.prisma.offer.findUnique({ where: { requestId } });
    let rideRow: PrismaRide | null = null;
    if (offer?.rideId) {
      rideRow = await this.prisma.ride.findUnique({ where: { id: offer.rideId } });
    }
    const outboxIds: string[] = [];
    await this.prisma.$transaction(async (tx) => {
      if (offer?.rideId && rideRow) {
        await tx.ride.update({
          where: { id: offer.rideId },
          data: {
            status: DbRideStatus.cancelled,
            updatedAt: new Date(),
          },
        });
        if (rideRow.riderId) {
          const { eventId } = await this.notifications.createRiderNotificationTx(tx, {
            riderId: rideRow.riderId,
            type: RiderNotificationType.ride_cancelled,
            title: 'Ride cancelled',
            body: 'Your ride request was cancelled.',
            data: { rideId: rideRow.id, requestId },
          });
          outboxIds.push(eventId);
        }
        if (rideRow.driverId) {
          const { eventId } = await this.notifications.createDriverNotificationTx(tx, {
            driverId: rideRow.driverId,
            type: DriverNotificationType.ride_cancelled,
            title: 'Ride cancelled',
            body: 'The assigned ride was cancelled.',
            data: { rideId: rideRow.id, requestId },
          });
          outboxIds.push(eventId);
        }
      }
      await tx.offer.deleteMany({ where: { requestId } });
    });
    for (const eid of outboxIds) {
      void this.notifications.flushOutboundDeliveries(eid);
    }
    this.logger.log('ride.declined', { requestId, driverId });
    return { declined: true };
  }

  private async updateRideByTripId(
    tripId: string,
    status: RideStatus,
    driverId?: string,
  ): Promise<{ tripId: string; ride: RideSummaryDto }> {
    const t = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!t) {
      throw new NotFoundException('trip_not_found');
    }
    if (driverId && t.driverId && t.driverId !== driverId) {
      throw new ForbiddenException('trip_forbidden');
    }
    const ride = await this.prisma.ride.findUnique({ where: { id: t.rideId } });
    if (!ride) {
      throw new NotFoundException('trip_not_found');
    }
    if (driverId && ride.driverId && ride.driverId !== driverId) {
      throw new ForbiddenException('trip_forbidden');
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

  async arriveAtPickup(
    tripId: string,
    driverId?: string,
  ): Promise<{ trip: { tripId: string; ride: RideSummaryDto } }> {
    const { tripId: tid, ride } = await this.updateRideByTripId(tripId, RideStatus.DriverArrived, driverId);
    await this.emitRiderRideLifecycleNotification(
      ride,
      RiderNotificationType.driver_arrived,
      'Driver arrived',
      'Your driver has arrived at the pickup location.',
    );
    this.logger.log('ride.driver_arrived', { tripId, rideId: ride.id, driverId: ride.driverId ?? driverId ?? null });
    return { trip: { tripId: tid, ride } };
  }

  async startTrip(
    tripId: string,
    driverId?: string,
  ): Promise<{ trip: { tripId: string; ride: RideSummaryDto } }> {
    const { tripId: tid, ride } = await this.updateRideByTripId(tripId, RideStatus.InProgress, driverId);
    await this.emitRiderRideLifecycleNotification(
      ride,
      RiderNotificationType.trip_started,
      'Trip started',
      'Your trip is in progress.',
    );
    this.logger.log('ride.started', { tripId, rideId: ride.id, driverId: ride.driverId ?? driverId ?? null });
    return { trip: { tripId: tid, ride } };
  }

  private async emitRiderRideLifecycleNotification(
    ride: RideSummaryDto,
    type: RiderNotificationType,
    title: string,
    body: string,
  ): Promise<void> {
    if (!ride.riderId) {
      return;
    }
    const { eventId } = await this.prisma.$transaction((tx) =>
      this.notifications.createRiderNotificationTx(tx, {
        riderId: ride.riderId!,
        type,
        title,
        body,
        data: { rideId: ride.id },
      }),
    );
    void this.notifications.flushOutboundDeliveries(eventId);
  }

  async completeTrip(
    tripId: string,
    body?: { paymentMethod?: RidePaymentMethod },
    driverId?: string,
  ): Promise<{ trip: { tripId: string; ride: RideSummaryDto } }> {
    const paymentMethod = body?.paymentMethod ?? RidePaymentMethod.cash;
    const commissionSettings = await this.getCommissionSettings();
    const commissionRateDecimal = this.commissionPercentToDecimal(commissionSettings);
    const commissionPercentLabel = commissionSettings.commissionRate;
    const outboxIds: string[] = [];
    const out = await this.prisma.$transaction(async (tx) => {
      const t = await tx.trip.findUnique({ where: { id: tripId } });
      if (!t) {
        throw new NotFoundException('trip_not_found');
      }
      if (driverId && t.driverId && t.driverId !== driverId) {
        throw new ForbiddenException('trip_forbidden');
      }
      const ride = await tx.ride.findUnique({ where: { id: t.rideId } });
      if (!ride) {
        throw new NotFoundException('trip_not_found');
      }
      if (driverId && ride.driverId && ride.driverId !== driverId) {
        throw new ForbiddenException('trip_forbidden');
      }

      if (ride.status === DbRideStatus.completed) {
        const updated = await tx.ride.findUniqueOrThrow({ where: { id: ride.id } });
        return { trip: { tripId, ride: this.toRideSummaryDto(updated) } };
      }

      const now = new Date();
      const rideDriverId = ride.driverId ?? t.driverId;
      const fareAmount = this.fareAmountFromRide(ride);

      await tx.ride.update({
        where: { id: ride.id },
        data: {
          status: DbRideStatus.completed,
          paymentMethod,
          updatedAt: now,
        },
      });

      if (rideDriverId) {
        const commissionResult = await this.walletService.applyCommissionForCompletedRide(tx, {
          driverId: rideDriverId,
          rideId: ride.id,
          fareAmount,
          paymentMethod,
          commissionRateDecimal,
          commissionPercentLabel,
        });
        outboxIds.push(...commissionResult.dispatchEventIds);
      }

      if (ride.riderId) {
        const fareLabel =
          ride.finalFare != null ? `ETB ${ride.finalFare}` : 'See app for fare details';
        const { eventId } = await this.notifications.createRiderNotificationTx(tx, {
          riderId: ride.riderId,
          type: RiderNotificationType.trip_completed,
          title: 'Trip completed',
          body: `Thanks for riding with us. Fare: ${fareLabel}.`,
          data: { rideId: ride.id, tripId },
        });
        outboxIds.push(eventId);
      }

      const updated = await tx.ride.findUniqueOrThrow({ where: { id: ride.id } });
      return { trip: { tripId, ride: this.toRideSummaryDto(updated) } };
    });
    for (const eid of outboxIds) {
      void this.notifications.flushOutboundDeliveries(eid);
    }
    this.logger.log('ride.completed', {
      tripId,
      rideId: out.trip.ride.id,
      driverId: out.trip.ride.driverId ?? driverId ?? null,
      paymentMethod,
      finalFare: out.trip.ride.finalFare ?? null,
    });
    return out;
  }

  async getTrip(tripId: string, driverId?: string): Promise<{ trip: { tripId: string; ride: RideSummaryDto } }> {
    const t = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!t) {
      throw new NotFoundException('trip_not_found');
    }
    if (driverId && t.driverId && t.driverId !== driverId) {
      throw new ForbiddenException('trip_forbidden');
    }
    const ride = await this.prisma.ride.findUnique({ where: { id: t.rideId } });
    if (!ride) {
      throw new NotFoundException('trip_not_found');
    }
    if (driverId && ride.driverId && ride.driverId !== driverId) {
      throw new ForbiddenException('trip_forbidden');
    }
    return { trip: { tripId, ride: this.toRideSummaryDto(ride) } };
  }

  /**
   * Read-only snapshot for admin dashboard — same persisted state as rider/driver flows.
   */
  async getAdminOverview(): Promise<{
    driverOnline: boolean;
    settings: {
      requireRideSafetyPin: boolean;
      demoAutoTripProgression: boolean;
      pricing: PricingSettings;
      promo: PromoSettings;
      commission: CommissionSettings;
    };
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
    await this.ensurePlaceholderDriverRecord();
    const [rides, offers, trips, driverRow, settings] = await Promise.all([
      this.prisma.ride.findMany(),
      this.prisma.offer.findMany(),
      this.prisma.trip.findMany(),
      this.prisma.driver.findUnique({ where: { id: this.placeholderDriverId } }),
      this.getAppSettings(),
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
      settings,
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

  async listAdminDrivers(): Promise<
    Array<{
      id: string;
      userId: string;
      name: string | null;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      online: boolean;
      isVerified: boolean;
      verificationStatus: string;
      vehicleStatus: string | null;
      vehicleTagNumber: string | null;
      vehicleSummary: string | null;
      activeTripCount: number;
      createdAt: string;
      updatedAt: string;
      walletBalance: number;
      walletMinBalance: number;
      walletWarningThreshold: number;
      walletBlocked: boolean;
      walletBelowWarning: boolean;
      walletUnreadNotifications: number;
    }>
  > {
    await this.ensurePlaceholderDriverRecord();
    const [drivers, users, rides, wallets, unreadGroups, vehicles] = await Promise.all([
      this.prisma.driver.findMany({ orderBy: { updatedAt: 'desc' } }),
      this.prisma.user.findMany({ where: { role: 'driver' } }),
      this.prisma.ride.findMany({
        where: {
          status: {
            in: [
              DbRideStatus.driver_assigned,
              DbRideStatus.driver_arrived,
              DbRideStatus.in_progress,
            ],
          },
        },
      }),
      this.prisma.driverWallet.findMany(),
      this.prisma.driverNotification.groupBy({
        by: ['driverId'],
        where: { readAt: null },
        _count: { _all: true },
      }),
      this.prisma.driverVehicle.findMany(),
    ]);
    const unreadByDriver = new Map(unreadGroups.map((g) => [g.driverId, g._count._all]));
    const userById = new Map(users.map((u) => [u.id, u]));
    const walletByDriverId = new Map(wallets.map((w) => [w.driverId, w]));
    const vehicleByDriverId = new Map(vehicles.map((v) => [v.driverId, v]));
    const activeTripCountByDriverId = new Map<string, number>();
    for (const ride of rides) {
      if (!ride.driverId) continue;
      activeTripCountByDriverId.set(
        ride.driverId,
        (activeTripCountByDriverId.get(ride.driverId) ?? 0) + 1,
      );
    }
    return drivers.map((driver) => {
      const user = userById.get(driver.id);
      const w = walletByDriverId.get(driver.id);
      const vehicle = vehicleByDriverId.get(driver.id);
      const balance = w?.balance ?? 0;
      const minB = w?.minBalance ?? 0;
      const warn = w?.warningThreshold ?? 0;
      return {
        id: driver.id,
        userId: driver.id,
        name: user?.name ?? null,
        firstName: user?.firstName ?? null,
        lastName: user?.lastName ?? null,
        phone: user?.phone ?? null,
        email: user?.email ?? null,
        address: user?.address ?? null,
        online: driver.online,
        isVerified: driver.isVerified,
        verificationStatus: driver.verificationStatus,
        vehicleStatus: vehicle?.status ?? null,
        vehicleTagNumber: vehicle?.tagNumber ?? null,
        vehicleSummary: vehicle ? `${vehicle.make} ${vehicle.model}` : null,
        activeTripCount: activeTripCountByDriverId.get(driver.id) ?? 0,
        createdAt: driver.createdAt.toISOString(),
        updatedAt: driver.updatedAt.toISOString(),
        walletBalance: balance,
        walletMinBalance: minB,
        walletWarningThreshold: warn,
        walletBlocked: !this.walletService.isEligibleForNewRides(balance, minB),
        walletBelowWarning: this.walletService.isBelowWarningThreshold(balance, warn),
        walletUnreadNotifications: unreadByDriver.get(driver.id) ?? 0,
      };
    });
  }

  /** Rider accounts (`User` with role rider) + ride counts from persisted rides. */
  async listAdminRiders(): Promise<
    Array<{
      id: string;
      name: string | null;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      rideCount: number;
      createdAt: string;
    }>
  > {
    const rows = await this.prisma.user.findMany({
      where: { role: 'rider' },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { ridesAsRider: true } },
      },
    });
    return rows.map((u) => ({
      id: u.id,
      name: u.name ?? null,
      firstName: u.firstName ?? null,
      lastName: u.lastName ?? null,
      phone: u.phone ?? null,
      email: u.email ?? null,
      address: u.address ?? null,
      rideCount: u._count.ridesAsRider,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  async updateAdminDriverVerification(
    driverId: string,
    input: { verificationStatus?: string },
    actor?: SessionUserDto,
  ): Promise<{
    id: string;
    userId: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    online: boolean;
    isVerified: boolean;
    verificationStatus: string;
    activeTripCount: number;
    createdAt: string;
    updatedAt: string;
    walletBalance: number;
    walletMinBalance: number;
    walletWarningThreshold: number;
    walletBlocked: boolean;
    walletBelowWarning: boolean;
    walletUnreadNotifications: number;
  }> {
    const requestedStatus = input.verificationStatus === 'approved'
      ? 'approved'
      : input.verificationStatus === 'rejected'
        ? 'rejected'
        : 'pending';
    await this.ensurePlaceholderDriverRecord();
    const previous = await this.prisma.driver.findUnique({ where: { id: driverId } });
    await this.prisma.$transaction(async (tx) => {
      await tx.driver.upsert({
        where: { id: driverId },
        create: {
          id: driverId,
          online: false,
          isVerified: requestedStatus === 'approved',
          verificationStatus: requestedStatus,
        },
        update: {
          isVerified: requestedStatus === 'approved',
          verificationStatus: requestedStatus,
        },
      });
      if (actor?.role === SessionUserRole.Admin) {
        await this.auditService.recordAdminAction(tx, {
          actor,
          action: requestedStatus === 'approved' ? 'driver.approved' : requestedStatus === 'rejected' ? 'driver.rejected' : 'driver.verification_pending',
          targetType: 'driver',
          targetId: driverId,
          metadata: {
            previous: previous
              ? {
                  verificationStatus: previous.verificationStatus,
                  isVerified: previous.isVerified,
                }
              : null,
            next: {
              verificationStatus: requestedStatus,
              isVerified: requestedStatus === 'approved',
            },
          } as Prisma.InputJsonValue,
        });
      }
    });
    await this.walletService.ensureWallet(driverId);
    const drivers = await this.listAdminDrivers();
    const driver = drivers.find((row) => row.id === driverId);
    if (!driver) {
      throw new NotFoundException('driver_not_found');
    }
    return driver;
  }

  async updateAdminDriverVehicle(
    driverId: string,
    input: { vehicleStatus?: string; rejectionReason?: string },
    actor?: SessionUserDto,
  ): Promise<{
    vehicleStatus: string;
    rejectionReason: string | null;
  }> {
    const vehicle = await this.prisma.driverVehicle.findUnique({ where: { driverId } });
    if (!vehicle) {
      throw new NotFoundException('vehicle_not_found');
    }
    const nextStatus =
      input.vehicleStatus === 'approved'
        ? VehicleApprovalStatus.approved
        : input.vehicleStatus === 'rejected'
          ? VehicleApprovalStatus.rejected
          : VehicleApprovalStatus.pending;
    const updated = await this.prisma.driverVehicle.update({
      where: { driverId },
      data: {
        status: nextStatus,
        reviewedBy: actor?.id ?? null,
        reviewedAt: new Date(),
        rejectionReason:
          nextStatus === VehicleApprovalStatus.rejected
            ? input.rejectionReason?.trim() || 'Vehicle update rejected'
            : null,
      },
    });
    await this.prisma.driver.update({
      where: { id: driverId },
      data: { online: false },
    });
    if (actor?.role === SessionUserRole.Admin) {
      await this.auditService.recordAdminAction(this.prisma, {
        actor,
        action:
          nextStatus === VehicleApprovalStatus.approved
            ? 'vehicle.approved'
            : nextStatus === VehicleApprovalStatus.rejected
              ? 'vehicle.rejected'
              : 'vehicle.pending',
        targetType: 'driver_vehicle',
        targetId: updated.id,
        metadata: {
          driverId,
          status: updated.status,
          rejectionReason: updated.rejectionReason,
        } as Prisma.InputJsonValue,
      });
    }
    return {
      vehicleStatus: updated.status,
      rejectionReason: updated.rejectionReason ?? null,
    };
  }

  async getDriverWalletSnapshot(driverId = this.placeholderDriverId): Promise<{
    balance: number;
    minBalance: number;
    warningThreshold: number;
    blocked: boolean;
    belowWarning: boolean;
  }> {
    const p = await this.getDriverProfile(driverId);
    return {
      balance: p.walletBalance,
      minBalance: p.walletMinBalance,
      warningThreshold: p.walletWarningThreshold,
      blocked: p.walletBlocked,
      belowWarning: p.walletBelowWarning,
    };
  }

  async listDriverWalletTransactions(
    driverId = this.placeholderDriverId,
    limit = 50,
  ): Promise<{
    transactions: Array<{
      id: string;
      type: string;
      amount: number;
      reason: string;
      rideId: string | null;
      createdAt: string;
    }>;
  }> {
    await this.walletService.ensureWallet(driverId);
    const rows = await this.prisma.walletTransaction.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, Math.max(1, limit)),
    });
    return {
      transactions: rows.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount,
        reason: r.reason,
        rideId: r.rideId,
        metadata: r.metadata as Record<string, unknown> | null,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async createDriverTopUpRequest(
    driverId: string,
    input: { amount: number; method: TopUpMethod; reference: string },
  ): Promise<{ id: string }> {
    await this.walletService.ensureWallet(driverId);
    return this.walletService.createTopUpRequest({
      driverId,
      amount: input.amount,
      method: input.method,
      reference: input.reference,
    });
  }

  async upsertDriverVehicle(
    driverId: string,
    input: {
      make: string;
      model: string;
      color: string;
      capacity: number;
      tagNumber: string;
      insuranceExpiry?: string;
    },
  ): Promise<{
    vehicle: {
      make: string;
      model: string;
      color: string;
      capacity: number;
      tagNumber: string;
      insuranceExpiry: string | null;
      status: string;
    };
  }> {
    await this.prisma.driver.upsert({
      where: { id: driverId },
      create: {
        id: driverId,
        online: false,
        isVerified: false,
        verificationStatus: 'pending',
      },
      update: { online: false },
    });
    const vehicle = await this.prisma.driverVehicle.upsert({
      where: { driverId },
      create: {
        driverId,
        make: input.make.trim(),
        model: input.model.trim(),
        color: input.color.trim(),
        capacity: input.capacity,
        tagNumber: input.tagNumber.trim(),
        insuranceExpiry: input.insuranceExpiry?.trim() || null,
        status: VehicleApprovalStatus.pending,
      },
      update: {
        make: input.make.trim(),
        model: input.model.trim(),
        color: input.color.trim(),
        capacity: input.capacity,
        tagNumber: input.tagNumber.trim(),
        insuranceExpiry: input.insuranceExpiry?.trim() || null,
        status: VehicleApprovalStatus.pending,
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
      },
    });
    await this.prisma.driver.update({
      where: { id: driverId },
      data: { online: false },
    });
    return {
      vehicle: {
        make: vehicle.make,
        model: vehicle.model,
        color: vehicle.color,
        capacity: vehicle.capacity,
        tagNumber: vehicle.tagNumber,
        insuranceExpiry: vehicle.insuranceExpiry ?? null,
        status: vehicle.status,
      },
    };
  }

  async listAdminWalletTransactions(input: {
    driverId?: string;
    type?: WalletTransactionType;
    limit?: number;
  }): Promise<{
    transactions: Array<{
      id: string;
      driverId: string;
      driverName: string | null;
      type: string;
      amount: number;
      reason: string;
      rideId: string | null;
      metadata: Record<string, unknown> | null;
      createdAt: string;
    }>;
  }> {
    const take = Math.min(500, Math.max(1, input.limit ?? 200));
    const where: Prisma.WalletTransactionWhereInput = {};
    if (input.driverId) {
      where.driverId = input.driverId;
    }
    if (input.type) {
      where.type = input.type;
    }
    const rows = await this.prisma.walletTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });
    const userIds = [...new Set(rows.map((r) => r.driverId))];
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } } });
    const nameById = new Map(users.map((u) => [u.id, u.name ?? null]));
    return {
      transactions: rows.map((r) => ({
        id: r.id,
        driverId: r.driverId,
        driverName: nameById.get(r.driverId) ?? null,
        type: r.type,
        amount: r.amount,
        reason: r.reason,
        rideId: r.rideId,
        metadata: r.metadata as Record<string, unknown> | null,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async listAdminTopUpRequests(): Promise<{
    requests: Array<{
      id: string;
      driverId: string;
      driverName: string | null;
      amount: number;
      method: string;
      reference: string;
      status: string;
      createdAt: string;
      reviewedBy: string | null;
      proofUrl: string | null;
      proofContentType: string | null;
    }>;
  }> {
    const rows = await this.prisma.topUpRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const userIds = [...new Set(rows.map((r) => r.driverId))];
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } } });
    const nameById = new Map(users.map((u) => [u.id, u.name ?? null]));
    return {
      requests: rows.map((r) => ({
        id: r.id,
        driverId: r.driverId,
        driverName: nameById.get(r.driverId) ?? null,
        amount: r.amount,
        method: r.method,
        reference: r.reference,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        reviewedBy: r.reviewedBy,
        proofUrl: r.proofStorageKey ? this.storage.getPublicUrl(r.proofStorageKey) : null,
        proofContentType: r.proofContentType,
      })),
    };
  }

  async approveAdminTopUpRequest(
    requestId: string,
    actor?: SessionUserDto,
  ): Promise<{ credited: number; balance: number }> {
    const result = await this.walletService.approveTopUpRequest(requestId, actor?.id ?? 'admin');
    if (actor?.role === SessionUserRole.Admin) {
      await this.auditService.recordAdminAction(this.prisma, {
        actor,
        action: 'top_up.approved',
        targetType: 'top_up_request',
        targetId: requestId,
        metadata: result as Prisma.InputJsonValue,
      });
    }
    return result;
  }

  async rejectAdminTopUpRequest(
    requestId: string,
    actor?: SessionUserDto,
  ): Promise<{ rejected: true }> {
    await this.walletService.rejectTopUpRequest(requestId, actor?.id ?? 'admin');
    if (actor?.role === SessionUserRole.Admin) {
      await this.auditService.recordAdminAction(this.prisma, {
        actor,
        action: 'top_up.rejected',
        targetType: 'top_up_request',
        targetId: requestId,
      });
    }
    return { rejected: true };
  }

  buildWalletTransactionsCsv(
    rows: Array<{
      id: string;
      driverId: string;
      driverName: string | null;
      type: string;
      amount: number;
      reason: string;
      rideId: string | null;
      metadata?: Record<string, unknown> | null;
      createdAt: string;
    }>,
  ): string {
    const header = 'id,driverId,driverName,type,amount,reason,rideId,metadata,createdAt';
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const lines = rows.map(
      (r) =>
        [
          r.id,
          r.driverId,
          r.driverName ?? '',
          r.type,
          String(r.amount),
          esc(r.reason),
          r.rideId ?? '',
          esc(r.metadata != null ? JSON.stringify(r.metadata) : ''),
          r.createdAt,
        ].join(','),
    );
    return [header, ...lines].join('\n');
  }

  private readonly placeholderRiderId = 'placeholder-rider';

  async listRiderNotifications(
    riderId = this.placeholderRiderId,
    limit = 50,
  ): Promise<{
    notifications: Array<{
      id: string;
      type: string;
      title: string;
      body: string;
      data: Record<string, unknown> | null;
      read: boolean;
      createdAt: string;
    }>;
  }> {
    const take = Math.min(100, Math.max(1, limit));
    const rows = await this.prisma.riderNotification.findMany({
      where: { riderId },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return {
      notifications: rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data as Record<string, unknown> | null,
        read: n.readAt != null,
        createdAt: n.createdAt.toISOString(),
      })),
    };
  }

  async listDriverNotifications(
    driverId = this.placeholderDriverId,
    limit = 50,
  ): Promise<{
    notifications: Array<{
      id: string;
      type: string;
      title: string;
      body: string;
      data: Record<string, unknown> | null;
      read: boolean;
      createdAt: string;
    }>;
  }> {
    const take = Math.min(100, Math.max(1, limit));
    const rows = await this.prisma.driverNotification.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return {
      notifications: rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data as Record<string, unknown> | null,
        read: n.readAt != null,
        createdAt: n.createdAt.toISOString(),
      })),
    };
  }

  async markDriverNotificationsRead(
    driverId: string,
    ids?: string[],
  ): Promise<{ updated: number }> {
    const res = await this.prisma.driverNotification.updateMany({
      where: {
        driverId,
        readAt: null,
        ...(ids?.length ? { id: { in: ids } } : {}),
      },
      data: { readAt: new Date() },
    });
    return { updated: res.count };
  }

  async listDriverTopUpRequests(driverId = this.placeholderDriverId): Promise<{
    requests: Array<{
      id: string;
      amount: number;
      method: string;
      reference: string;
      status: string;
      createdAt: string;
      proofUrl: string | null;
    }>;
  }> {
    await this.walletService.ensureWallet(driverId);
    const rows = await this.prisma.topUpRequest.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return {
      requests: rows.map((r) => ({
        id: r.id,
        amount: r.amount,
        method: r.method,
        reference: r.reference,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        proofUrl: r.proofStorageKey ? this.storage.getPublicUrl(r.proofStorageKey) : null,
      })),
    };
  }

  private static readonly TOP_UP_PROOF_MAX_BYTES = 5 * 1024 * 1024;
  private static readonly TOP_UP_PROOF_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

  async uploadDriverTopUpProof(
    driverId: string,
    requestId: string,
    file: { buffer: Buffer; mimetype: string; size: number },
  ): Promise<{ proofUrl: string }> {
    if (file.size > AppStateService.TOP_UP_PROOF_MAX_BYTES) {
      throw new BadRequestException('proof_too_large');
    }
    if (!AppStateService.TOP_UP_PROOF_MIMES.has(file.mimetype)) {
      throw new BadRequestException('proof_invalid_type');
    }
    const req = await this.prisma.topUpRequest.findUnique({ where: { id: requestId } });
    if (!req || req.driverId !== driverId) {
      throw new NotFoundException('top_up_not_found');
    }
    if (req.status !== 'pending') {
      throw new BadRequestException('top_up_not_pending');
    }
    const ext =
      file.mimetype === 'image/jpeg' ? '.jpg' : file.mimetype === 'image/png' ? '.png' : '.webp';
    const key = `top-up-proofs/${driverId}/${requestId}${ext}`;
    if (req.proofStorageKey && req.proofStorageKey !== key) {
      try {
        await this.storage.deleteObject(req.proofStorageKey);
      } catch {
        /* ignore missing old file */
      }
    }
    await this.storage.putObject(key, file.buffer, file.mimetype);
    await this.prisma.topUpRequest.update({
      where: { id: requestId },
      data: { proofStorageKey: key, proofContentType: file.mimetype },
    });
    return { proofUrl: this.storage.getPublicUrl(key) };
  }

  async listAdminDriverNotifications(limit = 80): Promise<{
    notifications: Array<{
      id: string;
      driverId: string;
      driverName: string | null;
      type: string;
      title: string;
      body: string;
      read: boolean;
      createdAt: string;
    }>;
  }> {
    const take = Math.min(200, Math.max(1, limit));
    const rows = await this.prisma.driverNotification.findMany({
      orderBy: { createdAt: 'desc' },
      take,
    });
    const userIds = [...new Set(rows.map((r) => r.driverId))];
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } } });
    const nameById = new Map(users.map((u) => [u.id, u.name ?? null]));
    return {
      notifications: rows.map((n) => ({
        id: n.id,
        driverId: n.driverId,
        driverName: nameById.get(n.driverId) ?? null,
        type: n.type,
        title: n.title,
        body: n.body,
        read: n.readAt != null,
        createdAt: n.createdAt.toISOString(),
      })),
    };
  }
}
