import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateQuyChuan_Dto {
  @IsString()
  @IsNotEmpty()
  loaiGiaoDich: string;

  @IsString()
  @IsNotEmpty()
  nghiepVu: string;

  @IsString()
  @IsNotEmpty()
  taiKhoanNo: string;

  @IsString()
  @IsNotEmpty()
  taiKhoanCo: string;

  @IsString()
  @IsOptional()
  moTa?: string;
}
