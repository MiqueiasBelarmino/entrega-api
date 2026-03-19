import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { Role } from '@prisma/client';

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, deliveryId: string, dto: CreateRatingDto) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.status !== 'COMPLETED') {
      throw new BadRequestException('Delivery must be completed to be rated');
    }

    const isMerchant = delivery.merchantId === userId;
    const isCourier = delivery.courierId === userId;

    if (!isMerchant && !isCourier) {
      throw new BadRequestException('User is not part of this delivery');
    }

    // Check if user already rated
    const existingRating = await this.prisma.rating.findUnique({
      where: {
        deliveryId_reviewerId: {
          deliveryId,
          reviewerId: userId,
        },
      },
    });

    if (existingRating) {
      throw new BadRequestException('You have already rated this delivery');
    }

    const reviewedId = isMerchant ? delivery.courierId : delivery.merchantId;
    const role = isMerchant ? Role.MERCHANT : Role.COURIER;

    if (!reviewedId) {
      throw new BadRequestException('Cannot rate because the other party is missing');
    }

    const rating = await this.prisma.rating.create({
      data: {
        deliveryId,
        reviewerId: userId,
        reviewedId,
        role,
        score: dto.score,
        tags: dto.tags || [],
        comment: dto.comment,
      },
    });

    return rating;
  }

  async findByDelivery(userId: string, deliveryId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    const isMerchant = delivery.merchantId === userId;
    const isCourier = delivery.courierId === userId;

    if (!isMerchant && !isCourier) {
      throw new BadRequestException('User is not part of this delivery');
    }

    const ratings = await this.prisma.rating.findMany({
      where: { deliveryId },
    });

    // Blind rating logic
    const currentUserRating = ratings.find((r) => r.reviewerId === userId);
    const hasRated = !!currentUserRating;

    return ratings.map((rating) => {
      // If it's a rating given BY the current user, or if they have already rated the other person, return full data
      if (rating.reviewerId === userId || hasRated) {
        return rating;
      }

      // Otherwise, mask the rating received FROM the other person
      return {
        id: rating.id,
        deliveryId: rating.deliveryId,
        reviewerId: rating.reviewerId,
        reviewedId: rating.reviewedId,
        role: rating.role,
        createdAt: rating.createdAt,
        isHidden: true, 
        // Masked fields below
        score: null,
        tags: [],
        comment: null,
      };
    });
  }
}
