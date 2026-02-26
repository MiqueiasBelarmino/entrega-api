import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, BusinessStatus } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    name: string;
    email?: string;
    phoneE164: string;
    role?: Role;
    businessName?: string;
    categoryId?: string;
    businessPhone?: string;
    address?: string;
  }) {
    // If it's a merchant, create user and business in a transaction
    if (data.role === Role.MERCHANT && data.businessName && data.categoryId) {
       const bName = data.businessName;
       const cId = data.categoryId;
       const bPhone = data.businessPhone;
       const bAddress = data.address;

       return this.prisma.$transaction(async (tx) => {
         const user = await tx.user.create({
           data: {
             name: data.name,
             email: data.email,
             phoneE164: data.phoneE164,
             role: data.role,
           },
         });

         const finalSlug = `${bName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

         await tx.business.create({
           data: {
             ownerId: user.id,
             name: bName,
             categoryId: cId,
             slug: finalSlug,
             phone: bPhone,
             address: bAddress,
             status: BusinessStatus.ACTIVE, // Created by admin = auto active
           },
         });

         return user;
       });
    }

    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phoneE164: data.phoneE164,
        role: data.role || Role.COURIER,
      },
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async findByEmail(email: string) {
    return this.prisma
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async update(id: string, data: { name?: string; email?: string; role?: Role; isActive?: boolean }) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
