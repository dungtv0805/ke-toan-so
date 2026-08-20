import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { SO_THANG } from '@app/entities';
import { MucDanhMucDto } from '../../ban-hang/dto/create-ban-hang.dto';

/** Sáu loại chi phí cố định — khớp cột LCHINH…THUONGCN của sheet thiết kế. */
export class ChiPhiNhanSuDto {
  @IsNumber()
  @Min(0)
  luongChinh: number;

  @IsNumber()
  @Min(0)
  luongKpi: number;

  @IsNumber()
  @Min(0)
  thuongDoanhSo: number;

  @IsNumber()
  @Min(0)
  baoHiem: number;

  @IsNumber()
  @Min(0)
  daoTao: number;

  @IsNumber()
  @Min(0)
  thuongCongNhan: number;
}

export class CreateKeHoachNhanSuDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1900)
  nam: number;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => MucDanhMucDto)
  boPhan: MucDanhMucDto;

  @IsNotEmpty()
  @IsString()
  maViTri: string;

  @IsOptional()
  @IsString()
  tenChucVu?: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ChiPhiNhanSuDto)
  chiPhi: ChiPhiNhanSuDto;

  @IsArray()
  @ArrayMinSize(SO_THANG)
  @ArrayMaxSize(SO_THANG)
  @IsNumber({}, { each: true })
  thang: number[];

  @IsOptional()
  @IsString()
  ghiChu?: string;
}
