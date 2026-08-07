import { describe, it, expect } from 'vitest';
import { THUE_SUAT_OPTIONS, tinhTienThue } from './taxService';

describe('tinhTienThue', () => {
  it('tính theo từng mức thuế suất', () => {
    expect(tinhTienThue(100_000_000, '10')).toBe(10_000_000);
    expect(tinhTienThue(100_000_000, '8')).toBe(8_000_000);
    expect(tinhTienThue(100_000_000, '5')).toBe(5_000_000);
    expect(tinhTienThue(100_000_000, '0')).toBe(0);
  });

  it('không chịu thuế / không kê khai → 0', () => {
    expect(tinhTienThue(100_000_000, 'KCT')).toBe(0);
    expect(tinhTienThue(100_000_000, 'KKKT')).toBe(0);
  });

  it('làm tròn về đồng', () => {
    expect(tinhTienThue(1_234_567, '10')).toBe(123_457);
    expect(tinhTienThue(1_234_567, '8')).toBe(98_765);
  });

  it('thiếu tiền hàng hoặc thuế suất → 0, không NaN', () => {
    expect(tinhTienThue(undefined, '10')).toBe(0);
    expect(tinhTienThue(100_000_000, undefined)).toBe(0);
    expect(tinhTienThue(100_000_000, 'suat-la')).toBe(0);
  });

  it('mọi lựa chọn trong THUE_SUAT_OPTIONS đều tính được', () => {
    THUE_SUAT_OPTIONS.forEach((o) => {
      expect(Number.isFinite(tinhTienThue(1_000_000, o.value))).toBe(true);
    });
  });
});
