import { BadRequestException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationSender } from '../notifications/notification-channel';
import { Role, BusinessStatus } from '@prisma/client';
import { normalizePhoneToE164BR } from '../common/phone/normalize-phone';
import * as crypto from 'crypto';

type JwtPayload = {
  sub: string;
  name: string;
  email?: string | null;
  role: Role;
  phoneE164: string;
  isRoot: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly notificationSender: NotificationSender,
  ) {}

  private hashOtp(code: string): string {
    // MVP: SHA256. Em produção, pode adicionar pepper e/ou usar scrypt/argon.
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  private generateOtpCode(): string {
    // 6 dígitos
    const n = crypto.randomInt(0, 1_000_000);
    return n.toString().padStart(6, '0');
  }

  async startOtp(params: {
    phone: string;
    requestIp?: string;
    userAgent?: string;
  }) {
    const phoneE164 = normalizePhoneToE164BR(params.phone);

    const user = await this.prisma.user.findUnique({
      where: { phoneE164 },
      select: { id: true, phoneE164: true },
    });

    if (!user) {
      throw new UnauthorizedException('Número não cadastrado. Por favor, crie uma conta primeiro.');
    }

    // rate limit simples: no máximo 3 OTPs nos últimos 15 min
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
    const sentCount = await this.prisma.otpToken.count({
      where: { userId: user.id, createdAt: { gte: fifteenMinAgo } },
    });
    if (sentCount >= 3) throw new HttpException('Muitas tentativas. Tente novamente mais tarde.', HttpStatus.TOO_MANY_REQUESTS);

    const code = this.generateOtpCode();

    await this.prisma.otpToken.create({
      data: {
        userId: user.id,
        codeHash: this.hashOtp(code),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
        sentTo: phoneE164,
        requestIp: params.requestIp,
        userAgent: params.userAgent,
      },
    });

    await this.notificationSender.sendOtp({
      to: phoneE164,
      code,
    });

    return { ok: true };
  }

  async registerMerchant(params: {
    phone: string;
    name: string;
    businessName: string;
    categoryId: string;
    businessPhone?: string;
    address?: string;
    slug?: string;
    requestIp?: string;
    userAgent?: string;
  }) {
    const phoneE164 = normalizePhoneToE164BR(params.phone);

    const existingUser = await this.prisma.user.findUnique({
      where: { phoneE164 },
    });

    if (existingUser) {
      throw new BadRequestException('Número já cadastrado.');
    }

    // Gerar um slug se não for enviado. Simplificação com Date.now()
    const finalSlug = params.slug || `${params.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

    // Transaction to create User and Business
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          phoneE164,
          name: params.name,
          role: Role.MERCHANT,
        },
      });

      await tx.business.create({
        data: {
          ownerId: newUser.id,
          name: params.businessName,
          slug: finalSlug,
          categoryId: params.categoryId,
          phone: params.businessPhone,
          address: params.address,
          status: BusinessStatus.PENDING,
        },
      });

      return newUser;
    });

    // Start OTP flow automatically using internal method logic
    return this.sendOtpToUser(user.id, phoneE164, params.requestIp, params.userAgent);
  }

  async registerCourier(params: {
    phone: string;
    name: string;
    requestIp?: string;
    userAgent?: string;
  }) {
    const phoneE164 = normalizePhoneToE164BR(params.phone);

    const existingUser = await this.prisma.user.findUnique({
      where: { phoneE164 },
    });

    if (existingUser) {
      throw new BadRequestException('Número já cadastrado.');
    }

    const user = await this.prisma.user.create({
      data: {
        phoneE164,
        name: params.name,
        role: Role.COURIER,
      },
    });

    return this.sendOtpToUser(user.id, phoneE164, params.requestIp, params.userAgent);
  }

  private async sendOtpToUser(userId: string, phoneE164: string, requestIp?: string, userAgent?: string) {
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
    const sentCount = await this.prisma.otpToken.count({
      where: { userId, createdAt: { gte: fifteenMinAgo } },
    });
    if (sentCount >= 3) throw new HttpException('Muitas tentativas. Tente novamente mais tarde.', HttpStatus.TOO_MANY_REQUESTS);

    const code = this.generateOtpCode();

    await this.prisma.otpToken.create({
      data: {
        userId,
        codeHash: this.hashOtp(code),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
        sentTo: phoneE164,
        requestIp,
        userAgent,
      },
    });

    await this.notificationSender.sendOtp({
      to: phoneE164,
      code,
    });

    return { ok: true };
  }

  async verifyOtp(params: { phone: string; code: string }) {
    const phoneE164 = normalizePhoneToE164BR(params.phone);

    const user = await this.prisma.user.findUnique({
      where: { phoneE164 },
      select: { id: true, name: true, email: true, role: true, phoneE164: true, isActive: true, isRoot: true },
    });

    if (!user || !user.isActive) throw new UnauthorizedException('Acesso não permitido.');

    const token = await this.prisma.otpToken.findFirst({
      where: {
        userId: user.id,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!token) throw new UnauthorizedException('Código inválido ou expirado.');

    if (token.attempts >= 5) throw new HttpException('Muitas tentativas. Gere um novo código.', HttpStatus.TOO_MANY_REQUESTS);

    const isValid = token.codeHash === this.hashOtp(params.code);
    if (!isValid) {
      await this.prisma.otpToken.update({
        where: { id: token.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Código inválido.');
    }

    await this.prisma.otpToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() },
    });

    const payload: JwtPayload = {
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phoneE164: user.phoneE164,
      isRoot: user.isRoot,
    };

    const jwt = this.jwtService.sign(payload);

    return {
      accessToken: jwt, // Consistent with frontend Verify page which expects accessToken
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phoneE164: user.phoneE164,
        isRoot: user.isRoot,
      },
    };
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        businesses: {
          select: { id: true, name: true, slug: true, address: true, status: true, defaultDeliveryPrice: true }
        }
      }
    });
  }
}
