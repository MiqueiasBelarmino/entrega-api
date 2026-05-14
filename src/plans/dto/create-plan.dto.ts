import { IsBoolean, IsNumber, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { BillingCycleType, PerDeliveryFeeType } from '@prisma/client';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyFee?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  deliveryLimit?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  perDeliveryFee?: number;

  @IsEnum(PerDeliveryFeeType)
  @IsOptional()
  perDeliveryFeeType?: PerDeliveryFeeType;

  @IsEnum(BillingCycleType)
  @IsOptional()
  billingCycleType?: BillingCycleType;

  @IsInt()
  @Min(0)
  @IsOptional()
  trialDays?: number;
}
