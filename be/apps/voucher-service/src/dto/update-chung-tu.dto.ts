import {
  IsOptional,
  IsNumber,
  IsDateString,
  IsObject,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import type { DanhMuc } from '@app/entities';

export class UpdateChungTuDto {
  @IsOptional()
  @IsDateString()
  ngay?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  soTien?: number;

  @IsOptional()
  @IsString()
  noiDung?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nguoiGiaoDich?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  diaChi?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  ghiChu?: string;

  @IsOptional()
  @IsObject()
  danhMuc?: DanhMuc;
}
