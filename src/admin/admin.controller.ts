import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, ParseBoolPipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, DeliveryStatus, BusinessStatus } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getStats(@Query('range') range: 'today' | '7d' | '30d') {
    return await this.adminService.getStats(range);
  }

  @Get('deliveries')
  findAllDeliveries(
      @Query('status') status?: DeliveryStatus,
      @Query('merchantId') merchantId?: string,
      @Query('courierId') courierId?: string,
      @Query('businessId') businessId?: string,
      @Query('query') query?: string,
      @Query('dateFrom') dateFrom?: string,
      @Query('dateTo') dateTo?: string,
  ) {
      return this.adminService.findAllDeliveries({ status, merchantId, courierId, businessId, query, dateFrom, dateTo });
  }

  @Get('deliveries/:id')
  findOneDelivery(@Param('id') id: string) {
      return this.adminService.findOneDelivery(id);
  }

  @Post('deliveries/:id/cancel')
  cancelDelivery(@Param('id') id: string) {
      return this.adminService.cancelDelivery(id);
  }

  @Get('businesses')
  findAllBusinesses(
      @Query('status') status?: BusinessStatus,
      @Query('query') query?: string
  ) {
      return this.adminService.findAllBusinesses({ status, query });
  }

  @Patch('businesses/:id')
  updateBusinessStatus(
      @Param('id') id: string,
      @Body('status') status: BusinessStatus
  ) {
      return this.adminService.updateBusinessStatus(id, status);
  }

  @Get('users')
  findAllUsers(
      @Query('role') role?: Role,
      @Query('isActive') isActive?: string, // Boolean passed as string in Query
      @Query('query') query?: string
  ) {
      // transform query bool
      const isActiveBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
      return this.adminService.findAllUsers({ role, isActive: isActiveBool, query });
  }

  @Patch('users/:id')
  updateUser(
      @Param('id') id: string,
      @Body() body: { role?: Role; isActive?: boolean }
  ) {
      return this.adminService.updateUser(id, body);
  }
}
