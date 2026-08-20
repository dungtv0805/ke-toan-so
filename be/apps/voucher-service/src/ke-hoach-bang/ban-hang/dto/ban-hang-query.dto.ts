import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class KeHoachBanHangQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  nam: number;
}
