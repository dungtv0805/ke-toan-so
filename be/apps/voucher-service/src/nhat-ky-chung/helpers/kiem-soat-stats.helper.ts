import { KiemSoatTrangThai } from '@app/entities';
import { NhatKyChungStats } from '../dto';

/**
 * 3 trạng thái kiểm soát thật + khoá tương ứng trong `NhatKyChungStats`.
 * `KHONG_DUOC_TRU` được người dùng gọi là "không hợp lệ" (xem chú thích ở entity).
 */
export const KIEM_SOAT_BUCKETS: {
  key: 'hopLe' | 'chuaHopLe' | 'khongHopLe';
  trangThai: KiemSoatTrangThai;
}[] = [
  { key: 'hopLe', trangThai: 'HOP_LE' },
  { key: 'chuaHopLe', trangThai: 'CHUA_HOP_LE' },
  { key: 'khongHopLe', trangThai: 'KHONG_DUOC_TRU' },
];

const so = (v: unknown): number =>
  typeof v === 'number' && isFinite(v) ? v : 0;

/**
 * Đổi 1 dòng kết quả `$group` (các trường phẳng `hopLe_soLuong`, `hopLe_giaTri`...)
 * thành `NhatKyChungStats`. Không có dòng nào (bộ lọc không khớp gì) → tất cả về 0.
 *
 * `chuaKiemSoat` tính bằng phần còn lại của tổng để 4 nhóm luôn cộng đúng bằng tổng,
 * kể cả khi dữ liệu cũ mang trạng thái ngoài 3 giá trị đã biết.
 */
export function buildStatsResponse(
  row: Record<string, unknown> | undefined,
): NhatKyChungStats {
  const tongSo = so(row?.tongSo);
  const tongGiaTri = so(row?.tongGiaTri);

  const buckets = KIEM_SOAT_BUCKETS.map((b) => ({
    soLuong: so(row?.[`${b.key}_soLuong`]),
    giaTri: so(row?.[`${b.key}_giaTri`]),
  }));

  const daKiemSoatSoLuong = buckets.reduce((s, b) => s + b.soLuong, 0);
  const daKiemSoatGiaTri = buckets.reduce((s, b) => s + b.giaTri, 0);

  return {
    tongSo,
    tongPhatSinhNo: so(row?.tongPhatSinhNo),
    tongPhatSinhCo: so(row?.tongPhatSinhCo),
    tongGiaTri,
    hopLe: buckets[0],
    chuaHopLe: buckets[1],
    khongHopLe: buckets[2],
    chuaKiemSoat: {
      soLuong: Math.max(0, tongSo - daKiemSoatSoLuong),
      giaTri: Math.max(0, tongGiaTri - daKiemSoatGiaTri),
    },
  };
}
