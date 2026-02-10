import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { DeliveryStatus, Prisma, Role } from '@prisma/client';
import { NotificationSender } from '../notifications/notification-channel';

import { PushService } from '../push/push.service';

@Injectable()
export class DeliveriesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationSender,
    private pushService: PushService,
  ) {}

  async create(userId: string, dto: CreateDeliveryDto) {
    // Validate business ownership
    const business = await this.prisma.business.findUnique({
      where: { id: dto.businessId },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    if (business.status !== 'ACTIVE') {
      throw new ForbiddenException('Business is not active');
    }

    if (business.ownerId !== userId) {
      throw new ForbiddenException('You do not own this business');
    }

    const preferredUntil = dto.preferredCourierId 
      ? new Date(Date.now() + 30 * 60 * 1000) // 30 minutes window
      : null;

    const delivery = await this.prisma.delivery.create({
      data: {
        merchantId: userId,
        businessId: dto.businessId,
        pickupAddress: dto.pickupAddress,
        dropoffAddress: dto.dropoffAddress,
        price: dto.price,
        notes: dto.notes,
        status: DeliveryStatus.AVAILABLE,
        preferredCourierId: dto.preferredCourierId,
        preferredUntil,
      },
    });

    // Notify Couriers
    if (delivery.preferredCourierId) {
       this.pushService.sendToUser(delivery.preferredCourierId, {
           type: 'delivery-available',
           deliveryId: delivery.id,
           title: 'Nova entrega prioritária!',
           body: 'Você recebeu uma oferta exclusiva.',
           routeTo: '/courier'
       });
    } else {
        // Broadcast to all active couriers (MVP approach - could be geo-filtered later)
        const activeCouriers = await this.prisma.user.findMany({
            where: { role: Role.COURIER, isActive: true },
            select: { id: true }
        });
        const courierIds = activeCouriers.map(c => c.id);
        if (courierIds.length > 0) {
            this.pushService.sendToUsers(courierIds, {
                type: 'delivery-available',
                deliveryId: delivery.id,
                title: 'Nova entrega disponível 📦',
                body: 'Abra o app para aceitar.',
                routeTo: '/courier'
            });
        }
    }

    return delivery;
  }

  async findAllMerchant(userId: string) {
    return this.prisma.delivery.findMany({
      where: { merchantId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        courier: {
            select: { id: true, name: true, phoneE164: true }
        },
        business: {
            select: { id: true, name: true }
        }
      }
    });
  }

  async findOne(userId: string, role: string, id: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        courier: {
            select: { id: true, name: true, phoneE164: true }
        },
         business: {
            select: { id: true, name: true, phone: true, address: true }
        },
        merchant: {
            select: { id: true, name: true, phoneE164: true }
        }
      }
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (role === Role.MERCHANT && delivery.merchantId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (role === Role.COURIER && delivery.courierId !== userId && delivery.status !== DeliveryStatus.AVAILABLE) {
      throw new ForbiddenException('Access denied');
    }

    // Sanitize PII for Couriers if delivery is just AVAILABLE (not yet accepted by them)
    if (role === Role.COURIER && delivery.status === DeliveryStatus.AVAILABLE) {
        return {
            ...delivery,
            merchant: {
                id: delivery.merchant.id,
                name: delivery.merchant.name,
                // phoneE164 removed
            },
            business: {
                id: delivery.business.id,
                name: delivery.business.name,
                address: delivery.business.address,
                // phone removed
            }
        };
    }

    return delivery;
  }

  // Courier methods
  async findAvailable(userId: string) {
    return this.prisma.delivery.findMany({
      where: { 
          status: DeliveryStatus.AVAILABLE,
          OR: [
              { preferredCourierId: null },
              { preferredCourierId: userId },
              { preferredUntil: { lt: new Date() } }
          ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
          select: { id: true, name: true }
        },
        merchant: {
          select: { id: true, name: true } // Removed phoneE164
        }
      }
    });
  }

  async findByCourier(courierId: string) {
    const commonInclude = {
        business: {
            select: { id: true, name: true }
        },
        merchant: {
            select: { id: true, name: true, phoneE164: true }
        }
    };

    const [inProgress, waiting] = await Promise.all([
        // 1. Em andamento (PICKED_UP): pickedUpAt ASC
        this.prisma.delivery.findMany({
            where: { courierId, status: DeliveryStatus.PICKED_UP },
            orderBy: [
                { pickedUpAt: 'asc' },
                { createdAt: 'asc' },
                { id: 'asc' }
            ],
            include: commonInclude
        }),
        // 2. Aguardando retirada (ACCEPTED): acceptedAt ASC
        this.prisma.delivery.findMany({
            where: { courierId, status: DeliveryStatus.ACCEPTED },
            orderBy: [
                { acceptedAt: 'asc' },
                { createdAt: 'asc' },
                { id: 'asc' }
            ],
            include: commonInclude
        }),
        // // 3. Histórico — completadas (COMPLETED): completedAt DESC
        // this.prisma.delivery.findMany({
        //     where: { courierId, status: DeliveryStatus.COMPLETED },
        //     orderBy: [
        //         { completedAt: 'desc' },
        //         { createdAt: 'asc' },
        //         { id: 'asc' }
        //     ],
        //     include: commonInclude
        // }),
        // // 4. Histórico — canceladas (CANCELED): canceledAt DESC
        // this.prisma.delivery.findMany({
        //     where: { courierId, status: DeliveryStatus.CANCELED },
        //     orderBy: [
        //         { canceledAt: 'desc' },
        //         { createdAt: 'asc' },
        //         { id: 'asc' }
        //     ],
        //     include: commonInclude
        // })
    ]);

    return [...inProgress, ...waiting];
  }

  async accept(userId: string, id: string) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id } });
    
    if (delivery && delivery.preferredCourierId && delivery.preferredCourierId !== userId) {
        if (delivery.preferredUntil && delivery.preferredUntil > new Date()) {
             throw new ForbiddenException('Priority window active for another courier');
        }
    }

    // Atomic update to prevent race conditions
    const result = await this.prisma.delivery.updateMany({
      where: {
        id,
        status: DeliveryStatus.AVAILABLE,
        courierId: null,
      },
      data: {
        status: DeliveryStatus.ACCEPTED,
        courierId: userId,
        acceptedAt: new Date(),
      },
    });

    if (result.count === 0) {
      if (!delivery) throw new NotFoundException('Delivery not found'); // Re-fetch or use cached check if valid
      // ... existing error logic ...
      const current = await this.prisma.delivery.findUnique({ where: { id } }); // fetch fresh
      if (!current) throw new NotFoundException('Delivery not found');

      if (current.status !== DeliveryStatus.AVAILABLE) {
        throw new ConflictException('Delivery is no longer available');
      }
      if (current.courierId) {
        throw new ConflictException('Delivery already accepted by another courier');
      }
      throw new ConflictException('Unable to accept delivery');
    }

    const updatedDelivery = await this.prisma.delivery.findUnique({ where: { id } });

    // Notify Merchant
    if (updatedDelivery) {
        this.pushService.sendToUser(updatedDelivery.merchantId, {
            type: 'delivery-accepted',
            deliveryId: updatedDelivery.id,
            title: 'Entrega aceita! 🛵',
            body: 'Um entregador aceitou seu pedido.',
            routeTo: `/merchant`
        });
    }

    return updatedDelivery;
  }

  async pickup(userId: string, id: string) {
    const result = await this.prisma.delivery.updateMany({
      where: {
        id,
        courierId: userId,
        status: DeliveryStatus.ACCEPTED,
      },
      data: {
        status: DeliveryStatus.PICKED_UP,
        pickedUpAt: new Date(),
      },
    });

    if (result.count === 0) {
      const delivery = await this.prisma.delivery.findUnique({ where: { id } });
      if (!delivery) throw new NotFoundException('Delivery not found');

      if (delivery.courierId !== userId) {
        throw new ForbiddenException('You are not the courier for this delivery');
      }
      if (delivery.status !== DeliveryStatus.ACCEPTED) {
        throw new ConflictException(`Cannot pickup delivery in status ${delivery.status}`);
      }
    }

    return this.prisma.delivery.findUnique({ where: { id } });
  }

  async complete(userId: string, id: string) {
    const result = await this.prisma.delivery.updateMany({
      where: {
        id,
        courierId: userId,
        status: DeliveryStatus.PICKED_UP,
      },
      data: {
        status: DeliveryStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    if (result.count === 0) {
      const delivery = await this.prisma.delivery.findUnique({ where: { id } });
      if (!delivery) throw new NotFoundException('Delivery not found');

      if (delivery.courierId !== userId) {
        throw new ForbiddenException('You are not the courier for this delivery');
      }
      if (delivery.status !== DeliveryStatus.PICKED_UP) {
        throw new ConflictException(`Cannot complete delivery in status ${delivery.status}`);
      }
    }

    const updatedDelivery = await this.prisma.delivery.findUnique({ where: { id } });

    // Notify Merchant
    if (updatedDelivery) {
        this.pushService.sendToUser(updatedDelivery.merchantId, {
            type: 'delivery-completed',
            deliveryId: updatedDelivery.id,
            title: 'Entrega finalizada ✅',
            body: 'O pedido foi entregue com sucesso.',
            routeTo: `/merchant`
        });
    }

    return updatedDelivery;
  }

  async cancel(userId: string, id: string) {
    const result = await this.prisma.delivery.updateMany({
      where: {
        id,
        courierId: userId,
        status: DeliveryStatus.ACCEPTED,
      },
      data: {
        status: DeliveryStatus.CANCELED,
        canceledAt: new Date(),
        canceledBy: 'COURIER', // CanceledBy.COURIER
        cancelReason: 'Courier canceled',
      },
    });

    if (result.count === 0) {
      const delivery = await this.prisma.delivery.findUnique({ where: { id } });
      if (!delivery) throw new NotFoundException('Delivery not found');

      if (delivery.courierId !== userId) {
        throw new ForbiddenException('You are not the courier for this delivery');
      }
      if (delivery.status !== DeliveryStatus.ACCEPTED) {
        throw new ConflictException(`Cannot cancel delivery in status ${delivery.status}`);
      }
    }

    return this.prisma.delivery.findUnique({ where: { id } });
  }

  async cancelByMerchant(userId: string, id: string, reason?: string) {
      const delivery = await this.prisma.delivery.findUnique({ where: { id } });
      if (!delivery) throw new NotFoundException('Delivery not found');
      
      if (delivery.merchantId !== userId) {
          throw new ForbiddenException('Access denied');
      }

      if (delivery.status !== DeliveryStatus.AVAILABLE && delivery.status !== DeliveryStatus.ACCEPTED) {
          throw new ConflictException('Cannot cancel delivery in current status');
      }

      // If accepted, we can cancel, but it affects the courier.
      // Requirements: "Allowed when status is AVAILABLE or ACCEPTED (only if not PICKED_UP)." -> Handled.
      
      const updated = await this.prisma.delivery.update({
          where: { id },
          data: {
              status: DeliveryStatus.CANCELED,
              canceledAt: new Date(),
              canceledBy: 'MERCHANT', // CanceledBy.MERCHANT
              cancelReason: reason || 'Merchant canceled',
          }
      });
      
      // Notify Courier if allocated
      if (delivery.courierId) {
          this.pushService.sendToUser(delivery.courierId, {
              type: 'delivery-canceled',
              deliveryId: updated.id,
              title: 'Entrega cancelada ❌',
              body: 'O estabelecimento cancelou o pedido.',
              routeTo: '/courier'
          });
      }

      return updated;
  }

  async reportIssue(userId: string, id: string, reason: string) {
    const result = await this.prisma.delivery.updateMany({
      where: {
        id,
        courierId: userId,
        status: { in: [DeliveryStatus.ACCEPTED, DeliveryStatus.PICKED_UP] },
      },
      data: {
        status: DeliveryStatus.ISSUE,
        issueReason: reason,
        issueAt: new Date(),
      },
    });

    if (result.count === 0) {
      const delivery = await this.prisma.delivery.findUnique({ where: { id } });
      if (!delivery) throw new NotFoundException('Delivery not found');

      if (delivery.courierId !== userId) {
        throw new ForbiddenException('You are not the courier for this delivery');
      }
      if (delivery.status !== DeliveryStatus.ACCEPTED && delivery.status !== DeliveryStatus.PICKED_UP) {
        throw new ConflictException(`Cannot report issue for delivery in status ${delivery.status}`);
      }
    }

    const updated = await this.prisma.delivery.findUnique({ where: { id } });
    
    // Notify Merchant about Issue
    if (updated) {
        this.pushService.sendToUser(updated.merchantId, {
           type: 'delivery-issue',
           deliveryId: updated.id,
           title: 'Problema na entrega ⚠️',
           body: `Entregador relatou: ${reason}`,
           routeTo: '/merchant'
        });
    }

    return updated;
  }
}
