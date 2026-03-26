import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.user.upsert({
    where: { id: 'placeholder-rider' },
    create: { id: 'placeholder-rider', role: 'rider', name: 'Demo Rider' },
    update: {},
  });
  await prisma.user.upsert({
    where: { id: 'placeholder-driver' },
    create: { id: 'placeholder-driver', role: 'driver', name: 'Demo Driver' },
    update: {},
  });
  await prisma.driver.upsert({
    where: { id: 'placeholder-driver' },
    create: {
      id: 'placeholder-driver',
      online: false,
      isVerified: false,
      verificationStatus: 'pending',
    },
    update: {},
  });
  await prisma.driverWallet.upsert({
    where: { driverId: 'placeholder-driver' },
    create: {
      driverId: 'placeholder-driver',
      balance: 10_000,
      minBalance: 100,
      warningThreshold: 300,
    },
    update: {
      balance: 10_000,
    },
  });
  await prisma.appSetting.upsert({
    where: { key: 'requireRideSafetyPin' },
    create: { key: 'requireRideSafetyPin', booleanValue: true },
    update: {},
  });
  await prisma.appSetting.upsert({
    where: { key: 'pricingSettings' },
    create: {
      key: 'pricingSettings',
      jsonValue: {
        baseFare: 35,
        perKmRate: 11,
        perMinuteRate: 2,
        minimumFare: 25,
        cancellationFee: 20,
      },
    },
    update: {},
  });
  await prisma.appSetting.upsert({
    where: { key: 'promoSettings' },
    create: {
      key: 'promoSettings',
      jsonValue: {
        enabled: true,
        code: 'ZEYAGO20',
        discountType: 'percent',
        discountAmount: 20,
        active: true,
      },
    },
    update: {},
  });
  await prisma.appSetting.upsert({
    where: { key: 'commissionSettings' },
    create: {
      key: 'commissionSettings',
      jsonValue: { commissionType: 'percent', commissionRate: 5 },
    },
    update: {},
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
