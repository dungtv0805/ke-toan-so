import { IsArray, ArrayMaxSize } from 'class-validator';

export class ImportItemsDto {
  @IsArray()
  @ArrayMaxSize(2000, { message: 'Mỗi lần import tối đa 2000 dòng' })
  items: Record<string, unknown>[];
}
