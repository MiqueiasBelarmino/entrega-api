import { OtpChannel } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class AuthStartDto {
  @IsString()
  @MinLength(8)
  phone: string; // aceita formatado; normalizamos

  @IsEnum(OtpChannel)
  channel: OtpChannel; // SMS | WHATSAPP
}
