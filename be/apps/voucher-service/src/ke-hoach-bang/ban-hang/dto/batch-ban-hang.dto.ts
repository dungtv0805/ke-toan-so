import { OmitType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateKeHoachBanHangDto } from './create-ban-hang.dto';
import { UpdateKeHoachBanHangDto } from './update-ban-hang.dto';

/** Dòng thêm mới trong lô — `nam` lấy ở cấp lô nên bỏ khỏi từng dòng. */
export class ThemKeHoachBanHangItemDto extends OmitType(
  CreateKeHoachBanHangDto,
  ['nam'] as const,
) {}

export class SuaKeHoachBanHangItemDto extends UpdateKeHoachBanHangDto {
  @IsNotEmpty()
  @IsString()
  id: string;
}

/** Lưu một thể: bảng gửi hết dòng mới và dòng đã sửa trong một lần bấm Lưu. */
export class BatchKeHoachBanHangDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1900)
  nam: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ThemKeHoachBanHangItemDto)
  them?: ThemKeHoachBanHangItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SuaKeHoachBanHangItemDto)
  sua?: SuaKeHoachBanHangItemDto[];
}
