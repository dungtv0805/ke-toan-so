import { buildSeries, DongTinhSeries } from './series.helper';

const dong = (
  ngay: string,
  soTien: number,
  tkNo?: string,
  tkCo?: string,
): DongTinhSeries => ({
  ngay: new Date(ngay),
  soTien,
  danhMuc: {
    ...(tkNo ? { taiKhoanNo: { ma: tkNo } } : {}),
    ...(tkCo ? { taiKhoanCo: { ma: tkCo } } : {}),
  },
});

describe('buildSeries — theo 12 tháng', () => {
  it('trả đủ 12 tháng kể cả tháng không có dòng nào', () => {
    const out = buildSeries([], 2026);
    expect(out).toHaveLength(12);
    expect(out[0]).toEqual({ thang: 1, doanhThu: 0, chiPhi: 0, loiNhuan: 0 });
    expect(out[11].thang).toBe(12);
  });

  it('doanh thu = phát sinh Có tài khoản 5xx, chi phí = phát sinh Nợ tài khoản 6xx', () => {
    const out = buildSeries(
      [
        dong('2026-03-10', 100, '131', '511'),
        dong('2026-03-20', 40, '642', '331'),
      ],
      2026,
    );
    expect(out[2]).toEqual({ thang: 3, doanhThu: 100, chiPhi: 40, loiNhuan: 60 });
  });

  it('bỏ qua dòng của năm khác', () => {
    const out = buildSeries([dong('2025-03-10', 100, '131', '511')], 2026);
    expect(out.every((r) => r.doanhThu === 0)).toBe(true);
  });

  it('dòng không dính TK 5xx/6xx không vào doanh thu lẫn chi phí', () => {
    const out = buildSeries([dong('2026-01-05', 100, '112', '131')], 2026);
    expect(out[0]).toEqual({ thang: 1, doanhThu: 0, chiPhi: 0, loiNhuan: 0 });
  });
});

describe('buildSeries — theo tuần trong 1 tháng', () => {
  it('chia 5 tuần theo ngày/7 giống pnl-series của reporting', () => {
    const out = buildSeries(
      [
        dong('2026-03-01', 10, '131', '511'), // tuần 1
        dong('2026-03-08', 20, '131', '511'), // tuần 2
        dong('2026-03-29', 30, '131', '511'), // tuần 5
      ],
      2026,
      3,
    );
    expect(out).toHaveLength(5);
    expect(out.map((r) => r.doanhThu)).toEqual([10, 20, 0, 0, 30]);
  });

  it('bỏ qua dòng ngoài tháng đang xem', () => {
    const out = buildSeries([dong('2026-04-01', 10, '131', '511')], 2026, 3);
    expect(out.every((r) => r.doanhThu === 0)).toBe(true);
  });
});
