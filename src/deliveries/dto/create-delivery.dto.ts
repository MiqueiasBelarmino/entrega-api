import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateDeliveryDto {
  @IsString()
  @IsNotEmpty()
  pickupAddress: string;

  @IsString()
  @IsNotEmpty()
  dropoffAddress: string;

  @IsNumber()
  @Min(0.01)
  price: number; // In plain number, usually passed as number from JSON. Decimal handling in Service.

  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  @IsNotEmpty()
  businessId: string;
}
