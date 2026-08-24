import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { DongTienLoai } from '@app/entities';

export class CreateDongTienDto {
  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsString()
  @IsNotEmpty()
  ten: string;

  @IsEnum(DongTienLoai)
  loai: DongTienLoai;

  @IsString()
  @IsOptional()
  nhom?: string;

  @IsString()
  @IsOptional()
  moTa?: string;
}
