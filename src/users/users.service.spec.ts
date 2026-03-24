import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Role, BusinessStatus } from '@prisma/client';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    neighborhood: {
      findUnique: jest.fn(),
    },
    business: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a basic user (e.g. courier)', async () => {
      const dto = { name: 'Test', phoneE164: '+551199999999', cityId: 'city-1' };
      const expectedUser = { id: '1', ...dto, role: Role.COURIER };
      
      mockPrismaService.user.create.mockResolvedValue(expectedUser);

      const result = await service.create(dto);
      
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          email: undefined,
          phoneE164: dto.phoneE164,
          role: Role.COURIER,
          cityId: dto.cityId,
        },
      });
      expect(result).toEqual(expectedUser);
    });

    it('should throw NotFoundException if merchant is created without neighborhood', async () => {
      const dto = { name: 'Merchant', phoneE164: '+551199999999', role: Role.MERCHANT, businessName: 'Store', categoryId: 'cat-1' };
      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if merchant neighborhood is invalid', async () => {
      const dto = { name: 'Merchant', phoneE164: '+551199999999', role: Role.MERCHANT, businessName: 'Store', categoryId: 'cat-1', neighborhoodId: 'invalid' };
      mockPrismaService.neighborhood.findUnique.mockResolvedValue(null);
      
      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should create merchant and business in a transaction', async () => {
      const dto = { name: 'Merchant', phoneE164: '+551199999999', role: Role.MERCHANT, businessName: 'Store', categoryId: 'cat-1', neighborhoodId: 'valid-n' };
      const mockNeighborhood = { id: 'valid-n', cityId: 'city-1' };
      const mockUser = { id: 'u-1', name: 'Merchant', role: Role.MERCHANT };
      
      mockPrismaService.neighborhood.findUnique.mockResolvedValue(mockNeighborhood);
      
      // Simulate transaction behavior by executing the callback
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          business: { create: jest.fn().mockResolvedValue({}) }
        };
        const res = await callback(tx);
        expect(tx.user.create).toHaveBeenCalled();
        expect(tx.business.create).toHaveBeenCalled();
        return res;
      });

      const result = await service.create(dto);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findAll', () => {
    it('should return a list of users', async () => {
      const users = [{ id: '1', name: 'User 1' }];
      mockPrismaService.user.findMany.mockResolvedValue(users);

      const result = await service.findAll();
      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(result).toEqual(users);
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      const user = { id: '1', email: 'test@test.com' };
      mockPrismaService.user.findFirst.mockResolvedValue(user);

      const result = await service.findByEmail('test@test.com');
      expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { email: 'test@test.com' } });
      expect(result).toEqual(user);
    });
  });

  describe('findOne', () => {
    it('should return a user if found', async () => {
      const user = { id: '1', name: 'User 1' };
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.findOne('1');
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException if user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updatedUser = { id: '1', name: 'Updated' };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('1', { name: 'Updated' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { name: 'Updated' },
      });
      expect(result).toEqual(updatedUser);
    });
  });
});
