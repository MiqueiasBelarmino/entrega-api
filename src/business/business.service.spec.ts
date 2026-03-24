import { Test, TestingModule } from '@nestjs/testing';
import { BusinessService } from './business.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('BusinessService', () => {
  let service: BusinessService;
  let prisma: PrismaService;

  const mockPrisma = {
    business: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    neighborhood: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BusinessService>(BusinessService);
    prisma = module.get<PrismaService>(PrismaService);
    
    jest.clearAllMocks();
  });

  describe('findMyBusiness', () => {
    it('should return businesses owned by user', async () => {
      mockPrisma.business.findMany.mockResolvedValue([{ id: 'biz-1' }]);
      const result = await service.findMyBusiness('user-1');
      expect(result).toHaveLength(1);
      expect(prisma.business.findMany).toHaveBeenCalledWith({ where: { ownerId: 'user-1' } });
    });
  });

  describe('update', () => {
    it('should update business data', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({ id: 'biz-1', ownerId: 'user-1' });
      mockPrisma.business.update.mockResolvedValue({ id: 'biz-1', name: 'New Name' });

      const result = await service.update('user-1', 'biz-1', { name: 'New Name' });
      expect(result.name).toBe('New Name');
      expect(prisma.business.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({ id: 'biz-1', ownerId: 'other' });
      await expect(service.update('user-1', 'biz-1', { name: 'New Name' })).rejects.toThrow(ForbiddenException);
    });

    it('should update cityId if neighborhood changes', async () => {
        mockPrisma.business.findUnique.mockResolvedValue({ id: 'biz-1', ownerId: 'user-1' });
        mockPrisma.neighborhood.findUnique.mockResolvedValue({ id: 'n-1', cityId: 'city-new' });
        mockPrisma.business.update.mockResolvedValue({ id: 'biz-1' });

        await service.update('user-1', 'biz-1', { neighborhoodId: 'n-1' });
        
        expect(prisma.business.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ cityId: 'city-new', neighborhoodId: 'n-1' })
        }));
    });
  });
});
