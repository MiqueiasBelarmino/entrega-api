import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role, DeliveryStatus } from '@prisma/client';

describe('Deliveries (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let merchantToken: string;
  let courierToken: string;
  let merchantId: string;
  let courierId: string;
  let businessId: string;
  let deliveryId: string;
  let cityId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [JwtService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'dev_secret' });

    // Full Cleanup
    await prisma.otpToken.deleteMany();
    await prisma.rating.deleteMany();
    await prisma.delivery.deleteMany();
    await prisma.business.deleteMany();
    await prisma.pushSubscription.deleteMany();
    await prisma.user.deleteMany();
    await prisma.neighborhood.deleteMany();
    await prisma.zonePriceRule.deleteMany();
    await prisma.deliveryZone.deleteMany();
    await prisma.city.deleteMany();
    await prisma.category.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should setup city, users and business', async () => {
    // Create City
    const city = await prisma.city.create({
        data: { name: 'E2E City', state: 'TS' }
    });
    cityId = city.id;

    // Create Merchant
    const merchant = await prisma.user.create({
      data: {
        name: 'Merchant User',
        phoneE164: '+5511999999993',
        role: Role.MERCHANT,
      },
    });
    merchantId = merchant.id;
    merchantToken = jwtService.sign({ sub: merchant.id, role: merchant.role, name: merchant.name });

    // Create Courier
    const courier = await prisma.user.create({
      data: {
        name: 'Courier User',
        phoneE164: '+5511999999994',
        role: Role.COURIER,
        cityId: cityId, // Required for available deliveries
        isActive: true,
      },
    });
    courierId = courier.id;
    courierToken = jwtService.sign({ sub: courier.id, role: courier.role, name: courier.name });

    // Create Category
    const category = await prisma.category.create({
      data: { name: 'Logistics', slug: 'log-e2e' }
    });

    // Create Delivery Zone & Neighborhood for creation validation
    const zone = await prisma.deliveryZone.create({
        data: { name: 'Central Zone', cityId: cityId }
    });
    const neighborhood = await prisma.neighborhood.create({
        data: { name: 'Central Neighborhood', cityId: cityId, deliveryZoneId: zone.id }
    });

    // Create Business
    const business = await prisma.business.create({
      data: {
        name: 'Test Business E2E',
        slug: 'test-business-e2e',
        categoryId: category.id,
        ownerId: merchant.id,
        status: 'ACTIVE',
        cityId: cityId,
        neighborhoodId: neighborhood.id,
      }
    });
    businessId = business.id;
  });

  it('/deliveries (POST) - Merchant creates delivery', async () => {
    // We need a dest neighborhood. Use the same city.
    const neighbor = await prisma.neighborhood.findFirst({ where: { cityId } });
    
    const res = await request(app.getHttpServer())
      .post('/deliveries')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        businessId: businessId,
        pickupAddress: 'Pickup Point',
        dropoffAddress: 'Dropoff Point',
        destNeighborhoodId: neighbor!.id,
        price: 15.00,
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.status).toBe(DeliveryStatus.AVAILABLE);
    deliveryId = res.body.id;
  });

  it('/deliveries/available (GET) - Courier sees delivery', async () => {
      const res = await request(app.getHttpServer())
        .get('/deliveries/available')
        .set('Authorization', `Bearer ${courierToken}`)
        .expect(200);

      expect(res.body.some(d => d.id === deliveryId)).toBe(true);
  });

  it('/deliveries/:id/accept (POST) - Courier accepts', async () => {
      await request(app.getHttpServer())
        .post(`/deliveries/${deliveryId}/accept`)
        .set('Authorization', `Bearer ${courierToken}`)
        .expect(200);

      const updated = await prisma.delivery.findUnique({ where: { id: deliveryId } });
      expect(updated?.status).toBe(DeliveryStatus.ACCEPTED);
      expect(updated?.courierId).toBe(courierId);
  });

  it('/deliveries/:id/pickup (POST) - Courier picks up', async () => {
      await request(app.getHttpServer())
        .post(`/deliveries/${deliveryId}/pickup`)
        .set('Authorization', `Bearer ${courierToken}`)
        .expect(200);

      const updated = await prisma.delivery.findUnique({ where: { id: deliveryId } });
      expect(updated?.status).toBe(DeliveryStatus.PICKED_UP);
  });

  it('/deliveries/:id/complete (POST) - Courier completes', async () => {
      await request(app.getHttpServer())
        .post(`/deliveries/${deliveryId}/complete`)
        .set('Authorization', `Bearer ${courierToken}`)
        .expect(200);

      const updated = await prisma.delivery.findUnique({ where: { id: deliveryId } });
      expect(updated?.status).toBe(DeliveryStatus.COMPLETED);
  });
});
