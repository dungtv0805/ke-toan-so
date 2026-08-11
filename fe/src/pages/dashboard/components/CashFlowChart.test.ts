import { describe, it, expect } from 'vitest';
import { tinhChiTiet } from './CashFlowChart';
import type { CashMoneyLine } from '@/services/dashboardService';

/**
 * Bảng chi tiết trong tooltip phải cộng lại đúng bằng 3 thẻ KPI ngay trên nó.
 * KPI dựng thế này (xem CashFlowChart):
 *   Tổng thu / Tổng chi = Σ các bucket TRONG khoảng đang chọn
 *   Tồn                 = số dư luỹ kế tại bucket cuối = tồn đầu kỳ + Σ (thu−chi) TỪ ĐẦU NĂM
 * Hai cửa sổ khác nhau — đây chính là chỗ dễ sai nhất.
 */
const thang = (n: number, thu: number, chi: number) => ({ thang: n, thu, chi });

const dong = (
  ma: string,
  ten: string,
  soDuDauKy: number,
  points: { thang: number; thu: number; chi: number }[],
): CashMoneyLine => ({
  ma,
  ten,
  soDuDauKy,
  points: Array.from({ length: 12 }, (_, i) => points.find((p) => p.thang === i + 1) ?? thang(i + 1, 0, 0)),
});

const mb = dong('3999369986', 'MB', 600, [thang(1, 400, 100), thang(3, 0, 500)]);
const vcb = dong('1703329986', 'Vietcombank', 300, [thang(3, 200, 0)]);
const tienMat = dong('', 'Tiền mặt', 100, [thang(1, 50, 20), thang(2, 0, 30), thang(5, 10, 0)]);
const duLieu = [mb, vcb, tienMat];

describe('tinhChiTiet', () => {
  it('thu/chi chỉ tính trong khoảng chọn, tồn luỹ kế từ đầu năm', () => {
    const rows = tinhChiTiet(duLieu, false, 2, 3);
    const byTen = Object.fromEntries(rows.map((r) => [r.ten, r]));

    expect(byTen['Tiền mặt']).toMatchObject({ thu: 0, chi: 30 });
    expect(byTen['MB']).toMatchObject({ thu: 0, chi: 500 });
    expect(byTen['Vietcombank']).toMatchObject({ thu: 200, chi: 0 });
    // Tồn tới hết tháng 3, tính từ tồn đầu kỳ (KHÔNG cắt theo khoảng)
    expect(byTen['Tiền mặt'].ton).toBe(100 + 50 - 20 - 30); // 100
    expect(byTen['MB'].ton).toBe(600 + 400 - 100 - 500); // 400
    expect(byTen['Vietcombank'].ton).toBe(300 + 200); // 500
  });

  it('mỗi tài khoản ngân hàng một dòng, không có dòng TK kế toán', () => {
    const rows = tinhChiTiet(duLieu, false, 1, 12);

    // Xếp theo tồn giảm dần: VCB 500 > MB 400 > Tiền mặt 110.
    expect(rows.map((r) => [r.ma, r.ten])).toEqual([
      ['1703329986', 'Vietcombank'],
      ['3999369986', 'MB'],
      ['', 'Tiền mặt'],
    ]);
    // Không dòng nào mang số hiệu TK kế toán.
    expect(rows.every((r) => !/^11[12]/.test(r.ma))).toBe(true);
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
    const nh = dong('3999369986', 'MB', 10, [
      thang(1, 5, 0), thang(2, 0, 3), thang(3, 0, 0), thang(4, 7, 0), thang(5, 0, 1),
    ]);
    nh.points = nh.points.slice(0, 5);
    // isWeekly=true → startMonth/endMonth là số THÁNG (vd 7), không được lọc bucket tuần theo nó
    const rows = tinhChiTiet([nh], true, 7, 7);
    expect(rows[0]).toMatchObject({ ma: '3999369986', thu: 12, chi: 4, ton: 18 });
  });

  it('bỏ dòng không tiền, không phát sinh', () => {
    const rows = tinhChiTiet(
      [dong('1161000535351', 'ABBank', 0, []), dong('', 'Tiền mặt', 50, []), dong('3999369986', 'MB', 300, [])],
      false,
      1,
      12,
    );
    expect(rows.map((r) => r.ten)).toEqual(['MB', 'Tiền mặt']);
  });
});
