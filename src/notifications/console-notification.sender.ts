import { Injectable, Logger } from '@nestjs/common';
import { NotificationSender, SendOtpParams } from './notification-channel';

@Injectable()
export class ConsoleNotificationSender implements NotificationSender {
  private readonly logger = new Logger(ConsoleNotificationSender.name);

  async sendOtp({ to, code, channel }: SendOtpParams): Promise<void> {
    // MVP: só loga. Depois você troca pela implementação do provedor.
    this.logger.log(`[${channel}] OTP para ${to}: ${code}`);
  }
}
