import { PrismaClient, Role, DeliveryStatus } from '@prisma/client';

const prisma = new PrismaClient();
const isDev = process.env.NODE_ENV === 'development';
const rootPhone = process.env.ROOT_ADMIN_PHONE_E164;

async function main() {
  if (isDev) {
    console.log('[PROD] Skipping seed in development');
    return;
  }
  console.log('[PROD] Seeding database.');

  await prisma.category.upsert({
    where: { id: "069e312f-ff70-4b7a-9257-d59d9ab15138" },
    update: {
      name: 'Comida',
      slug: 'food',
    },
    create: {
      id: "069e312f-ff70-4b7a-9257-d59d9ab15138",
      name: 'Comida',
      slug: 'food',
    },
  });

  await prisma.notificationProvider.upsert({
    where: { providerKey: 'WHATSAPP_META' },
    update: {
      name: 'WhatsApp Cloud API (Meta)',
      status: 'ACTIVE',
      priority: 1,
      maxRetries: 3,
      retryDelayMs: 1000,
      timeoutMs: 5000,
    },
    create: {
      providerKey: 'WHATSAPP_META',
      name: 'WhatsApp Cloud API (Meta)',
      status: 'ACTIVE',
      priority: 1,
      maxRetries: 3,
      retryDelayMs: 1000,
      timeoutMs: 5000,
    },
  });

  if (rootPhone) {
    console.log(`[PROD] Seeding Root Admin: ${rootPhone}`);
    await prisma.user.upsert({
      where: { phoneE164: rootPhone },
      update: { role: Role.ADMIN, isRoot: true, isActive: true },
      create: {
        name: 'Miquéias Belarmino',
        phoneE164: rootPhone,
        role: Role.ADMIN,
        isRoot: true,
        isActive: true,
      }
    });
  }

  console.log('[PROD] Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
