import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import type { LoaiKeHoach } from '@app/entities';

export class KeHoachDongTienQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  nam: number;

  // Không truyền = Kế hoạch: giữ nguyên hành vi cho bản FE cũ chưa gửi tham số.
  @IsOptional()
  @IsIn(['KE_HOACH', 'DU_BAO'])
  loaiKeHoach?: LoaiKeHoach;
}
