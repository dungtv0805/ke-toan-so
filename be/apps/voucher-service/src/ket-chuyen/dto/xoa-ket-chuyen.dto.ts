import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Body cho `POST /ket-chuyen/xoa`. Không dùng path param `:soPhieu` vì số chứng từ
 * luôn chứa dấu `/` (`NVK202608/001`) — gateway giải mã `%2F` thành dấu phân cách
 * rồi ghép lại thành nhiều segment, khiến route path-param không bao giờ khớp.
 */
export class XoaKetChuyenDto {
  @IsString()
  @IsNotEmpty()
  soPhieu: string;
}
