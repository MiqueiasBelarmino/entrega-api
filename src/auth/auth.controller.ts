import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthStartDto } from './dto/auth-start.dto';
import { AuthVerifyDto } from './dto/auth-verify.dto';
import { RegisterMerchantDto } from './dto/register-merchant.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('start')
  start(@Body() body: AuthStartDto, @Req() req: any) {
    return this.authService.startOtp({
      phone: body.phone,
      requestIp: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @Post('register/merchant')
  registerMerchant(@Body() body: RegisterMerchantDto, @Req() req: any) {
    return this.authService.registerMerchant({
      ...body,
      requestIp: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @Post('verify')
  verify(@Body() body: AuthVerifyDto) {
    return this.authService.verifyOtp({
      phone: body.phone,
      code: body.code,
    });
  }


  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    // req.user comes from JWT, might be stale. Fetch fresh.
    return this.authService.getMe(req.user.id);
  }
}
