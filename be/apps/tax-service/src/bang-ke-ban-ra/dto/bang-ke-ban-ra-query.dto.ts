import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '@app/dto';

export class BangKeBanRaQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsDateString()
  tuNgay?: string;

  @IsOptional()
  @IsDateString()
  denNgay?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  quy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  nam?: number;

  @IsOptional()
  @IsString()
  soChungTu?: string;

  @IsOptional()
  @IsIn(['da', 'chua', 'cho-bo-sung'])
  lienKet?: 'da' | 'chua' | 'cho-bo-sung';
}
