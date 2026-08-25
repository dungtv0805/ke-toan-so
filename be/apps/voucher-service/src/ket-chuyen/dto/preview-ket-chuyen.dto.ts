import { IsDateString, IsNotEmpty } from 'class-validator';

export class PreviewKetChuyenDto {
  @IsNotEmpty()
  @IsDateString()
  denNgay: string;
}
