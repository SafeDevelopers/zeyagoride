-- CreateEnum
CREATE TYPE "RidePaymentMethod" AS ENUM ('cash', 'bank', 'telebirr');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('credit', 'debit', 'commission');

-- CreateEnum
CREATE TYPE "TopUpMethod" AS ENUM ('telebirr', 'bank');

-- CreateEnum
CREATE TYPE "TopUpStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "Ride" ADD COLUMN "paymentMethod" "RidePaymentMethod";

-- CreateTable
CREATE TABLE "DriverWallet" (
    "driverId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "minBalance" INTEGER NOT NULL DEFAULT 100,
    "warningThreshold" INTEGER NOT NULL DEFAULT 300,

    CONSTRAINT "DriverWallet_pkey" PRIMARY KEY ("driverId")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "rideId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopUpRequest" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "TopUpMethod" NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "TopUpStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,

    CONSTRAINT "TopUpRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WalletTransaction_driverId_createdAt_idx" ON "WalletTransaction"("driverId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_rideId_idx" ON "WalletTransaction"("rideId");

-- CreateIndex
CREATE INDEX "WalletTransaction_type_idx" ON "WalletTransaction"("type");

-- CreateIndex
CREATE INDEX "TopUpRequest_driverId_idx" ON "TopUpRequest"("driverId");

-- CreateIndex
CREATE INDEX "TopUpRequest_status_idx" ON "TopUpRequest"("status");

-- AddForeignKey
ALTER TABLE "DriverWallet" ADD CONSTRAINT "DriverWallet_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopUpRequest" ADD CONSTRAINT "TopUpRequest_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
