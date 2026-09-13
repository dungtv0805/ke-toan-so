import { describe, expect, it } from 'vitest';
import {
  congKhoang,
  COT_KY,
  hoaVon,
  hoaVonKhoang,
  KHOANG_QUY,
  tyLeTrenCha,
  tyLeTrenDoanhThu,
} from './kyCot';

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

describe('COT_KY', () => {
  it('đi từ rộng tới hẹp: năm → 6 tháng → quý → tháng', () => {
    expect(COT_KY.map((c) => c.title)).toEqual([
      'Cả năm', '6 tháng đầu', '6 tháng cuối',
      'QUÝ I', 'QUÝ II', 'QUÝ III', 'QUÝ IV',
      'T1', 'T2', 'T3', 'T4', 'T5', 'T6',
      'T7', 'T8', 'T9', 'T10', 'T11', 'T12',
    ]);
  });

  it('khoá cột duy nhất — antd đòi vậy', () => {
    expect(new Set(COT_KY.map((c) => c.key)).size).toBe(COT_KY.length);
  });
});

describe('tyLeTrenDoanhThu', () => {
  const doanhThu = [1000, 500, ...Array(10).fill(0)];

  it('chia cho doanh thu của CHÍNH KỲ, không phải cả năm', () => {
    expect(tyLeTrenDoanhThu(100, doanhThu, 0, 1)).toBeCloseTo(0.1);
    expect(tyLeTrenDoanhThu(100, doanhThu, 0, 2)).toBeCloseTo(100 / 1500);
  });

  it('kỳ chưa có doanh thu thì không chia được', () => {
    expect(tyLeTrenDoanhThu(100, doanhThu, 5, 6)).toBeNull();
  });
});

describe('tyLeTrenCha', () => {
  const cha = [400, 0, ...Array(10).fill(0)];

  it('dòng con lấy tỷ lệ trên dòng cha cùng kỳ', () => {
    expect(tyLeTrenCha(100, cha, 0, 1)).toBeCloseTo(0.25);
  });

  it('dòng không có cha là gốc của nhóm nên bằng 100%', () => {
    expect(tyLeTrenCha(100, undefined, 0, 1)).toBe(1);
  });

  it('dòng KHÔNG PHÁT SINH để trống, không phải 100%', () => {
    // Cột toàn "100,0%" nằm cạnh ô số tiền trống thì gây hiểu nhầm.
    expect(tyLeTrenCha(0, undefined, 0, 1)).toBeNull();
    expect(tyLeTrenCha(0, cha, 0, 1)).toBeNull();
  });

  it('dòng cha bằng 0 thì không chia được', () => {
    expect(tyLeTrenCha(100, cha, 1, 2)).toBeNull();
  });
});
