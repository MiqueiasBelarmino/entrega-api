import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class ActiveUserGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userPayload = request.user;

    if (!userPayload || !userPayload.id) {
       // If no user payload, JwtGuard should have caught it, 
       // but if we are here and no user, it means something is wrong or route is not protected by JWT but not public?
       // Actually if JwtGuard is global, it runs first. If it passes (valid token), we have user.
       // If public, we returned true above.
       return true; 
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userPayload.id },
      select: { isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User is inactive.');
    }

    return true;
  }
}
