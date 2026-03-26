-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('unpaid', 'pending', 'authorized', 'paid', 'failed', 'refunded');

-- AlterTable
ALTER TABLE "Ride"
ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'unpaid',
ADD COLUMN "paymentId" TEXT;

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'unpaid',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_rideId_key" ON "Payment"("rideId");
