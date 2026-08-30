import { describe, expect, it } from 'vitest';
import {
  quyTuSoDuCuoi,
  quyTuSoDuDau,
  tinhTongHopDongTien,
} from './dongTienTongHop';

const m = (...v: number[]) => {
  const a = Array(12).fill(0);
  v.forEach((x, i) => (a[i] = x));
  return a;
};

describe('tinhTongHopDongTien', () => {
  it('gom thu và chi theo chiều của từng dòng', () => {
    const kq = tinhTongHopDongTien(
      [
        { chieu: 'THU', thang: m(100, 200) },
        { chieu: 'THU', thang: m(10, 20) },
        { chieu: 'CHI', thang: m(50, 60) },
      ],
      0,
    );
    expect(kq.thu.slice(0, 2)).toEqual([110, 220]);
    expect(kq.chi.slice(0, 2)).toEqual([50, 60]);
  });

  it('tồn cuối = tồn đầu + thu − chi', () => {
    const kq = tinhTongHopDongTien([{ chieu: 'THU', thang: m(100) }], 500);
    expect(kq.tonDau[0]).toBe(500);
    expect(kq.tonCuoi[0]).toBe(600);
  });

  it('tồn đầu tháng sau là tồn cuối tháng trước', () => {
    const kq = tinhTongHopDongTien(
      [
        { chieu: 'THU', thang: m(100, 100, 100) },
        { chieu: 'CHI', thang: m(30, 30, 30) },
      ],
      1000,
    );
    // 1000 → 1070 → 1140 → 1210
    expect(kq.tonDau.slice(0, 4)).toEqual([1000, 1070, 1140, 1210]);
    expect(kq.tonCuoi.slice(0, 3)).toEqual([1070, 1140, 1210]);
  });

  it('thặng dư = thu − chi, âm khi chi nhiều hơn thu', () => {
    const kq = tinhTongHopDongTien(
      [
        { chieu: 'THU', thang: m(100) },
        { chieu: 'CHI', thang: m(250) },
      ],
      0,
    );
    expect(kq.thangDu[0]).toBe(-150);
    expect(kq.tonCuoi[0]).toBe(-150);
  });

  it('tồn đầu năm âm vẫn cuộn đúng — kế hoạch có thể bắt đầu thấu chi', () => {
    const kq = tinhTongHopDongTien([{ chieu: 'THU', thang: m(200) }], -500);
    expect(kq.tonDau[0]).toBe(-500);
    expect(kq.tonCuoi[0]).toBe(-300);
    expect(kq.tonDau[1]).toBe(-300);
  });

  it('bảng rỗng cho toàn 0, trừ tồn đầu năm', () => {
    const kq = tinhTongHopDongTien([], 700);
    expect(kq.thu.every((v) => v === 0)).toBe(true);
    expect(kq.tonDau[0]).toBe(700);
    expect(kq.tonCuoi[11]).toBe(700);
  });
});

describe('quý của dòng số dư', () => {
  const thang = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  it('tồn đầu quý lấy tháng đầu quý, không cộng dồn', () => {
    expect(quyTuSoDuDau(thang)).toEqual([1, 4, 7, 10]);
  });

  it('tồn cuối quý lấy tháng cuối quý, không cộng dồn', () => {
    expect(quyTuSoDuCuoi(thang)).toEqual([3, 6, 9, 12]);
  });
});
