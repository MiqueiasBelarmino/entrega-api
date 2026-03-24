import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role, DeliveryStatus, CourierStatus, BusinessStatus } from '@prisma/client';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: PrismaService;

  const mockPrisma = {
    delivery: {
      aggregate: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    business: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('should return combined stats', async () => {
      mockPrisma.delivery.aggregate.mockResolvedValue({ _sum: { price: 100 } });
      mockPrisma.delivery.count.mockResolvedValue(10);
      mockPrisma.user.count
        .mockResolvedValueOnce(5) // couriers
        .mockResolvedValueOnce(3); // merchants

      const result = await service.getStats('today', 'city-1');

      expect(prisma.delivery.aggregate).toHaveBeenCalled();
      expect(prisma.delivery.count).toHaveBeenCalled();
      expect(prisma.user.count).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        totalRevenue: 100,
        totalDeliveries: 10,
        couriersActive: 5,
        merchantsActive: 3,
      });
    });
  });

  describe('cancelDelivery', () => {
    it('should throw NotFoundException if delivery does not exist', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(null);
      await expect(service.cancelDelivery('1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if delivery is already COMPLETED', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({ status: DeliveryStatus.COMPLETED });
      await expect(service.cancelDelivery('1')).rejects.toThrow(ForbiddenException);
    });

    it('should mark delivery as ISSUE if it was PICKED_UP', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({ id: '1', status: DeliveryStatus.PICKED_UP });
      mockPrisma.delivery.update.mockResolvedValue({ status: DeliveryStatus.ISSUE });

      const result = await service.cancelDelivery('1');

      expect(prisma.delivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: DeliveryStatus.ISSUE,
            issueReason: expect.any(String),
          }),
        }),
      );
      expect(result.status).toBe(DeliveryStatus.ISSUE);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1', isRoot: false });
      mockPrisma.user.update.mockResolvedValue({ id: '1', isActive: false });

      const result = await service.updateUser('1', { isActive: false });

      expect(prisma.user.update).toHaveBeenCalled();
      expect(result.isActive).toBe(false);
    });

    it('should throw ForbiddenException if trying to deactivate a ROOT user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'root', isRoot: true });
      await expect(service.updateUser('root', { isActive: false })).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if trying to change ROOT user role to something other than ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'root', isRoot: true, role: Role.ADMIN });
      await expect(service.updateUser('root', { role: Role.COURIER })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAllUsers', () => {
    it('should fetch users with filtering', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: '1', name: 'User1' }]);
      const result = await service.findAllUsers({ role: Role.MERCHANT, query: 'Test' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: Role.MERCHANT,
            OR: expect.any(Array),
          }),
        }),
      );
      expect(result).toHaveLength(1);
    });
  });
});
