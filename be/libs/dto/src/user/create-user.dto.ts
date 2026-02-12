import { IsEmail, IsString, IsArray, ValidateNested, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole, UserStatus } from '@app/entities';

export class UserTenantDto {
  @IsString()
  tenantId: string;

  @IsEnum(UserRole)
  role: UserRole;
}

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  hoTen: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserTenantDto)
  tenants: UserTenantDto[];

  @IsOptional()
  @IsEnum(UserStatus)
  trangThai?: UserStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
