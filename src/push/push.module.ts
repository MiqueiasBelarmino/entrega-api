import { Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [AuthModule],
  controllers: [PushController],
  providers: [PushService,PrismaService],
  exports: [PushService],
})
export class PushModule {}
