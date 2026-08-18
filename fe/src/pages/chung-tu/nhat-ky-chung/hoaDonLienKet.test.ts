import { describe, it, expect } from 'vitest';
import {
  suyLoaiHoaDon,
  tongThanhToanHoaDon,
  dungDongNhap,
  type HoaDonGan,
} from './hoaDonLienKet';

describe('suyLoaiHoaDon', () => {
  it('phiếu chi / báo nợ là tiền ra → hóa đơn mua vào', () => {
    expect(suyLoaiHoaDon('PHIEU_CHI')).toBe('mua');
    expect(suyLoaiHoaDon('BAO_NO')).toBe('mua');
  });

  it('phiếu thu / báo có là tiền vào → hóa đơn bán ra', () => {
    expect(suyLoaiHoaDon('PHIEU_THU')).toBe('ban');
    expect(suyLoaiHoaDon('BAO_CO')).toBe('ban');
  });

  it('loại lạ hoặc chưa chọn thì mặc định mua vào — hóa đơn đầu vào nhiều hơn hẳn', () => {
    expect(suyLoaiHoaDon(undefined)).toBe('mua');
    expect(suyLoaiHoaDon('KHAC')).toBe('mua');
  });
});

describe('tongThanhToanHoaDon', () => {
  const hd = (over: Partial<HoaDonGan>): HoaDonGan => ({
    soHoaDon: '001',
    loai: 'mua',
    ...over,
  });

  it('cộng tổng thanh toán của các hóa đơn đã gắn', () => {
    expect(
      tongThanhToanHoaDon([
        hd({ tongThanhToan: 1_100_000 }),
        hd({ tongThanhToan: 2_200_000 }),
      ]),
    ).toBe(3_300_000);
  });

  it('hóa đơn mới gõ (chưa có số tiền) tính là 0, không ra NaN', () => {
    expect(tongThanhToanHoaDon([hd({}), hd({ tongThanhToan: 500 })])).toBe(500);
  });
});

describe('dungDongNhap', () => {
  const args = {
    soHoaDon: 'HD0001234',
    ngayChungTu: '2026-08-18',
    soChungTu: 'PC0001',
    doiTuongTen: 'Cty ABC',
    doiTuongMst: '0101243150',
  };

  it('hóa đơn mua vào điền tên/MST vào cặp trường người bán', () => {
    const row = dungDongNhap({ ...args, loai: 'mua' });
    expect(row).toMatchObject({
      soHoaDon: 'HD0001234',
      ngayHoaDon: '2026-08-18',
      soChungTu: 'PC0001',
      tenNguoiBan: 'Cty ABC',
      mstNguoiBan: '0101243150',
      giaTriChuaThue: 0,
      tienThue: 0,
      tongThanhToan: 0,
      choBoSung: true,
    });
    expect(row.tenNguoiMua).toBeUndefined();
  });

  it('hóa đơn bán ra điền vào cặp trường người mua', () => {
    const row = dungDongNhap({ ...args, loai: 'ban' });
    expect(row).toMatchObject({ tenNguoiMua: 'Cty ABC', mstNguoiMua: '0101243150' });
    expect(row.tenNguoiBan).toBeUndefined();
  });

  it('chứng từ chưa có đối tượng thì để "(Chưa xác định)" — BE bắt buộc trường tên', () => {
    const row = dungDongNhap({ ...args, loai: 'mua', doiTuongTen: undefined, doiTuongMst: undefined });
    expect(row.tenNguoiBan).toBe('(Chưa xác định)');
    expect(row.mstNguoiBan).toBeUndefined();
  });

  it('luôn đặt thuế suất mặc định 10 để BE không rớt @IsIn', () => {
    expect(dungDongNhap({ ...args, loai: 'mua' }).thueSuat).toBe('10');
  });
});
