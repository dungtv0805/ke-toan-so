import {
  IsOptional,
  IsNumber,
  IsDateString,
  IsObject,
  IsString,
  Min,
} from 'class-validator';
import type { DanhMuc } from '@app/entities';

export class UpdateNhatKyChungDto {
  @IsOptional()
  @IsDateString()
  ngay?: string;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Số tiền phải lớn hơn 0' })
  soTien?: number;

  @IsOptional()
  @IsString()
  noiDung?: string;

  @IsOptional()
  @IsObject()
  danhMuc?: DanhMuc;

  @IsOptional()
  @IsString()
  ghiChu?: string;

  @IsOptional()
  @IsString()
  nguoiGiaoDich: string;

  @IsOptional()
  @IsString()
  diaChi: string;
}
