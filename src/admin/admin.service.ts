import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryStatus, Prisma, Role, BusinessStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // 1. STATS
  async getStats(range: 'today' | '7d' | '30d' = 'today') {
    const now = new Date()
    const dateFrom = new Date(now)

    if (range === 'today') {
        dateFrom.setHours(0, 0, 0, 0)
    } else if (range === '7d') {
        dateFrom.setDate(dateFrom.getDate() - 7)
        dateFrom.setHours(0, 0, 0, 0)
    } else if (range === '30d') {
        dateFrom.setDate(dateFrom.getDate() - 30)
        dateFrom.setHours(0, 0, 0, 0)
    }

    const whereCreated = { createdAt: { gte: dateFrom } };

    const [
        totalRevenue,
        deliveriesCreated,
        couriersActive,
        merchantsActive
    ] = await Promise.all([
        this.prisma.delivery.aggregate({
            _sum: { price: true },
            where: { status: DeliveryStatus.COMPLETED, ...whereCreated }
        }),
        this.prisma.delivery.count({ where: whereCreated }),
        this.prisma.user.count({ where: { role: Role.COURIER, isActive: true } }),
        this.prisma.user.count({ where: { role: Role.MERCHANT, isActive: true } })
    ]);

    return {
        totalRevenue: totalRevenue._sum.price || 0,
        totalDeliveries: deliveriesCreated,
        couriersActive,
        merchantsActive
    };
  }

  // 2. DELIVERIES
  async findAllDeliveries(params: {
      status?: DeliveryStatus;
      merchantId?: string;
      courierId?: string;
      businessId?: string;
      query?: string;
      dateFrom?: string;
      dateTo?: string;
  }) {
    const where: Prisma.DeliveryWhereInput = {};

    if (params.status) where.status = params.status;
    if (params.merchantId) where.merchantId = params.merchantId;
    if (params.courierId) where.courierId = params.courierId;
    if (params.businessId) where.businessId = params.businessId;

    if (params.dateFrom) {
        where.createdAt = { gte: new Date(params.dateFrom) };
    }
    if (params.dateTo) {
        where.createdAt = { ...where.createdAt as any, lte: new Date(params.dateTo) };
    }

    if (params.query) {
        // Simple search on ID or addresses
        where.OR = [
            { id: { contains: params.query } }, // UUIDs dont really use contains but okay for partial match attempts or exact.
            { pickupAddress: { contains: params.query, mode: 'insensitive' } },
            { dropoffAddress: { contains: params.query, mode: 'insensitive' } },
        ];
    }

    return this.prisma.delivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            business: { select: { name: true } },
            merchant: { select: { name: true, phoneE164: true } },
            courier: { select: { name: true, phoneE164: true } },
        },
        take: 100 // Limit for safety
    });
  }

  async findOneDelivery(id: string) {
      return this.prisma.delivery.findUnique({
          where: { id },
          include: {
              business: true,
              merchant: true,
              courier: true,
          }
      });
  }

  async cancelDelivery(id: string) {
      const delivery = await this.prisma.delivery.findUnique({ where: { id } });
      if (!delivery) throw new NotFoundException('Delivery not found');

      if (delivery.status === DeliveryStatus.COMPLETED) {
          throw new ForbiddenException('Cannot cancel a completed delivery');
      }

      const data: Prisma.DeliveryUpdateInput = {
          status: DeliveryStatus.CANCELED,
          canceledAt: new Date(),
      };

      // If it was picked up, mark as issue implicitly? Spec says "se status == PICKED_UP -> marcar ISSUE automaticamente"
      // Wait, spec says: "Admin: Pode cancelar qualquer entrega NÃO COMPLETED - se status == PICKED_UP -> marcar ISSUE automaticamente"
      // This implies if Admin cancels a picked up delivery, it's an ISSUE state, not CANCELED? Or CANCELED with issue?
      // "status -> ISSUE" implies status IS ISSUE.
      
      if (delivery.status === DeliveryStatus.PICKED_UP) {
          data.status = DeliveryStatus.ISSUE;
          data.issueAt = new Date();
          data.issueReason = 'Cancelled by Admin while in transit';
      }

      return this.prisma.delivery.update({
          where: { id },
          data
      });
  }

  // 3. BUSINESSES
  async findAllBusinesses(params: { status?: BusinessStatus; query?: string }) {
      const where: Prisma.BusinessWhereInput = {};
      
      if (params.status) where.status = params.status;
      if (params.query) {
           where.OR = [
              { name: { contains: params.query, mode: 'insensitive' } },
              { slug: { contains: params.query, mode: 'insensitive' } },
          ];
      }

      return this.prisma.business.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: { owner: { select: { name: true, phoneE164: true } } }
      });
  }

  async updateBusinessStatus(id: string, status: BusinessStatus) {
      return this.prisma.business.update({
          where: { id },
          data: { status }
      });
  }

  // 4. USERS
  async findAllUsers(params: { role?: Role; isActive?: boolean; query?: string }) {
     const where: Prisma.UserWhereInput = {};

     if (params.role) where.role = params.role;
     if (params.isActive !== undefined) where.isActive = params.isActive;
     if (params.query) {
         where.OR = [
             { name: { contains: params.query, mode: 'insensitive' } },
             { email: { contains: params.query, mode: 'insensitive' } },
             { phoneE164: { contains: params.query } }
         ];
     }

     return this.prisma.user.findMany({
         where,
         orderBy: { createdAt: 'desc' }
     });
  }

  async updateUser(id: string, data: { role?: Role; isActive?: boolean }) {
      const user = await this.prisma.user.findUnique({ where: { id } });
      if (!user) throw new NotFoundException('User not found');

      if (user.isRoot) {
          // PROTECTION: cannot modify root
           if (data.role && data.role !== Role.ADMIN) {
               throw new ForbiddenException('Cannot change role of Root user');
           }
           if (data.isActive === false) {
               throw new ForbiddenException('Cannot deactivate Root user');
           }
      }

      return this.prisma.user.update({
          where: { id },
          data
      });
  }
}
