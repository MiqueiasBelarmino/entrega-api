import { IsBoolean, IsDecimal, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
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

  @IsDecimal()
  @IsOptional()
  monthlyFee?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  deliveryLimit?: number;

  @IsDecimal()
  @IsOptional()
  perDeliveryFee?: string;

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
