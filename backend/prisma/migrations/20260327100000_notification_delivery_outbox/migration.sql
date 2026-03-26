-- Outbound notification events + per-channel delivery rows; rider in-app inbox; driver ride/wallet types.

CREATE TYPE "RiderNotificationType" AS ENUM (
  'driver_assigned',
  'driver_arrived',
  'trip_started',
  'trip_completed',
  'ride_cancelled'
);

CREATE TYPE "NotificationRecipientType" AS ENUM ('rider', 'driver');

CREATE TYPE "NotificationChannel" AS ENUM ('in_app', 'sms', 'push');

CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('pending', 'delivered', 'failed', 'skipped');

CREATE TYPE "NotificationEventType" AS ENUM (
  'low_balance_warning',
  'wallet_blocked',
  'top_up_approved',
  'top_up_rejected',
  'commission_deducted',
  'new_ride_request',
  'ride_cancelled',
  'driver_assigned',
  'driver_arrived',
  'trip_started',
  'trip_completed'
);

ALTER TYPE "DriverNotificationType" ADD VALUE 'new_ride_request';
ALTER TYPE "DriverNotificationType" ADD VALUE 'ride_cancelled';

CREATE TABLE "RiderNotification" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "type" "RiderNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RiderNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationEvent" (
    "id" TEXT NOT NULL,
    "recipientType" "NotificationRecipientType" NOT NULL,
    "recipientId" TEXT NOT NULL,
    "eventType" "NotificationEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "driverNotificationId" TEXT,
    "riderNotificationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationEventId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'pending',
    "providerReference" TEXT,
    "errorMessage" TEXT,
    "attemptedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationEvent_driverNotificationId_key" ON "NotificationEvent"("driverNotificationId");

CREATE UNIQUE INDEX "NotificationEvent_riderNotificationId_key" ON "NotificationEvent"("riderNotificationId");

CREATE INDEX "NotificationEvent_recipientType_recipientId_createdAt_idx" ON "NotificationEvent"("recipientType", "recipientId", "createdAt");

CREATE INDEX "NotificationEvent_eventType_createdAt_idx" ON "NotificationEvent"("eventType", "createdAt");

CREATE INDEX "RiderNotification_riderId_createdAt_idx" ON "RiderNotification"("riderId", "createdAt");

CREATE INDEX "RiderNotification_riderId_readAt_idx" ON "RiderNotification"("riderId", "readAt");

CREATE INDEX "NotificationDelivery_notificationEventId_channel_idx" ON "NotificationDelivery"("notificationEventId", "channel");

CREATE INDEX "NotificationDelivery_status_channel_idx" ON "NotificationDelivery"("status", "channel");

ALTER TABLE "RiderNotification" ADD CONSTRAINT "RiderNotification_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_driverNotificationId_fkey" FOREIGN KEY ("driverNotificationId") REFERENCES "DriverNotification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_riderNotificationId_fkey" FOREIGN KEY ("riderNotificationId") REFERENCES "RiderNotification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationEventId_fkey" FOREIGN KEY ("notificationEventId") REFERENCES "NotificationEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
