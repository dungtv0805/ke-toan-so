import type { DoanhThuRow } from '@/services/baoCaoReportService';
import { NUM_FMT, type ReportCol, type ReportSheet } from '@/utils/exportReportExcel';

/** Cột Excel = cột đang hiện trên màn hình, kể cả dải tháng đang lọc. */
export function buildDoanhThuSheets(
  rows: DoanhThuRow[],
  tong: DoanhThuRow,
  startMonth: number,
  endMonth: number,
  kyLabel: string,
): ReportSheet[] {
  if (rows.length === 0) return [];

  const monthCols: ReportCol[] = [];
  for (let m = startMonth; m <= endMonth; m += 1) {
    monthCols.push({ key: `t${m}`, header: `Tháng ${m}`, align: 'right', numFmt: NUM_FMT, width: 16 });
  }

  const columns: ReportCol[] = [
    { key: 'soHopDong', header: 'Mã ĐH', width: 12 },
    { key: 'khachHang', header: 'Khách hàng', width: 34 },
    { key: 'sanPham', header: 'Sản phẩm', width: 26 },
    { key: 'doanhSo', header: 'Doanh số', align: 'right', numFmt: NUM_FMT, width: 16 },
    { key: 'doanhThu', header: 'Doanh thu', align: 'right', numFmt: NUM_FMT, width: 16 },
    ...monthCols,
  ];

  const cellsOf = (r: DoanhThuRow): Record<string, string | number> => {
    const cells: Record<string, string | number> = {
      soHopDong: r.soHopDong || r.tenDonHang,
      khachHang: r.khachHang,
      sanPham: r.sanPham,
      doanhSo: r.doanhSo,
      doanhThu: r.doanhThu,
    };
    for (let m = startMonth; m <= endMonth; m += 1) cells[`t${m}`] = r.thang[m - 1] ?? 0;
    return cells;
  };

  return [
    {
      name: 'Doanh thu',
      title: 'BÁO CÁO DOANH THU',
      meta: [`Kỳ: ${kyLabel}`],
      columns,
      rows: [
        ...rows.map((r) => ({ cells: cellsOf(r) })),
        { cells: { ...cellsOf(tong), soHopDong: 'TỔNG', khachHang: '', sanPham: '' }, bold: true, fill: 'total' as const },
      ],
    },
  ];
}
