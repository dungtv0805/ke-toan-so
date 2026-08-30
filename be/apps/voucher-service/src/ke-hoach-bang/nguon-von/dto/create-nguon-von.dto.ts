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
} from 'class-validator';
import {
  NHOM_NGUON_VON,
  SO_THANG,
  type LoaiKeHoach,
  type NhomNguonVon,
} from '@app/entities';

export class CreateKeHoachNguonVonDto {
  @IsOptional()
  @IsIn(['KE_HOACH', 'DU_BAO'])
  loaiKeHoach?: LoaiKeHoach;

  @IsNotEmpty()
  @IsInt()
  @Min(1900)
  nam: number;

  @IsIn(NHOM_NGUON_VON as unknown as string[])
  nhom: NhomNguonVon;

  /** Mã chỉ tiêu gõ tự do — nguồn vốn không có danh mục riêng. */
  @IsNotEmpty()
  @IsString()
  maChiTieu: string;

  @IsOptional()
  @IsString()
  tenChiTieu?: string;

  // Số dư đầu năm cho phép ÂM: một chỉ tiêu có thể bắt đầu ở trạng thái âm.
  @IsNumber()
  soDuDauNam: number;

  // Mục tiêu biến động cả năm — âm nghĩa là kế hoạch giảm nguồn vốn đó.
  @IsNumber()
  giaTriMucTieu: number;

  // Biến động từng tháng, cho phép ÂM (giảm trong tháng).
  @IsArray()
  @ArrayMinSize(SO_THANG)
  @ArrayMaxSize(SO_THANG)
  @IsNumber({}, { each: true })
  thang: number[];

  @IsOptional()
  @IsString()
  ghiChu?: string;
}
