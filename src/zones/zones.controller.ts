import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ZonesService } from './zones.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';
import { CreateNeighborhoodDto } from './dto/create-neighborhood.dto';
import { UpdateNeighborhoodDto } from './dto/update-neighborhood.dto';
import { UpsertZonePriceRuleDto } from './dto/upsert-zone-price-rule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller()
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  // ── Public / Merchant Endpoints ──────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('neighborhoods')
  findActiveNeighborhoods() {
    return this.zonesService.findActiveNeighborhoods();
  }

  @UseGuards(JwtAuthGuard)
  @Get('zones/price-rules/matrix')
  findActiveMatrix() {
    return this.zonesService.findActiveMatrix();
  }

  // ── Admin Endpoints ───────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/zones')
  findAllZones() {
    return this.zonesService.findAllZones();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin/zones')
  createZone(@Body() createDto: CreateDeliveryZoneDto) {
    return this.zonesService.createZone(createDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/zones/:id')
  updateZone(@Param('id') id: string, @Body() updateDto: UpdateDeliveryZoneDto) {
    return this.zonesService.updateZone(id, updateDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('admin/zones/:id')
  removeZone(@Param('id') id: string) {
    return this.zonesService.removeZone(id);
  }

  // Admin: Neighborhoods
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/neighborhoods')
  findAllNeighborhoods() {
    return this.zonesService.findAllNeighborhoods();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin/neighborhoods')
  createNeighborhood(@Body() createDto: CreateNeighborhoodDto) {
    return this.zonesService.createNeighborhood(createDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/neighborhoods/:id')
  updateNeighborhood(@Param('id') id: string, @Body() updateDto: UpdateNeighborhoodDto) {
    return this.zonesService.updateNeighborhood(id, updateDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('admin/neighborhoods/:id')
  removeNeighborhood(@Param('id') id: string) {
    return this.zonesService.removeNeighborhood(id);
  }

  // Admin: Price Rules (Matrix)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/zones/price-rules')
  findAllPriceRules() {
    return this.zonesService.findAllPriceRules();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin/zones/price-rules')
  upsertPriceRule(@Body() upsertDto: UpsertZonePriceRuleDto) {
    return this.zonesService.upsertPriceRule(upsertDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('admin/zones/price-rules/:id')
  removePriceRule(@Param('id') id: string) {
    return this.zonesService.removePriceRule(id);
  }
}
