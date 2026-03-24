import { Test, TestingModule } from '@nestjs/testing';
import { ZonesService } from './zones.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('ZonesService', () => {
  let service: ZonesService;
  let prisma: PrismaService;

  const mockPrisma = {
    deliveryZone: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    neighborhood: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    zonePriceRule: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZonesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ZonesService>(ZonesService);
    prisma = module.get<PrismaService>(PrismaService);
    
    jest.clearAllMocks();
  });

  describe('Zones', () => {
    it('should create a zone', async () => {
      mockPrisma.deliveryZone.create.mockResolvedValue({ id: 'z1' });
      await service.createZone({ name: 'Z1', cityId: 'c1' });
      expect(prisma.deliveryZone.create).toHaveBeenCalled();
    });
  });

  describe('Neighborhoods', () => {
    it('should throw ConflictException if neighborhood exists', async () => {
      mockPrisma.neighborhood.findUnique.mockResolvedValue({ id: 'n1' });
      await expect(service.createNeighborhood({ name: 'N1', cityId: 'c1', deliveryZoneId: 'z1' }))
        .rejects.toThrow(ConflictException);
    });

    it('should create neighborhood if not exists', async () => {
      mockPrisma.neighborhood.findUnique.mockResolvedValue(null);
      mockPrisma.neighborhood.create.mockResolvedValue({ id: 'n1' });
      await service.createNeighborhood({ name: 'N1', cityId: 'c1', deliveryZoneId: 'z1' });
      expect(prisma.neighborhood.create).toHaveBeenCalled();
    });
  });

  describe('Price Rules', () => {
    it('should upsert a price rule', async () => {
      mockPrisma.zonePriceRule.upsert.mockResolvedValue({ id: 'r1' });
      await service.upsertPriceRule({ originZoneId: 'z1', destZoneId: 'z2', price: 10 });
      expect(prisma.zonePriceRule.upsert).toHaveBeenCalled();
    });

    it('should find active matrix and format numbers', async () => {
        mockPrisma.zonePriceRule.findMany.mockResolvedValue([
            { originZoneId: 'z1', destZoneId: 'z2', price: '10.50' }
        ]);
        const result = await service.findActiveMatrix();
        expect(result[0].price).toBe(10.5);
    });
  });
});
