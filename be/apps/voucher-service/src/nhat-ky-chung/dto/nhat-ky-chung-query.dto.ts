import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class NhatKyChungQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 15;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  loai?: string;

  @IsOptional()
  @IsString()
  doiTuong?: string;

  @IsOptional()
  @IsString()
  duAn?: string;

  @IsOptional()
  @IsString()
  boPhan?: string;

  @IsOptional()
  @IsString()
  taiKhoanNo?: string;

  @IsOptional()
  @IsString()
  taiKhoanCo?: string;

  @IsOptional()
  @IsString()
  hopDong?: string;

  /** Tài khoản — khớp bên Nợ HOẶC bên Có (bộ lọc "Tài khoản" gộp trên màn hình). */
  @IsOptional()
  @IsString()
  taiKhoan?: string;

  @IsOptional()
  @IsString()
  nghiepVu?: string;

  @IsOptional()
  @IsString()
  khoanMuc?: string;

  @IsOptional()
  @IsString()
  nhanVien?: string;

  @IsOptional()
  @IsString()
  sanPham?: string;

  @IsOptional()
  @IsString()
  doi?: string;

  @IsOptional()
  @IsString()
  nhomKhuyenMai?: string;

  @IsOptional()
  @IsString()
  nguoiGiaoDich?: string;

  /** HOP_LE | CHUA_HOP_LE | KHONG_DUOC_TRU | CHUA_KIEM_SOAT */
  @IsOptional()
  @IsString()
  kiemSoat?: string;
}
