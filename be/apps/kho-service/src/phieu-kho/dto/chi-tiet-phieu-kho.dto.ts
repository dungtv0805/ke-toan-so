import { IsString, IsOptional, IsNumber } from 'class-validator';

export class ChiTietPhieuKhoDto {
  @IsNumber() stt: number;
  @IsString() hangHoaMa: string;
  @IsString() hangHoaTen: string;
  @IsString() @IsOptional() quyCach?: string;
  @IsString() @IsOptional() donViTinh?: string;
  @IsString() @IsOptional() khoMa?: string;
  @IsString() @IsOptional() khoTen?: string;
  @IsString() @IsOptional() tkNo?: string;
  @IsString() @IsOptional() tkCo?: string;
  @IsNumber() soLuong: number;
  @IsNumber() @IsOptional() soLuongChungTu?: number;
  @IsNumber() @IsOptional() soLuongThucTe?: number;
  @IsNumber() donGia: number;
  @IsNumber() thanhTien: number;
}
