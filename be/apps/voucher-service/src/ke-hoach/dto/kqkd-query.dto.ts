import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { LoaiKeHoach } from '@app/entities';

export class KqkdQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2999)
  nam: number;

  @IsOptional()
  @IsIn(['KE_HOACH', 'DU_BAO'])
  loaiKeHoach?: LoaiKeHoach;

  /** Bỏ trống = gộp mọi phiên bản. */
  @IsOptional()
  @IsString()
  phienBan?: string;
}
