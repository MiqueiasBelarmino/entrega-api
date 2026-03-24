import { Test, TestingModule } from '@nestjs/testing';
import { SmartNotificationSender } from './smart-notification-sender';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppMetaService } from './whatsapp-meta/whatsapp-meta.service';

describe('SmartNotificationSender', () => {
  let sender: SmartNotificationSender;
  let whatsAppService: WhatsAppMetaService;

  const mockPrisma = {
    notificationProvider: {
      findMany: jest.fn(),
    },
  };

  const activeWhatsAppProvider = {
    providerKey: 'WHATSAPP_META',
    name: 'WhatsApp',
    maxRetries: 1,
    retryDelayMs: 0,
    priority: 0,
    timeoutMs: 5000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmartNotificationSender,
        { provide: PrismaService, useValue: mockPrisma },
        WhatsAppMetaService, // Use actual class so instanceof check passes
      ],
    }).compile();

    sender = module.get<SmartNotificationSender>(SmartNotificationSender);
    whatsAppService = module.get<WhatsAppMetaService>(WhatsAppMetaService);
    jest.clearAllMocks();
  });

  describe('sendOtp', () => {
    it('should bypass real sending in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      await sender.sendOtp({ to: '+5511999', code: '123456' });

      expect(mockPrisma.notificationProvider.findMany).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should throw if no active providers found in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      mockPrisma.notificationProvider.findMany.mockResolvedValue([]);

      await expect(sender.sendOtp({ to: '+5511999', code: '123456' })).rejects.toThrow(
        'Serviço de notificação indisponível',
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should send OTP via WhatsApp successfully in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockPrisma.notificationProvider.findMany.mockResolvedValue([activeWhatsAppProvider]);
      // Spy on the real WhatsApp service method
      jest.spyOn(whatsAppService, 'sendTemplateNotification').mockResolvedValue({ metaMessageId: 'm1', status: 'sent' });

      await sender.sendOtp({ to: '+5511999', code: '123456' });

      expect(whatsAppService.sendTemplateNotification).toHaveBeenCalledTimes(1);
      process.env.NODE_ENV = originalEnv;
    });

    it('should retry on failure and then throw if all retries fail', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockPrisma.notificationProvider.findMany.mockResolvedValue([activeWhatsAppProvider]);
      jest.spyOn(whatsAppService, 'sendTemplateNotification').mockRejectedValue(new Error('Network error'));

      await expect(sender.sendOtp({ to: '+5511999', code: '123456' })).rejects.toThrow();
      // maxRetries=1 means 1 initial attempt + 1 retry = 2 calls
      expect(whatsAppService.sendTemplateNotification).toHaveBeenCalledTimes(2);

      process.env.NODE_ENV = originalEnv;
    });

    it('should skip unknown providers and throw if all fail', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockPrisma.notificationProvider.findMany.mockResolvedValue([
        { ...activeWhatsAppProvider, providerKey: 'UNKNOWN_PROVIDER' },
      ]);
      jest.spyOn(whatsAppService, 'sendTemplateNotification');

      await expect(sender.sendOtp({ to: '+5511999', code: '123456' })).rejects.toThrow();
      expect(whatsAppService.sendTemplateNotification).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
