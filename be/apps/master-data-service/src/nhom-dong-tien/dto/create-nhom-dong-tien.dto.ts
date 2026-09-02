import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';

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

  /**
   * Chiều tiền của nhóm — Kế hoạch dòng tiền suy Thu/Chi của từng dòng từ đây.
   *
   * `@Transform` bắt buộc: `@IsOptional()` KHÔNG bỏ qua chuỗi rỗng, mà form gửi
   * `chieu: ""` khi người dùng xoá lựa chọn → `@IsIn` đánh trượt cả request.
   */
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsIn(['THU', 'CHI'])
  @IsOptional()
  chieu?: 'THU' | 'CHI';
}
