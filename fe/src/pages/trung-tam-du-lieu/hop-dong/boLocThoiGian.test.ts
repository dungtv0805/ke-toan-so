import { describe, it, expect } from 'vitest';
import { khoangThang, trongKy, tuPeriod, tuKhoangNgay, KY_OPTIONS } from './boLocThoiGian';
import { PERIOD_OPTIONS } from '@/components/shared/period';

describe('tuPeriod', () => {
  it('năm nay / năm trước đều là cả năm, chỉ khác năm', () => {
    expect(tuPeriod('namNay', 2026)).toEqual({ nam: 2026, ky: 'CA_NAM' });
    expect(tuPeriod('namTruoc', 2026)).toEqual({ nam: 2025, ky: 'CA_NAM' });
  });

  it('tháng, quý, nửa năm khớp kỳ tương ứng', () => {
    expect(tuPeriod('thang1', 2026)).toEqual({ nam: 2026, ky: 'T1' });
    expect(tuPeriod('thang12', 2026)).toEqual({ nam: 2026, ky: 'T12' });
    expect(tuPeriod('quy1', 2026)).toEqual({ nam: 2026, ky: 'Q1' });
    expect(tuPeriod('quy4', 2026)).toEqual({ nam: 2026, ky: 'Q4' });
    expect(tuPeriod('nuaDau', 2026)).toEqual({ nam: 2026, ky: 'HK1' });
    expect(tuPeriod('nuaCuoi', 2026)).toEqual({ nam: 2026, ky: 'HK2' });
  });

  it('khoảng ngày tự chọn giữ nguyên hai đầu, năm lấy theo ngày bắt đầu', () => {
    expect(tuKhoangNgay('2025-11-20', '2026-02-10', 2026)).toEqual({
      nam: 2025,
      ky: 'TUY_CHON',
      tuNgay: '2025-11-20',
      denNgay: '2026-02-10',
    });
  });

  it('chưa chọn ngày bắt đầu thì dùng năm hiện tại', () => {
    expect(tuKhoangNgay(undefined, undefined, 2026).nam).toBe(2026);
  });

  it('lọc tùy chọn chỉ lấy đơn trong khoảng, không phụ thuộc năm', () => {
    const loc = tuKhoangNgay('2025-11-20', '2026-02-10', 2026);
    expect(trongKy({ ngayKy: '2025-12-31' }, loc)).toBe(true);
    expect(trongKy({ ngayKy: '2026-02-10' }, loc)).toBe(true);
    expect(trongKy({ ngayKy: '2026-02-11' }, loc)).toBe(false);
    expect(trongKy({ ngayKy: '2025-11-19' }, loc)).toBe(false);
  });

  it('mọi lựa chọn của Tổng quan đều ra kỳ hợp lệ', () => {
    const hopLe = new Set(KY_OPTIONS.map((o) => o.value));
    PERIOD_OPTIONS.forEach((o) => {
      expect(hopLe.has(tuPeriod(o.value, 2026).ky)).toBe(true);
    });
  });
});

describe('khoangThang', () => {
  it('cả năm là tháng 1 đến 12', () => {
    expect(khoangThang('CA_NAM')).toEqual([1, 12]);
  });

  it('quý và nửa năm đúng biên', () => {
    expect(khoangThang('Q1')).toEqual([1, 3]);
    expect(khoangThang('Q4')).toEqual([10, 12]);
    expect(khoangThang('HK1')).toEqual([1, 6]);
    expect(khoangThang('HK2')).toEqual([7, 12]);
  });

  it('tháng lẻ chỉ gồm chính nó', () => {
    expect(khoangThang('T3')).toEqual([3, 3]);
    expect(khoangThang('T12')).toEqual([12, 12]);
  });

  it('tùy chọn không có khoảng tháng', () => {
    expect(khoangThang('TUY_CHON')).toBeNull();
  });

  it('danh sách lựa chọn đủ 20 mục', () => {
    // Cả năm + 2 nửa năm + 4 quý + 12 tháng + Tùy chọn
    expect(KY_OPTIONS).toHaveLength(20);
  });
});

describe('trongKy — đơn có ngày ký', () => {
  const don = { ngayKy: '2026-03-15', nam: 2026 };

  it('đúng năm, kỳ cả năm', () => {
    expect(trongKy(don, { nam: 2026, ky: 'CA_NAM' })).toBe(true);
  });

  it('sai năm thì loại, dù kỳ là cả năm', () => {
    expect(trongKy(don, { nam: 2025, ky: 'CA_NAM' })).toBe(false);
  });

  it('lọc theo quý', () => {
    expect(trongKy(don, { nam: 2026, ky: 'Q1' })).toBe(true);
    expect(trongKy(don, { nam: 2026, ky: 'Q2' })).toBe(false);
  });

  it('lọc theo tháng', () => {
    expect(trongKy(don, { nam: 2026, ky: 'T3' })).toBe(true);
    expect(trongKy(don, { nam: 2026, ky: 'T4' })).toBe(false);
  });

  it('lọc theo nửa năm, biên tháng 6/7', () => {
    expect(trongKy({ ngayKy: '2026-06-30' }, { nam: 2026, ky: 'HK1' })).toBe(true);
    expect(trongKy({ ngayKy: '2026-07-01' }, { nam: 2026, ky: 'HK1' })).toBe(false);
    expect(trongKy({ ngayKy: '2026-07-01' }, { nam: 2026, ky: 'HK2' })).toBe(true);
  });

  it('ngày ký dạng ISO đầy đủ vẫn đọc đúng tháng', () => {
    expect(trongKy({ ngayKy: '2026-03-15T00:00:00.000Z' }, { nam: 2026, ky: 'Q1' })).toBe(
      true,
    );
  });
});

describe('trongKy — đơn thiếu ngày ký', () => {
  const donCu = { nam: 2026 };

  it('lọt khi đúng năm và kỳ là cả năm', () => {
    expect(trongKy(donCu, { nam: 2026, ky: 'CA_NAM' })).toBe(true);
  });

  it('bị loại ở kỳ quý/tháng vì không đoán tháng', () => {
    expect(trongKy(donCu, { nam: 2026, ky: 'Q1' })).toBe(false);
    expect(trongKy(donCu, { nam: 2026, ky: 'T1' })).toBe(false);
  });

  it('bị loại khi sai năm', () => {
    expect(trongKy(donCu, { nam: 2025, ky: 'CA_NAM' })).toBe(false);
  });

  it('không có cả ngayKy lẫn nam thì luôn bị loại', () => {
    expect(trongKy({}, { nam: 2026, ky: 'CA_NAM' })).toBe(false);
  });
});

describe('trongKy — kỳ tùy chọn', () => {
  const loc = {
    nam: 2026,
    ky: 'TUY_CHON' as const,
    tuNgay: '2026-03-01',
    denNgay: '2026-03-31',
  };

  it('bao gồm cả hai đầu mút', () => {
    expect(trongKy({ ngayKy: '2026-03-01' }, loc)).toBe(true);
    expect(trongKy({ ngayKy: '2026-03-31' }, loc)).toBe(true);
  });

  it('loại ngày ngoài khoảng', () => {
    expect(trongKy({ ngayKy: '2026-02-28' }, loc)).toBe(false);
    expect(trongKy({ ngayKy: '2026-04-01' }, loc)).toBe(false);
  });

  it('khoảng có thể vắt qua năm, không bị chặn bởi nam', () => {
    const vatNam = {
      nam: 2026,
      ky: 'TUY_CHON' as const,
      tuNgay: '2025-12-01',
      denNgay: '2026-01-31',
    };
    expect(trongKy({ ngayKy: '2025-12-15' }, vatNam)).toBe(true);
  });

  it('đơn thiếu ngày ký bị loại', () => {
    expect(trongKy({ nam: 2026 }, loc)).toBe(false);
  });

  it('chưa chọn đủ 2 đầu ngày thì rơi về cả năm', () => {
    expect(trongKy({ ngayKy: '2026-08-01' }, { nam: 2026, ky: 'TUY_CHON' })).toBe(true);
    expect(trongKy({ nam: 2026 }, { nam: 2026, ky: 'TUY_CHON' })).toBe(true);
  });
});
