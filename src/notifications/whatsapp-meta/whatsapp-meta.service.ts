import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import {
  SendTemplateNotificationInput,
  SendTemplateNotificationSchema,
  WhatsAppMetaResponse,
} from './whatsapp-meta.schema';

@Injectable()
export class WhatsAppMetaService {
  private readonly logger = new Logger(WhatsAppMetaService.name);

  private readonly token = process.env.META_WHATSAPP_TOKEN;
  private readonly phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  private readonly apiVersion = process.env.META_WHATSAPP_API_VERSION || 'v19.0';
  private readonly baseUrl = 'https://graph.facebook.com';

  /**
   * Envia uma notificação baseada em template (Utility) via WhatsApp Cloud API.
   * @param input Dados da mensagem (to, templateName, components, etc)
   */
  async sendTemplateNotification(
    input: SendTemplateNotificationInput,
    options?: { timeoutMs?: number }
  ): Promise<WhatsAppMetaResponse> {
    try {
      // 1. Validar input com Zod
      const validatedData = SendTemplateNotificationSchema.parse(input);

      // 2. Construir payload para a Meta
      const url = `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        to: validatedData.to,
        type: 'template',
        template: {
          name: validatedData.templateName,
          language: {
            code: validatedData.language,
          },
          components: validatedData.components || [],
        },
      };

      // 3. Executar chamada HTTP
      const controller = new AbortController();
      let timeoutId: NodeJS.Timeout | undefined;
      if (options?.timeoutMs) {
        timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal as any,
      });

      if (timeoutId) clearTimeout(timeoutId);

      const data = await response.json();

      // 4. Tratar erros HTTP da Meta
      if (!response.ok) {
        this.logger.error(`Erro na Meta API: ${JSON.stringify(data)}`);
        throw new Error(data.error?.message || 'Erro desconhecido na Meta API');
      }

      // 5. Sucesso
      return {
        metaMessageId: data.messages?.[0]?.id,
        status: 'sent',
      };
    } catch (error) {
      this.logger.error(`Falha no envio de WhatsApp: ${error.message}`);
      throw error; // Lança exception para acionar fallback
    }
  }
}
