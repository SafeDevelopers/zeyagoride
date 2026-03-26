-- CreateEnum
CREATE TYPE "DriverNotificationType" AS ENUM (
  'low_balance_warning',
  'wallet_blocked',
  'top_up_approved',
  'top_up_rejected',
  'commission_deducted'
);

-- AlterTable
ALTER TABLE "WalletTransaction" ADD COLUMN "metadata" JSONB;

-- AlterTable
ALTER TABLE "TopUpRequest" ADD COLUMN "proofStorageKey" TEXT;
ALTER TABLE "TopUpRequest" ADD COLUMN "proofContentType" TEXT;

-- CreateTable
CREATE TABLE "DriverNotification" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" "DriverNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DriverNotification_driverId_createdAt_idx" ON "DriverNotification"("driverId", "createdAt");

-- CreateIndex
CREATE INDEX "DriverNotification_driverId_readAt_idx" ON "DriverNotification"("driverId", "readAt");

-- AddForeignKey
ALTER TABLE "DriverNotification" ADD CONSTRAINT "DriverNotification_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
