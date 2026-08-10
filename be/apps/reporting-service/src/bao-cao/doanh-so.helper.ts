import type { NhatKyChungEntry } from '@app/dto';
import { maChieu, nhanChieu, type GiaTriChieu } from './bao-cao.helper';

export type GroupBy = 'ngay' | 'thang' | 'quy' | 'nam';

export interface DoanhSoChieuRow {
  ten: string;
  soTien: number;
}

const hai = (n: number): string => String(n).padStart(2, '0');

/** Nhãn kỳ của một ngày, dùng làm khoá gom nhóm và nhãn trục X. */
export function nhanKy(ngay: Date, groupBy: GroupBy): string {
  const y = ngay.getUTCFullYear();
  const m = ngay.getUTCMonth() + 1;
  switch (groupBy) {
    case 'ngay':
      return `${hai(ngay.getUTCDate())}/${hai(m)}/${y}`;
    case 'quy':
      return `Q${Math.ceil(m / 3)}/${y}`;
    case 'nam':
      return `${y}`;
    default:
      return `T${m}/${y}`;
  }
}

/** Doanh số = phát sinh Có TK 511. Chấp nhận cả trường legacy ở cấp gốc bút toán. */
export function laDoanhThu(v: NhatKyChungEntry): boolean {
  const maTK = v.danhMuc?.taiKhoanCo?.ma ?? v.taiKhoanCo;
  return !!maTK?.startsWith('511');
}

export function gomTheoThoiGian(
  vouchers: NhatKyChungEntry[],
  groupBy: GroupBy,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const v of vouchers) {
    if (!laDoanhThu(v)) continue;
    const key = nhanKy(new Date(v.ngay), groupBy);
    out.set(key, (out.get(key) ?? 0) + v.soTien);
  }
  return out;
}

/**
 * Gom doanh số theo chiều phân tích, khoá gom nhóm là MÃ (`maChieu`), không phải nhãn
 * hiển thị — hai đối tượng khác nhau có thể trùng tên, một đối tượng có thể bị ghi tên
 * lệch giữa các kỳ. Bút toán không gắn chiều (không có mã nào) vẫn được gom vào nhóm
 * "Không xác định" thay vì loại bỏ, để tổng các nhóm luôn khớp tổng doanh số hiển thị
 * trên thẻ KPI cùng tab.
 */
export function gomTheoChieu(
  vouchers: NhatKyChungEntry[],
  field: string,
): DoanhSoChieuRow[] {
  const out = new Map<string, { ten: string; soTien: number }>();
  for (const v of vouchers) {
    if (!laDoanhThu(v)) continue;
    const dm = v.danhMuc as unknown as Record<string, GiaTriChieu | undefined>;
    const dim = dm?.[field];
    const khoa = maChieu(dim) ?? '';
    const e = out.get(khoa) ?? { ten: nhanChieu(dim), soTien: 0 };
    e.soTien += v.soTien;
    out.set(khoa, e);
  }
  return Array.from(out.values()).sort((a, b) => b.soTien - a.soTien);
}
