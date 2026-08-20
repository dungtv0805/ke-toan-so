import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class KeHoachNhanSuQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  nam: number;
}
