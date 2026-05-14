import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesService } from '../invoices/invoices.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class BillingSchedulerService {
  private readonly logger = new Logger(BillingSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private invoicesService: InvoicesService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM) // Run at 3 AM every day
  async handleBilling() {
    this.logger.log('Starting daily billing job...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find subscriptions that need billing
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.OVERDUE, SubscriptionStatus.TRIAL] },
        nextBillingDate: { lte: today },
      },
      include: { plan: true },
    });

    this.logger.log(`Found ${subscriptions.length} subscriptions to process.`);

    for (const sub of subscriptions) {
      try {
        await this.processSubscription(sub, today);
      } catch (error) {
        this.logger.error(`Failed to process billing for subscription ${sub.id}: ${error.message}`);
      }
    }

    this.logger.log('Daily billing job complete.');
  }

  private async processSubscription(sub: any, today: Date) {
    // If it was in TRIAL and trial ended, transition to ACTIVE
    if (sub.status === SubscriptionStatus.TRIAL) {
        await this.prisma.subscription.update({
            where: { id: sub.id },
            data: { status: SubscriptionStatus.ACTIVE }
        });
        // We might want to just set the next billing date and not generate an invoice for the trial period
        // Or generate a R$ 0,00 invoice. 
        // According to the plan: "ao expirar trialEndsAt: status -> ACTIVE, job agenda o primeiro ciclo"
        const nextDate = new Date(sub.nextBillingDate);
        nextDate.setMonth(nextDate.getMonth() + 1);
        
        await this.prisma.subscription.update({
            where: { id: sub.id },
            data: { nextBillingDate: nextDate }
        });
        return;
    }

    // Determine period
    // The current cycle ended at nextBillingDate
    // So the period is [nextBillingDate - 1 month, nextBillingDate]
    const periodEnd = new Date(sub.nextBillingDate);
    const periodStart = new Date(periodEnd);
    periodStart.setMonth(periodStart.getMonth() - 1);

    const referenceMonth = `${periodStart.getFullYear()}-${(periodStart.getMonth() + 1).toString().padStart(2, '0')}`;
    
    // Due date: usually 5 days after generation or fixed day
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 7);

    this.logger.log(`Generating invoice for sub ${sub.id} (Month: ${referenceMonth})`);

    await this.invoicesService.create({
      subscriptionId: sub.id,
      referenceMonth,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      dueDate: dueDate.toISOString(),
    });

    // Update next billing date
    const nextBillingDate = new Date(sub.nextBillingDate);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { nextBillingDate },
    });
  }
}
