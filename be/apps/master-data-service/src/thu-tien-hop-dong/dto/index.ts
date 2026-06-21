import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';

export class CreateThuTienHopDongDto {
  @IsOptional() @IsInt() nam?: number;
  @IsString() @IsNotEmpty() hopDongId: string;
  @IsOptional() @IsString() soHopDong?: string;
  @IsOptional() @IsString() doiTuongId?: string;
  @IsOptional() @IsString() tenKhachHang?: string;
  @IsOptional() @IsString() noiDung?: string;
  @IsNumber() soTien: number;
  @IsOptional() @IsDateString() ngay?: string;
  @IsOptional() @IsInt() lan?: number;
  @IsOptional() @IsString() ghiChu?: string;
}

export class UpdateThuTienHopDongDto {
  @IsOptional() @IsInt() nam?: number;
  @IsOptional() @IsString() hopDongId?: string;
  @IsOptional() @IsString() soHopDong?: string;
  @IsOptional() @IsString() doiTuongId?: string;
  @IsOptional() @IsString() tenKhachHang?: string;
  @IsOptional() @IsString() noiDung?: string;
  @IsOptional() @IsNumber() soTien?: number;
  @IsOptional() @IsDateString() ngay?: string;
  @IsOptional() @IsInt() lan?: number;
  @IsOptional() @IsString() ghiChu?: string;
}
