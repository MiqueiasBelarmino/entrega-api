import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { BusinessModule } from './business/business.module';
import { AdminModule } from './admin/admin.module';
import { SystemController } from './system/system.controller';
import { PrismaService } from './prisma/prisma.service';
import { NotificationsModule } from './notifications/notifications.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ActiveUserGuard } from './auth/guards/active-user.guard';
import { PushModule } from './push/push.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    BusinessModule,
    DeliveriesModule,
    NotificationsModule,
    NotificationsModule,
    SchedulerModule,
    AdminModule,
    PushModule,
  ],
  controllers: [AppController, SystemController],
  providers: [
    AppService,
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ActiveUserGuard,
    },
  ],
})
export class AppModule {}
