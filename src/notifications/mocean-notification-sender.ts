import { Injectable, Logger } from '@nestjs/common';
import { NotificationSender, SendOtpParams } from './notification-channel';

@Injectable()
export class MoceanNotificationSender extends NotificationSender {
  private readonly logger = new Logger(MoceanNotificationSender.name);
  private readonly authToken: string;
  private readonly from: string;

  constructor() {
    super();
    this.authToken = process.env.MOCEAN_AUTH_TOKEN || '';
    this.from = process.env.MOCEAN_FROM || 'MOCEAN';

    if (!this.authToken) {
      this.logger.warn('Mocean Auth Token missing in environment variables');
    }
    
    if (process.env.MOCEAN_API_KEY || process.env.MOCEAN_API_SECRET) {
        this.logger.error('MOCEAN_API_KEY and MOCEAN_API_SECRET are DEPRECATED and forbidden. Use MOCEAN_AUTH_TOKEN.');
        throw new Error('Invalid Mocean Configuration: Use Bearer Token only.');
    }
  }

  async sendOtp(params: SendOtpParams): Promise<void> {
    await this.send(params.to, `Seu codigo de verificacao e: ${params.code}`);
  }

  async send(to: string, message: string): Promise<void> {
    if (!this.authToken) {
        this.logger.error('Cannot send Mocean SMS: Auth Token missing');
        throw new Error('Mocean Auth Token missing');
    }

    try {
      const params = new URLSearchParams();
      params.append('mocean-from', this.from);
      params.append('mocean-to', to.replace('+', '')); 
      params.append('mocean-text', message);
      params.append('mocean-resp-format', 'json');

      const response = await fetch('https://rest.moceanapi.com/rest/2/sms', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params,
      });

      const result = await response.json();

      if (response.status !== 200 && response.status !== 201 && response.status !== 202) { 
         this.logger.error(`Mocean HTTP Error: ${response.status}`, result);
         throw new Error(`Mocean API Error: ${response.status}`);
      }
      
      // Mocean JSON response check - logic remains similar for v2
      if (result.messages && result.messages[0] && result.messages[0].status !== 0) {
          const errCode = result.messages[0].status;
          const errMsg = result.messages[0].err_msg;
          this.logger.error(`Mocean API Error [${errCode}]: ${errMsg}`);
          throw new Error(`Mocean SMS Failed: ${errMsg}`);
      }

      this.logger.log(`[Mocean SMS] Sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send Mocean SMS to ${to}`, error);
      throw error;
    }
  }
}
