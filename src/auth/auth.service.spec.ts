import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { NotificationSender } from '../notifications/notification-channel';
import { UnauthorizedException, BadRequestException, HttpException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as crypto from 'crypto';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let notificationSender: NotificationSender;
  let jwtService: JwtService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    otpToken: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    neighborhood: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockJwt = {
    sign: jest.fn(),
  };

  const mockNotification = {
    sendOtp: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: NotificationSender, useValue: mockNotification },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    notificationSender = module.get<NotificationSender>(NotificationSender);
    
    jest.clearAllMocks();
  });

  describe('startOtp', () => {
    it('should generate OTP and send notification for existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1', phoneE164: '+551199999999' });
      mockPrisma.otpToken.count.mockResolvedValue(0);
      mockPrisma.otpToken.create.mockResolvedValue({});
      mockNotification.sendOtp.mockResolvedValue(undefined);

      const result = await service.startOtp({ phone: '1199999999' });
      
      expect(prisma.user.findUnique).toHaveBeenCalled();
      expect(prisma.otpToken.create).toHaveBeenCalled();
      expect(notificationSender.sendOtp).toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.startOtp({ phone: '1199999999' })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw HttpException if OTP rate limit exceeded', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1', phoneE164: '+551199999999' });
      mockPrisma.otpToken.count.mockResolvedValue(3);

      await expect(service.startOtp({ phone: '1199999999' })).rejects.toThrow(HttpException);
    });
  });

  describe('registerCourier', () => {
    it('should register a new courier and start OTP', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: '1', phoneE164: '+551199999999', role: Role.COURIER });
      mockPrisma.otpToken.count.mockResolvedValue(0);
      
      const result = await service.registerCourier({
        phone: '1199999999',
        name: 'Courier',
        cityId: 'city-1',
      });
      
      expect(prisma.user.create).toHaveBeenCalled();
      expect(notificationSender.sendOtp).toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });

    it('should throw BadRequestException if phone is already registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1' });
      await expect(service.registerCourier({ phone: '1199999999', name: 'Courier', cityId: 'city-1' })).rejects.toThrow(BadRequestException);
    });

    it('should create courier with optional fields (vehiclePlate, cpf, cnh)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: '2', phoneE164: '+551188888888', role: Role.COURIER });
      mockPrisma.otpToken.count.mockResolvedValue(0);

      await service.registerCourier({
        phone: '1188888888',
        name: 'Driver',
        cityId: 'city-1',
        vehiclePlate: 'ABC1234',
        cpf: '123.456.789-00',
        cnh: '12345678901',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ vehiclePlate: 'ABC1234', cpf: '123.456.789-00', cnh: '12345678901' }),
        }),
      );
    });
  });

  describe('registerMerchant', () => {
    it('should register a new merchant in transaction and start OTP', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.neighborhood.findUnique.mockResolvedValue({ id: 'bairro-1', cityId: 'city-1' });
      mockPrisma.$transaction.mockImplementation(async (cb) => {
        return { id: 'm-1', phoneE164: '+551199999999' };
      });
      mockPrisma.otpToken.count.mockResolvedValue(0);

      const result = await service.registerMerchant({
        phone: '1199999999',
        name: 'Merchant',
        businessName: 'Loja',
        categoryId: 'cat-1',
        businessNeighborhoodId: 'bairro-1',
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(notificationSender.sendOtp).toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });

    it('should throw BadRequestException if missing neighborhood', async () => {
       mockPrisma.user.findUnique.mockResolvedValue(null);
       await expect(service.registerMerchant({ phone: '1199999999', name: 'M', businessName: 'B', categoryId: 'C' })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if neighborhood does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.neighborhood.findUnique.mockResolvedValue(null);
      await expect(service.registerMerchant({ phone: '1199999999', name: 'M', businessName: 'B', categoryId: 'C', businessNeighborhoodId: 'invalid' })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if phone is already registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.registerMerchant({ phone: '1199999999', name: 'M', businessName: 'B', categoryId: 'C', businessNeighborhoodId: 'bairro-1' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyOtp', () => {
    const validUser = { id: 'u-1', name: 'User', email: null, role: Role.COURIER, phoneE164: '+551199999999', isActive: true, isRoot: false };

    it('should throw UnauthorizedException if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.verifyOtp({ phone: '1199999999', code: '123456' })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...validUser, isActive: false });
      await expect(service.verifyOtp({ phone: '1199999999', code: '123456' })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if OTP token is not found or expired', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(validUser);
      mockPrisma.otpToken.findFirst.mockResolvedValue(null);
      await expect(service.verifyOtp({ phone: '1199999999', code: '123456' })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw HttpException if OTP attempts exceeded', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(validUser);
      mockPrisma.otpToken.findFirst.mockResolvedValue({ id: 't-1', codeHash: 'hash', attempts: 5 });
      await expect(service.verifyOtp({ phone: '1199999999', code: '123456' })).rejects.toThrow(HttpException);
    });

    it('should throw BadRequestException and increment attempts if code is wrong', async () => {
      const correctHash = crypto.createHash('sha256').update('999999').digest('hex');
      mockPrisma.user.findUnique.mockResolvedValue(validUser);
      mockPrisma.otpToken.findFirst.mockResolvedValue({ id: 't-1', codeHash: correctHash, attempts: 0 });
      mockPrisma.otpToken.update.mockResolvedValue({});

      await expect(service.verifyOtp({ phone: '1199999999', code: '111111' })).rejects.toThrow(BadRequestException);
      expect(prisma.otpToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ attempts: { increment: 1 } }) }),
      );
    });

    it('should return accessToken and user if OTP is valid', async () => {
      const code = '654321';
      const correctHash = crypto.createHash('sha256').update(code).digest('hex');
      mockPrisma.user.findUnique.mockResolvedValue(validUser);
      mockPrisma.otpToken.findFirst.mockResolvedValue({ id: 't-1', codeHash: correctHash, attempts: 0 });
      mockPrisma.otpToken.update.mockResolvedValue({});
      mockJwt.sign.mockReturnValue('signed-jwt-token');

      const result = await service.verifyOtp({ phone: '1199999999', code });

      expect(prisma.otpToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ consumedAt: expect.any(Date) }) }),
      );
      expect(jwtService.sign).toHaveBeenCalled();
      expect(result.accessToken).toBe('signed-jwt-token');
      expect(result.user.id).toBe('u-1');
    });
  });

  describe('getMe', () => {
    it('should return user data with city and businesses', async () => {
      const fullUser = { id: 'u-1', name: 'User', city: { id: 'c-1', name: 'SAP' }, businesses: [] };
      mockPrisma.user.findUnique.mockResolvedValue(fullUser);

      const result = await service.getMe('u-1');
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u-1' }, include: expect.any(Object) }),
      );
      expect(result).toEqual(fullUser);
    });
  });
});
