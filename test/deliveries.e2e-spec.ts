import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [JwtService], // We might need to provide this if not exported globally or we instantiate standalone
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    // jwtService = app.get<JwtService>(JwtService); // Try getting from app if available
    // If JwtService is not available (likely inside AuthModule), we can just use a new instance if we have the secret
    jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'dev_secret' });

    // Cleanup
    await prisma.delivery.deleteMany();
    await prisma.business.deleteMany();
    await prisma.user.deleteMany();
    await prisma.category.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should setup users and business', async () => {
    // Create Merchant
    const merchant = await prisma.user.create({
      data: {
        name: 'Merchant User',
        phoneE164: '+5511999999991',
        role: Role.MERCHANT,
      },
    });
    merchantId = merchant.id;
    merchantToken = jwtService.sign({ sub: merchant.id, role: merchant.role, name: merchant.name });

    // Create Courier
    const courier = await prisma.user.create({
      data: {
        name: 'Courier User',
        phoneE164: '+5511999999992',
        role: Role.COURIER,
      },
    });
    courierId = courier.id;
    courierToken = jwtService.sign({ sub: courier.id, role: courier.role, name: courier.name });

    // Create Category
    const category = await prisma.category.create({
      data: { name: 'Food', slug: 'food' }
    });

    // Create Business
    const business = await prisma.business.create({
      data: {
        name: 'Test Business',
        slug: 'test-business',
        categoryId: category.id,
        ownerId: merchant.id,
        status: 'ACTIVE',
      }
    });
    businessId = business.id;
  });

  it('/deliveries (POST) - Merchant creates delivery', async () => {
    const res = await request(app.getHttpServer())
      .post('/deliveries')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        businessId: businessId,
        pickupAddress: 'Rua A, 123',
        dropoffAddress: 'Rua B, 456',
        price: 15.50,
        notes: 'Fragile'
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.status).toBe('AVAILABLE');
    deliveryId = res.body.id;
  });

  it('/deliveries (GET) - Merchant lists deliveries', async () => {
    const res = await request(app.getHttpServer())
      .get('/deliveries')
      .set('Authorization', `Bearer ${merchantToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].id).toBe(deliveryId);
  });

  it('/deliveries/available (GET) - Courier sees available delivery', async () => {
     const res = await request(app.getHttpServer())
      .get('/deliveries/available')
      .set('Authorization', `Bearer ${courierToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find(d => d.id === deliveryId);
    expect(found).toBeDefined();
  });

  it('/deliveries/:id/accept (POST) - Courier accepts delivery', async () => {
    const res = await request(app.getHttpServer())
      .post(`/deliveries/${deliveryId}/accept`)
      .set('Authorization', `Bearer ${courierToken}`)
      .expect(200);

    expect(res.body.status).toBe('ACCEPTED');
    expect(res.body.courierId).toBe(courierId);
  });

  it('/deliveries/available (GET) - Delivery no longer available', async () => {
     const res = await request(app.getHttpServer())
      .get('/deliveries/available')
      .set('Authorization', `Bearer ${courierToken}`)
      .expect(200);

    const found = res.body.find(d => d.id === deliveryId);
    expect(found).toBeUndefined();
  });

  it('/deliveries/:id/pickup (POST) - Courier picks up', async () => {
    const res = await request(app.getHttpServer())
      .post(`/deliveries/${deliveryId}/pickup`)
      .set('Authorization', `Bearer ${courierToken}`)
      .expect(200);

    expect(res.body.status).toBe('PICKED_UP');
  });

  it('/deliveries/:id/complete (POST) - Courier completes', async () => {
    const res = await request(app.getHttpServer())
      .post(`/deliveries/${deliveryId}/complete`)
      .set('Authorization', `Bearer ${courierToken}`)
      .expect(200);

    expect(res.body.status).toBe('COMPLETED');
  });

  it('Create another delivery and Cancel', async () => {
     const createRes = await request(app.getHttpServer())
      .post('/deliveries')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        businessId: businessId,
        pickupAddress: 'Rua X',
        dropoffAddress: 'Rua Y',
        price: 20.00
      })
      .expect(201);
    
    const id = createRes.body.id;

    // Accept
    await request(app.getHttpServer())
      .post(`/deliveries/${id}/accept`)
      .set('Authorization', `Bearer ${courierToken}`)
      .expect(200);

    // Cancel
    const cancelRes = await request(app.getHttpServer())
      .post(`/deliveries/${id}/cancel`)
      .set('Authorization', `Bearer ${courierToken}`)
      .expect(200);
    
    expect(cancelRes.body.status).toBe('CANCELED');
  });
});
