// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  docRongDaLuu,
  ghiRongDaLuu,
  RONG_TOI_DA,
  RONG_TOI_THIEU,
  rongMoi,
} from './rongCot';

describe('rongMoi', () => {
  it('cộng khoảng đã kéo vào bề rộng lúc bắt đầu', () => {
    expect(rongMoi(200, 45)).toBe(245);
    expect(rongMoi(200, -45)).toBe(155);
  });

  it('không cho hẹp quá mức đọc được', () => {
    expect(rongMoi(100, -900)).toBe(RONG_TOI_THIEU);
  });

  it('không cho rộng quá mức — kéo lố là mất hẳn vùng cuộn', () => {
    expect(rongMoi(500, 9000)).toBe(RONG_TOI_DA);
  });

  it('làm tròn về số nguyên px', () => {
    expect(rongMoi(200, 10.6)).toBe(211);
  });
});

describe('docRongDaLuu / ghiRongDaLuu', () => {
  const KHOA = 'kh-test';

  beforeEach(() => localStorage.clear());

  it('chưa lưu gì thì trả về rỗng', () => {
    expect(docRongDaLuu(KHOA)).toEqual({});
  });

  it('ghi rồi đọc lại đúng như cũ', () => {
    ghiRongDaLuu(KHOA, { ma: 130, ten: 190 });
    expect(docRongDaLuu(KHOA)).toEqual({ ma: 130, ten: 190 });
  });

  /**
   * Khoá theo KEY cột chứ không theo chỉ số: thêm/bớt một cột thì các cột còn
   * lại vẫn giữ đúng bề rộng, không phải bump phiên bản khoá lưu như bảng cũ.
   */
  it('giữ bề rộng theo key, không lệch khi danh sách cột đổi', () => {
    ghiRongDaLuu(KHOA, { ma: 130, caNam: 150 });
    expect(docRongDaLuu(KHOA).caNam).toBe(150);
  });

  it('bỏ qua giá trị hỏng thay vì làm vỡ bảng', () => {
    localStorage.setItem(KHOA, '{ khong-phai-json');
    expect(docRongDaLuu(KHOA)).toEqual({});
  });

  it('bỏ qua mục không phải số dương', () => {
    localStorage.setItem(
      KHOA,
      JSON.stringify({ ma: 130, ten: 'rộng', quy: 0, thang: -5, ok: 90 }),
    );
    expect(docRongDaLuu(KHOA)).toEqual({ ma: 130, ok: 90 });
  });

  it('kẹp lại giá trị cũ nằm ngoài khoảng cho phép', () => {
    localStorage.setItem(KHOA, JSON.stringify({ hep: 5, rong: 99999 }));
    expect(docRongDaLuu(KHOA)).toEqual({
      hep: RONG_TOI_THIEU,
      rong: RONG_TOI_DA,
    });
  });
});
