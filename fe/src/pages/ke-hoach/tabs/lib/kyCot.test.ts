import { describe, expect, it } from 'vitest';
import { congKhoang, hoaVon, hoaVonKhoang, KHOANG_QUY } from './kyCot';

const thang = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

describe('congKhoang', () => {
  it('cả năm là tổng 12 tháng', () => {
    expect(congKhoang(thang, 0, 12)).toBe(78);
  });

  it('quý lấy đúng ba tháng của quý đó', () => {
    expect(KHOANG_QUY.map(([tu, den]) => congKhoang(thang, tu, den))).toEqual([
      6, 15, 24, 33,
    ]);
  });

  it('sáu tháng đầu và sáu tháng cuối cộng lại bằng cả năm', () => {
    expect(congKhoang(thang, 0, 6) + congKhoang(thang, 6, 12)).toBe(78);
  });

  it('dãy thiếu phần tử hoặc có null vẫn ra số, không ra NaN', () => {
    expect(congKhoang([10, undefined as unknown as number, 5], 0, 12)).toBe(15);
    expect(congKhoang(undefined, 0, 12)).toBe(0);
  });
});

describe('hoaVon', () => {
  it('định phí chia cho tỷ lệ số dư đảm phí', () => {
    // Biến phí 60% doanh thu → tỷ lệ số dư đảm phí 40% → hòa vốn = 40 / 0.4.
    expect(hoaVon(40, 600, 1000)).toBe(100);
  });

  it('chưa có doanh thu thì không xác định được, trả 0', () => {
    expect(hoaVon(40, 0, 0)).toBe(0);
  });

  it('biến phí ăn hết doanh thu thì bán bao nhiêu cũng không hòa vốn, trả 0', () => {
    expect(hoaVon(40, 1000, 1000)).toBe(0);
    expect(hoaVon(40, 1200, 1000)).toBe(0);
  });
});

describe('hoaVonKhoang', () => {
  const nguon = {
    doanhThuThuanThang: [1000, 1000, ...Array(10).fill(0)],
    dinhPhiThang: [40, 40, ...Array(10).fill(0)],
    bienPhiThang: [600, 900, ...Array(10).fill(0)],
  };

  it('KHÔNG cộng dồn hòa vốn của các tháng: quý tính lại từ ba số của chính quý', () => {
    const t1 = hoaVonKhoang(nguon, 0, 1); // 40 / (1 − 600/1000) = 100
    const t2 = hoaVonKhoang(nguon, 1, 2); // 40 / (1 − 900/1000) = 400
    const q1 = hoaVonKhoang(nguon, 0, 3); // 80 / (1 − 1500/2000) = 320
    expect(t1).toBeCloseTo(100, 6);
    expect(t2).toBeCloseTo(400, 6);
    expect(q1).toBeCloseTo(320, 6);
    expect(q1).not.toBe(t1 + t2);
  });
});
