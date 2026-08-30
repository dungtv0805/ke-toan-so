import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateKeHoachNguonVonDto } from './create-nguon-von.dto';

// Cho sửa cả nhóm lẫn mã chỉ tiêu — hai trường này nhập tay, gõ sai phải chữa
// được. Chỉ khoá loại kế hoạch và năm.
export class UpdateKeHoachNguonVonDto extends PartialType(
  OmitType(CreateKeHoachNguonVonDto, ['nam', 'loaiKeHoach'] as const),
) {}
