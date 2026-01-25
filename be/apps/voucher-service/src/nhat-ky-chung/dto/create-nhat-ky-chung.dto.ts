import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsIn,
  IsObject,
  Min,
} from 'class-validator';
import type { LoaiChungTu, DanhMuc } from '@app/entities';

export class CreateNhatKyChungDto {
  @IsNotEmpty()
  @IsIn(['PHIEU_THU', 'PHIEU_CHI'])
  loai: LoaiChungTu;

  @IsNotEmpty()
  @IsDateString()
  ngay: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Số tiền phải lớn hơn 0' })
  soTien: number;

  @IsNotEmpty()
  @IsString()
  noiDung: string;

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
