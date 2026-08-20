import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateKeHoachNhanSuDto } from './create-nhan-su.dto';

// Cho sửa cả bộ phận lẫn mã vị trí — hai trường này nhập tay, gõ sai phải chữa được.
// Chỉ khoá năm: đổi năm là chuyển sang bản kế hoạch khác, phải thêm dòng mới.
export class UpdateKeHoachNhanSuDto extends PartialType(
  OmitType(CreateKeHoachNhanSuDto, ['nam'] as const),
) {}
