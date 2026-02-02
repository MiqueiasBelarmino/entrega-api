import { Module } from '@nestjs/common';
import { NotificationSender } from './notification-channel';
import { ConsoleNotificationSender } from './console-notification-sender';
import { TwilioNotificationSender } from './twilio-notification-sender';
import { MoceanNotificationSender } from './mocean-notification-sender';
import { SmartNotificationSender } from './smart-notification-sender';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [
    TwilioNotificationSender,
    MoceanNotificationSender,
    {
      provide: NotificationSender,
      useClass: SmartNotificationSender,
    },
    PrismaService,
  ],
  exports: [NotificationSender],
})
export class NotificationsModule {}
