import { describe, expect, it } from 'vitest';
import { soDuLuyKe } from './nguonVonSoDu';

describe('soDuLuyKe', () => {
  it('số dư cuối mỗi tháng = đầu năm + luỹ kế biến động', () => {
    const thang = [10, 20, 30, ...Array(9).fill(0)];
    const kq = soDuLuyKe(100, thang);
    expect(kq.slice(0, 4)).toEqual([110, 130, 160, 160]);
  });

  it('biến động âm làm số dư giảm', () => {
    const kq = soDuLuyKe(1000, [-100, -200, ...Array(10).fill(0)]);
    expect(kq.slice(0, 3)).toEqual([900, 700, 700]);
  });

  it('số dư cuối năm = đầu năm + tổng 12 tháng', () => {
    const thang = Array(12).fill(5);
    expect(soDuLuyKe(0, thang)[11]).toBe(60);
  });

  it('bù đủ 12 phần tử khi mảng thiếu', () => {
    expect(soDuLuyKe(50, [10])).toHaveLength(12);
    expect(soDuLuyKe(50, [10])[11]).toBe(60);
  });
});
