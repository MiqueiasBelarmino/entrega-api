import { IsString, MinLength } from 'class-validator';

export class AuthStartDto {
  @IsString()
  @MinLength(8)
  phone: string; // aceita formatado; normalizamos
}
