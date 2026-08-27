import { describe, expect, it } from 'vitest';
import { chonMacDinh, thieuLoaiGiaoDich, tienToSoPhieu } from './loaiGiaoDichLo';

const DANH_SACH = [
  { ma: 'KC', loaiChungTuMa: 'KC' },
  { ma: 'NVK', loaiChungTuMa: 'KT' },
  { ma: 'TV' },
];

describe('chonMacDinh', () => {
  it('chọn lại mã đã dùng lần trước', () => {
    expect(chonMacDinh('KC', DANH_SACH)).toBe('KC');
  });

  it('bỏ qua mã đã lưu nhưng không còn trong danh mục', () => {
    expect(chonMacDinh('DA_XOA', DANH_SACH)).toBeUndefined();
  });

  it('không chọn gì khi công ty chưa từng kết chuyển', () => {
    expect(chonMacDinh(undefined, DANH_SACH)).toBeUndefined();
  });
});

describe('thieuLoaiGiaoDich', () => {
  it('chặn khi công ty có danh mục mà chưa chọn', () => {
    expect(thieuLoaiGiaoDich(DANH_SACH, undefined)).toBe(true);
  });

  it('không chặn khi đã chọn', () => {
    expect(thieuLoaiGiaoDich(DANH_SACH, 'KC')).toBe(false);
  });

  it('không chặn công ty chưa khai loại giao dịch nào', () => {
    expect(thieuLoaiGiaoDich([], undefined)).toBe(false);
  });
});

describe('tienToSoPhieu', () => {
  it('lấy mã loại chứng từ liên kết', () => {
    expect(tienToSoPhieu(DANH_SACH, 'KC')).toBe('KC');
    expect(tienToSoPhieu(DANH_SACH, 'NVK')).toBe('KT');
  });

  it('về NVK khi loại giao dịch chưa liên kết loại chứng từ', () => {
    expect(tienToSoPhieu(DANH_SACH, 'TV')).toBe('NVK');
  });

  it('về NVK khi chưa chọn gì', () => {
    expect(tienToSoPhieu(DANH_SACH, undefined)).toBe('NVK');
  });
});
