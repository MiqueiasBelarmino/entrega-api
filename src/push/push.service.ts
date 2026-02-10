import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Adjust path if needed
import * as webPush from 'web-push';

export interface PushSubscriptionDto {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (!publicKey || !privateKey || !subject) {
      this.logger.error('VAPID Configuration missing! Push notifications will not work.');
      return;
    }

    webPush.setVapidDetails(subject, publicKey, privateKey);
    this.logger.log('VAPID initialized');
  }

  getPublicKey() {
    return { key: process.env.VAPID_PUBLIC_KEY };
  }

  async addSubscription(userId: string, subscription: PushSubscriptionDto, userAgent?: string) {
    return this.prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId,
          endpoint: subscription.endpoint,
        },
      },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
        updatedAt: new Date(),
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
      },
    });
  }

  async removeSubscription(userId: string, endpoint: string) {
    // Only delete if it belongs to the user
    try {
      await this.prisma.pushSubscription.delete({
        where: {
          userId_endpoint: {
            userId,
            endpoint,
          },
        },
      });
    } catch (e) {
      // Ignore if not found
    }
  }

  async sendToUser(userId: string, payload: any) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    const payloadString = JSON.stringify(payload);

    const promises = subscriptions.map((sub) =>
      this.sendNotification(sub, payloadString),
    );

    await Promise.allSettled(promises);
  }

  async sendToUsers(userIds: string[], payload: any) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId: { in: userIds } },
    });

    const payloadString = JSON.stringify(payload);

    const promises = subscriptions.map((sub) =>
      this.sendNotification(sub, payloadString),
    );

    await Promise.allSettled(promises);
  }

  private async sendNotification(subscription: any, payload: string) {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    try {
      await webPush.sendNotification(pushSubscription, payload);
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        this.logger.warn(`Subscription expired or invalid: ${subscription.id}. Removing.`);
        await this.prisma.pushSubscription.delete({ where: { id: subscription.id } });
      } else {
        this.logger.error(`Error sending push to ${subscription.id}: ${error.message}`);
      }
    }
  }
}
