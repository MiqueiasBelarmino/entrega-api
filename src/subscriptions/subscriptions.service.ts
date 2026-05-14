import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async create(createSubscriptionDto: CreateSubscriptionDto) {
    const { businessId, planId, startDate: startDateInput } = createSubscriptionDto;

    // Check if business exists
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { subscription: true },
    });

    if (!business) {
      throw new NotFoundException(`Business with ID ${businessId} not found`);
    }

    if (business.subscription) {
      throw new ConflictException(`Business ${businessId} already has a subscription`);
    }

    // Get plan details
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with ID ${planId} not found`);
    }

    const startDate = startDateInput ? new Date(startDateInput) : new Date();
    let trialEndsAt: Date | null = null;
    let nextBillingDate: Date | null = null;
    let status = createSubscriptionDto.status || SubscriptionStatus.ACTIVE;

    if (plan.trialDays && plan.trialDays > 0) {
      status = SubscriptionStatus.TRIAL;
      trialEndsAt = new Date(startDate.getTime() + plan.trialDays * 24 * 60 * 60 * 1000);
      nextBillingDate = trialEndsAt;
    } else {
      nextBillingDate = startDate; // Billing should happen immediately or be scheduled
    }

    return this.prisma.subscription.create({
      data: {
        businessId,
        planId,
        status,
        startDate,
        trialEndsAt,
        nextBillingDate,
      },
    });
  }

  async findByBusiness(businessId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { businessId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription for business ${businessId} not found`);
    }

    return subscription;
  }

  async updateStatus(id: string, status: SubscriptionStatus, reason?: string) {
    const data: any = { status };
    
    if (status === SubscriptionStatus.SUSPENDED) {
      data.suspendedAt = new Date();
      data.suspendReason = reason;
    } else if (status === SubscriptionStatus.CANCELED) {
      data.canceledAt = new Date();
      data.cancelReason = reason;
    }

    return this.prisma.subscription.update({
      where: { id },
      data,
    });
  }

  async findAll() {
    return this.prisma.subscription.findMany({
      include: { 
        business: { select: { name: true } },
        plan: { select: { name: true } }
      },
    });
  }
}
