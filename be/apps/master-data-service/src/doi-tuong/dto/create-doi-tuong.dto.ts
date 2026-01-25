import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsEmail,
} from 'class-validator';
import { DoiTuongType } from '@app/entities';

export class CreateDoiTuongDto {
  @IsEnum(DoiTuongType)
  loai: DoiTuongType;

  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsString()
  @IsNotEmpty()
  ten: string;

  @IsString()
  @IsOptional()
  diaChi?: string;

  @IsString()
  @IsOptional()
  soDienThoai?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  maSoThue: string;

  @IsString()
  @IsOptional()
  nguoiLienHe?: string;
}
