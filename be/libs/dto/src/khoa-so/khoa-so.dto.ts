import {
  IsString,
  IsOptional,
  IsDate,
  IsArray,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateKhoaSoDto {
  @IsString()
  @IsOptional()
  loaiChungTuMa?: string;

  @IsString()
  @IsOptional()
  chiNhanhId?: string;

  @Type(() => Date)
  @IsDate()
  ngayKhoaSo: Date;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  nguoiDungBiKhoa?: string[];

  @IsString()
  @IsOptional()
  dienGiai?: string;

  @IsBoolean()
  @IsOptional()
  coXuLyChuaGhiSo?: boolean;
}

export class KhoaSoCauHinhDto {
  @IsString()
  @IsOptional()
  chiNhanhId?: string;

  @IsString()
  @IsIn(['NGAY', 'TUAN', 'THANG', 'QUY', 'NAM'])
  kyKhoaSo: 'NGAY' | 'TUAN' | 'THANG' | 'QUY' | 'NAM';

  @IsString()
  gioThucHien: string;

  @IsBoolean()
  isActive: boolean;
}

export class KiemTraKhoaSoDto {
  @IsString()
  @IsOptional()
  loaiChungTuMa?: string;

  @IsString()
  @IsOptional()
  chiNhanhId?: string;

  @Type(() => Date)
  @IsDate()
  ngayChungTu: Date;

  @IsString()
  userId: string;
}

export interface KiemTraKhoaSoResponse {
  biKhoa: boolean;
  lyDo?: string;
  khoaSoId?: string;
}

export class KhoaSoQueryDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsString()
  @IsOptional()
  loaiChungTuMa?: string;

  @IsString()
  @IsOptional()
  chiNhanhId?: string;
}
