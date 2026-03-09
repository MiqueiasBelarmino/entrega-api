import { IsString, IsOptional, IsNumber, Min, IsUUID } from 'class-validator';

export class UpdateBusinessDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsUUID()
  @IsOptional()
  neighborhoodId?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  defaultDeliveryPrice?: number;
}
