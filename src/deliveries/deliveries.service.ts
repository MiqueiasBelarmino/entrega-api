import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { DeliveryStatus, Prisma } from '@prisma/client';
import { NotificationSender } from '../notifications/notification-channel';

@Injectable()
export class DeliveriesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationSender,
  ) {}

  async create(userId: string, dto: CreateDeliveryDto) {
    // Validate business ownership
    const business = await this.prisma.business.findUnique({
      where: { id: dto.businessId },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    if (business.ownerId !== userId) {
      throw new ForbiddenException('You do not own this business');
    }

    return this.prisma.delivery.create({
      data: {
        merchantId: userId,
        businessId: dto.businessId,
        pickupAddress: dto.pickupAddress,
        dropoffAddress: dto.dropoffAddress,
        price: dto.price,
        notes: dto.notes,
        status: DeliveryStatus.AVAILABLE,
      },
    });
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

  async findOneMerchant(userId: string, id: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        courier: {
            select: { id: true, name: true, phoneE164: true }
        },
         business: {
            select: { id: true, name: true }
        }
      }
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.merchantId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return delivery;
  }

  // Courier methods
  async findAllAvailable() {
    return this.prisma.delivery.findMany({
      where: { status: DeliveryStatus.AVAILABLE },
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
            select: { id: true, name: true }
        },
        merchant: {
            select: { id: true, name: true, phoneE164: true }
        }
      }
    });
  }

  async accept(userId: string, id: string) {
    const delivery = await this.prisma.$transaction(async (tx) => {
        const delivery = await tx.delivery.findUnique({
            where: { id }
        });

        if (!delivery) throw new NotFoundException('Delivery not found');

        if (delivery.status !== DeliveryStatus.AVAILABLE) {
            throw new ConflictException('Delivery is not available');
        }

        return tx.delivery.update({
            where: { id },
            data: {
                status: DeliveryStatus.ACCEPTED,
                courierId: userId,
                acceptedAt: new Date(),
            }
        });
    });

    // Notify Merchant
    await this.notifications.send(
      delivery.merchantId,
      `Your delivery ${delivery.id.slice(0, 8)} was accepted by a courier.`
    );

    return delivery;
  }

  async pickup(userId: string, id: string) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id }});
    if (!delivery) throw new NotFoundException('Delivery not found');
    
    if (delivery.courierId !== userId) throw new ForbiddenException('Not your delivery');
    if (delivery.status !== DeliveryStatus.ACCEPTED) throw new BadRequestException('Delivery must be ACCEPTED to pickup');

    return this.prisma.delivery.update({
        where: { id },
        data: {
            status: DeliveryStatus.PICKED_UP,
            pickedUpAt: new Date(),
        }
    });
  }

  async complete(userId: string, id: string) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id }});
    if (!delivery) throw new NotFoundException('Delivery not found');

    if (delivery.courierId !== userId) throw new ForbiddenException('Not your delivery');
    if (delivery.status !== DeliveryStatus.PICKED_UP) throw new BadRequestException('Delivery must be PICKED_UP to complete');

    const updated = await this.prisma.delivery.update({
        where: { id },
        data: {
            status: DeliveryStatus.COMPLETED,
            completedAt: new Date(),
        }
    });

    // Notify Merchant
    await this.notifications.send(
      updated.merchantId,
      `Your delivery ${updated.id.slice(0, 8)} has been completed!`
    );

    return updated;
  }

  async cancel(userId: string, id: string) {
    // Only courier can cancel BEFORE pickup (conceptually, or maybe merchant too? Spec says "courier pode cancelar antes do pickup")
    // "POST /deliveries/:id/cancel - permitido apenas se status == ACCEPTED - courier pode cancelar antes do pickup"
    
    const delivery = await this.prisma.delivery.findUnique({ where: { id }});
    if (!delivery) throw new NotFoundException('Delivery not found');

    if (delivery.courierId !== userId) throw new ForbiddenException('Not your delivery');
    if (delivery.status !== DeliveryStatus.ACCEPTED) throw new BadRequestException('Can only cancel if ACCEPTED');

    return this.prisma.delivery.update({
        where: { id },
        data: {
            status: DeliveryStatus.CANCELED,
            canceledAt: new Date(),
        }
    });
  }
}
