import { Type } from 'class-transformer';
import {
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
  @ValidateNested({ each: true })
  @Type(() => DongKetChuyenDto)
  dong: DongKetChuyenDto[];
}
