import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateNeighborhoodDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  cityId: string;

  @IsUUID()
  @IsNotEmpty()
  deliveryZoneId: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
