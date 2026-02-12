import {
  IsString,
  IsEmail,
  IsEnum,
  MinLength,
  IsOptional,
} from 'class-validator';
import { UserRole, UserStatus } from '@app/entities';

export class CreateNguoiDungDto {
  @IsString()
  @MinLength(2, { message: 'Họ tên phải có ít nhất 2 ký tự' })
  hoTen: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString()
  @IsOptional()
  tenantId?: string;

  @IsEnum(UserRole, { message: 'Vai trò không hợp lệ' })
  vaiTro: UserRole;

  @IsOptional()
  @IsEnum(UserStatus, { message: 'Trạng thái không hợp lệ' })
  trangThai?: UserStatus;
}
