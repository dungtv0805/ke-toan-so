import { describe, it, expect } from 'vitest';
import { tinhDoanhThuHopDong, tinhMacDinhGhiNhan } from './ghiNhanDoanhThu';
import type { NhatKyChung } from '@/types';

const entry = (taiKhoanNo: string, taiKhoanCo: string, soTien: number): NhatKyChung =>
  ({ id: `${taiKhoanNo}-${taiKhoanCo}-${soTien}`, taiKhoanNo, taiKhoanCo, soTien } as NhatKyChung);

describe('tinhDoanhThuHopDong', () => {
  it('cộng mọi dòng Có 511 vào đã ghi nhận', () => {
    const r = tinhDoanhThuHopDong([
      entry('3387', '5113', 40_000_000),
      entry('3387', '511', 35_336_473),
      entry('131', '3387', 100_000_000),
    ]);
    expect(r.daGhiNhan).toBe(75_336_473);
    expect(r.ghiNhan).toHaveLength(2);
  });

  it('chưa ghi nhận = Có 3387 trừ Nợ 3387', () => {
    const r = tinhDoanhThuHopDong([
      entry('112', '3387', 93_733_000),
      entry('3387', '511', 40_000_000),
    ]);
    expect(r.chuaGhiNhan).toBe(53_733_000);
  });

  it('ghi nhận vượt số treo → chưa ghi nhận về 0, không âm', () => {
    const r = tinhDoanhThuHopDong([
      entry('112', '3387', 10_000_000),
      entry('3387', '511', 15_000_000),
    ]);
    expect(r.chuaGhiNhan).toBe(0);
  });

  it('đơn chưa có chứng từ nào → tất cả bằng 0', () => {
    const r = tinhDoanhThuHopDong([]);
    expect(r).toEqual({ ghiNhan: [], daGhiNhan: 0, chuaGhiNhan: 0 });
  });

  it('bỏ qua dòng không liên quan 511/3387', () => {
    const r = tinhDoanhThuHopDong([entry('642', '331', 5_000_000)]);
    expect(r.daGhiNhan).toBe(0);
    expect(r.chuaGhiNhan).toBe(0);
  });
});

describe('tinhMacDinhGhiNhan', () => {
  it('còn phần chưa ghi nhận → gợi ý đúng phần còn lại', () => {
    expect(tinhMacDinhGhiNhan(93_733_000, 40_000_000)).toBe(53_733_000);
  });

  it('đã thu nhưng chưa ghi nhận lần nào → gợi ý cả số đã thu', () => {
    expect(tinhMacDinhGhiNhan(93_733_000, 0)).toBe(93_733_000);
  });

  it('ghi nhận hết → bỏ trống ô số tiền', () => {
    expect(tinhMacDinhGhiNhan(50_000_000, 50_000_000)).toBeUndefined();
  });

  it('ghi nhận vượt số đã thu → bỏ trống, không ra số âm', () => {
    expect(tinhMacDinhGhiNhan(50_000_000, 60_000_000)).toBeUndefined();
  });

  it('chưa thu đồng nào → bỏ trống', () => {
    expect(tinhMacDinhGhiNhan(0, 0)).toBeUndefined();
  });
});
