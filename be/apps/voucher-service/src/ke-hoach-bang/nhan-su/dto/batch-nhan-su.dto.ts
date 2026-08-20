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
import { CreateKeHoachNhanSuDto } from './create-nhan-su.dto';
import { UpdateKeHoachNhanSuDto } from './update-nhan-su.dto';

/** Dòng thêm mới trong lô — `nam` lấy ở cấp lô nên bỏ khỏi từng dòng. */
export class ThemKeHoachNhanSuItemDto extends OmitType(
  CreateKeHoachNhanSuDto,
  ['nam'] as const,
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
