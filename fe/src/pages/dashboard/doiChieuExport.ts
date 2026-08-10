import { NUM_FMT, type ReportCol, type ReportSheet } from '@/utils/exportReportExcel';
import type { DoiChieuRow } from './trialBalanceDerive';

const soCot = (key: string, header: string): ReportCol => ({
  key,
  header,
  width: 18,
  align: 'right',
  numFmt: NUM_FMT,
});

const COLUMNS: ReportCol[] = [
  { key: 'doiTuong', header: 'Đối tượng', width: 36 },
  soCot('duDauKy', 'Số dư đầu kỳ'),
  soCot('phatSinhTang', 'Phát sinh tăng'),
  soCot('phatSinhGiam', 'Phát sinh giảm'),
  soCot('duCuoiKy', 'Số dư cuối kỳ'),
];

/** Một sheet "Đối chiếu công nợ", dòng cuối là tổng cộng. */
export function buildDoiChieuSheets(
  rows: DoiChieuRow[],
  loai: 'thu' | 'tra',
  kyLabel: string,
): ReportSheet[] {
  if (!rows.length) return [];

  const nhan = loai === 'thu' ? 'PHẢI THU' : 'PHẢI TRẢ';
  const cong = (f: keyof DoiChieuRow) =>
    rows.reduce((s, r) => s + (r[f] as number), 0);

  return [
    {
      name: `Đối chiếu ${loai === 'thu' ? 'phải thu' : 'phải trả'}`,
      title: `BẢNG ĐỐI CHIẾU CÔNG NỢ ${nhan} — ${kyLabel}`,
      columns: COLUMNS,
      rows: [
        ...rows.map((r) => ({ cells: { ...r } })),
        {
          bold: true,
          cells: {
            doiTuong: 'TỔNG CỘNG',
            duDauKy: cong('duDauKy'),
            phatSinhTang: cong('phatSinhTang'),
            phatSinhGiam: cong('phatSinhGiam'),
            duCuoiKy: cong('duCuoiKy'),
          },
        },
      ],
    },
  ];
}
