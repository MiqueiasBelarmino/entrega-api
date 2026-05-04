import { Module, Global } from '@nestjs/common';
import { TelegramAlertService } from './telegram-alert.service';
import { APP_FILTER } from '@nestjs/core';
import { TelegramExceptionFilter } from './telegram-exception.filter';

@Global()
@Module({
  providers: [
    TelegramAlertService,
    {
      provide: APP_FILTER,
      useClass: TelegramExceptionFilter,
    },
  ],
  exports: [TelegramAlertService],
})
export class AlertsModule {}
