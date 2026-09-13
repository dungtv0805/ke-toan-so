import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { LoaiKeHoach } from '@app/entities';

export class KqkdQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2999)
  nam: number;

  /**
   * Nguồn số liệu của báo cáo. 'THUC_HIEN' không phải một loại kế hoạch: nó đọc
   * `chung_tu` (số thực tế) và bỏ qua `phienBan`.
   */
  @IsOptional()
  @IsIn(['KE_HOACH', 'DU_BAO', 'THUC_HIEN'])
  loaiKeHoach?: LoaiKeHoach | 'THUC_HIEN';

  /** Bỏ trống = gộp mọi phiên bản. */
  @IsOptional()
  @IsString()
  phienBan?: string;
}
