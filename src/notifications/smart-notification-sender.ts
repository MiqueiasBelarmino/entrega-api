import { Injectable, Logger } from '@nestjs/common';
import { NotificationSender, SendOtpParams } from './notification-channel';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppMetaService } from './whatsapp-meta/whatsapp-meta.service';

@Injectable()
export class SmartNotificationSender extends NotificationSender {
  private readonly logger = new Logger(SmartNotificationSender.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppMetaService: WhatsAppMetaService,
  ) {
    super();
  }

  // Mapper function to get the actual service based on the DB providerKey
  private getProviderService(providerKey: string) {
    switch (providerKey) {
      case 'WHATSAPP_META':
        return this.whatsAppMetaService;
      default:
        return null;
    }
  }

  // Helper sleep function for retry delays
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async sendOtp(params: SendOtpParams): Promise<void> {
    // [AMBIENTE DE DESENVOLVIMENTO]
    // Evita consumo de cota e envio real. O código é logado no console para teste.
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'develpment') {
      this.logger.debug(`[DEV MODE] OTP bypass. Código para ${params.to}: ${params.code}`);
      return;
    }

    const providers = await this.prisma.notificationProvider.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { priority: 'asc' },
    });

    if (providers.length === 0) {
      this.logger.error('Nenhum provedor de notificação ativo encontrado.');
      throw new Error('Serviço de notificação indisponível (sem provedores ativos).');
    }

    let lastError: Error | null = null;

    for (const provider of providers) {
      const service = this.getProviderService(provider.providerKey);
      
      if (!service) {
        this.logger.warn(`Serviço não implementado para o provedor: ${provider.providerKey}`);
        continue;
      }

      this.logger.log(`Tentando envio via: ${provider.name} (Prioridade: ${provider.priority})`);

      for (let attempt = 1; attempt <= provider.maxRetries + 1; attempt++) {
        try {
          if (attempt > 1) {
            this.logger.log(`[${provider.name}] Retentativa ${attempt - 1} de ${provider.maxRetries}...`);
            await this.sleep(provider.retryDelayMs);
          }

          if (service instanceof WhatsAppMetaService) {
            await service.sendTemplateNotification({
              to: params.to.replace('+', ''),
              templateName: 'account_confirm_entrega_hub', // Default OTP template
              language: 'pt_BR',
              hasOptIn: true,
              components: [
                {
                  type: 'body',
                  parameters: [{ type: 'text', text: params.code }],
                },
                {
                  type: 'button',
                  sub_type: 'url',
                  index: '0',
                  parameters: [{ type: 'text', text: params.code }],
                },
              ],
            }, { timeoutMs: provider.timeoutMs });
          } else {
             await (service as any).sendOtp(params); // fallback original if we ever implement more NotificationSenders
          }

          this.logger.log(`[${provider.name}] OTP enviado com sucesso!`);
          return; // Success! Exit the loop.
        } catch (error) {
          const err = error as Error;
          this.logger.error(`[${provider.name}] Falha na tentativa ${attempt}: ${err.message}`);
          lastError = err;
        }
      }

      this.logger.warn(`[${provider.name}] Esgotadas todas as retentativas. Realizando fallback para o próximo provedor...`);
    }

    this.logger.error('Todos os provedores de notificação falharam.');
    throw new Error(`Falha no envio do OTP via todos os canais. Último erro: ${lastError?.message || 'Erro desconhecido'}`);
  }

  async send(to: string, message: string): Promise<void> {
    // This method is for generic text sending (non-template or different templates)
    // For now we just log a warning as MVP requires templates on WhatsApp
    this.logger.warn('Send (free text) is not natively supported directly on WhatsApp Utility without templates. Doing nothing.');
  }
}

