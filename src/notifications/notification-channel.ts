export interface SendOtpParams {
  to: string; // E.164
  code: string;
}

export abstract class NotificationSender {
  abstract sendOtp(params: SendOtpParams): Promise<void>;
  abstract send(to: string, message: string): Promise<void>;
}
