import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SoDuDauKyItemDto {
  @IsString()
  maTaiKhoan: string;

  @IsNumber()
  duNo: number;

  @IsNumber()
  duCo: number;
}

export class SaveSoDuDauKyDto {
  @IsDateString()
  ngayApDung: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SoDuDauKyItemDto)
  items: SoDuDauKyItemDto[];
}
