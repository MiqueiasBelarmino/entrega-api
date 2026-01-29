import { Injectable, Logger } from '@nestjs/common';
import { NotificationSender, SendOtpParams } from './notification-channel';

@Injectable()
export class ConsoleNotificationSender extends NotificationSender {
  private readonly logger = new Logger(ConsoleNotificationSender.name);

  async sendOtp(params: SendOtpParams): Promise<void> {
    this.logger.log(
      `[OTP] Channel: ${params.channel} | To: ${params.to} | Code: ${params.code}`,
    );
  }
}
