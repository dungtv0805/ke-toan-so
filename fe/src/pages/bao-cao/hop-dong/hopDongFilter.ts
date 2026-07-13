import {
  hasActiveFilters,
  matchAllFilters,
  type ColumnFilters,
} from '@/components/table/columnFilter';
import type { BaoCaoHopDongRow } from '@/types';

/**
 * Key cột lọc được — trùng `key` trong định nghĩa cột antd.
 * Bảng này chỉ có "Năm" là cột nhãn; các cột còn lại là số lượng / số tiền nên không lọc.
 * Năm rỗng hiển thị "Chưa rõ" → lọc theo đúng chữ đang thấy trên bảng.
 */
const getValue = (r: BaoCaoHopDongRow, key: string): string | undefined =>
  key === 'nam' ? (r.nam == null ? 'Chưa rõ' : String(r.nam)) : undefined;

const SUM_KEYS = [
  'soLuong',
  'giaTri',
  'quyetToan',
  'thuTien',
  'chuaCoHD',
  'hdChuaKy',
  'hdPhotoScan',
  'hdGoc',
] as const;

/** Dòng Tổng cộng từ các dòng còn hiện (đúng cách backend tính: cộng dồn, bình quân = giá trị / số lượng). */
export function sumHopDong(rows: BaoCaoHopDongRow[]): BaoCaoHopDongRow {
  const tong: BaoCaoHopDongRow = {
    nam: null,
    soLuong: 0,
    giaTri: 0,
    quyetToan: 0,
    thuTien: 0,
    chuaCoHD: 0,
    hdChuaKy: 0,
    hdPhotoScan: 0,
    hdGoc: 0,
    giaTriBinhQuan: 0,
  };
  for (const r of rows) {
    for (const k of SUM_KEYS) tong[k] += r[k] || 0;
  }
  tong.giaTriBinhQuan = tong.soLuong ? tong.giaTri / tong.soLuong : 0;
  return tong;
}

export interface HopDongView {
  rows: BaoCaoHopDongRow[];
  tong: BaoCaoHopDongRow | null;
}

/**
 * Lọc báo cáo theo bộ lọc cột. Dòng Tổng được cộng lại từ các năm còn hiện (như SUBTOTAL của
 * Excel); lọc không còn dòng nào → bảng rỗng, không hiện dòng Tổng toàn số 0.
 * Không lọc gì → giữ nguyên số của backend, tránh lệch do làm tròn.
 */
export function filterHopDong(
  rows: BaoCaoHopDongRow[],
  tong: BaoCaoHopDongRow | null,
  filters: ColumnFilters,
): HopDongView {
  if (!hasActiveFilters(filters)) return { rows, tong };

  const kept = rows.filter((r) => matchAllFilters(r, filters, getValue));
  if (kept.length === 0) return { rows: [], tong: null };
  return { rows: kept, tong: sumHopDong(kept) };
}
