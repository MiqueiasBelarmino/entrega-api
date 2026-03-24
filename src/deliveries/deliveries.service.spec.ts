import { Test, TestingModule } from '@nestjs/testing';
import { DeliveriesService } from './deliveries.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationSender } from '../notifications/notification-channel';
import { PushService } from '../push/push.service';
import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { DeliveryStatus, Role } from '@prisma/client';

describe('DeliveriesService', () => {
  let service: DeliveriesService;
  let prisma: PrismaService;
  let pushService: PushService;

  const mockPrisma = {
    business: {
      findUnique: jest.fn(),
    },
    neighborhood: {
      findUnique: jest.fn(),
    },
    delivery: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockNotifications = { sendOtp: jest.fn() };
  const mockPush = { sendToUser: jest.fn(), sendToUsers: jest.fn() };

  const activeBusiness = { id: 'biz-1', status: 'ACTIVE', ownerId: 'user-1', cityId: 'city-1' };
  const validNeighborhood = { id: 'neigh-1', cityId: 'city-1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveriesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationSender, useValue: mockNotifications },
        { provide: PushService, useValue: mockPush },
      ],
    }).compile();

    service = module.get<DeliveriesService>(DeliveriesService);
    prisma = module.get<PrismaService>(PrismaService);
    pushService = module.get<PushService>(PushService);
    
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and broadcast delivery to all active couriers in city', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(activeBusiness);
      mockPrisma.neighborhood.findUnique.mockResolvedValue(validNeighborhood);
      mockPrisma.delivery.create.mockResolvedValue({ id: 'del-1', preferredCourierId: null });
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'courier-1' }, { id: 'courier-2' }]);

      await service.create('user-1', { businessId: 'biz-1', destNeighborhoodId: 'neigh-1' } as any);

      expect(pushService.sendToUsers).toHaveBeenCalledWith(['courier-1', 'courier-2'], expect.any(Object));
    });

    it('should send priority push to preferred courier instead of broadcasting', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(activeBusiness);
      mockPrisma.neighborhood.findUnique.mockResolvedValue(validNeighborhood);
      mockPrisma.delivery.create.mockResolvedValue({ id: 'del-1', preferredCourierId: 'pref-c-1' });

      await service.create('user-1', { businessId: 'biz-1', destNeighborhoodId: 'neigh-1', preferredCourierId: 'pref-c-1' } as any);

      expect(pushService.sendToUser).toHaveBeenCalledWith('pref-c-1', expect.any(Object));
      expect(pushService.sendToUsers).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if business does not exist', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(null);
      await expect(service.create('user-1', { businessId: 'x' } as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if business is not active', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({ ...activeBusiness, status: 'PENDING' });
      await expect(service.create('user-1', { businessId: 'biz-1' } as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user does not own business', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({ ...activeBusiness, ownerId: 'other' });
      await expect(service.create('user-1', { businessId: 'biz-1' } as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if destination neighborhood does not exist', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(activeBusiness);
      mockPrisma.neighborhood.findUnique.mockResolvedValue(null);
      await expect(service.create('user-1', { businessId: 'biz-1', destNeighborhoodId: 'x' } as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if city is different between business and neighborhood', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(activeBusiness);
      mockPrisma.neighborhood.findUnique.mockResolvedValue({ ...validNeighborhood, cityId: 'city-2' });
      await expect(service.create('user-1', { businessId: 'biz-1', destNeighborhoodId: 'neigh-1' } as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    const mockDelivery = {
      id: 'del-1',
      status: DeliveryStatus.AVAILABLE,
      merchantId: 'm-1',
      courierId: null,
      merchant: { id: 'm-1', name: 'Merchant', phoneE164: '+5511' },
      business: { id: 'b-1', name: 'Store', address: 'Rua X', phone: '999' },
    };

    it('should return delivery for merchant who owns it', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({ ...mockDelivery, status: DeliveryStatus.ACCEPTED, courierId: 'c-1' });
      const result = await service.findOne('m-1', Role.MERCHANT, 'del-1');
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException if merchant does not own delivery', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({ ...mockDelivery, merchantId: 'other-m' });
      await expect(service.findOne('m-1', Role.MERCHANT, 'del-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if delivery does not exist', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(null);
      await expect(service.findOne('m-1', Role.MERCHANT, 'del-1')).rejects.toThrow(NotFoundException);
    });

    it('should allow courier to view AVAILABLE delivery (sanitizing PII)', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      const result = await service.findOne('c-1', Role.COURIER, 'del-1') as any;
      expect(result.merchant.phoneE164).toBeUndefined();
      expect(result.business.phone).toBeUndefined();
    });

    it('should throw ForbiddenException if courier tries to access non-AVAILABLE delivery they do not own', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({ ...mockDelivery, status: DeliveryStatus.ACCEPTED, courierId: 'other-courier' });
      await expect(service.findOne('c-1', Role.COURIER, 'del-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAvailable', () => {
    it('should return empty array if courier has no city', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.findAvailable('c-1');
      expect(result).toEqual([]);
    });

    it('should return available deliveries filtered by courier city', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ cityId: 'city-1' });
      mockPrisma.delivery.findMany.mockResolvedValue([{ id: 'del-1' }]);
      const result = await service.findAvailable('c-1');
      expect(prisma.delivery.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ status: DeliveryStatus.AVAILABLE }),
      }));
      expect(result).toHaveLength(1);
    });
  });

  describe('accept', () => {
    it('should accept an available delivery atomically (updateMany)', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({ id: 'del-1', status: DeliveryStatus.AVAILABLE, courierId: null });
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.delivery.findUnique.mockResolvedValueOnce({ id: 'del-1', status: DeliveryStatus.AVAILABLE });

      await service.accept('courier-1', 'del-1');

      expect(prisma.delivery.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ status: DeliveryStatus.AVAILABLE }),
      }));
    });

    it('should throw ConflictException if delivery was already taken (updateMany count = 0)', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({ id: 'del-1', status: DeliveryStatus.ACCEPTED, courierId: 'other' });
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.accept('courier-1', 'del-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('pickup', () => {
    it('should pickup an ACCEPTED delivery by the assigned courier', async () => {
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 1 });

      await service.pickup('courier-1', 'del-1');
      expect(prisma.delivery.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ status: DeliveryStatus.ACCEPTED, courierId: 'courier-1' }),
      }));
    });

    it('should throw ConflictException if pickup fails (not assigned courier or wrong status)', async () => {
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.delivery.findUnique.mockResolvedValue({ id: 'del-1', courierId: 'courier-1', status: DeliveryStatus.AVAILABLE });
      await expect(service.pickup('courier-1', 'del-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('complete', () => {
    it('should complete a PICKED_UP delivery and notify the merchant', async () => {
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.delivery.findUnique.mockResolvedValue({ id: 'del-1', merchantId: 'm-1' });

      await service.complete('courier-1', 'del-1');
      expect(pushService.sendToUser).toHaveBeenCalledWith('m-1', expect.any(Object));
    });

    it('should throw ConflictException if complete fails', async () => {
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.delivery.findUnique.mockResolvedValue({ id: 'del-1', courierId: 'courier-1', status: DeliveryStatus.ACCEPTED });
      await expect(service.complete('courier-1', 'del-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('cancel (courier)', () => {
    it('should cancel an ACCEPTED delivery by courier and record canceledBy COURIER', async () => {
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 1 });
      await service.cancel('courier-1', 'del-1');
      expect(prisma.delivery.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: DeliveryStatus.CANCELED, canceledBy: 'COURIER' }),
      }));
    });

    it('should throw ConflictException if cancel fails (wrong status or not assigned courier)', async () => {
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.delivery.findUnique.mockResolvedValue({ id: 'del-1', courierId: 'courier-1', status: DeliveryStatus.PICKED_UP });
      await expect(service.cancel('courier-1', 'del-1')).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if delivery is not found on cancel fallback', async () => {
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.delivery.findUnique.mockResolvedValue(null);
      await expect(service.cancel('courier-1', 'del-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelByMerchant', () => {
    it('should cancel AVAILABLE delivery by merchant and notify any assigned courier', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({ id: 'del-1', merchantId: 'm-1', status: DeliveryStatus.AVAILABLE, courierId: null });
      mockPrisma.delivery.update.mockResolvedValue({ id: 'del-1', status: DeliveryStatus.CANCELED });

      await service.cancelByMerchant('m-1', 'del-1', 'Changed mind');
      expect(prisma.delivery.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ canceledBy: 'MERCHANT' }),
      }));
      expect(pushService.sendToUser).not.toHaveBeenCalled(); // No courier yet
    });

    it('should notify courier when canceling an ACCEPTED delivery', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({ id: 'del-1', merchantId: 'm-1', status: DeliveryStatus.ACCEPTED, courierId: 'c-1' });
      mockPrisma.delivery.update.mockResolvedValue({ id: 'del-1', status: DeliveryStatus.CANCELED });

      await service.cancelByMerchant('m-1', 'del-1');
      expect(pushService.sendToUser).toHaveBeenCalledWith('c-1', expect.any(Object));
    });

    it('should throw NotFoundException if delivery does not exist', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(null);
      await expect(service.cancelByMerchant('m-1', 'del-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if merchant does not own delivery', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({ id: 'del-1', merchantId: 'other-m', status: DeliveryStatus.AVAILABLE });
      await expect(service.cancelByMerchant('m-1', 'del-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if delivery is PICKED_UP (too late to cancel)', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({ id: 'del-1', merchantId: 'm-1', status: DeliveryStatus.PICKED_UP });
      await expect(service.cancelByMerchant('m-1', 'del-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('reportIssue', () => {
    it('should mark delivery as ISSUE and notify merchant', async () => {
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.delivery.findUnique.mockResolvedValue({ id: 'del-1', merchantId: 'm-1', courierId: 'c-1' });

      await service.reportIssue('c-1', 'del-1', 'Package damaged');
      expect(pushService.sendToUser).toHaveBeenCalledWith('m-1', expect.any(Object));
    });

    it('should throw NotFoundException if delivery is not found on reportIssue fallback', async () => {
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.delivery.findUnique.mockResolvedValue(null);
      await expect(service.reportIssue('c-1', 'del-1', 'issue')).rejects.toThrow(NotFoundException);
    });
  });
});
