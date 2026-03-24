import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryCleanupService } from './delivery-cleanup.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DeliveryCleanupService', () => {
  let service: DeliveryCleanupService;

  const mockPrisma = {
    delivery: {
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryCleanupService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DeliveryCleanupService>(DeliveryCleanupService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Note: The main cleanup logic (handleExpiredAvailable, handleAbandonedAccepted, handleStalePickedUp)
  // is currently commented out pending product decision on delivery timeouts.
  // These tests are a placeholder for when the cron logic is re-enabled.
  // Once re-enabled, tests should cover:
  // - Expired AVAILABLE deliveries -> CANCELED (SYSTEM)
  // - Abandoned ACCEPTED deliveries -> AVAILABLE (reset)
  // - Stale PICKED_UP deliveries -> ISSUE
});
