import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateKeHoachBanHangDto } from './create-ban-hang.dto';

// Không cho đổi năm và sản phẩm khi sửa — muốn đổi thì xoá rồi thêm lại,
// nếu không khoá chống trùng (năm, sản phẩm) sẽ bị lách.
export class UpdateKeHoachBanHangDto extends PartialType(
  OmitType(CreateKeHoachBanHangDto, ['nam', 'sanPham'] as const),
) {}
