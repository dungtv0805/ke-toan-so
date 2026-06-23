import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsMongoId,
  ValidateIf,
} from 'class-validator';

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

  @IsString()
  @IsNotEmpty()
  role: string;
}

export class UpdateTenantMemberDto {
  @IsString()
  @IsOptional()
  role?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateMemberProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  hoTen?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
