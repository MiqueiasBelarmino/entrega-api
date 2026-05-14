import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceStatus, PerDeliveryFeeType, DeliveryStatus, Prisma } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateInvoiceDto) {
    const { subscriptionId, referenceMonth, periodStart, periodEnd, dueDate } = dto;

    // Check if invoice already exists for this subscription and month
    const existing = await this.prisma.invoice.findUnique({
      where: {
        subscriptionId_referenceMonth: {
          subscriptionId,
          referenceMonth,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Invoice for ${referenceMonth} already exists for this subscription`);
    }

    // Get subscription and plan
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    const plan = subscription.plan;
    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    // Find deliveries in period
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        businessId: subscription.businessId,
        status: DeliveryStatus.COMPLETED,
        completedAt: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { completedAt: 'asc' },
    });

    // Calculation logic
    const monthlyFeeAmount = plan.monthlyFee || new Prisma.Decimal(0);
    const deliveryLimit = plan.deliveryLimit || 0;
    const deliveryCount = deliveries.length;
    
    let includedDeliveries = 0;
    let excessDeliveries = 0;
    let deliveryFeeAmount = new Prisma.Decimal(0);

    const invoiceDeliveriesData: any[] = [];

    for (let i = 0; i < deliveries.length; i++) {
      const delivery = deliveries[i];
      let fee = new Prisma.Decimal(0);
      let isIncluded = false;

      // Check franchise
      if (plan.monthlyFee && i < deliveryLimit) {
        includedDeliveries++;
        isIncluded = true;
      } else {
        excessDeliveries++;
        // Calculate fee
        if (plan.perDeliveryFee && plan.perDeliveryFeeType) {
          if (plan.perDeliveryFeeType === PerDeliveryFeeType.FIXED) {
            fee = plan.perDeliveryFee;
          } else if (plan.perDeliveryFeeType === PerDeliveryFeeType.PERCENTAGE) {
            fee = delivery.price.mul(plan.perDeliveryFee).div(100);
          }
        }
      }

      deliveryFeeAmount = deliveryFeeAmount.add(fee);
      invoiceDeliveriesData.push({
        deliveryId: delivery.id,
        deliveryValue: delivery.price,
        feeAmount: fee,
        isIncluded,
      });
    }

    const totalAmount = monthlyFeeAmount.add(deliveryFeeAmount);

    // Create Invoice and details in transaction
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          subscriptionId,
          businessId: subscription.businessId,
          referenceMonth,
          periodStart: start,
          periodEnd: end,
          dueDate: new Date(dueDate),
          monthlyFeeAmount,
          deliveryCount,
          includedDeliveries,
          excessDeliveries,
          deliveryFeeAmount,
          totalAmount,
          status: InvoiceStatus.PENDING,
        },
      });

      // Create delivery details
      await tx.invoiceDelivery.createMany({
        data: invoiceDeliveriesData.map(d => ({
          ...d,
          invoiceId: invoice.id,
        })),
      });

      return invoice;
    });
  }

  async findAll() {
    return this.prisma.invoice.findMany({
      include: {
        business: { select: { name: true } },
        subscription: { include: { plan: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByBusiness(businessId: string) {
    return this.prisma.invoice.findMany({
      where: { businessId },
      include: { subscription: { include: { plan: { select: { name: true } } } } },
      orderBy: { periodStart: 'desc' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        business: true,
        subscription: { include: { plan: true } },
        deliveries: {
          include: {
            delivery: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    return invoice;
  }

  async markAsPaid(id: string, paidBy: string, notes?: string) {
    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
        paidBy,
        notes,
      },
    });
  }

  async waive(id: string, notes?: string) {
    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.WAIVED,
        notes,
      },
    });
  }
}
