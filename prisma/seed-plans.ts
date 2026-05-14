import { PrismaClient, BillingCycleType, PerDeliveryFeeType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding plans...');

  const defaultPlan = await prisma.plan.upsert({
    where: { id: '069e312f-ff70-4b7a-9257-d59d9ab15138' }, // Using a fixed ID for easy reference in code if needed, or search by name
    update: {},
    create: {
      id: '069e312f-ff70-4b7a-9257-d59d9ab15138',
      name: 'Taxa por Entrega (Padrão)',
      description: 'Cobrança fixa de R$ 2,00 por entrega realizada. Sem mensalidade.',
      monthlyFee: null,
      deliveryLimit: null,
      perDeliveryFee: 2.00,
      perDeliveryFeeType: PerDeliveryFeeType.FIXED,
      billingCycleType: BillingCycleType.FROM_SUBSCRIPTION_DATE,
      isActive: true,
      isPublic: true,
    },
  });

  console.log({ defaultPlan });
  console.log('Seeding plans complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
