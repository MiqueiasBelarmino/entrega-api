import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DeliveryCleanupService } from './delivery-cleanup.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [DeliveryCleanupService, PrismaService],
})
export class SchedulerModule {}
