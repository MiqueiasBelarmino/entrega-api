import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, SubscriptionStatus } from '@prisma/client';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(createSubscriptionDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.subscriptionsService.findAll();
  }

  @Get('my')
  @Roles(Role.MERCHANT)
  async findMy(@Request() req, @Param('businessId') businessId: string) {
    // In a real scenario, we should verify if the user owns the business
    // For now, let's assume businessId is passed from the frontend
    return this.subscriptionsService.findByBusiness(businessId);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: SubscriptionStatus,
    @Body('reason') reason?: string,
  ) {
    return this.subscriptionsService.updateStatus(id, status, reason);
  }
}
