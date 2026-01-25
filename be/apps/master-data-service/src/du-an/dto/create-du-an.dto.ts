import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { DuAnStatus } from '@app/entities';

export class CreateDuAnDto {
  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsString()
  @IsNotEmpty()
  ten: string;

  @IsDateString()
  @IsOptional()
  ngayBatDau?: string;

  @IsDateString()
  @IsOptional()
  ngayKetThuc?: string;

  @IsString()
  @IsOptional()
  chuDauTuId?: string;

  @IsString()
  @IsOptional()
  chuDuAnMa?: string;

  @IsString()
  @IsOptional()
  chuDuAn?: string;

  @IsEnum(DuAnStatus)
  @IsOptional()
  trangThai?: DuAnStatus;

  @IsString()
  @IsOptional()
  moTa?: string;
}
