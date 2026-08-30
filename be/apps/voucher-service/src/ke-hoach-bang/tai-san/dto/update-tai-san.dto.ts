import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateKeHoachTaiSanDto } from './create-tai-san.dto';

// Cho sửa cả bộ phận lẫn mã tài sản — hai trường này nhập tay, gõ sai phải chữa
// được. Chỉ khoá loại kế hoạch và năm: đổi chúng là chuyển sang bản kế hoạch khác.
export class UpdateKeHoachTaiSanDto extends PartialType(
  OmitType(CreateKeHoachTaiSanDto, ['nam', 'loaiKeHoach'] as const),
) {}
