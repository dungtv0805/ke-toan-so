import { describe, it, expect } from 'vitest';
import { tinhChiTiet } from './CashFlowChart';
import type { CashAccountSeries, CashMoneyLine } from '@/services/dashboardService';

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

/** TK cha = Σ dòng con, đúng như BE phát ra. */
const tk = (ma: string, ten: string, chiTiet: CashMoneyLine[]): CashAccountSeries => ({
  ma,
  ten,
  soDuDauKy: chiTiet.reduce((s, c) => s + c.soDuDauKy, 0),
  points: Array.from({ length: 12 }, (_, i) => ({
    thang: i + 1,
    thu: chiTiet.reduce((s, c) => s + c.points[i].thu, 0),
    chi: chiTiet.reduce((s, c) => s + c.points[i].chi, 0),
  })),
  chiTiet,
});

const tienMat = tk('1111', 'Tiền mặt', [dong('', '', 100, [thang(1, 50, 20), thang(2, 0, 30), thang(5, 10, 0)])]);
const vcb = dong('VCB', 'Vietcombank', 600, [thang(1, 400, 100), thang(3, 0, 500)]);
const tcb = dong('TCB', 'Techcombank', 300, [thang(3, 200, 0)]);
const nganHang = tk('1121', 'TGNH', [vcb, tcb]);
// TK không tách đối tượng thì BE trả chiTiet rỗng.
const duLieu: CashAccountSeries[] = [{ ...tienMat, chiTiet: [] }, nganHang];

describe('tinhChiTiet', () => {
  it('thu/chi chỉ tính trong khoảng chọn, tồn luỹ kế từ đầu năm', () => {
    const rows = tinhChiTiet(duLieu, false, 2, 3);
    const byMa = Object.fromEntries(rows.map((r) => [r.ma, r]));

    // Tháng 2–3: 1111 thu 0 / chi 30; 1121 thu 200 / chi 500
    expect(byMa['1111']).toMatchObject({ thu: 0, chi: 30, laCon: false });
    expect(byMa['1121']).toMatchObject({ thu: 200, chi: 500, laCon: false });
    // Tồn tới hết tháng 3, tính từ tồn đầu kỳ (KHÔNG cắt theo khoảng)
    expect(byMa['1111'].ton).toBe(100 + 50 - 20 - 30); // 100
    expect(byMa['1121'].ton).toBe(900 + 400 - 100 + 200 - 500); // 900
  });

  it('tách được từng ngân hàng, dòng con đánh cờ laCon và nằm ngay dưới TK', () => {
    const rows = tinhChiTiet(duLieu, false, 1, 12);

    // Cha xếp theo tồn giảm dần, con cũng vậy: TCB tồn 500 > VCB tồn 400.
    expect(rows.map((r) => [r.ma, r.laCon])).toEqual([
      ['1121', false],
      ['TCB', true],
      ['VCB', true],
      ['1111', false],
    ]);
    const byMa = Object.fromEntries(rows.map((r) => [r.ma, r]));
    expect(byMa['VCB']).toMatchObject({ ten: 'Vietcombank', thu: 400, chi: 600, ton: 400 });
    expect(byMa['TCB']).toMatchObject({ ten: 'Techcombank', thu: 200, chi: 0, ton: 500 });
    // Dòng cha đúng bằng Σ hai ngân hàng.
    expect(byMa['1121'].ton).toBe(byMa['VCB'].ton + byMa['TCB'].ton);
    expect(byMa['1121'].thu).toBe(byMa['VCB'].thu + byMa['TCB'].thu);
  });

  it('tổng dòng CHA khớp đúng 3 thẻ KPI với mọi khoảng tháng', () => {
    for (let start = 1; start <= 12; start++) {
      for (let end = start; end <= 12; end++) {
        const cha = tinhChiTiet(duLieu, false, start, end).filter((r) => !r.laCon);
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
        expect(cha.reduce((s, r) => s + r.thu, 0)).toBe(kpiThu);
        expect(cha.reduce((s, r) => s + r.chi, 0)).toBe(kpiChi);
        expect(cha.reduce((s, r) => s + r.ton, 0)).toBe(kpiTon);
      }
    }
  });

  it('chế độ tuần dùng trọn 5 bucket, không cắt theo tháng', () => {
    const nh = dong('VCB', 'Vietcombank', 10, [
      thang(1, 5, 0), thang(2, 0, 3), thang(3, 0, 0), thang(4, 7, 0), thang(5, 0, 1),
    ]);
    nh.points = nh.points.slice(0, 5);
    const cha: CashAccountSeries = { ma: '1121', ten: 'TGNH', soDuDauKy: 10, points: nh.points, chiTiet: [nh] };
    // isWeekly=true → startMonth/endMonth là số THÁNG (vd 7), không được lọc bucket tuần theo nó
    const rows = tinhChiTiet([cha], true, 7, 7);
    expect(rows[0]).toMatchObject({ ma: '1121', thu: 12, chi: 4, ton: 18 });
    expect(rows[1]).toMatchObject({ ma: 'VCB', thu: 12, chi: 4, ton: 18 });
  });

  it('bỏ TK không tiền, không phát sinh; bỏ luôn dòng con rỗng của TK còn tiền', () => {
    const rong = dong('BIDV', 'BIDV', 0, []);
    const cha = tk('1121', 'TGNH', [dong('VCB', 'Vietcombank', 50, []), rong]);
    const rows = tinhChiTiet([tk('1111', 'Tiền mặt', [dong('', '', 0, [])]), cha], false, 1, 12);

    expect(rows.map((r) => r.ma)).toEqual(['1121', 'VCB']);
  });
});
