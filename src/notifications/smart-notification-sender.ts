import { Injectable, Logger } from '@nestjs/common';
import { NotificationSender, SendOtpParams } from './notification-channel';
import { TwilioNotificationSender } from './twilio-notification-sender';
import { MoceanNotificationSender } from './mocean-notification-sender';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SmartNotificationSender extends NotificationSender {
  private readonly logger = new Logger(SmartNotificationSender.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly twilioSender: TwilioNotificationSender,
    private readonly moceanSender: MoceanNotificationSender,
  ) {
    super();
  }

  private async getProvider(): Promise<NotificationSender> {
    try {
        const config = await this.prisma.systemConfig.findUnique({
            where: { key: 'SMS_PROVIDER' }
        });

        if (config?.value === 'MOCEAN') {
            return this.moceanSender;
        }
        
        // Default to Twilio
        return this.twilioSender;
    } catch (e) {
        this.logger.error('Failed to fetch SMS_PROVIDER config, defaulting to Twilio', e);
        return this.twilioSender;
    }
  }

  async sendOtp(params: SendOtpParams): Promise<void> {
    const provider = await this.getProvider();
    this.logger.log(`Using SMS Provider: ${provider.constructor.name}`);
    await provider.sendOtp(params);
  }

  async send(to: string, message: string): Promise<void> {
    const provider = await this.getProvider();
    this.logger.log(`Using SMS Provider: ${provider.constructor.name}`);
    await provider.send(to, message);
  }
}
