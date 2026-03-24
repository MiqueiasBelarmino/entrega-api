import { Test, TestingModule } from '@nestjs/testing';
import { CitiesService } from './cities.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('CitiesService', () => {
  let service: CitiesService;
  let prisma: PrismaService;

  const mockPrisma = {
    city: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitiesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CitiesService>(CitiesService);
    prisma = module.get<PrismaService>(PrismaService);
    
    jest.clearAllMocks();
  });

  it('should create a city', async () => {
    mockPrisma.city.create.mockResolvedValue({ id: '1', name: 'City' });
    const result = await service.create({ name: 'City', state: 'TS' });
    expect(result.name).toBe('City');
    expect(prisma.city.create).toHaveBeenCalled();
  });

  it('should find all cities', async () => {
    mockPrisma.city.findMany.mockResolvedValue([{ id: '1' }]);
    const result = await service.findAll();
    expect(result).toHaveLength(1);
  });

  it('should throw NotFoundException if city not found', async () => {
    mockPrisma.city.findUnique.mockResolvedValue(null);
    await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
  });
});
