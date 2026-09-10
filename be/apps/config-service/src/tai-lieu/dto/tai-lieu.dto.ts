import { IsIn, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { PERMISSION_MODULES } from '@app/core';

/**
 * Mỗi mục Thư viện là một category; quyền suy ra từ đây (`/{category}:{action}`).
 * Gồm 4 thư viện chung (`quy-trinh`, `bieu-mau`, `chinh-sach`, `huong-dan`) và
 * thư viện riêng của từng phân hệ (`kho/quy-trinh`, `thue/huong-dan`…) — lấy
 * thẳng từ PERMISSION_MODULES để thêm phân hệ mới không phải sửa chỗ này.
 */
export const TAI_LIEU_CATEGORIES: string[] = PERMISSION_MODULES.filter((m) =>
  /^\/(?:[a-z-]+\/)?(?:quy-trinh|huong-dan|bieu-mau|chinh-sach)$/.test(m),
).map((m) => m.slice(1));
const CATS = TAI_LIEU_CATEGORIES;

export class CreateFileDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  moTa?: string;

  @IsIn(CATS)
  category: string;
}

export class CreateYoutubeDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  moTa?: string;

  @IsIn(CATS)
  category: string;

  @IsUrl()
  youtubeUrl: string;
}
