import { IsIn, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

/** Mỗi mục Thư viện là một category; quyền suy ra từ đây (`/{category}:{action}`). */
const CATS = ['quy-trinh', 'bieu-mau', 'chinh-sach', 'huong-dan'] as const;

export class CreateFileDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  moTa?: string;

  @IsIn(CATS as unknown as string[])
  category: string;
}

export class CreateYoutubeDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  moTa?: string;

  @IsIn(CATS as unknown as string[])
  category: string;

  @IsUrl()
  youtubeUrl: string;
}
