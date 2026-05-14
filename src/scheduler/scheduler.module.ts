import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DeliveryCleanupService } from './delivery-cleanup.service';
import { BillingSchedulerService } from './billing-scheduler.service';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    InvoicesModule,
  ],
  providers: [DeliveryCleanupService, BillingSchedulerService, PrismaService],
})
export class SchedulerModule {}
