import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateNhomDongTienDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  ma: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  ten: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  moTa?: string;
}
