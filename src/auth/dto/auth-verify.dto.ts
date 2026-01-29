import { IsString, Length, MinLength } from 'class-validator';

export class AuthVerifyDto {
  @IsString()
  @MinLength(8)
  phone: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
