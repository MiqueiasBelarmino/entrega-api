import { Controller, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { BusinessService } from './business.service';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('business')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get('my')
  @Roles(Role.MERCHANT)
  findMy(@Request() req) {
    return this.businessService.findMyBusiness(req.user.id);
  }

  @Patch(':id')
  @Roles(Role.MERCHANT)
  update(@Request() req, @Param('id') id: string, @Body() updateBusinessDto: UpdateBusinessDto) {
    return this.businessService.update(req.user.id, id, updateBusinessDto);
  }
}
