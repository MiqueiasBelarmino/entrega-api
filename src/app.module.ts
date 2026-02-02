import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    AuthModule,
    UsersModule,
    BusinessModule,
    DeliveriesModule,
    NotificationsModule,
    AdminModule,
  ],
  controllers: [AppController, SystemController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
