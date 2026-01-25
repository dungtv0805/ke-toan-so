import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsArray,
  IsOptional,
} from 'class-validator';
import { UserRole } from '@app/entities';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  hoTen: string;

  @IsEnum(UserRole)
  @IsOptional()
  vaiTro?: UserRole;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];
}
