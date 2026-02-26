import { Injectable, Logger } from '@nestjs/common';
import { NotificationSender, SendOtpParams } from './notification-channel';

@Injectable()
export class ConsoleNotificationSender extends NotificationSender {
  private readonly logger = new Logger(ConsoleNotificationSender.name);

  async sendOtp(params: SendOtpParams): Promise<void> {
    this.logger.log(
      `[OTP] To: ${params.to} | Code: ${params.code}`,
    );
  }

  async send(to: string, message: string): Promise<void> {
    this.logger.log(`[NOTIF] To: ${to} | Message: ${message}`);
  }
}
