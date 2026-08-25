import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { BenKetChuyen, LoaiKetChuyen } from '@app/entities';

export class CreateTaiKhoanKetChuyenDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  thuTu: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  ma: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  taiKhoanTu: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  tenTaiKhoanTu?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  taiKhoanDen: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  tenTaiKhoanDen?: string;

  @IsIn(['NO', 'CO', 'HAI_BEN'])
  ben: BenKetChuyen;

  @IsOptional()
  @IsIn(['XAC_DINH_KQKD'])
  loai?: LoaiKetChuyen;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  dienGiai?: string;
}
