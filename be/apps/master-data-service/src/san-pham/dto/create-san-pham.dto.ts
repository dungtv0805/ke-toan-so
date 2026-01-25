import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateSanPhamDto {
  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsString()
  @IsNotEmpty()
  ten: string;

  @IsString()
  @IsOptional()
  donVi?: string;

  @IsNumber()
  @IsOptional()
  giaBan?: number;

  @IsString()
  @IsOptional()
  nhom?: string;

  @IsString()
  @IsOptional()
  moTa?: string;
}
