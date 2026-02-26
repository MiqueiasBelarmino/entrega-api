import { Module } from '@nestjs/common';
import { NotificationSender } from './notification-channel';
import { SmartNotificationSender } from './smart-notification-sender';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppMetaService } from './whatsapp-meta/whatsapp-meta.service';

@Module({
  providers: [
    WhatsAppMetaService,
    {
      provide: NotificationSender,
      useClass: SmartNotificationSender,
    },
    PrismaService,
  ],
  exports: [NotificationSender],
})
export class NotificationsModule {}
