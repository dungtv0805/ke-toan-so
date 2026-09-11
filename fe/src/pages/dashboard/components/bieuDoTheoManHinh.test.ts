import { describe, it, expect } from 'vitest';
import {
  banKinhDonut,
  hienNhanSo,
  rongTrucTen,
  RONG_TRUC_TEN_DIEN_THOAI,
  SO_DIEM_TOI_DA_CO_NHAN_DIEN_THOAI,
} from './bieuDoTheoManHinh';

describe('hienNhanSo', () => {
  it('máy tính / máy tính bảng luôn giữ nhãn như cũ', () => {
    expect(hienNhanSo('desktop', 31)).toBe(true);
    expect(hienNhanSo('tablet', 12)).toBe(true);
  });

  it('điện thoại: kỳ ngắn giữ nhãn, 12 tháng thì bỏ', () => {
    expect(hienNhanSo('mobile', 3)).toBe(true);
    expect(hienNhanSo('mobile', SO_DIEM_TOI_DA_CO_NHAN_DIEN_THOAI)).toBe(true);
    expect(hienNhanSo('mobile', 12)).toBe(false);
  });
});

describe('banKinhDonut', () => {
  it('ngoài điện thoại trả đúng số gốc', () => {
    expect(banKinhDonut('desktop', 52, 82)).toEqual({ innerRadius: 52, outerRadius: 82 });
    expect(banKinhDonut('tablet', 44, 70)).toEqual({ innerRadius: 44, outerRadius: 70 });
  });

  it('điện thoại thu 3/4 để nhãn ngoài vành không bị cắt', () => {
    expect(banKinhDonut('mobile', 52, 82)).toEqual({ innerRadius: 39, outerRadius: 62 });
  });
});

describe('rongTrucTen', () => {
  it('ngoài điện thoại giữ nguyên', () => {
    expect(rongTrucTen('desktop', 150)).toBe(150);
    expect(rongTrucTen('tablet', 140)).toBe(140);
  });

  it('điện thoại có trần, trục vốn hẹp hơn trần thì giữ', () => {
    expect(rongTrucTen('mobile', 150)).toBe(RONG_TRUC_TEN_DIEN_THOAI);
    expect(rongTrucTen('mobile', 80)).toBe(80);
  });
});
