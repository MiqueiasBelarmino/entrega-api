import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { normalizePhoneToE164BR } from '../common/phone/normalize-phone';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() body: CreateUserDto) {
    const phoneE164 = normalizePhoneToE164BR(body.phone);
    return this.usersService.create({
      ...body,
      phoneE164,
    });
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@Request() req, @Body() body: { name?: string; email?: string }) {
      // NOTE: Using inline body type for speed, ideally use DTO
      return this.usersService.update(req.user.id, body);
  }
}
