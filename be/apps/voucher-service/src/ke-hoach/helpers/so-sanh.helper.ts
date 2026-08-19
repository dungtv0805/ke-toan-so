/** Một dòng tổng hợp theo chiều phân tích (dùng chung cho kế hoạch lẫn thực hiện). */
export interface DimensionRow {
  key: string;
  ten?: string;
  doanhThu: number;
  chiPhi: number;
  tong: number;
  soLuong: number;
}

/** Chỉ tiêu đem ra so sánh giữa kế hoạch và thực hiện. */
export type ChiTieu = 'doanhThu' | 'chiPhi' | 'loiNhuan' | 'tong';

export const CHI_TIEU_LIST: ChiTieu[] = [
  'doanhThu',
  'chiPhi',
  'loiNhuan',
  'tong',
];

export interface SoSanhRow {
  key: string;
  ten?: string;
  keHoach: number;
  thucHien: number;
  chenhLech: number;
  /** null khi kế hoạch = 0 (không chia được) — FE hiển thị "—". */
  tyLeDat: number | null;
}

export interface SoSanhKetQua {
  rows: SoSanhRow[];
  tong: Omit<SoSanhRow, 'key' | 'ten'>;
}

export function layChiTieu(row: DimensionRow, chiTieu: ChiTieu): number {
  if (chiTieu === 'loiNhuan') return (row.doanhThu || 0) - (row.chiPhi || 0);
  return row[chiTieu] || 0;
}

function tinhTyLe(keHoach: number, thucHien: number): number | null {
  if (!keHoach) return null;
  return (thucHien / keHoach) * 100;
}

/**
 * Ghép hai bảng tổng hợp theo MÃ (không theo tên — hai mã khác nhau có thể trùng tên).
 * Mã chỉ có ở một phía vẫn ra dòng, phía kia là 0.
 */
export function gomSoSanh(
  keHoach: DimensionRow[],
  thucHien: DimensionRow[],
  chiTieu: ChiTieu,
): SoSanhKetQua {
  const map = new Map<string, SoSanhRow>();

  const nap = (rows: DimensionRow[], phia: 'keHoach' | 'thucHien') => {
    for (const row of rows) {
      const key = row.key;
      const hienCo = map.get(key) ?? {
        key,
        ten: undefined,
        keHoach: 0,
        thucHien: 0,
        chenhLech: 0,
        tyLeDat: null,
      };
      hienCo[phia] += layChiTieu(row, chiTieu);
      if (!hienCo.ten && row.ten) hienCo.ten = row.ten;
      map.set(key, hienCo);
    }
  };

  nap(keHoach, 'keHoach');
  nap(thucHien, 'thucHien');

  const rows = [...map.values()]
    .filter((r) => r.keHoach !== 0 || r.thucHien !== 0)
    .map((r) => ({
      ...r,
      chenhLech: r.thucHien - r.keHoach,
      tyLeDat: tinhTyLe(r.keHoach, r.thucHien),
    }))
    .sort((a, b) => Math.abs(b.keHoach) - Math.abs(a.keHoach));

  const tongKeHoach = rows.reduce((s, r) => s + r.keHoach, 0);
  const tongThucHien = rows.reduce((s, r) => s + r.thucHien, 0);

  return {
    rows,
    tong: {
      keHoach: tongKeHoach,
      thucHien: tongThucHien,
      chenhLech: tongThucHien - tongKeHoach,
      tyLeDat: tinhTyLe(tongKeHoach, tongThucHien),
    },
  };
}
