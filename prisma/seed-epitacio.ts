import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Presidente Epitácio...');

  // 1. Create City
  const epitacio = await prisma.city.upsert({
    where: { name_state: { name: 'Presidente Epitácio', state: 'SP' } },
    update: {},
    create: { name: 'Presidente Epitácio', state: 'SP' }
  });

  // 2. Define Zones
  const epitacioZones = [
    { name: "Zona Central", slug: "zona-central" },
    { name: "Zona Norte", slug: "zona-norte" },
    { name: "Zona Sul", slug: "zona-sul" },
    { name: "Zona Leste", slug: "zona-leste" },
    { name: "Zona Oeste", slug: "zona-oeste" },
    { name: "Zona Rural", slug: "zona-rural" }
  ];

  const epitacioZoneMap: Record<string, string> = {};
  for (const z of epitacioZones) {
    let zone = await prisma.deliveryZone.findFirst({ where: { name: z.name, cityId: epitacio.id } });
    if (!zone) {
      zone = await prisma.deliveryZone.create({
        data: { name: z.name, cityId: epitacio.id }
      });
    }
    epitacioZoneMap[z.slug] = zone.id;
  }

  // 3. Define Neighborhoods
  const epitacioNeighborhoods = [
    { "name": "Centro", "zoneSlug": "zona-central" },
    { "name": "Vila Santa Rosa", "zoneSlug": "zona-central" },
    { "name": "Vila Continental", "zoneSlug": "zona-central" },
    { "name": "Vila Cruzeiro do Sul", "zoneSlug": "zona-central" },
    { "name": "Vila Monte Castelo", "zoneSlug": "zona-central" },
    { "name": "Vila Nossa Senhora de Aparecida", "zoneSlug": "zona-central" },
    { "name": "Vila Paraíso", "zoneSlug": "zona-central" },
    { "name": "Vila Paraná", "zoneSlug": "zona-central" },
    { "name": "Vila Batista", "zoneSlug": "zona-central" },
    { "name": "Barranca Rio Paraná", "zoneSlug": "zona-central" },
    { "name": "Jardim Aeroporto", "zoneSlug": "zona-norte" },
    { "name": "Jardim Real", "zoneSlug": "zona-norte" },
    { "name": "Jardim Real II", "zoneSlug": "zona-norte" },
    { "name": "Jardim Primavera", "zoneSlug": "zona-norte" },
    { "name": "Jardim Tropical", "zoneSlug": "zona-norte" },
    { "name": "Jardim dos Pioneiros", "zoneSlug": "zona-norte" },
    { "name": "Jardim Alto do Mirante I", "zoneSlug": "zona-norte" },
    { "name": "Jardim Alto do Mirante II", "zoneSlug": "zona-norte" },
    { "name": "Jardim Bela Vista", "zoneSlug": "zona-norte" },
    { "name": "Jardim América", "zoneSlug": "zona-norte" },
    { "name": "Jardim das Paineiras", "zoneSlug": "zona-norte" },
    { "name": "Vila Maria", "zoneSlug": "zona-norte" },
    { "name": "Vila Ana Maria", "zoneSlug": "zona-norte" },
    { "name": "Vila Industrial", "zoneSlug": "zona-norte" },
    { "name": "Vila São José", "zoneSlug": "zona-norte" },
    { "name": "Vila Vista Alegre", "zoneSlug": "zona-norte" },
    { "name": "Vila Nova", "zoneSlug": "zona-norte" },
    { "name": "Jardim Campo Grande", "zoneSlug": "zona-sul" },
    { "name": "Jardim Esperança", "zoneSlug": "zona-sul" },
    { "name": "Jardim Flor de Acácia", "zoneSlug": "zona-sul" },
    { "name": "Jardim Oriental", "zoneSlug": "zona-sul" },
    { "name": "Jardim Pontal", "zoneSlug": "zona-sul" },
    { "name": "Jardim São João Escócia", "zoneSlug": "zona-sul" },
    { "name": "Jardim Jaçanã", "zoneSlug": "zona-sul" },
    { "name": "Jardim Tangará", "zoneSlug": "zona-sul" },
    { "name": "Vila Boa Vista", "zoneSlug": "zona-sul" },
    { "name": "Vila Palmira", "zoneSlug": "zona-leste" },
    { "name": "Vila Natal", "zoneSlug": "zona-leste" },
    { "name": "Vila Porã", "zoneSlug": "zona-leste" },
    { "name": "Vila Sobrasil", "zoneSlug": "zona-leste" },
    { "name": "Vila Vicente", "zoneSlug": "zona-leste" },
    { "name": "Vila Santo Antônio", "zoneSlug": "zona-leste" },
    { "name": "Vila Gilberto", "zoneSlug": "zona-leste" },
    { "name": "Loteamento Sarraipa", "zoneSlug": "zona-leste" },
    { "name": "Loteamento Eduy Mello", "zoneSlug": "zona-leste" },
    { "name": "Residencial São Paulo", "zoneSlug": "zona-leste" },
    { "name": "Distrito Industrial", "zoneSlug": "zona-oeste" },
    { "name": "Vila Porto Tibiriçá", "zoneSlug": "zona-oeste" },
    { "name": "Vila Presidente Vargas", "zoneSlug": "zona-oeste" },
    { "name": "Vila São Luiz", "zoneSlug": "zona-oeste" },
    { "name": "Vila Planalto", "zoneSlug": "zona-oeste" },
    { "name": "Loteamento Eder", "zoneSlug": "zona-oeste" },
    { "name": "Granjas Agrícolas Helvecio", "zoneSlug": "zona-oeste" },
    { "name": "Campinal", "zoneSlug": "zona-rural" },
    { "name": "Centro (Campinal)", "zoneSlug": "zona-rural" },
    { "name": "Área Rural de Presidente Epitácio", "zoneSlug": "zona-rural" },
    { "name": "Área Rural de Campinal", "zoneSlug": "zona-rural" },
    { "name": "Estância Santa Priscila", "zoneSlug": "zona-rural" },
    { "name": "Chácaras Real", "zoneSlug": "zona-rural" },
    { "name": "Condomínio Estância", "zoneSlug": "zona-rural" }
  ];

  for (const n of epitacioNeighborhoods) {
    await prisma.neighborhood.upsert({
      where: { name_cityId: { name: n.name, cityId: epitacio.id } },
      update: { deliveryZoneId: epitacioZoneMap[n.zoneSlug] },
      create: { name: n.name, cityId: epitacio.id, deliveryZoneId: epitacioZoneMap[n.zoneSlug] }
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
    const originZoneId = epitacioZoneMap[rule.from];
    const destZoneId = epitacioZoneMap[rule.to];
    
    if (originZoneId && destZoneId) {
      await prisma.zonePriceRule.upsert({
        where: { originZoneId_destZoneId: { originZoneId, destZoneId } },
        update: { price: rule.price },
        create: { originZoneId, destZoneId, price: rule.price }
      });
    }
  }

  console.log('Presidente Epitácio seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
