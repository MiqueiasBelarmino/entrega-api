import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('deliveries/:deliveryId/ratings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  @Roles(Role.MERCHANT, Role.COURIER)
  create(
    @Request() req,
    @Param('deliveryId') deliveryId: string,
    @Body() createRatingDto: CreateRatingDto,
  ) {
    return this.ratingsService.create(req.user.id, deliveryId, createRatingDto);
  }

  @Get()
  @Roles(Role.MERCHANT, Role.COURIER)
  findByDelivery(@Request() req, @Param('deliveryId') deliveryId: string) {
    return this.ratingsService.findByDelivery(req.user.id, deliveryId);
  }
}
