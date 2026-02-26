import { z } from 'zod';

/**
 * Schema para os componentes de um template do WhatsApp.
 * Focado em variáveis do tipo 'text' para templates de 'Utility'.
 */
export const WhatsAppTemplateComponentSchema = z.object({
  type: z.enum(['body', 'header', 'button']),
  sub_type: z.enum(['quick_reply', 'url']).optional(),
  index: z.string().optional(),
  parameters: z.array(
    z.object({
      type: z.literal('text'),
      text: z.string().min(1, 'O conteúdo da variável não pode estar vazio'),
    }),
  ),
});

export type WhatsAppTemplateComponent = z.infer<typeof WhatsAppTemplateComponentSchema>;

/**
 * Schema para o input do método sendTemplateNotification.
 */
export const SendTemplateNotificationSchema = z.object({
  to: z.string().regex(/^\d+$/, 'O número deve conter apenas dígitos (E.164 sem o +)'),
  templateName: z.string().min(1, 'O nome do template é obrigatório'),
  language: z.string().default('pt_BR'),
  components: z.array(WhatsAppTemplateComponentSchema).optional(),
  hasOptIn: z.boolean().refine((val) => val === true, {
    message: 'O envio requer opt-in do usuário',
  }),
});

export type SendTemplateNotificationInput = z.infer<typeof SendTemplateNotificationSchema>;

/**
 * Interface de resposta da API do WhatsApp Cloud.
 */
export interface WhatsAppMetaResponse {
  metaMessageId?: string;
  status: 'sent' | 'failed';
  error?: string;
  rawResponse?: any;
}
