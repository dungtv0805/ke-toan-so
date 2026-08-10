import { describe, it, expect } from 'vitest';
import { tinhLichThanhToan } from './lichThanhToan';

const HOM_NAY = new Date('2026-08-10T00:00:00.000Z');

/** Ngày cách hôm nay `n` ngày, dạng ISO. */
const sau = (n: number): string => {
  const d = new Date(HOM_NAY);
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

describe('tinhLichThanhToan', () => {
  it('luôn trả đủ 4 mốc kể cả khi rỗng', () => {
    const out = tinhLichThanhToan([], HOM_NAY);
    expect(out.map((r) => r.nhan)).toEqual(['Trong 7 ngày', '8–30 ngày', '31–60 ngày', '61–90 ngày']);
    expect(out.every((r) => r.soKhoan === 0 && r.soTien === 0)).toBe(true);
  });

  it('phân đúng khoản vào từng mốc', () => {
    const out = tinhLichThanhToan(
      [
        { hanThanhToan: sau(3), conLai: 100 },
        { hanThanhToan: sau(20), conLai: 200 },
        { hanThanhToan: sau(45), conLai: 300 },
        { hanThanhToan: sau(80), conLai: 400 },
      ],
      HOM_NAY,
    );
    expect(out.map((r) => r.soTien)).toEqual([100, 200, 300, 400]);
    expect(out.map((r) => r.soKhoan)).toEqual([1, 1, 1, 1]);
  });

  it('biên ngày 7 thuộc mốc đầu, ngày 8 thuộc mốc hai', () => {
    const out = tinhLichThanhToan(
      [
        { hanThanhToan: sau(7), conLai: 10 },
        { hanThanhToan: sau(8), conLai: 20 },
      ],
      HOM_NAY,
    );
    expect(out[0].soTien).toBe(10);
    expect(out[1].soTien).toBe(20);
  });

  it('biên ngày 30 thuộc mốc hai, ngày 31 thuộc mốc ba', () => {
    const out = tinhLichThanhToan(
      [
        { hanThanhToan: sau(30), conLai: 10 },
        { hanThanhToan: sau(31), conLai: 20 },
      ],
      HOM_NAY,
    );
    expect(out[1].soTien).toBe(10);
    expect(out[2].soTien).toBe(20);
  });

  it('khoản đã quá hạn không vào lịch tương lai', () => {
    const out = tinhLichThanhToan([{ hanThanhToan: sau(-5), conLai: 999 }], HOM_NAY);
    expect(out.every((r) => r.soTien === 0)).toBe(true);
  });

  it('đến hạn đúng hôm nay tính vào mốc đầu', () => {
    const out = tinhLichThanhToan([{ hanThanhToan: sau(0), conLai: 50 }], HOM_NAY);
    expect(out[0].soTien).toBe(50);
  });

  it('quá 90 ngày bị loại', () => {
    const out = tinhLichThanhToan([{ hanThanhToan: sau(91), conLai: 999 }], HOM_NAY);
    expect(out.every((r) => r.soTien === 0)).toBe(true);
  });

  it('bỏ khoản đã tất toán và khoản thiếu hạn thanh toán', () => {
    const out = tinhLichThanhToan(
      [
        { hanThanhToan: sau(3), conLai: 0 },
        { hanThanhToan: undefined, conLai: 500 },
        { hanThanhToan: sau(3), conLai: 70 },
      ],
      HOM_NAY,
    );
    expect(out[0]).toEqual({ nhan: 'Trong 7 ngày', soKhoan: 1, soTien: 70 });
  });

  it('cộng dồn nhiều khoản cùng mốc', () => {
    const out = tinhLichThanhToan(
      [
        { hanThanhToan: sau(2), conLai: 100 },
        { hanThanhToan: sau(5), conLai: 250 },
      ],
      HOM_NAY,
    );
    expect(out[0]).toEqual({ nhan: 'Trong 7 ngày', soKhoan: 2, soTien: 350 });
  });
});
