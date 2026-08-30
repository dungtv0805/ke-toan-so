import { OmitType } from '@nestjs/mapped-types';
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
import type { LoaiKeHoach } from '@app/entities';
import { CreateKeHoachDongTienDto } from './create-dong-tien.dto';
import { UpdateKeHoachDongTienDto } from './update-dong-tien.dto';

/** Dòng thêm mới trong lô — `nam` và loại lấy ở cấp lô nên bỏ khỏi từng dòng. */
export class ThemKeHoachDongTienItemDto extends OmitType(
  CreateKeHoachDongTienDto,
  ['nam', 'loaiKeHoach'] as const,
) {}

export class SuaKeHoachDongTienItemDto extends UpdateKeHoachDongTienDto {
  @IsNotEmpty()
  @IsString()
  id: string;
}

/** Lưu một thể: bảng gửi hết dòng mới và dòng đã sửa trong một lần bấm Lưu. */
export class BatchKeHoachDongTienDto {
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
  @Type(() => ThemKeHoachDongTienItemDto)
  them?: ThemKeHoachDongTienItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SuaKeHoachDongTienItemDto)
  sua?: SuaKeHoachDongTienItemDto[];
}
