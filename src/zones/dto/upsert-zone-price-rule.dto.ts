import { IsUUID, IsNumber, Min, IsBoolean, IsOptional } from 'class-validator';

export class UpsertZonePriceRuleDto {
  @IsUUID()
  originZoneId: string;

  @IsUUID()
  destZoneId: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
