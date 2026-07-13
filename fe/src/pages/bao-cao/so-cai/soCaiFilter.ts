import { hasActiveFilters, matchAllFilters, type ColumnFilters } from '@/components/table/columnFilter';
import type { SoCaiByAccount, SoCaiEntry, TrialBalance } from '@/services/soCaiService';

/** Key cột lọc được của bảng tài khoản (tab Tổng hợp theo TK và tab Cân đối phát sinh). */
const accountValue = (
  r: { taiKhoan: string; tenTaiKhoan: string },
  key: string,
): string | undefined =>
  key === 'taiKhoan' ? r.taiKhoan : key === 'tenTaiKhoan' ? r.tenTaiKhoan : undefined;

/** Key cột lọc được của bảng bút toán (tab Chi tiết tài khoản). */
const entryValue = (e: SoCaiEntry, key: string): string | undefined =>
  key === 'soPhieu'
    ? e.soPhieu
    : key === 'loaiChungTu'
      ? e.loaiChungTu
      : key === 'dienGiai'
        ? e.dienGiai
        : undefined;

/**
 * Tab "Tổng hợp theo TK". Bảng phẳng — dòng Tổng cộng của antd cộng lại từ dataSource, nên chỉ
 * cần lọc là số tổng tự khớp với những dòng còn hiện.
 */
export function filterSoCaiSummary(
  rows: SoCaiByAccount[],
  filters: ColumnFilters,
): SoCaiByAccount[] {
  if (!hasActiveFilters(filters)) return rows;
  return rows.filter((r) => matchAllFilters(r, filters, accountValue));
}

/** Tab "Bảng cân đối phát sinh". Cũng phẳng, cùng bộ key cột với bảng tổng hợp. */
export function filterTrialBalance(rows: TrialBalance[], filters: ColumnFilters): TrialBalance[] {
  if (!hasActiveFilters(filters)) return rows;
  return rows.filter((r) => matchAllFilters(r, filters, accountValue));
}

/**
 * Tab "Chi tiết tài khoản": lọc bút toán rồi CỘNG LẠI phát sinh Nợ/Có theo các dòng còn hiện
 * (như SUBTOTAL của Excel) để khối tổng phía trên bảng không lệch với bảng.
 *
 * Số dư đầu kỳ / cuối kỳ giữ nguyên: đó là số dư của tài khoản, không phải tổng của mấy dòng
 * đang hiển thị.
 */
export function filterSoCaiChiTiet(
  acc: SoCaiByAccount | null,
  filters: ColumnFilters,
): SoCaiByAccount | null {
  if (!acc || !hasActiveFilters(filters)) return acc;

  const chiTiet = acc.chiTiet.filter((e) => matchAllFilters(e, filters, entryValue));
  return {
    ...acc,
    phatSinhNo: chiTiet.reduce((s, e) => s + e.phatSinhNo, 0),
    phatSinhCo: chiTiet.reduce((s, e) => s + e.phatSinhCo, 0),
    chiTiet,
  };
}
