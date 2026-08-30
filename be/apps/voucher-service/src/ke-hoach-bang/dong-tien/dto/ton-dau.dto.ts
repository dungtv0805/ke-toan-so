import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import type { LoaiKeHoach } from '@app/entities';

export class TonDauQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  nam: number;

  @IsOptional()
  @IsIn(['KE_HOACH', 'DU_BAO'])
  loaiKeHoach?: LoaiKeHoach;
}

/** Tồn quỹ đầu năm — cho phép âm (kế hoạch có thể bắt đầu bằng thấu chi). */
export class LuuTonDauDto {
  @IsInt()
  @Min(1900)
  nam: number;

  @IsOptional()
  @IsIn(['KE_HOACH', 'DU_BAO'])
  loaiKeHoach?: LoaiKeHoach;

  @IsNumber()
  soTien: number;
}
