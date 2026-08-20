import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { KhoanMucLoai, LoaiChiPhi } from '@app/entities';

export class CreateKhoanMucDto {
  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsString()
  @IsNotEmpty()
  ten: string;

  @IsEnum(KhoanMucLoai)
  loai: KhoanMucLoai;

  @IsString()
  @IsOptional()
  nhom?: string;

  @IsEnum(LoaiChiPhi)
  @IsOptional()
  loaiChiPhi?: LoaiChiPhi;

  @IsString()
  @IsOptional()
  moTa?: string;
}
