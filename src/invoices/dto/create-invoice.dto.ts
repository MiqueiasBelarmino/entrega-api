import { IsNotEmpty, IsString, IsDateString } from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  subscriptionId: string;

  @IsString()
  @IsNotEmpty()
  referenceMonth: string; // YYYY-MM

  @IsDateString()
  @IsNotEmpty()
  periodStart: string;

  @IsDateString()
  @IsNotEmpty()
  periodEnd: string;

  @IsDateString()
  @IsNotEmpty()
  dueDate: string;
}
