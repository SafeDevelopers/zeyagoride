-- Auth/register split, registration completeness, and single-driver vehicle approval.

CREATE TYPE "VehicleApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

ALTER TABLE "User"
ADD COLUMN "registrationCompleted" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "DriverVehicle" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "make" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "tagNumber" TEXT NOT NULL,
  "insuranceExpiry" TEXT,
  "status" "VehicleApprovalStatus" NOT NULL DEFAULT 'pending',
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DriverVehicle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DriverVehicle_driverId_key" ON "DriverVehicle"("driverId");
CREATE INDEX "DriverVehicle_status_updatedAt_idx" ON "DriverVehicle"("status", "updatedAt");

ALTER TABLE "DriverVehicle"
ADD CONSTRAINT "DriverVehicle_driverId_fkey"
FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DriverVehicle"
ADD CONSTRAINT "DriverVehicle_reviewedBy_fkey"
FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
