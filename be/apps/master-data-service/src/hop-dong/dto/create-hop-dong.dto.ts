import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDate,
  IsEnum,
  ValidateNested,
  IsInt,
  Min,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TrangThaiHopDong } from '@app/entities/master-data/hop-dong.entity';

export class PhuLucDto {
  @IsOptional()
  @IsNumber()
  giaTri?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  ngayKy?: Date;
}

export class DieuKhoanThanhToanDto {
  @IsOptional()
  @IsString()
  tamUng?: string;

  @IsOptional()
  @IsString()
  thanhToanGiaiDoan?: string;

  @IsOptional()
  @IsString()
  quyetToan?: string;
}

export class BaoHanhDto {
  @IsOptional()
  @IsNumber()
  giaTri?: number;

  @IsOptional()
  @IsString()
  thoiGian?: string;

  @IsOptional()
  @IsString()
  hinhThuc?: string;
}

export class TienDoThiCongDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  soNgay?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  tuNgay?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  denNgay?: Date;
}

export class CreateHopDongDto {
  @IsString()
  @IsNotEmpty()
  soHopDong: string;

  @IsString()
  @IsNotEmpty()
  tenCongTrinh: string;

  @IsOptional()
  @IsNumber()
  giaTriSauThue?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  ngayKy?: Date;

  @IsOptional()
  @ValidateNested()
  @Type(() => PhuLucDto)
  phuLuc1?: PhuLucDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PhuLucDto)
  phuLuc2?: PhuLucDto;

  @IsOptional()
  @IsMongoId()
  doiTuongId?: string;

  @IsOptional()
  @IsString()
  nguoiKy?: string;

  @IsOptional()
  @IsString()
  chucVu?: string;

  @IsOptional()
  @IsString()
  nguoiGiaoDich?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DieuKhoanThanhToanDto)
  dieuKhoanThanhToan?: DieuKhoanThanhToanDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BaoHanhDto)
  baoHanh?: BaoHanhDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TienDoThiCongDto)
  tienDoThiCong?: TienDoThiCongDto;

  @IsOptional()
  @IsEnum(TrangThaiHopDong)
  trangThai?: TrangThaiHopDong;

  @IsOptional()
  @IsInt()
  @Min(0)
  soLuongLuu?: number;
}
