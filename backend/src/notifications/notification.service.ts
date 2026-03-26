import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DriverNotificationType,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationEventType,
  NotificationRecipientType,
  Prisma,
  RiderNotificationType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  NOTIFICATION_DELIVERY_PROVIDER,
  type NotificationDeliveryProvider,
} from './notification-delivery.provider';
import { StructuredLogger } from '../common/logging/structured-logger';

function driverTypeToEventType(type: DriverNotificationType): NotificationEventType {
  switch (type) {
    case DriverNotificationType.low_balance_warning:
      return NotificationEventType.low_balance_warning;
    case DriverNotificationType.wallet_blocked:
      return NotificationEventType.wallet_blocked;
    case DriverNotificationType.top_up_approved:
      return NotificationEventType.top_up_approved;
    case DriverNotificationType.top_up_rejected:
      return NotificationEventType.top_up_rejected;
    case DriverNotificationType.commission_deducted:
      return NotificationEventType.commission_deducted;
    case DriverNotificationType.new_ride_request:
      return NotificationEventType.new_ride_request;
    case DriverNotificationType.ride_cancelled:
      return NotificationEventType.ride_cancelled;
    default: {
      const _x: never = type;
      return _x;
    }
  }
}

function riderTypeToEventType(type: RiderNotificationType): NotificationEventType {
  switch (type) {
    case RiderNotificationType.driver_assigned:
      return NotificationEventType.driver_assigned;
    case RiderNotificationType.driver_arrived:
      return NotificationEventType.driver_arrived;
    case RiderNotificationType.trip_started:
      return NotificationEventType.trip_started;
    case RiderNotificationType.trip_completed:
      return NotificationEventType.trip_completed;
    case RiderNotificationType.ride_cancelled:
      return NotificationEventType.ride_cancelled;
    default: {
      const _x: never = type;
      return _x;
    }
  }
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly structuredLogger = new StructuredLogger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_DELIVERY_PROVIDER)
    private readonly delivery: NotificationDeliveryProvider,
  ) {}

  /**
   * Persist driver in-app row + outbox + per-channel delivery tracking; SMS/push finalized after commit.
   */
  async createDriverNotificationTx(
    tx: Prisma.TransactionClient,
    input: {
      driverId: string;
      type: DriverNotificationType;
      title: string;
      body: string;
      data?: Prisma.InputJsonValue;
    },
  ): Promise<{ notificationId: string; eventId: string }> {
    const driverRow = await tx.driverNotification.create({
      data: {
        driverId: input.driverId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data === undefined ? Prisma.JsonNull : input.data,
      },
    });
    const now = new Date();
    const event = await tx.notificationEvent.create({
      data: {
        recipientType: NotificationRecipientType.driver,
        recipientId: input.driverId,
        eventType: driverTypeToEventType(input.type),
        title: input.title,
        body: input.body,
        data: input.data === undefined ? Prisma.JsonNull : input.data,
        driverNotificationId: driverRow.id,
      },
    });
    await tx.notificationDelivery.createMany({
      data: [
        {
          notificationEventId: event.id,
          channel: NotificationChannel.in_app,
          status: NotificationDeliveryStatus.delivered,
          deliveredAt: now,
          attemptedAt: now,
        },
        {
          notificationEventId: event.id,
          channel: NotificationChannel.sms,
          status: NotificationDeliveryStatus.pending,
        },
        {
          notificationEventId: event.id,
          channel: NotificationChannel.push,
          status: NotificationDeliveryStatus.pending,
        },
      ],
    });
    this.structuredLogger.log('notifications.driver_created', {
      driverId: input.driverId,
      type: input.type,
      eventId: event.id,
      notificationId: driverRow.id,
    });
    return { notificationId: driverRow.id, eventId: event.id };
  }

  async createRiderNotificationTx(
    tx: Prisma.TransactionClient,
    input: {
      riderId: string;
      type: RiderNotificationType;
      title: string;
      body: string;
      data?: Prisma.InputJsonValue;
    },
  ): Promise<{ notificationId: string; eventId: string }> {
    const riderRow = await tx.riderNotification.create({
      data: {
        riderId: input.riderId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data === undefined ? Prisma.JsonNull : input.data,
      },
    });
    const now = new Date();
    const event = await tx.notificationEvent.create({
      data: {
        recipientType: NotificationRecipientType.rider,
        recipientId: input.riderId,
        eventType: riderTypeToEventType(input.type),
        title: input.title,
        body: input.body,
        data: input.data === undefined ? Prisma.JsonNull : input.data,
        riderNotificationId: riderRow.id,
      },
    });
    await tx.notificationDelivery.createMany({
      data: [
        {
          notificationEventId: event.id,
          channel: NotificationChannel.in_app,
          status: NotificationDeliveryStatus.delivered,
          deliveredAt: now,
          attemptedAt: now,
        },
        {
          notificationEventId: event.id,
          channel: NotificationChannel.sms,
          status: NotificationDeliveryStatus.pending,
        },
        {
          notificationEventId: event.id,
          channel: NotificationChannel.push,
          status: NotificationDeliveryStatus.pending,
        },
      ],
    });
    this.structuredLogger.log('notifications.rider_created', {
      riderId: input.riderId,
      type: input.type,
      eventId: event.id,
      notificationId: riderRow.id,
    });
    return { notificationId: riderRow.id, eventId: event.id };
  }

  /** Call after the surrounding Prisma transaction commits (SMS/push stubs or real sends). */
  async flushOutboundDeliveries(eventId: string): Promise<void> {
    try {
      await this.delivery.processEventAfterCommit(eventId);
    } catch (e) {
      this.logger.warn(`flushOutboundDeliveries failed for ${eventId}`, e as Error);
      this.structuredLogger.error('notifications.flush_failed', e, { eventId });
    }
  }

  async healthCheck(): Promise<{ ok: boolean; provider: string; detail?: string }> {
    return this.delivery.healthCheck();
  }
}
