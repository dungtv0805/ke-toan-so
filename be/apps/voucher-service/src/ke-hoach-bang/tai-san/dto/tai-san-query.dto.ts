import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import type { LoaiKeHoach } from '@app/entities';

export class KeHoachTaiSanQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  nam: number;

  @IsOptional()
  @IsIn(['KE_HOACH', 'DU_BAO'])
  loaiKeHoach?: LoaiKeHoach;
}
