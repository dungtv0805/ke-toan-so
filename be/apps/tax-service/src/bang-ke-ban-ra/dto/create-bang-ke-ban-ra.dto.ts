import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsIn,
  IsDateString,
} from 'class-validator';

export const THUE_SUAT_VALUES = ['0', '5', '8', '10', 'KCT', 'KKKT'];

export class CreateBangKeBanRaDto {
  @IsDateString()
  ngayHoaDon: string;

  @IsString()
  @IsNotEmpty()
  soHoaDon: string;

  @IsString()
  @IsOptional()
  kyHieuHoaDon?: string;

  @IsString()
  @IsNotEmpty()
  tenNguoiMua: string;

  @IsString()
  @IsOptional()
  mstNguoiMua?: string;

  @IsString()
  @IsOptional()
  tenHangHoa?: string;

  @IsNumber()
  giaTriChuaThue: number;

  @IsString()
  @IsIn(THUE_SUAT_VALUES)
  thueSuat: string;

  @IsString()
  @IsOptional()
  ghiChu?: string;

  @IsString()
  @IsOptional()
  chungTuId?: string;

  @IsString()
  @IsOptional()
  soChungTu?: string;
}
