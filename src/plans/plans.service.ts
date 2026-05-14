import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async create(createPlanDto: CreatePlanDto) {
    return this.prisma.plan.create({
      data: createPlanDto,
    });
  }

  async findAll() {
    return this.prisma.plan.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllPublic() {
    return this.prisma.plan.findMany({
      where: { isPublic: true, isActive: true },
      orderBy: { monthlyFee: 'asc' },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }

    return plan;
  }

  async update(id: string, updatePlanDto: UpdatePlanDto) {
    await this.findOne(id);

    return this.prisma.plan.update({
      where: { id },
      data: updatePlanDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // Instead of deleting, we might want to deactivate if there are subscriptions
    const subscriptionsCount = await this.prisma.subscription.count({
      where: { planId: id },
    });

    if (subscriptionsCount > 0) {
      return this.prisma.plan.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.plan.delete({
      where: { id },
    });
  }
}
