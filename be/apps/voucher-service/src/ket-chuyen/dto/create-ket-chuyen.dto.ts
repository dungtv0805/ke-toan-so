import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class DongKetChuyenDto {
  @IsString()
  @IsNotEmpty()
  maKetChuyen: string;

  @IsString()
  @IsOptional()
  dienGiai?: string;

  @IsString()
  @IsNotEmpty()
  taiKhoanNo: string;

  @IsString()
  @IsNotEmpty()
  taiKhoanCo: string;

  @IsNumber()
  @Min(1, { message: 'Số tiền phải lớn hơn 0' })
  soTien: number;
}

export class CreateKetChuyenDto {
  @IsNotEmpty()
  @IsDateString()
  denNgay: string;

  @IsNotEmpty()
  @IsDateString()
  ngayHachToan: string;

  @IsNotEmpty()
  @IsDateString()
  ngayChungTu: string;

  @IsString()
  @IsNotEmpty()
  dienGiai: string;

  @IsArray()
  // Mảng rỗng lọt qua cả hai chốt chặn của `create` (chỗ đó chỉ kiểm số dòng của
  // preview), tiêu một số trong dải NVK rồi trả `success` với `soDong: 0`.
  @ArrayNotEmpty({ message: 'Phải có ít nhất một dòng hạch toán để kết chuyển' })
  @ValidateNested({ each: true })
  @Type(() => DongKetChuyenDto)
  dong: DongKetChuyenDto[];
}
