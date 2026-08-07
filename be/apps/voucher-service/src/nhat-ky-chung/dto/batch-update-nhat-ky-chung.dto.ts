import {
  IsOptional,
  IsString,
  IsNotEmpty,
  IsIn,
  IsDateString,
  IsNumber,
  Min,
  IsObject,
} from 'class-validator';
import type { LoaiChungTu, DanhMuc } from '@app/entities';

export class BatchItemDto {
  @IsOptional()
  @IsString()
  id?: string; // undefined = create new, string = update existing

  // KHAC: chứng từ tổng hợp chỉ hiện ở Nhật ký chung — sửa lại được như phiếu thu/chi
  @IsNotEmpty()
  @IsIn(['PHIEU_THU', 'PHIEU_CHI', 'KHAC'])
  loai: LoaiChungTu;

  @IsNotEmpty()
  @IsDateString()
  ngay: string;

  @IsOptional()
  @IsDateString()
  ngayGhiSo?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
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
  nguoiGiaoDich?: string;

  @IsOptional()
  @IsString()
  diaChi?: string;
}
