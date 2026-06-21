import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';

export class CreateHoaDonBanRaDto {
  @IsOptional() @IsString() soHoaDon?: string;
  @IsOptional() @IsDateString() ngay?: string;
  @IsOptional() @IsString() noiDung?: string;
  @IsString() @IsNotEmpty() hopDongId: string;
  @IsOptional() @IsString() soHopDong?: string;
  @IsOptional() @IsString() tenCongTrinh?: string;
  @IsOptional() @IsString() doiTuongId?: string;
  @IsOptional() @IsString() donViMua?: string;
  @IsOptional() @IsNumber() tienHang?: number;
  @IsOptional() @IsNumber() tienThue?: number;
  @IsNumber() tong: number;
  @IsOptional() @IsInt() lan?: number;
  @IsOptional() @IsInt() nam?: number;
  @IsOptional() @IsInt() namHoaDon?: number;
}

export class UpdateHoaDonBanRaDto {
  @IsOptional() @IsString() soHoaDon?: string;
  @IsOptional() @IsDateString() ngay?: string;
  @IsOptional() @IsString() noiDung?: string;
  @IsOptional() @IsString() hopDongId?: string;
  @IsOptional() @IsString() soHopDong?: string;
  @IsOptional() @IsString() tenCongTrinh?: string;
  @IsOptional() @IsString() doiTuongId?: string;
  @IsOptional() @IsString() donViMua?: string;
  @IsOptional() @IsNumber() tienHang?: number;
  @IsOptional() @IsNumber() tienThue?: number;
  @IsOptional() @IsNumber() tong?: number;
  @IsOptional() @IsInt() lan?: number;
  @IsOptional() @IsInt() nam?: number;
  @IsOptional() @IsInt() namHoaDon?: number;
}
