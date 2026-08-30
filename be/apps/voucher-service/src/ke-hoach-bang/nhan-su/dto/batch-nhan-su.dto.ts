import { OmitType } from '@nestjs/mapped-types';
import type { LoaiKeHoach } from '@app/entities';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateKeHoachNhanSuDto } from './create-nhan-su.dto';
import { UpdateKeHoachNhanSuDto } from './update-nhan-su.dto';

/** Dòng thêm mới trong lô — `nam` lấy ở cấp lô nên bỏ khỏi từng dòng. */
export class ThemKeHoachNhanSuItemDto extends OmitType(
  CreateKeHoachNhanSuDto,
  ['nam', 'loaiKeHoach'] as const,
) {}

export class SuaKeHoachNhanSuItemDto extends UpdateKeHoachNhanSuDto {
  @IsNotEmpty()
  @IsString()
  id: string;
}

/** Lưu một thể: bảng gửi hết dòng mới và dòng đã sửa trong một lần bấm Lưu. */
export class BatchKeHoachNhanSuDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1900)
  nam: number;

  // Cả lô cùng một loại: trang Kế hoạch và trang Dự báo lưu riêng.
  @IsOptional()
  @IsIn(['KE_HOACH', 'DU_BAO'])
  loaiKeHoach?: LoaiKeHoach;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ThemKeHoachNhanSuItemDto)
  them?: ThemKeHoachNhanSuItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SuaKeHoachNhanSuItemDto)
  sua?: SuaKeHoachNhanSuItemDto[];
}
