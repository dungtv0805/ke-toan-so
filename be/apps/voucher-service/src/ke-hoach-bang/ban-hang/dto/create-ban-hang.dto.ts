import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { SO_THANG, type LoaiKeHoach } from '@app/entities';

/** Ảnh chụp một mục danh mục lúc lưu — giữ cả mã và tên để bảng đọc lại được. */
export class MucDanhMucDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsString()
  ma: string;

  @IsNotEmpty()
  @IsString()
  ten: string;
}

export class CreateKeHoachBanHangDto {
  // Không truyền = Kế hoạch: giữ nguyên hành vi cho bản FE cũ chưa gửi trường này.
  @IsOptional()
  @IsIn(['KE_HOACH', 'DU_BAO'])
  loaiKeHoach?: LoaiKeHoach;

  @IsNotEmpty()
  @IsInt()
  @Min(1900)
  nam: number;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => MucDanhMucDto)
  nhomSanPham: MucDanhMucDto;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => MucDanhMucDto)
  sanPham: MucDanhMucDto;

  @IsNumber()
  @Min(0)
  luong: number;

  @IsNumber()
  @Min(0)
  giaBinhQuan: number;

  // Bảng luôn gửi đủ 12 tháng — thiếu là lỗi phía gọi, không tự bù.
  @IsArray()
  @ArrayMinSize(SO_THANG)
  @ArrayMaxSize(SO_THANG)
  @IsNumber({}, { each: true })
  thang: number[];

  @IsOptional()
  @IsString()
  ghiChu?: string;
}
