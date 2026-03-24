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
    create: { id: 'placeholder-driver', online: false },
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
