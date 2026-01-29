export type NotificationChannel = 'SMS' | 'WHATSAPP';

export interface SendOtpParams {
  to: string; // E.164
  code: string;
  channel: NotificationChannel;
}

export abstract class NotificationSender {
  abstract sendOtp(params: SendOtpParams): Promise<void>;
}
