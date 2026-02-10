import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { PushService, PushSubscriptionDto } from './push.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    role: string;
  };
}

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('vapid-public-key')
  getPublicKey() {
    return this.pushService.getPublicKey();
  }

  @Post('subscribe')
  subscribe(@Req() req: AuthenticatedRequest, @Body() body: PushSubscriptionDto) {
    const userId = req.user.userId;
    const userAgent = req.headers['user-agent'];
    return this.pushService.addSubscription(userId, body, userAgent);
  }

  @Post('unsubscribe')
  unsubscribe(@Req() req: AuthenticatedRequest, @Body() body: { endpoint: string }) {
    const userId = req.user.userId;
    return this.pushService.removeSubscription(userId, body.endpoint);
  }
}
