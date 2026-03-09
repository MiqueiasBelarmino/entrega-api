import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateNeighborhoodDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsUUID()
  @IsNotEmpty()
  deliveryZoneId: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
