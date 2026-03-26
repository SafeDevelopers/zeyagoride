import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LoggingNotificationDeliveryProvider } from './logging-notification-delivery.provider';
import { NOTIFICATION_DELIVERY_PROVIDER } from './notification-delivery.provider';
import { NotificationService } from './notification.service';

@Module({
  imports: [PrismaModule],
  providers: [
    LoggingNotificationDeliveryProvider,
    {
      provide: NOTIFICATION_DELIVERY_PROVIDER,
      useExisting: LoggingNotificationDeliveryProvider,
    },
    NotificationService,
  ],
  exports: [NotificationService, NOTIFICATION_DELIVERY_PROVIDER],
})
export class NotificationsModule {}
