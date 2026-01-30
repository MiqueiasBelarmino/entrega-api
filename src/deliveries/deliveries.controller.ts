import { Body, Controller, Get, Param, Post, UseGuards, Request, ForbiddenException, HttpCode, HttpStatus } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('deliveries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  // ==========================================
  // COURIER Routes
  // ==========================================
  @Get('available')
  @Roles(Role.COURIER)
  findAvailable(@Request() req) {
    // Note: 'req' unused but guard checks checks role
    return this.deliveriesService.findAvailable();
  }

  @Get('active')
  @Roles(Role.COURIER)
  findActive(@Request() req) {
    return this.deliveriesService.findByCourier(req.user.id);
  }

  // ==========================================
  // MERCHANT Routes
  // ==========================================
  @Post()
  @Roles(Role.MERCHANT)
  create(@Request() req, @Body() createDeliveryDto: CreateDeliveryDto) {
    return this.deliveriesService.create(req.user.id, createDeliveryDto);
  }

  @Get()
  @Roles(Role.MERCHANT)
  findAllMerchant(@Request() req) {
    return this.deliveriesService.findAllMerchant(req.user.id);
  }

  @Get(':id')
  @Roles(Role.MERCHANT, Role.COURIER)
  findOne(@Request() req, @Param('id') id: string) {
    return this.deliveriesService.findOne(req.user.id, req.user.role, id);
  }

  @Post(':id/accept')
  @Roles(Role.COURIER)
  @HttpCode(HttpStatus.OK)
  accept(@Request() req, @Param('id') id: string) {
    return this.deliveriesService.accept(req.user.id, id);
  }

  @Post(':id/pickup')
  @Roles(Role.COURIER)
  @HttpCode(HttpStatus.OK)
  pickup(@Request() req, @Param('id') id: string) {
    return this.deliveriesService.pickup(req.user.id, id);
  }

  @Post(':id/complete')
  @Roles(Role.COURIER)
  @HttpCode(HttpStatus.OK)
  complete(@Request() req, @Param('id') id: string) {
    return this.deliveriesService.complete(req.user.id, id);
  }

  @Post(':id/cancel')
  @Roles(Role.COURIER)
  @HttpCode(HttpStatus.OK)
  cancel(@Request() req, @Param('id') id: string) {
    return this.deliveriesService.cancel(req.user.id, id);
  }
}
