import { PrismaClient, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Finding businesses without subscriptions...');

  const businesses = await prisma.business.findMany({
    where: {
      status: 'ACTIVE',
      subscription: { is: null },
    },
  });

  console.log(`Found ${businesses.length} businesses to fix.`);

  const planId = '069e312f-ff70-4b7a-9257-d59d9ab15138';

  for (const business of businesses) {
    console.log(`Creating subscription for business: ${business.name} (${business.id})`);
    
    await prisma.subscription.create({
      data: {
        businessId: business.id,
        planId,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        nextBillingDate: new Date(), // Set to today to allow immediate billing or cycle start
      },
    });
  }

  console.log('Fix complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
