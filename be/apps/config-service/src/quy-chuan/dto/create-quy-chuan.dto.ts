import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Một hồ sơ chứng từ được tham chiếu trong `hoSoChungTu`. Trước đây trường này chỉ có
 * `@IsArray()` (không kiểm tra phần tử) và được lưu thẳng vào cột JSON — bất kỳ object nào
 * cũng lọt qua. Khai báo DTO lồng để mỗi phần tử phải đúng hình dạng { id, ma, ten }.
 */
export class HoSoChungTuRef_Dto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsString()
  @IsNotEmpty()
  ten: string;
}

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

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => HoSoChungTuRef_Dto)
  hoSoChungTu?: HoSoChungTuRef_Dto[];
}
