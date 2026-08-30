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
import { CreateKeHoachNguonVonDto } from './create-nguon-von.dto';
import { UpdateKeHoachNguonVonDto } from './update-nguon-von.dto';

export class ThemKeHoachNguonVonItemDto extends OmitType(
  CreateKeHoachNguonVonDto,
  ['nam', 'loaiKeHoach'] as const,
) {}

export class SuaKeHoachNguonVonItemDto extends UpdateKeHoachNguonVonDto {
  @IsNotEmpty()
  @IsString()
  id: string;
}

export class BatchKeHoachNguonVonDto {
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
  @Type(() => ThemKeHoachNguonVonItemDto)
  them?: ThemKeHoachNguonVonItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SuaKeHoachNguonVonItemDto)
  sua?: SuaKeHoachNguonVonItemDto[];
}
