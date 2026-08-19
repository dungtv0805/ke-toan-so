import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreateKeHoachDto } from './create-ke-hoach.dto';

export class UpdateKeHoachDto extends PartialType(CreateKeHoachDto) {}

/** Một phần tử của `PATCH /ke-hoach/batch` — sửa nhiều dòng trong một lần lưu. */
export class BatchUpdateKeHoachItemDto extends UpdateKeHoachDto {
  @IsString()
  id: string;
}

export class DeleteBatchKeHoachDto {
  @IsOptional()
  ids: string[];
}
