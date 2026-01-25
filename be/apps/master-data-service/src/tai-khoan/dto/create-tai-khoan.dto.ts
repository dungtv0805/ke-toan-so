import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { LoaiTaiKhoan, NhomTaiKhoan } from '@app/entities';

export class CreateTaiKhoanDto {
  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsString()
  @IsNotEmpty()
  ten: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  capDo: number;

  @IsEnum(LoaiTaiKhoan)
  loai: LoaiTaiKhoan;

  @IsEnum(NhomTaiKhoan)
  nhom: NhomTaiKhoan;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsOptional()
  moTa?: string;
}
