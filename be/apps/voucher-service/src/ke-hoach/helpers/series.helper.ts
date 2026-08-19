/** Dòng tối thiểu cần để dựng series (khớp cả `KeHoachDong` lẫn `ChungTu`). */
export interface DongTinhSeries {
  ngay: Date | string;
  soTien: number;
  danhMuc?: {
    taiKhoanNo?: { ma?: string };
    taiKhoanCo?: { ma?: string };
  };
}

export interface SeriesRow {
  /** Số tháng (1–12), hoặc số tuần (1–5) khi xem 1 tháng. */
  thang: number;
  doanhThu: number;
  chiPhi: number;
  loiNhuan: number;
}

/** Doanh thu = phát sinh Có TK 5xx (cùng quy tắc với `bao-cao.service` của reporting). */
export const laDoanhThu = (d: DongTinhSeries): boolean =>
  !!d.danhMuc?.taiKhoanCo?.ma?.startsWith('5');

/** Chi phí = phát sinh Nợ TK 6xx. */
export const laChiPhi = (d: DongTinhSeries): boolean =>
  !!d.danhMuc?.taiKhoanNo?.ma?.startsWith('6');

function cong(rows: DongTinhSeries[]): Omit<SeriesRow, 'thang'> {
  let doanhThu = 0;
  let chiPhi = 0;
  for (const d of rows) {
    if (laDoanhThu(d)) doanhThu += d.soTien || 0;
    if (laChiPhi(d)) chiPhi += d.soTien || 0;
  }
  return { doanhThu, chiPhi, loiNhuan: doanhThu - chiPhi };
}

/**
 * Dựng chuỗi doanh thu / chi phí / lợi nhuận theo kỳ, **đúng cách chia kỳ của
 * `pnl-series`** (reporting-service): có `month` → 5 tuần theo `ceil(ngày/7)`;
 * không có → 12 tháng. Nhờ vậy gauge "Kế hoạch" và "Thực hiện" luôn cùng trục.
 */
export function buildSeries(
  rows: DongTinhSeries[],
  year: number,
  month?: number,
): SeriesRow[] {
  const theoTuan = !!month && month >= 1 && month <= 12;
  const ngayCua = (d: DongTinhSeries) => new Date(d.ngay);

  if (theoTuan) {
    return Array.from({ length: 5 }, (_, i) => {
      const tuan = i + 1;
      const trongTuan = rows.filter((d) => {
        const n = ngayCua(d);
        return (
          n.getFullYear() === year &&
          n.getMonth() === month - 1 &&
          Math.ceil(n.getDate() / 7) === tuan
        );
      });
      return { thang: tuan, ...cong(trongTuan) };
    });
  }

  return Array.from({ length: 12 }, (_, m) => {
    const trongThang = rows.filter((d) => {
      const n = ngayCua(d);
      return n.getFullYear() === year && n.getMonth() === m;
    });
    return { thang: m + 1, ...cong(trongThang) };
  });
}
