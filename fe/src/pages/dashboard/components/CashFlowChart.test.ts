import { describe, it, expect } from 'vitest';
import { tinhChiTiet } from './CashFlowChart';
import type { CashAccountSeries } from '@/services/dashboardService';

/**
 * Bảng chi tiết trong tooltip phải cộng lại đúng bằng 3 thẻ KPI ngay trên nó.
 * KPI dựng thế này (xem CashFlowChart):
 *   Tổng thu / Tổng chi = Σ các bucket TRONG khoảng đang chọn
 *   Tồn                 = số dư luỹ kế tại bucket cuối = tồn đầu kỳ + Σ (thu−chi) TỪ ĐẦU NĂM
 * Hai cửa sổ khác nhau — đây chính là chỗ dễ sai nhất.
 */
const thang = (n: number, thu: number, chi: number) => ({ thang: n, thu, chi });

const tk = (
  ma: string,
  soDuDauKy: number,
  points: { thang: number; thu: number; chi: number }[],
): CashAccountSeries => ({
  ma,
  ten: `TK ${ma}`,
  soDuDauKy,
  points: Array.from({ length: 12 }, (_, i) => points.find((p) => p.thang === i + 1) ?? thang(i + 1, 0, 0)),
});

describe('tinhChiTiet', () => {
  const duLieu = [
    tk('1111', 100, [thang(1, 50, 20), thang(2, 0, 30), thang(5, 10, 0)]),
    tk('1121', 900, [thang(1, 400, 100), thang(3, 200, 500)]),
  ];

  it('thu/chi chỉ tính trong khoảng chọn, tồn luỹ kế từ đầu năm', () => {
    const rows = tinhChiTiet(duLieu, false, 2, 3);
    const byMa = Object.fromEntries(rows.map((r) => [r.ma, r]));

    // Tháng 2–3: 1111 thu 0 / chi 30; 1121 thu 200 / chi 500
    expect(byMa['1111']).toMatchObject({ thu: 0, chi: 30 });
    expect(byMa['1121']).toMatchObject({ thu: 200, chi: 500 });
    // Tồn tới hết tháng 3, tính từ tồn đầu kỳ (KHÔNG cắt theo khoảng)
    expect(byMa['1111'].ton).toBe(100 + 50 - 20 - 30); // 100
    expect(byMa['1121'].ton).toBe(900 + 400 - 100 + 200 - 500); // 900
  });

  it('tổng các dòng khớp đúng 3 thẻ KPI với mọi khoảng tháng', () => {
    for (let start = 1; start <= 12; start++) {
      for (let end = start; end <= 12; end++) {
        const rows = tinhChiTiet(duLieu, false, start, end);
        const kpiThu = duLieu.reduce(
          (s, t) => s + t.points.filter((p) => p.thang >= start && p.thang <= end).reduce((a, p) => a + p.thu, 0),
          0,
        );
        const kpiChi = duLieu.reduce(
          (s, t) => s + t.points.filter((p) => p.thang >= start && p.thang <= end).reduce((a, p) => a + p.chi, 0),
          0,
        );
        const kpiTon = duLieu.reduce(
          (s, t) => s + t.points.filter((p) => p.thang <= end).reduce((a, p) => a + p.thu - p.chi, t.soDuDauKy),
          0,
        );
        expect(rows.reduce((s, r) => s + r.thu, 0)).toBe(kpiThu);
        expect(rows.reduce((s, r) => s + r.chi, 0)).toBe(kpiChi);
        expect(rows.reduce((s, r) => s + r.ton, 0)).toBe(kpiTon);
      }
    }
  });

  it('chế độ tuần dùng trọn 5 bucket, không cắt theo tháng', () => {
    const tuan: CashAccountSeries = {
      ma: '1111',
      ten: 'Tiền mặt',
      soDuDauKy: 10,
      points: [thang(1, 5, 0), thang(2, 0, 3), thang(3, 0, 0), thang(4, 7, 0), thang(5, 0, 1)],
    };
    // isWeekly=true → startMonth/endMonth là số THÁNG (vd 7), không được lọc bucket tuần theo nó
    const rows = tinhChiTiet([tuan], true, 7, 7);
    expect(rows[0]).toMatchObject({ thu: 12, chi: 4, ton: 18 });
  });

  it('bỏ dòng tài khoản không tiền, không phát sinh; sắp theo tồn giảm dần', () => {
    const rows = tinhChiTiet(
      [tk('1111', 0, []), tk('1121', 50, []), tk('1112', 300, [])],
      false,
      1,
      12,
    );
    expect(rows.map((r) => r.ma)).toEqual(['1112', '1121']);
  });
});
