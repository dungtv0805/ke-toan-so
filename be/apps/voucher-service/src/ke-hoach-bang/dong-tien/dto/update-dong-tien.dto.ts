import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateKeHoachDongTienDto } from './create-dong-tien.dto';

// Không cho đổi loại kế hoạch, năm và dòng tiền khi sửa — ba trường đó là khoá
// chống trùng. Muốn đổi thì xoá rồi thêm lại.
export class UpdateKeHoachDongTienDto extends PartialType(
  OmitType(CreateKeHoachDongTienDto, [
    'nam',
    'loaiKeHoach',
    'dongTien',
  ] as const),
) {}
