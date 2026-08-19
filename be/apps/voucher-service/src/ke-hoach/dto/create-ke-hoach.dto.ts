import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import type { DanhMuc, LoaiKeHoach } from '@app/entities';

export class CreateKeHoachDto {
  @IsNotEmpty()
  @IsIn(['KE_HOACH', 'DU_BAO'])
  loaiKeHoach: LoaiKeHoach;

  // Bỏ trống → service gán PHIEN_BAN_MAC_DINH.
  @IsOptional()
  @IsString()
  phienBan?: string;

  @IsNotEmpty()
  @IsDateString()
  ngay: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Số tiền phải lớn hơn 0' })
  soTien: number;

  // Diễn giải có thể bỏ trống — dòng kế hoạch thường chỉ cần TK + chiều + số tiền.
  @IsOptional()
  @IsString()
  noiDung?: string;

  @IsOptional()
  @IsObject()
  danhMuc?: DanhMuc;

  @IsOptional()
  @IsString()
  ghiChu?: string;
}
