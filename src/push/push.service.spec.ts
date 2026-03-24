import { Test, TestingModule } from '@nestjs/testing';
import { PushService } from './push.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock the web-push module to avoid actual push notifications
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

import * as webPush from 'web-push';

describe('PushService', () => {
  let service: PushService;
  let prisma: PrismaService;

  const mockPrisma = {
    pushSubscription: {
      upsert: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PushService>(PushService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('addSubscription', () => {
    it('should upsert a push subscription', async () => {
      mockPrisma.pushSubscription.upsert.mockResolvedValue({ id: 'sub-1' });

      const dto = { endpoint: 'https://push.example.com', keys: { p256dh: 'key1', auth: 'auth1' } };
      await service.addSubscription('user-1', dto);

      expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId_endpoint: { userId: 'user-1', endpoint: dto.endpoint } },
      }));
    });
  });

  describe('removeSubscription', () => {
    it('should delete a user subscription quietly', async () => {
      mockPrisma.pushSubscription.delete.mockResolvedValue({});
      await service.removeSubscription('user-1', 'https://push.example.com');
      expect(prisma.pushSubscription.delete).toHaveBeenCalled();
    });

    it('should not throw if subscription not found', async () => {
      mockPrisma.pushSubscription.delete.mockRejectedValue(new Error('Not found'));
      // Should silently handle the error
      await expect(service.removeSubscription('user-1', 'https://push.example.com')).resolves.not.toThrow();
    });
  });

  describe('sendToUser', () => {
    it('should find subscriptions and send to all', async () => {
      const mockSub = { id: 'sub-1', endpoint: 'https://push.example.com', p256dh: 'k', auth: 'a' };
      mockPrisma.pushSubscription.findMany.mockResolvedValue([mockSub]);
      (webPush.sendNotification as jest.Mock).mockResolvedValue({});

      await service.sendToUser('user-1', { type: 'test' });

      expect(webPush.sendNotification).toHaveBeenCalledTimes(1);
    });

    it('should do nothing if user has no subscriptions', async () => {
      mockPrisma.pushSubscription.findMany.mockResolvedValue([]);
      await service.sendToUser('user-1', { type: 'test' });
      expect(webPush.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('sendToUsers', () => {
    it('should send to multiple users subscriptions', async () => {
      const subs = [
        { id: 's1', endpoint: 'https://e1.com', p256dh: 'k1', auth: 'a1' },
        { id: 's2', endpoint: 'https://e2.com', p256dh: 'k2', auth: 'a2' },
      ];
      mockPrisma.pushSubscription.findMany.mockResolvedValue(subs);
      (webPush.sendNotification as jest.Mock).mockResolvedValue({});

      await service.sendToUsers(['u1', 'u2'], { type: 'test' });

      expect(webPush.sendNotification).toHaveBeenCalledTimes(2);
    });

    it('should auto-remove expired subscription (410)', async () => {
      const mockSub = { id: 'sub-1', endpoint: 'https://push.example.com', p256dh: 'k', auth: 'a' };
      mockPrisma.pushSubscription.findMany.mockResolvedValue([mockSub]);
      mockPrisma.pushSubscription.delete.mockResolvedValue({});
      (webPush.sendNotification as jest.Mock).mockRejectedValue({ statusCode: 410, message: 'Gone' });

      await service.sendToUsers(['u1'], { type: 'test' });

      // Even with error a 410 triggers cleanup
      expect(prisma.pushSubscription.delete).toHaveBeenCalledWith({ where: { id: 'sub-1' } });
    });
  });
});
