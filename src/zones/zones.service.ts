import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';
import { CreateNeighborhoodDto } from './dto/create-neighborhood.dto';
import { UpdateNeighborhoodDto } from './dto/update-neighborhood.dto';
import { UpsertZonePriceRuleDto } from './dto/upsert-zone-price-rule.dto';

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Delivery Zones ────────────────────────────────────────────────────────

  async createZone(data: CreateDeliveryZoneDto) {
    return this.prisma.deliveryZone.create({ data });
  }

  async findAllZones(cityId?: string) {
    const where: any = {};
    if (cityId) where.cityId = cityId;
    return this.prisma.deliveryZone.findMany({
      where,
      include: { city: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOneZone(id: string) {
    const zone = await this.prisma.deliveryZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException('Delivery Zone not found');
    return zone;
  }

  async updateZone(id: string, data: UpdateDeliveryZoneDto) {
    await this.findOneZone(id);
    return this.prisma.deliveryZone.update({
      where: { id },
      data,
    });
  }

  async removeZone(id: string) {
    await this.findOneZone(id);
    return this.prisma.deliveryZone.delete({ where: { id } });
  }

  // ── Neighborhoods ─────────────────────────────────────────────────────────

  async createNeighborhood(data: CreateNeighborhoodDto) {
    const existing = await this.prisma.neighborhood.findUnique({
      where: { name_cityId: { name: data.name, cityId: data.cityId } },
    });
    if (existing) throw new ConflictException('Neighborhood already exists in this city');
    
    return this.prisma.neighborhood.create({ data });
  }

  async findAllNeighborhoods(cityId?: string) {
    const where: any = {};
    if (cityId) where.cityId = cityId;
    return this.prisma.neighborhood.findMany({
      where,
      include: { deliveryZone: true, city: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findActiveNeighborhoods(cityId?: string) {
    const where: any = { isActive: true };
    if (cityId) where.cityId = cityId;
    return this.prisma.neighborhood.findMany({
      where,
      include: { deliveryZone: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOneNeighborhood(id: string) {
    const n = await this.prisma.neighborhood.findUnique({ where: { id } });
    if (!n) throw new NotFoundException('Neighborhood not found');
    return n;
  }

  async updateNeighborhood(id: string, data: UpdateNeighborhoodDto) {
    await this.findOneNeighborhood(id);
    if (data.name || data.cityId) {
      const existing = await this.prisma.neighborhood.findFirst({
        where: {
          name: data.name,
          cityId: data.cityId,
          NOT: { id },
        },
      });
      if (existing) throw new ConflictException('Neighborhood already exists in this city');
    }
    return this.prisma.neighborhood.update({
      where: { id },
      data,
    });
  }

  async removeNeighborhood(id: string) {
    await this.findOneNeighborhood(id);
    return this.prisma.neighborhood.delete({ where: { id } });
  }

  // ── Zone Price Rules (Matrix) ────────────────────────────────────────────

  async upsertPriceRule(data: UpsertZonePriceRuleDto) {
    return this.prisma.zonePriceRule.upsert({
      where: {
        originZoneId_destZoneId: {
          originZoneId: data.originZoneId,
          destZoneId: data.destZoneId,
        },
      },
      update: {
        price: data.price,
        isActive: data.isActive ?? true,
      },
      create: {
        originZoneId: data.originZoneId,
        destZoneId: data.destZoneId,
        price: data.price,
        isActive: data.isActive ?? true,
      },
    });
  }

  async findAllPriceRules(cityId?: string) {
    const where: any = {};
    if (cityId) {
      where.originZone = { cityId };
    }
    
    return this.prisma.zonePriceRule.findMany({
      where,
      include: {
        originZone: true,
        destZone: true,
      },
      orderBy: [
        { originZone: { name: 'asc' } },
        { destZone: { name: 'asc' } }
      ],
    });
  }

  async findActiveMatrix() {
    const rules = await this.prisma.zonePriceRule.findMany({
      where: { isActive: true },
    });
    // Return mapping for frontend
    return rules.map(r => ({
      originZoneId: r.originZoneId,
      destZoneId: r.destZoneId,
      price: Number(r.price),
    }));
  }

  async removePriceRule(id: string) {
    return this.prisma.zonePriceRule.delete({ where: { id } });
  }
}
