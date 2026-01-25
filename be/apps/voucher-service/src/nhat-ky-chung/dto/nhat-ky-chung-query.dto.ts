import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsDateString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { LoaiChungTu } from '@app/entities';

export class NhatKyChungQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 15;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn(['PHIEU_THU', 'PHIEU_CHI'])
  loai?: LoaiChungTu;
}
