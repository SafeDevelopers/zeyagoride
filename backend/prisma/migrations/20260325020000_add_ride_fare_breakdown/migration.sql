-- AlterTable
ALTER TABLE "Ride"
ADD COLUMN "originalFare" INTEGER,
ADD COLUMN "discountAmount" INTEGER,
ADD COLUMN "finalFare" INTEGER,
ADD COLUMN "promoCode" TEXT;
