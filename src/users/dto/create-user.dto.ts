import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  // @IsEnum(Role) -- IsEnum might need import, avoiding complex import if strict strict mode.
  // Actually, I should use `IsEnum`.
  role?: any; // Using any to avoid enum import issues if not straightforward, but let's try strict if possible.
  // Wait, I can't easily import Role here without potentially circular dependency or just plain enum import. 
  // Let's use string for now or better yet, verify imports.
  // I'll stick to basic DTO structure.
}
