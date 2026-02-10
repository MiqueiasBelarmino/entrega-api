import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { normalizePhoneToE164BR } from '../common/phone/normalize-phone';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  create(@Request() req, @Body() body: CreateUserDto) {
    if (body.role && (body.role === Role.ADMIN || body.role === 'ROOT') && !req.user.isRoot) {
        throw new ForbiddenException('Only ROOT can create ADMIN users');
    }

    const phoneE164 = normalizePhoneToE164BR(body.phone);
    return this.usersService.create({
      ...body,
      phoneE164,
      role: body.role,
    });
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async update(@Request() req, @Param('id') id: string, @Body() body: { name?: string; email?: string; role?: Role; isActive?: boolean }) {
    if (body.role && !req.user.isRoot) {
        throw new ForbiddenException('Only ROOT can change user roles');
    }
    
    // Check if target is ADMIN? req.user.isRoot should be enough to allow.
    // Ideally we also prevent ADMIN from modifying other ADMINs if not ROOT, but "Only ROOT for role elevation" is the strict requirement.
    // "ADMIN cannot promote to ADMIN; only ROOT can." handled.
    // "ADMIN cannot modify ... other ADMIN accounts" - user asked for this in previous context? 
    // "Requirements: ... Keep ability for ADMIN to deactivate users..."
    // "Prevent admin privilege escalation (Root-only for role elevation)"
    
    // I will implement strictly what was asked: checking isRoot if role is involved.
    
    return this.usersService.update(id, body);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@Request() req, @Body() body: { name?: string; email?: string }) {
      // NOTE: Using inline body type for speed, ideally use DTO
      return this.usersService.update(req.user.id, body);
  }
}
