import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Santo Anastácio...');

  // 1. Create City
  const city = await prisma.city.upsert({
    where: { name_state: { name: 'Santo Anastácio', state: 'SP' } },
    update: {},
    create: { name: 'Santo Anastácio', state: 'SP' }
  });

  // 2. Define Zones
  const zones = [
    { name: "Zona Central", slug: "zona-central" },
    { name: "Zona Norte", slug: "zona-norte" },
    { name: "Zona Sul", slug: "zona-sul" },
    { name: "Zona Leste", slug: "zona-leste" },
    { name: "Zona Oeste", slug: "zona-oeste" },
    { name: "Zona Rural", slug: "zona-rural" }
  ];

  const zoneMap: Record<string, string> = {};
  for (const z of zones) {
    let zone = await prisma.deliveryZone.findFirst({ where: { name: z.name, cityId: city.id } });
    if (!zone) {
      zone = await prisma.deliveryZone.create({
        data: { name: z.name, cityId: city.id }
      });
    }
    zoneMap[z.slug] = zone.id;
  }

  // 3. Define Neighborhoods
  const neighborhoods = [
    { "name": "Centro", "zoneSlug": "zona-central" },
    { "name": "Vila Ortega", "zoneSlug": "zona-central" },
    { "name": "Vila Sanches", "zoneSlug": "zona-central" },
    { "name": "Vila Martins", "zoneSlug": "zona-central" },
    { "name": "Vila Moreno", "zoneSlug": "zona-central" },
    { "name": "Jardim Santa Helena", "zoneSlug": "zona-norte" },
    { "name": "Jardim Vitória Régia", "zoneSlug": "zona-norte" },
    { "name": "Jardim Nova Esperança", "zoneSlug": "zona-norte" },
    { "name": "Jardim Paulista", "zoneSlug": "zona-norte" },
    { "name": "Vila São João", "zoneSlug": "zona-norte" },
    { "name": "Jardim Planalto", "zoneSlug": "zona-sul" },
    { "name": "Jardim das Flores", "zoneSlug": "zona-sul" },
    { "name": "Jardim São Paulo", "zoneSlug": "zona-sul" },
    { "name": "Vila Esperança", "zoneSlug": "zona-sul" },
    { "name": "Vila Oriente", "zoneSlug": "zona-leste" },
    { "name": "Vila Garcia", "zoneSlug": "zona-leste" },
    { "name": "Residencial Anastácio", "zoneSlug": "zona-leste" },
    { "name": "Vila Industrial", "zoneSlug": "zona-oeste" },
    { "name": "Distrito Industrial", "zoneSlug": "zona-oeste" },
    { "name": "Vila Operária", "zoneSlug": "zona-oeste" },
    { "name": "Área Rural de Santo Anastácio", "zoneSlug": "zona-rural" },
    { "name": "Assentamentos Rurais", "zoneSlug": "zona-rural" },
    { "name": "Chácaras Anastácio", "zoneSlug": "zona-rural" }
  ];

  for (const n of neighborhoods) {
    await prisma.neighborhood.upsert({
      where: { name_cityId: { name: n.name, cityId: city.id } },
      update: { deliveryZoneId: zoneMap[n.zoneSlug] },
      create: { name: n.name, cityId: city.id, deliveryZoneId: zoneMap[n.zoneSlug] }
    });
  }

  // 4. Pricing Matrix
  const pricingMatrix = [
    { "from": "zona-central", "to": "zona-central", "price": 6 },
    { "from": "zona-central", "to": "zona-norte", "price": 7 },
    { "from": "zona-central", "to": "zona-sul", "price": 7 },
    { "from": "zona-central", "to": "zona-leste", "price": 8 },
    { "from": "zona-central", "to": "zona-oeste", "price": 8 },
    { "from": "zona-central", "to": "zona-rural", "price": 12 },
    { "from": "zona-norte", "to": "zona-central", "price": 7 },
    { "from": "zona-norte", "to": "zona-norte", "price": 6 },
    { "from": "zona-norte", "to": "zona-sul", "price": 8 },
    { "from": "zona-norte", "to": "zona-leste", "price": 9 },
    { "from": "zona-norte", "to": "zona-oeste", "price": 9 },
    { "from": "zona-norte", "to": "zona-rural", "price": 13 },
    { "from": "zona-sul", "to": "zona-central", "price": 7 },
    { "from": "zona-sul", "to": "zona-norte", "price": 8 },
    { "from": "zona-sul", "to": "zona-sul", "price": 6 },
    { "from": "zona-sul", "to": "zona-leste", "price": 9 },
    { "from": "zona-sul", "to": "zona-oeste", "price": 9 },
    { "from": "zona-sul", "to": "zona-rural", "price": 13 },
    { "from": "zona-leste", "to": "zona-central", "price": 8 },
    { "from": "zona-leste", "to": "zona-norte", "price": 9 },
    { "from": "zona-leste", "to": "zona-sul", "price": 9 },
    { "from": "zona-leste", "to": "zona-leste", "price": 6 },
    { "from": "zona-leste", "to": "zona-oeste", "price": 10 },
    { "from": "zona-leste", "to": "zona-rural", "price": 14 },
    { "from": "zona-oeste", "to": "zona-central", "price": 8 },
    { "from": "zona-oeste", "to": "zona-norte", "price": 9 },
    { "from": "zona-oeste", "to": "zona-sul", "price": 9 },
    { "from": "zona-oeste", "to": "zona-leste", "price": 10 },
    { "from": "zona-oeste", "to": "zona-oeste", "price": 6 },
    { "from": "zona-oeste", "to": "zona-rural", "price": 14 },
    { "from": "zona-rural", "to": "zona-central", "price": 12 },
    { "from": "zona-rural", "to": "zona-norte", "price": 13 },
    { "from": "zona-rural", "to": "zona-sul", "price": 13 },
    { "from": "zona-rural", "to": "zona-leste", "price": 14 },
    { "from": "zona-rural", "to": "zona-oeste", "price": 14 },
    { "from": "zona-rural", "to": "zona-rural", "price": 10 }
  ];

  for (const rule of pricingMatrix) {
    const originZoneId = zoneMap[rule.from];
    const destZoneId = zoneMap[rule.to];
    
    if (originZoneId && destZoneId) {
      await prisma.zonePriceRule.upsert({
        where: { originZoneId_destZoneId: { originZoneId, destZoneId } },
        update: { price: rule.price },
        create: { originZoneId, destZoneId, price: rule.price }
      });
    }
  }

  console.log('Santo Anastácio seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
