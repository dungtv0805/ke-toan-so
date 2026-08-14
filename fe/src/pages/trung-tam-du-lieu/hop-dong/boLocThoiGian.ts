import dayjs from 'dayjs';
import { resolvePeriod, type DashboardPeriod } from '@/components/shared/period';

/** Kỳ lọc trong một năm. `TUY_CHON` dùng khoảng ngày do người dùng chọn. */
export type KyLoc =
  | 'CA_NAM'
  | 'HK1'
  | 'HK2'
  | 'Q1'
  | 'Q2'
  | 'Q3'
  | 'Q4'
  | 'T1'
  | 'T2'
  | 'T3'
  | 'T4'
  | 'T5'
  | 'T6'
  | 'T7'
  | 'T8'
  | 'T9'
  | 'T10'
  | 'T11'
  | 'T12'
  | 'TUY_CHON';

export interface BoLocThoiGian {
  nam: number;
  ky: KyLoc;
  /** Chỉ dùng khi ky === 'TUY_CHON', định dạng YYYY-MM-DD. */
  tuNgay?: string;
  denNgay?: string;
}

export const KY_OPTIONS: { value: KyLoc; label: string }[] = [
  { value: 'CA_NAM', label: 'Cả năm' },
  { value: 'HK1', label: '6 tháng đầu năm' },
  { value: 'HK2', label: '6 tháng cuối năm' },
  { value: 'Q1', label: 'Quý 1' },
  { value: 'Q2', label: 'Quý 2' },
  { value: 'Q3', label: 'Quý 3' },
  { value: 'Q4', label: 'Quý 4' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: `T${i + 1}` as KyLoc,
    label: `Tháng ${i + 1}`,
  })),
  { value: 'TUY_CHON', label: 'Tùy chọn khoảng ngày' },
];

/** Khoảng tháng [đầu, cuối] của kỳ; `null` với kỳ tùy chọn. */
export function khoangThang(ky: KyLoc): [number, number] | null {
  if (ky === 'TUY_CHON') return null;
  if (ky === 'CA_NAM') return [1, 12];
  if (ky === 'HK1') return [1, 6];
  if (ky === 'HK2') return [7, 12];
  if (ky.startsWith('Q')) {
    const q = Number(ky.slice(1));
    return [q * 3 - 2, q * 3];
  }
  const t = Number(ky.slice(1));
  return [t, t];
}

/**
 * Bộ lọc thời gian suy từ ô kỳ dùng chung với trang Tổng quan (một dropdown gộp
 * kỳ + năm), để Bán hàng và Tổng quan hiểu kỳ giống hệt nhau.
 */
export function tuPeriod(period: DashboardPeriod, namHienTai: number): BoLocThoiGian {
  const { year, startMonth, endMonth } = resolvePeriod(period, namHienTai);
  return { nam: year, ky: kyTuKhoangThang(startMonth, endMonth) };
}

/**
 * Bộ lọc khi người dùng tự chọn "Từ ngày → Đến ngày".
 *
 * `nam` lấy theo ngày bắt đầu vì số kế toán được nạp theo năm; thiếu ngày bắt đầu thì
 * dùng năm hiện tại (lúc này `trongKy` hiểu như cả năm — xem `trongKy`).
 */
export function tuKhoangNgay(
  tuNgay: string | undefined,
  denNgay: string | undefined,
  namHienTai: number,
): BoLocThoiGian {
  return {
    nam: tuNgay ? dayjs(tuNgay).year() : namHienTai,
    ky: 'TUY_CHON',
    tuNgay,
    denNgay,
  };
}

/** Khoảng tháng [đầu, cuối] → kỳ tương ứng; khoảng lạ thì coi như cả năm. */
export function kyTuKhoangThang(dau: number, cuoi: number): KyLoc {
  if (dau === 1 && cuoi === 12) return 'CA_NAM';
  if (dau === 1 && cuoi === 6) return 'HK1';
  if (dau === 7 && cuoi === 12) return 'HK2';
  if (dau === cuoi) return `T${dau}` as KyLoc;
  if (cuoi - dau === 2 && dau % 3 === 1) return `Q${(dau + 2) / 3}` as KyLoc;
  return 'CA_NAM';
}

export interface DongLocThoiGian {
  /** Ngày ký hợp đồng (YYYY-MM-DD hoặc ISO). */
  ngayKy?: string;
  /** Năm nhập tay của đơn cũ — chỉ dùng khi thiếu ngayKy. */
  nam?: number;
}

/**
 * Một đơn hàng có thuộc kỳ đang lọc không.
 *
 * Đơn thiếu `ngayKy` chỉ lọt khi kỳ là "Cả năm" và trùng năm — không đoán tháng cho
 * đơn cũ, tránh làm sai bảng quý/tháng. Kỳ tùy chọn chưa chọn đủ hai đầu ngày thì
 * hiểu như "Cả năm".
 */
export function trongKy(row: DongLocThoiGian, loc: BoLocThoiGian): boolean {
  const coDayDuKhoang = loc.ky === 'TUY_CHON' && Boolean(loc.tuNgay && loc.denNgay);

  if (coDayDuKhoang) {
    if (!row.ngayKy) return false;
    const d = dayjs(row.ngayKy);
    return (
      !d.isBefore(dayjs(loc.tuNgay), 'day') && !d.isAfter(dayjs(loc.denNgay), 'day')
    );
  }

  const [dau, cuoi] = khoangThang(loc.ky) ?? [1, 12];

  if (!row.ngayKy) {
    return row.nam === loc.nam && dau === 1 && cuoi === 12;
  }

  const d = dayjs(row.ngayKy);
  const thang = d.month() + 1;
  return d.year() === loc.nam && thang >= dau && thang <= cuoi;
}
