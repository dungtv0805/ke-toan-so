import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsBoolean,
  IsDate,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuyetToanHDDto {
  @IsOptional() @IsString() so?: string;
  @IsOptional() @Type(() => Date) @IsDate() ngay?: Date;
  @IsOptional() @IsNumber() giaTri?: number;
}

export class BaoHanhTheoDoiDto {
  @IsOptional() @IsNumber() giaTri?: number;
  @IsOptional() @IsInt() soNgay?: number;
  @IsOptional() @Type(() => Date) @IsDate() ngayGiaiToaBL?: Date;
  @IsOptional() @IsString() trangThai?: string;
}

export class DotThanhToanDto {
  @IsOptional() @IsNumber() tiLe?: number;
  @IsOptional() @IsNumber() soTien?: number;
}

export class DotHoaDonDto {
  @IsOptional() @IsNumber() soTien?: number;
}

export class TinhTrangHoSoDto {
  @IsOptional() @IsBoolean() hd?: boolean;
  @IsOptional() @IsBoolean() nt1?: boolean;
  @IsOptional() @IsBoolean() nt2?: boolean;
  @IsOptional() @IsBoolean() ntSuDung?: boolean;
  @IsOptional() @IsBoolean() thanhLy?: boolean;
  @IsOptional() @IsInt() namQuyetToan?: number;
}

export class UpsertTheoDoiHopDongDto {
  @IsOptional() @IsString() phuTrachHoSo?: string;
  @IsOptional() @IsString() trangThaiHoSo?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuyetToanHDDto)
  quyetToan?: QuyetToanHDDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BaoHanhTheoDoiDto)
  baoHanhTheoDoi?: BaoHanhTheoDoiDto;

  @IsOptional() @IsNumber() giamTru?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DotThanhToanDto)
  dotThanhToan?: DotThanhToanDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DotHoaDonDto)
  dotHoaDon?: DotHoaDonDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => TinhTrangHoSoDto)
  tinhTrangHoSo?: TinhTrangHoSoDto;

  @IsOptional() @IsString() ghiChu?: string;
}
