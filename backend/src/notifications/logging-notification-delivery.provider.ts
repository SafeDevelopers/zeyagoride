import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationDeliveryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { NotificationDeliveryProvider } from './notification-delivery.provider';

/**
 * Phase 1: persists channel rows as skipped with a clear reason; logs payload for ops.
 * Replace with SMS/push implementations that set `delivered` / `failed` + providerReference.
 */
@Injectable()
export class LoggingNotificationDeliveryProvider implements NotificationDeliveryProvider {
  private readonly logger = new Logger(LoggingNotificationDeliveryProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  async processEventAfterCommit(eventId: string): Promise<void> {
    const event = await this.prisma.notificationEvent.findUnique({
      where: { id: eventId },
      include: {
        deliveries: true,
      },
    });
    if (!event) {
      this.logger.warn(`NotificationEvent missing: ${eventId}`);
      return;
    }
    this.logger.log(
      `[outbox] ${event.eventType} → ${event.recipientType}:${event.recipientId} | ${event.title}`,
    );
    const now = new Date();
    await this.prisma.notificationDelivery.updateMany({
      where: {
        notificationEventId: eventId,
        channel: { in: [NotificationChannel.sms, NotificationChannel.push] },
        status: NotificationDeliveryStatus.pending,
      },
      data: {
        status: NotificationDeliveryStatus.skipped,
        errorMessage: 'provider_stub: configure SMS/push provider',
        attemptedAt: now,
      },
    });
  }

  async healthCheck(): Promise<{ ok: boolean; provider: string; detail?: string }> {
    const isProduction = (process.env.NODE_ENV ?? 'development').trim() === 'production';
    return {
      ok: !isProduction,
      provider: 'log',
      detail: isProduction
        ? 'notification provider is still stubbed; configure a real SMS/push provider before production'
        : 'stub delivery provider enabled for non-production environments',
    };
  }
}
