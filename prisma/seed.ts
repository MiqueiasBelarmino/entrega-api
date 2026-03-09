import { PrismaClient, Role, DeliveryStatus } from '@prisma/client';

const prisma = new PrismaClient();
const isDev = process.env.NODE_ENV === 'development';
const rootPhone = process.env.ROOT_ADMIN_PHONE_E164;

async function main() {
  if (!isDev) {
    console.log('Skipping seed in production');
    return;
  }
  console.log('Seeding database...');

  // await prisma.delivery.deleteMany();
  // await prisma.business.deleteMany();
  // await prisma.user.deleteMany();
  // await prisma.category.deleteMany();
  // await prisma.notificationProvider.deleteMany();

  const foodCategory = await prisma.category.upsert({
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

  // await prisma.notificationProvider.upsert({
  //   where: { providerKey: 'WHATSAPP_META' },
  //   update: {
  //     name: 'WhatsApp Cloud API (Meta)',
  //     status: 'ACTIVE',
  //     priority: 1,
  //     maxRetries: 3,
  //     retryDelayMs: 1000,
  //     timeoutMs: 5000,
  //   },
  //   create: {
  //     providerKey: 'WHATSAPP_META',
  //     name: 'WhatsApp Cloud API (Meta)',
  //     status: 'ACTIVE',
  //     priority: 1,
  //     maxRetries: 3,
  //     retryDelayMs: 1000,
  //     timeoutMs: 5000,
  //   },
  // });

  // if (rootPhone) {
  //   console.log(`Seeding Root Admin: ${rootPhone}`);
  //   await prisma.user.upsert({
  //     where: { phoneE164: rootPhone },
  //     update: { role: Role.ADMIN, isRoot: true, isActive: true },
  //     create: {
  //       name: process.env.ROOT_ADMIN_NAME || 'Root Admin',
  //       phoneE164: rootPhone,
  //       role: Role.ADMIN,
  //       isRoot: true,
  //       isActive: true,
  //     }
  //   });
  // }

  const zoneCentral = await prisma.deliveryZone.create({
    data: { name: 'Zona Central', description: 'Região central da cidade' }
  });
  
  const zoneSul = await prisma.deliveryZone.create({
    data: { name: 'Zona Sul', description: 'Região sul' }
  });

  const neighborhoodCentro = await prisma.neighborhood.create({
    data: { name: 'Centro', city: 'São Paulo', deliveryZoneId: zoneCentral.id }
  });

  const neighborhoodPaulista = await prisma.neighborhood.create({
    data: { name: 'Bela Vista', city: 'São Paulo', deliveryZoneId: zoneCentral.id }
  });

  const neighborhoodMoema = await prisma.neighborhood.create({
    data: { name: 'Moema', city: 'São Paulo', deliveryZoneId: zoneSul.id }
  });

  await prisma.zonePriceRule.createMany({
    data: [
      { originZoneId: zoneCentral.id, destZoneId: zoneCentral.id, price: 8.00 },
      { originZoneId: zoneCentral.id, destZoneId: zoneSul.id, price: 15.00 },
      { originZoneId: zoneSul.id, destZoneId: zoneSul.id, price: 10.00 },
      { originZoneId: zoneSul.id, destZoneId: zoneCentral.id, price: 14.00 }
    ]
  });

  // const merchant = await prisma.user.upsert({
  //   where: { phoneE164: '+5511999999999' },
  //   update: {},
  //   create: {
  //     name: 'Merchant01',
  //     phoneE164: '+5511999999999',
  //     role: Role.MERCHANT,
  //     email: 'merchant01@test.com',
  //   },
  // });

  // const courier01 = await prisma.user.upsert({
  //   where: { phoneE164: '+5511888888888' },
  //   update: {},
  //   create: {
  //     name: 'Courier01',
  //     phoneE164: '+5511888888888',
  //     role: Role.COURIER,
  //     email: 'courier01@test.com',
  //   },
  // });

  // const courier02 = await prisma.user.upsert({
  //   where: { phoneE164: '+5511777777777' },
  //   update: {},
  //   create: {
  //     name: 'Courier02',
  //     phoneE164: '+5511777777777',
  //     role: Role.COURIER,
  //     email: 'courier02@test.com',
  //   },
  // });

  // const business = await prisma.business.upsert({
  //   where: { slug: 'pizzaria-do-joao' },
  //   update: {},
  //   create: {
  //     name: 'Pizzaria do João',
  //     slug: 'pizzaria-do-joao',
  //     description: 'A melhor pizza da região',
  //     categoryId: foodCategory.id,
  //     ownerId: merchant.id,
  //     status: 'ACTIVE',
  //     address: 'Rua das Pizzas, 100',
  //     neighborhoodId: neighborhoodCentro.id,
  //     phone: '+5511999999999',
  //     defaultDeliveryPrice: 15.00,
  //   },
  // });

  // // Available Delivery
  // await prisma.delivery.create({
  //   data: {
  //     businessId: business.id,
  //     merchantId: merchant.id,
  //     pickupAddress: 'Rua das Pizzas, 100',
  //     dropoffAddress: 'Av. Paulista, 1500',
  //     destNeighborhoodId: neighborhoodPaulista.id,
  //     price: 25.00,
  //     notes: 'Entregar na portaria',
  //     status: DeliveryStatus.AVAILABLE,
  //   },
  // });

  // // Accepted Delivery (by Courier 1)
  // await prisma.delivery.create({
  //   data: {
  //     businessId: business.id,
  //     merchantId: merchant.id,
  //     pickupAddress: 'Rua das Pizzas, 100',
  //     dropoffAddress: 'Rua Augusta, 500',
  //     destNeighborhoodId: neighborhoodPaulista.id,
  //     price: 18.50,
  //     notes: 'Cuidado, quente',
  //     status: DeliveryStatus.ACCEPTED,
  //     courierId: courier01.id,
  //     acceptedAt: new Date(),
  //   },
  // });

  // // Completed Delivery
  // await prisma.delivery.create({
  //   data: {
  //     businessId: business.id,
  //     merchantId: merchant.id,
  //     pickupAddress: 'Rua das Pizzas, 100',
  //     dropoffAddress: 'Rua da Consolação, 200',
  //     destNeighborhoodId: neighborhoodPaulista.id,
  //     price: 30.00,
  //     status: DeliveryStatus.COMPLETED,
  //     courierId: courier02.id,
  //     acceptedAt: new Date(),
  //     pickedUpAt: new Date(),
  //     completedAt: new Date(),
  //   },
  // });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
