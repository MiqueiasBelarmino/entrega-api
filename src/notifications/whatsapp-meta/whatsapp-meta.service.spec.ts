import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppMetaService } from './whatsapp-meta.service';

describe('WhatsAppMetaService', () => {
  let service: WhatsAppMetaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WhatsAppMetaService],
    }).compile();

    service = module.get<WhatsAppMetaService>(WhatsAppMetaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendTemplateNotification', () => {
    it('should throw when Meta API returns an error response', async () => {
      // Mock fetch to simulate API failure
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: 'Invalid API key' } }),
      } as any);

      await expect(
        service.sendTemplateNotification({
          to: '5511999999999',
          templateName: 'account_confirm',
          language: 'pt_BR',
          hasOptIn: true,
        }),
      ).rejects.toThrow('Invalid API key');
    });

    it('should return metaMessageId on success', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ messages: [{ id: 'msg_abc123' }] }),
      } as any);

      const result = await service.sendTemplateNotification({
        to: '5511999999999',
        templateName: 'account_confirm',
        language: 'pt_BR',
        hasOptIn: true,
      });

      expect(result.metaMessageId).toBe('msg_abc123');
      expect(result.status).toBe('sent');
    });
  });
});
