import type { LoaiKeHoach } from '@app/entities';

/**
 * Loại mặc định khi phía gọi không truyền. Bản FE cũ không gửi trường này, và
 * mọi dòng lập trước đây đều là số Kế hoạch.
 */
export const LOAI_KE_HOACH_MAC_DINH: LoaiKeHoach = 'KE_HOACH';

/**
 * Mảnh điều kiện Mongo lọc theo loại kế hoạch, trộn vào `where` của bảng.
 *
 * Bản ghi tạo TRƯỚC khi hai bảng có trường `loaiKeHoach` không mang trường này.
 * Chúng đều là số KẾ HOẠCH, nên nhánh KE_HOACH phải nhận cả dòng thiếu trường —
 * nếu không, toàn bộ kế hoạch công ty đang dùng sẽ biến mất khỏi bảng ngay khi
 * deploy, trước lúc script backfill kịp chạy.
 *
 * Nhánh DU_BAO thì tuyệt đối KHÔNG được nới: dữ liệu cũ không phải dự báo.
 *
 * Bỏ nhánh $exists sau khi `backfill-loai-ke-hoach-bang.js` đã chạy trên mọi tenant.
 */
export function dieuKienLoaiKeHoach(
  loaiKeHoach: LoaiKeHoach,
): Record<string, unknown> {
  if (loaiKeHoach === 'KE_HOACH') {
    return {
      $or: [{ loaiKeHoach: 'KE_HOACH' }, { loaiKeHoach: { $exists: false } }],
    };
  }
  return { loaiKeHoach };
}
