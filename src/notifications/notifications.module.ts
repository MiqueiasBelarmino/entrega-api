import { Module } from '@nestjs/common';
import { NotificationSender } from './notification-channel';
import { ConsoleNotificationSender } from './console-notification-sender';

@Module({
  providers: [
    {
      provide: NotificationSender,
      useClass: ConsoleNotificationSender,
    },
  ],
  exports: [NotificationSender],
})
export class NotificationsModule {}
