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
import { CreateKeHoachTaiSanDto } from './create-tai-san.dto';
import { UpdateKeHoachTaiSanDto } from './update-tai-san.dto';

export class ThemKeHoachTaiSanItemDto extends OmitType(
  CreateKeHoachTaiSanDto,
  ['nam', 'loaiKeHoach'] as const,
) {}

export class SuaKeHoachTaiSanItemDto extends UpdateKeHoachTaiSanDto {
  @IsNotEmpty()
  @IsString()
  id: string;
}

export class BatchKeHoachTaiSanDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1900)
  nam: number;

  @IsOptional()
  @IsIn(['KE_HOACH', 'DU_BAO'])
  loaiKeHoach?: LoaiKeHoach;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ThemKeHoachTaiSanItemDto)
  them?: ThemKeHoachTaiSanItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SuaKeHoachTaiSanItemDto)
  sua?: SuaKeHoachTaiSanItemDto[];
}
