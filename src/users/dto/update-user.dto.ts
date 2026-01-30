import { IsString, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  email?: string;
  
  // Phone usually requires re-verification, so we might skip it for now or implement verified change.
  // For MVP, letting them change it directly might be risky if it's the auth key.
  // Requirement says: "editar os dados do negócio, do seu acesso (user, exceto role)"
  // I will allow name and email for now. Phone is sensitive for OTP auth.
}
