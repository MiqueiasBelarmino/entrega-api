import { Body, Controller, Get, Put, UseGuards, Param, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RootGuard } from '../auth/guards/root.guard';

@Controller('system')
@UseGuards(JwtAuthGuard, RootGuard)
export class SystemController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('config')
  async getAllConfig() {
    return this.prisma.systemConfig.findMany();
  }

  @Put('config')
  async updateConfig(@Body() body: { key: string; value: string }) {
    return this.prisma.systemConfig.upsert({
        where: { key: body.key },
        create: { key: body.key, value: body.value, updatedAt: new Date() },
        update: { value: body.value, updatedAt: new Date() }
    });
  }

  @Get('providers')
  async getProviders() {
    return this.prisma.notificationProvider.findMany({
      orderBy: { priority: 'asc' },
    });
  }

  @Put('providers/:id')
  async updateProvider(
    @Param('id') id: string,
    @Body() body: {
      status?: 'ACTIVE' | 'DISABLED' | 'BLOCKED';
      priority?: number;
      maxRetries?: number;
      retryDelayMs?: number;
      timeoutMs?: number;
    }
  ) {
    return this.prisma.notificationProvider.update({
      where: { id },
      data: body,
    });
  }
}
