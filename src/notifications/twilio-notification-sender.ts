import { Injectable, Logger } from '@nestjs/common';
import { Twilio } from 'twilio';
import { NotificationSender, SendOtpParams } from './notification-channel';

@Injectable()
export class TwilioNotificationSender extends NotificationSender {
  private readonly logger = new Logger(TwilioNotificationSender.name);
  private readonly client: Twilio;

  constructor() {
    super();
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      this.logger.error('Twilio credentials not found in environment variables');
      throw new Error('Twilio credentials missing');
    }

    this.client = new Twilio(accountSid, authToken);
  }

  async sendOtp(params: SendOtpParams): Promise<void> {
    const from = process.env.TWILIO_DEFAULT_NUMBER;
    if (!from) {
      this.logger.error('TWILIO_DEFAULT_NUMBER not found');
      throw new Error('TWILIO_DEFAULT_NUMBER missing');
    }

    try {
      console.log('OPT: ', params.code);
      return;
      await this.client.messages.create({
        body: `Seu código de verificação é: ${params.code}`,
        from,
        to: params.to,
      });
      this.logger.log(`[OTP] Sent to ${params.to}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${params.to}`, error);
      throw error;
    }
  }

  async send(to: string, message: string): Promise<void> {
    const from = process.env.TWILIO_DEFAULT_NUMBER;
    if (!from) {
      this.logger.error('TWILIO_DEFAULT_NUMBER not found');
      throw new Error('TWILIO_DEFAULT_NUMBER missing');
    }

    try {
      await this.client.messages.create({
        body: message,
        from,
        to,
      });
      this.logger.log(`[SMS] Sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}`, error);
      throw error;
    }
  }
}
