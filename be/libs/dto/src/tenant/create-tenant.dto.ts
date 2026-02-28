import { IsString, IsNotEmpty, IsOptional, IsBoolean, Matches, IsEmail, ValidateNested, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

export class TenantAdminDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  hoTen: string;

  @IsString()
  @IsOptional()
  password?: string;
}

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @IsString()
  @IsOptional()
  maSoThue?: string;

  @IsString()
  @IsOptional()
  diaChi?: string;

  @IsString()
  @IsOptional()
  dienThoai?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  nguoiDaiDien?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ValidateNested()
  @Type(() => TenantAdminDto)
  @IsOptional()
  admin?: TenantAdminDto;

  @IsMongoId()
  @IsOptional()
  adminUserId?: string; // Use existing user as admin
}
