import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateCityDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
