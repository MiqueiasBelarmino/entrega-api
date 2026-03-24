import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessService {
  constructor(private prisma: PrismaService) {}

  async findMyBusiness(userId: string) {
    const businesses = await this.prisma.business.findMany({
      where: { ownerId: userId },
    });
    
    // For MVP, we assume 1 business per merchant usually, or we return the list.
    // The requirement implies "editing data of the business". 
    // We'll return the first one found or all. 
    // Let's return the list for scalability.
    return businesses;
  }

  async update(userId: string, businessId: string, dto: UpdateBusinessDto) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    if (business.ownerId !== userId) {
      throw new ForbiddenException('You do not own this business');
    }

    const dataToUpdate: any = { ...dto };
    if (dto.neighborhoodId) {
      const neighborhood = await this.prisma.neighborhood.findUnique({
        where: { id: dto.neighborhoodId },
      });
      if (!neighborhood) {
        throw new BadRequestException('Bairro fornecido inválido.');
      }
      dataToUpdate.cityId = neighborhood.cityId;
    }

    return this.prisma.business.update({
      where: { id: businessId },
      data: dataToUpdate,
    });
  }
}
