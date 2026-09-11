import { describe, it, expect } from 'vitest';
import { tokenTheoManHinh } from './tokenTheoManHinh';

describe('tokenTheoManHinh', () => {
  it('máy tính: KHÔNG ghi đè gì — giữ mật độ 11px / 28px', () => {
    expect(tokenTheoManHinh('desktop', false)).toEqual({});
    expect(tokenTheoManHinh('desktop', true)).toEqual({});
  });

  it('máy tính bảng dùng chuột (cửa sổ laptop hẹp): cũng giữ nguyên', () => {
    expect(tokenTheoManHinh('tablet', false)).toEqual({});
  });

  it('máy tính bảng cảm ứng: chữ 12, control 32', () => {
    expect(tokenTheoManHinh('tablet', true)).toMatchObject({ fontSize: 12, controlHeight: 32 });
  });

  it('điện thoại: chữ 13, control 36 — bấm bằng ngón tay', () => {
    const t = tokenTheoManHinh('mobile', true);
    expect(t).toMatchObject({ fontSize: 13, controlHeight: 36 });
    expect(t.controlHeightSM).toBeLessThan(t.controlHeight!);
    expect(t.controlHeightLG).toBeGreaterThan(t.controlHeight!);
  });
});
