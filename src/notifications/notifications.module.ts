import { Module } from '@nestjs/common';
import { NotificationSender } from './notification-channel';
import { ConsoleNotificationSender } from './console-notification-sender';
import { TwilioNotificationSender } from './twilio-notification-sender';

@Module({
  providers: [
    {
      provide: NotificationSender,
      useClass:
        process.env.NODE_ENV === 'production'
          ? TwilioNotificationSender
          : TwilioNotificationSender, // Using Twilio for dev too as requested, or can be toggled
    },
  ],
  exports: [NotificationSender],
})
export class NotificationsModule {}
