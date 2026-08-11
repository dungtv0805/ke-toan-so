import { describe, it, expect } from 'vitest';
import {
  pivotTheoThang,
  KEY_CHUA_PHAN_LOAI,
  KEY_KHONG_RO_THANG,
  type DongGopPivot,
} from './pivotSanPham';

const gop = (d: Partial<DongGopPivot>): DongGopPivot => ({
  key: 'SP1',
  ten: 'Sản phẩm 1',
  thang: 0,
  soTien: 0,
  ...d,
});

describe('pivotTheoThang', () => {
  it('không có đóng góp nào thì hàng rỗng và tổng bằng 0', () => {
    const r = pivotTheoThang([]);
    expect(r.hang).toEqual([]);
    expect(r.tong.caNam).toBe(0);
    expect(r.tong.thang).toHaveLength(12);
    expect(r.tong.thang.every((x) => x === 0)).toBe(true);
  });

  it('cộng nhiều đóng góp cùng sản phẩm cùng tháng', () => {
    const r = pivotTheoThang([
      gop({ thang: 2, soTien: 100 }),
      gop({ thang: 2, soTien: 250 }),
    ]);
    expect(r.hang).toHaveLength(1);
    expect(r.hang[0].thang[2]).toBe(350);
    expect(r.hang[0].caNam).toBe(350);
  });

  it('cả năm = tổng 12 tháng', () => {
    const r = pivotTheoThang([
      gop({ thang: 0, soTien: 10 }),
      gop({ thang: 5, soTien: 20 }),
      gop({ thang: 11, soTien: 30 }),
    ]);
    expect(r.hang[0].caNam).toBe(60);
  });

  it('cột quý và nửa năm cộng đúng các tháng con', () => {
    const r = pivotTheoThang([
      gop({ thang: 0, soTien: 1 }),
      gop({ thang: 1, soTien: 2 }),
      gop({ thang: 2, soTien: 4 }),
      gop({ thang: 3, soTien: 8 }),
      gop({ thang: 6, soTien: 16 }),
      gop({ thang: 9, soTien: 32 }),
    ]);
    const h = r.hang[0];
    expect(h.quy).toEqual([7, 8, 16, 32]);
    expect(h.hk1).toBe(15);
    expect(h.hk2).toBe(48);
    expect(h.hk1 + h.hk2).toBe(h.caNam);
  });

  it('tách theo mã, hai sản phẩm trùng tên khác mã không bị gộp', () => {
    const r = pivotTheoThang([
      gop({ key: 'SP1', ten: 'Trùng tên', soTien: 30 }),
      gop({ key: 'SP2', ten: 'Trùng tên', soTien: 40 }),
    ]);
    expect(r.hang).toHaveLength(2);
    expect(r.tong.caNam).toBe(70);
  });

  it('hàng sắp xếp theo tên sản phẩm', () => {
    const r = pivotTheoThang([
      gop({ key: 'B', ten: 'Bê tông', soTien: 1 }),
      gop({ key: 'A', ten: 'Áo mưa', soTien: 1 }),
    ]);
    expect(r.hang.map((h) => h.ten)).toEqual(['Áo mưa', 'Bê tông']);
  });

  it('đóng góp không rõ tháng vào hàng riêng, chỉ có ở cột cả năm', () => {
    const r = pivotTheoThang([
      gop({ thang: 3, soTien: 100 }),
      gop({ thang: null, soTien: 70 }),
    ]);
    const khongRo = r.hang.find((h) => h.key === KEY_KHONG_RO_THANG);
    expect(khongRo?.caNam).toBe(70);
    expect(khongRo?.thang.every((x) => x === 0)).toBe(true);
    expect(khongRo?.ten).toBe('Không rõ tháng');
  });

  it('hàng không rõ tháng luôn đứng cuối', () => {
    const r = pivotTheoThang([
      gop({ key: 'Z', ten: 'Zebra', soTien: 1 }),
      gop({ thang: null, soTien: 1 }),
      gop({ key: 'A', ten: 'Alpha', soTien: 1 }),
    ]);
    expect(r.hang[r.hang.length - 1].key).toBe(KEY_KHONG_RO_THANG);
  });

  it('hàng chưa phân loại đứng cuối, ngay trước hàng không rõ tháng', () => {
    const r = pivotTheoThang([
      gop({ key: 'Z', ten: 'Zebra', soTien: 1 }),
      gop({ key: KEY_CHUA_PHAN_LOAI, ten: 'Chưa phân loại', soTien: 1 }),
      gop({ thang: null, soTien: 1 }),
      gop({ key: 'A', ten: 'Alpha', soTien: 1 }),
    ]);
    expect(r.hang.map((h) => h.key)).toEqual([
      'A',
      'Z',
      KEY_CHUA_PHAN_LOAI,
      KEY_KHONG_RO_THANG,
    ]);
  });

  it('hàng tổng cộng đủ mọi hàng, kể cả không rõ tháng', () => {
    const r = pivotTheoThang([
      gop({ key: 'A', ten: 'A', thang: 1, soTien: 100 }),
      gop({ key: 'B', ten: 'B', thang: 1, soTien: 200 }),
      gop({ thang: null, soTien: 50 }),
    ]);
    expect(r.tong.thang[1]).toBe(300);
    expect(r.tong.caNam).toBe(350);
    expect(r.tong.ten).toBe('TỔNG');
  });

  it('bỏ qua đóng góp bằng 0 để bảng không đầy hàng rỗng', () => {
    const r = pivotTheoThang([
      gop({ key: 'A', ten: 'A', soTien: 0 }),
      gop({ key: 'B', ten: 'B', soTien: 5 }),
    ]);
    expect(r.hang.map((h) => h.key)).toEqual(['B']);
  });

  it('số tiền âm vẫn được cộng (điều chỉnh giảm)', () => {
    const r = pivotTheoThang([
      gop({ thang: 0, soTien: 100 }),
      gop({ thang: 0, soTien: -30 }),
    ]);
    expect(r.hang[0].thang[0]).toBe(70);
  });

  it('tháng ngoài 0..11 bị coi như không rõ tháng', () => {
    const r = pivotTheoThang([gop({ thang: 12, soTien: 40 })]);
    expect(r.hang[0].key).toBe(KEY_KHONG_RO_THANG);
  });
});
