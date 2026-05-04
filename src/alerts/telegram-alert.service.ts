import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TelegramAlertService {
  private readonly logger = new Logger(TelegramAlertService.name);
  private lastAlertTimes: Map<string, number> = new Map();
  private readonly RATE_LIMIT_MS = 60000; // 1 mensagem por minuto para a mesma notificação

  async sendAlert(message: string): Promise<void> {
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      
      if (!token || !chatId) {
        this.logger.debug('Alerta Telegram ignorado: TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não definidos no .env');
        return;
      }

      // Rate limiting check: Evita flodar o celular com o mesmo erro em loop
      const now = Date.now();
      const lastTime = this.lastAlertTimes.get(message);
      
      if (lastTime && now - lastTime < this.RATE_LIMIT_MS) {
        this.logger.debug(`Alerta suprimido pelo Rate Limit (mesmo erro repetido em < 1 min).`);
        return;
      }
      
      this.lastAlertTimes.set(message, now);

      // Limpar cache antigo para não vazar memória
      this.cleanupCache(now);

      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      });
    } catch (error) {
      this.logger.error(`Falha ao disparar alerta para o Telegram: ${(error as Error).message}`);
    }
  }

  private cleanupCache(now: number) {
     for (const [msg, time] of this.lastAlertTimes.entries()) {
        if (now - time > this.RATE_LIMIT_MS) {
           this.lastAlertTimes.delete(msg);
        }
     }
  }
}
