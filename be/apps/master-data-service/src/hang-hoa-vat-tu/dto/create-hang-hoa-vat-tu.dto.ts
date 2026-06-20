import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn } from 'class-validator';

export class CreateHangHoaVatTuDto {
  @IsString() @IsNotEmpty() ma: string;
  @IsString() @IsNotEmpty() ten: string;
  @IsString() @IsOptional() @IsIn(['TAI_SAN', 'HANG_HOA', 'NGUYEN_LIEU']) tinhChat?: string;
  @IsString() @IsOptional() donViTinhMa?: string;
  @IsString() @IsOptional() donViTinhTen?: string;
  @IsString() @IsOptional() nhomVatTuMa?: string;
  @IsString() @IsOptional() nhomVatTuTen?: string;
  @IsString() @IsOptional() quyCach?: string;
  @IsString() @IsOptional() tkKho?: string;
  @IsNumber() @IsOptional() donGia?: number;
  @IsString() @IsOptional() moTa?: string;
}
