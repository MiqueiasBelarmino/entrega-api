import { Test, TestingModule } from '@nestjs/testing';
import { RatingsService } from './ratings.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('RatingsService', () => {
  let service: RatingsService;
  let prisma: PrismaService;

  const mockPrisma = {
    delivery: { findUnique: jest.fn() },
    rating: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RatingsService>(RatingsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  const completedDelivery = { id: 'del-1', status: 'COMPLETED', merchantId: 'm-1', courierId: 'c-1' };

  describe('create', () => {
    it('should create a rating where merchant rates courier', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(completedDelivery);
      mockPrisma.rating.findUnique.mockResolvedValue(null);
      mockPrisma.rating.create.mockResolvedValue({ id: 'r-1' });

      await service.create('m-1', 'del-1', { score: 5, tags: ['fast'] });

      expect(prisma.rating.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ reviewerId: 'm-1', reviewedId: 'c-1', score: 5, role: Role.MERCHANT }),
      }));
    });

    it('should create a rating where courier rates merchant', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(completedDelivery);
      mockPrisma.rating.findUnique.mockResolvedValue(null);
      mockPrisma.rating.create.mockResolvedValue({ id: 'r-2' });

      await service.create('c-1', 'del-1', { score: 4, comment: 'Nice merchant' });

      expect(prisma.rating.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ reviewerId: 'c-1', reviewedId: 'm-1', role: Role.COURIER }),
      }));
    });

    it('should throw NotFoundException if delivery does not exist', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(null);
      await expect(service.create('m-1', 'del-1', { score: 5 })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if delivery is not COMPLETED', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({ ...completedDelivery, status: 'ACCEPTED' });
      await expect(service.create('m-1', 'del-1', { score: 5 })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user is not part of the delivery', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(completedDelivery);
      await expect(service.create('outsider', 'del-1', { score: 5 })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user has already rated', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(completedDelivery);
      mockPrisma.rating.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.create('m-1', 'del-1', { score: 5 })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if the other party (courierId) is missing', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({ ...completedDelivery, courierId: null });
      mockPrisma.rating.findUnique.mockResolvedValue(null);
      await expect(service.create('m-1', 'del-1', { score: 5 })).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByDelivery', () => {
    it('should throw NotFoundException if delivery does not exist', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(null);
      await expect(service.findByDelivery('m-1', 'del-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is not part of the delivery', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(completedDelivery);
      await expect(service.findByDelivery('outsider', 'del-1')).rejects.toThrow(BadRequestException);
    });

    it('should mask the other party rating if current user has not yet rated (blind rating)', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(completedDelivery);
      mockPrisma.rating.findMany.mockResolvedValue([
        { id: 'r-c', reviewerId: 'c-1', reviewedId: 'm-1', score: 5, comment: 'Good' },
      ]);

      const result = await service.findByDelivery('m-1', 'del-1');
      expect(result[0].score).toBeNull();
      expect((result[0] as any).isHidden).toBe(true);
    });

    it('should show full data once the current user has rated (mutual reveal)', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(completedDelivery);
      mockPrisma.rating.findMany.mockResolvedValue([
        { id: 'r-m', reviewerId: 'm-1', reviewedId: 'c-1', score: 4 },
        { id: 'r-c', reviewerId: 'c-1', reviewedId: 'm-1', score: 5 },
      ]);

      const result = await service.findByDelivery('m-1', 'del-1');
      expect(result.find(r => r.reviewerId === 'c-1')?.score).toBe(5);
    });

    it('should return own rating without masking even before the other party rates', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(completedDelivery);
      mockPrisma.rating.findMany.mockResolvedValue([
        { id: 'r-m', reviewerId: 'm-1', reviewedId: 'c-1', score: 4 },
      ]);

      const result = await service.findByDelivery('m-1', 'del-1');
      expect(result.find(r => r.reviewerId === 'm-1')?.score).toBe(4);
    });
  });
});
