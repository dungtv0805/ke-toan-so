import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { LoaiKeHoach } from '@app/entities';

/** Bộ lọc của màn hình Kế hoạch / Dự báo — bám sát `NhatKyChungQueryDto`. */
export class KeHoachQueryDto {
  @IsOptional()
  @IsIn(['KE_HOACH', 'DU_BAO'])
  loaiKeHoach?: LoaiKeHoach;

  @IsOptional()
  @IsString()
  phienBan?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  nghiepVu?: string;

  /** Khớp tài khoản ở bên Nợ HOẶC bên Có. */
  @IsOptional()
  @IsString()
  taiKhoan?: string;

  @IsOptional()
  @IsString()
  taiKhoanNo?: string;

  @IsOptional()
  @IsString()
  taiKhoanCo?: string;

  /** Khớp đối tượng ở bên Nợ HOẶC bên Có. */
  @IsOptional()
  @IsString()
  doiTuong?: string;

  @IsOptional()
  @IsString()
  chuDauTu?: string;

  @IsOptional()
  @IsString()
  duAn?: string;

  @IsOptional()
  @IsString()
  sanPham?: string;

  @IsOptional()
  @IsString()
  boPhan?: string;

  @IsOptional()
  @IsString()
  doi?: string;

  @IsOptional()
  @IsString()
  nhanVien?: string;

  @IsOptional()
  @IsString()
  dongTien?: string;

  @IsOptional()
  @IsString()
  khoanMuc?: string;

  @IsOptional()
  @IsString()
  nhomQuanLy?: string;

  @IsOptional()
  @IsString()
  nhomKhuyenMai?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
