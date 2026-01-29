import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DeliveriesModule } from './deliveries/deliveries.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    DeliveriesModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
