import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsEmail,
  IsMongoId,
  ValidateIf,
} from 'class-validator';
import { UserRole } from '@app/entities';

export class AddUserToTenantDto {
  @IsMongoId()
  @IsOptional()
  userId?: string;

  @ValidateIf((o) => !o.userId)
  @IsEmail()
  @IsNotEmpty({ message: 'Email là bắt buộc khi tạo user mới' })
  email?: string;

  @ValidateIf((o) => !o.userId)
  @IsString()
  @IsNotEmpty({ message: 'Họ tên là bắt buộc khi tạo user mới' })
  hoTen?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}

export class UpdateTenantMemberDto {
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
