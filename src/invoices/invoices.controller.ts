import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, Query } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoicesService.create(createInvoiceDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.invoicesService.findAll();
  }

  @Get('my')
  @Roles(Role.MERCHANT)
  findMy(@Query('businessId') businessId: string) {
    return this.invoicesService.findByBusiness(businessId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MERCHANT)
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Patch(':id/pay')
  @Roles(Role.ADMIN)
  markAsPaid(@Param('id') id: string, @Request() req, @Body('notes') notes?: string) {
    return this.invoicesService.markAsPaid(id, req.user.id, notes);
  }

  @Patch(':id/waive')
  @Roles(Role.ADMIN)
  waive(@Param('id') id: string, @Body('notes') notes?: string) {
    return this.invoicesService.waive(id, notes);
  }
}
