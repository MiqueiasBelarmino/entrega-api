import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { NotificationSender } from './../src/notifications/notification-channel';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const mockNotificationSender = {
    sendOtp: jest.fn().mockResolvedValue(true),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(NotificationSender)
    .useValue(mockNotificationSender)
    .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Cleanup before tests
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

    // Create a base city for courier registration
    await prisma.city.create({
      data: { id: 'city-test-1', name: 'Test City', state: 'TS', isActive: true },
    });
  });

  afterAll(async () => {
    // Cleanup after tests
    await prisma.otpToken.deleteMany();
    await prisma.business.deleteMany();
    await prisma.neighborhood.deleteMany();
    await prisma.user.deleteMany();
    await prisma.city.deleteMany();
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('/auth/register/courier (POST)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register/courier')
      .send({
        phone: '11999999991',
        name: 'Test Courier',
        cityId: 'city-test-1'
      })
      .expect(201);

    expect(res.body).toEqual({ ok: true });
    expect(mockNotificationSender.sendOtp).toHaveBeenCalled();

    // Verify user was created in DB
    const user = await prisma.user.findUnique({
      where: { phoneE164: '+5511999999991' }
    });
    expect(user).toBeDefined();
    expect(user?.role).toBe('COURIER');
  });

  it('/auth/start (POST)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/start')
      .send({
        phone: '11999999991' // Exists from previous test
      })
      .expect(201);

    expect(res.body).toEqual({ ok: true });
    expect(mockNotificationSender.sendOtp).toHaveBeenCalled();
  });

  it('/auth/verify (POST)', async () => {
    // To verify, we need the actual OTP code or bypass it.
    // The simplest way in e2e when mocking SMS is to lookup the OTP hash or recreate it.
    // However, the hash is SHA256. Since we don't know the generated code without intercepting it,
    // let's manually create an OTP token in DB with a known hash of '123456'.
    const user = await prisma.user.findUnique({ where: { phoneE164: '+5511999999991' } });
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update('123456').digest('hex');
    
    await prisma.otpToken.create({
      data: {
        userId: user!.id,
        codeHash: hash,
        sentTo: '+5511999999991',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    });

    const res = await request(app.getHttpServer())
      .post('/auth/verify')
      .send({
        phone: '11999999991',
        code: '123456'
      })
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.phoneE164).toBe('+5511999999991');
  });

  it('/auth/verify (POST) - invalid code', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/verify')
      .send({
        phone: '11999999991',
        code: 'wrong'
      })
      .expect(400); // BadRequestException
      
    expect(res.body.message).toBe('Código inválido.');
  });
});
