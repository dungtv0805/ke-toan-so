import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateNhomSanPhamDto {
  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsString()
  @IsNotEmpty()
  ten: string;

  @IsString()
  @IsOptional()
  moTa?: string;
}
