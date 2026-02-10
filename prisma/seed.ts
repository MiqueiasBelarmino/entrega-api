import { PrismaClient, Role, DeliveryStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Cleanup (optional, be careful in prod)
  // await prisma.delivery.deleteMany();
  // await prisma.business.deleteMany();
  // await prisma.user.deleteMany();
  // await prisma.category.deleteMany();

  // 2. Create Categories
  const foodCategory = await prisma.category.upsert({
    where: { slug: 'food' },
    update: {},
    create: { name: 'Comida', slug: 'food' },
  });

  const logisticsCategory = await prisma.category.upsert({
    where: { slug: 'logistics' },
    update: {},
    create: { name: 'Logística', slug: 'logistics' },
  });

  // [NEW] Root Admin Seeding
  const rootPhone = process.env.ROOT_ADMIN_PHONE_E164;
  if (rootPhone) {
      console.log(`Seeding Root Admin: ${rootPhone}`);
      await prisma.user.upsert({
          where: { phoneE164: rootPhone },
          update: { role: Role.ADMIN, isRoot: true, isActive: true },
          create: {
              name: process.env.ROOT_ADMIN_NAME || 'Root Admin',
              phoneE164: rootPhone,
              role: Role.ADMIN,
              isRoot: true,
              isActive: true,
          }
      });
  }

  // 3. Create Users
  // Merchant
  const merchant = await prisma.user.upsert({
    where: { phoneE164: '+5511999999999' },
    update: {},
    create: {
      name: 'João Merchant',
      phoneE164: '+5511999999999',
      role: Role.MERCHANT,
      email: 'merchant@test.com',
    },
  });

  // Courier 1
  const courier1 = await prisma.user.upsert({
    where: { phoneE164: '+5511888888888' },
    update: {},
    create: {
      name: 'Carlos Courier',
      phoneE164: '+5511888888888',
      role: Role.COURIER,
      email: 'courier1@test.com',
    },
  });

  // Courier 2
  const courier2 = await prisma.user.upsert({
    where: { phoneE164: '+5511777777777' },
    update: {},
    create: {
      name: 'Ana Entregadora',
      phoneE164: '+5511777777777',
      role: Role.COURIER,
      email: 'courier2@test.com',
    },
  });

  // 4. Create Business
  const business = await prisma.business.upsert({
    where: { slug: 'pizzaria-do-joao' },
    update: {},
    create: {
      name: 'Pizzaria do João',
      slug: 'pizzaria-do-joao',
      description: 'A melhor pizza da região',
      categoryId: foodCategory.id,
      ownerId: merchant.id,
      status: 'ACTIVE',
      address: 'Rua das Pizzas, 100',
      phone: '+5511999999999',
      defaultDeliveryPrice: 15.00,
    },
  });

  // 5. Create Deliveries
  // Available Delivery
  await prisma.delivery.create({
    data: {
      businessId: business.id,
      merchantId: merchant.id,
      pickupAddress: 'Rua das Pizzas, 100',
      dropoffAddress: 'Av. Paulista, 1500',
      price: 25.00,
      notes: 'Entregar na portaria',
      status: DeliveryStatus.AVAILABLE,
    },
  });

  // Accepted Delivery (by Courier 1)
  await prisma.delivery.create({
    data: {
      businessId: business.id,
      merchantId: merchant.id,
      pickupAddress: 'Rua das Pizzas, 100',
      dropoffAddress: 'Rua Augusta, 500',
      price: 18.50,
      notes: 'Cuidado, quente',
      status: DeliveryStatus.ACCEPTED,
      courierId: courier1.id,
      acceptedAt: new Date(),
    },
  });

  // Completed Delivery
  await prisma.delivery.create({
    data: {
      businessId: business.id,
      merchantId: merchant.id,
      pickupAddress: 'Rua das Pizzas, 100',
      dropoffAddress: 'Rua da Consolação, 200',
      price: 30.00,
      status: DeliveryStatus.COMPLETED,
      courierId: courier2.id,
      acceptedAt: new Date(),
      pickedUpAt: new Date(),
      completedAt: new Date(),
    },
  });

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
