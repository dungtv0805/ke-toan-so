import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { BANG_KE_HOACH_NGUON, type BangKeHoachNguon } from '@app/entities';

export class TaiKhoanDinhKhoanDto {
  @IsNotEmpty()
  @IsString()
  ma: string;

  @IsNotEmpty()
  @IsString()
  ten: string;

  @IsOptional()
  @IsString()
  loai?: string;

  @IsOptional()
  @IsString()
  nhom?: string;
}

export class CauHinhDinhKhoanItemDto {
  @IsIn(BANG_KE_HOACH_NGUON as unknown as string[])
  bang: BangKeHoachNguon;

  /** 'THU'/'CHI' cho Dòng tiền, nhóm nguồn vốn cho Nguồn vốn; bảng khác bỏ trống. */
  @IsOptional()
  @IsString()
  phanLoai?: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => TaiKhoanDinhKhoanDto)
  taiKhoanNo: TaiKhoanDinhKhoanDto;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => TaiKhoanDinhKhoanDto)
  taiKhoanCo: TaiKhoanDinhKhoanDto;
}

/** Màn hình cấu hình gửi cả bảng một lần — ghi đè trọn bộ. */
export class LuuCauHinhDinhKhoanDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CauHinhDinhKhoanItemDto)
  items: CauHinhDinhKhoanItemDto[];
}
